"""
Index manager for lazy video content indexing.
Handles video registry synchronization, queue management, and background processing.
"""

import asyncio
import threading
import time
import logging
from typing import List, Dict, Optional, Set, Callable
from datetime import datetime, timedelta
from queue import PriorityQueue, Empty
from dataclasses import dataclass
import hashlib
from concurrent.futures import ThreadPoolExecutor, Future
from src.utils.ic_client import ICClient, VideoMetadata, ManifestContent
from src.models.video_models import (
    VideoIndexEntry, IndexingQueueItem, IndexStatus, ContentType,
    create_video_index_entry_from_metadata, validate_manifest_json
)
from src.processing.spacy_processor import SpacyProcessor
from src.processing.text_preprocessor import TextPreprocessor
from src.utils.config import Config

logger = logging.getLogger(__name__)


@dataclass
class IndexingStats:
    """Statistics for indexing operations."""
    total_videos: int = 0
    indexed_videos: int = 0
    queued_videos: int = 0
    failed_videos: int = 0
    processing_time: float = 0.0
    last_sync_time: Optional[datetime] = None
    errors: List[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []


class IndexManager:
    """
    Manages lazy indexing of video content from IC canisters.
    
    Provides functionality for:
    - Video registry synchronization with Access Control canister
    - Indexing queue management with priority handling
    - Background processing of video content
    - Index status tracking and error handling
    """
    
    def __init__(self, ic_client: ICClient, index_store, spacy_processor: SpacyProcessor = None):
        """
        Initialize IndexManager.
        
        Args:
            ic_client: IC client for canister communication
            index_store: Storage interface for index data
            spacy_processor: Optional spaCy processor for text processing
        """
        self.ic_client = ic_client
        self.index_store = index_store
        self.spacy_processor = spacy_processor or SpacyProcessor()
        self.text_preprocessor = TextPreprocessor()
        
        # Queue management
        self.indexing_queue = PriorityQueue(maxsize=Config.MAX_QUEUE_SIZE)
        self.processing_videos: Set[str] = set()
        self.failed_videos: Dict[str, str] = {}  # video_id -> error_message
        
        # Background processing
        self.executor = ThreadPoolExecutor(max_workers=Config.MAX_CONCURRENT_REQUESTS)
        self.processing_futures: Dict[str, Future] = {}
        self.is_processing = False
        self.stop_processing = threading.Event()
        
        # Enhanced monitoring
        self.processing_start_times: Dict[str, datetime] = {}
        self.alert_callbacks: List[Callable] = []
        self.performance_metrics = {
            'total_processed': 0,
            'total_failed': 0,
            'average_processing_time': 0.0,
            'queue_wait_times': [],
            'error_rates': []
        }
        
        # Statistics
        self.stats = IndexingStats()
        self.last_registry_sync = None
        
        # Callbacks for status updates
        self.status_callbacks: List[Callable] = []
        
        logger.info("IndexManager initialized")
    
    def add_status_callback(self, callback: Callable) -> None:
        """Add callback for status updates."""
        self.status_callbacks.append(callback)
    
    def add_alert_callback(self, callback: Callable) -> None:
        """Add callback for alerts and monitoring."""
        self.alert_callbacks.append(callback)
    
    def _send_alert(self, alert_type: str, message: str, details: Dict[str, Any] = None) -> None:
        """Send alert to registered callbacks."""
        alert_data = {
            'type': alert_type,
            'message': message,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {}
        }
        
        for callback in self.alert_callbacks:
            try:
                callback(alert_data)
            except Exception as e:
                logger.error(f"Error in alert callback: {str(e)}")
    
    def _notify_status_change(self, video_id: str, status: IndexStatus, message: str = None) -> None:
        """Notify registered callbacks of status changes."""
        for callback in self.status_callbacks:
            try:
                callback(video_id, status, message)
            except Exception as e:
                logger.error(f"Error in status callback: {str(e)}")
    
    def sync_video_registry(self, force: bool = False) -> List[VideoMetadata]:
        """
        Synchronize video registry from Access Control canister.
        
        Args:
            force: Force sync even if recently synced
            
        Returns:
            List of VideoMetadata from registry
            
        Raises:
            Exception: If registry sync fails
        """
        # Check if we need to sync
        if not force and self.last_registry_sync:
            time_since_sync = datetime.utcnow() - self.last_registry_sync
            if time_since_sync < timedelta(minutes=5):  # Don't sync more than every 5 minutes
                logger.debug("Skipping registry sync - too recent")
                return []
        
        try:
            logger.info("Synchronizing video registry from IC")
            start_time = time.time()
            
            # Fetch registry from IC
            registry = self.ic_client.get_video_registry(use_cache=not force)
            
            # Update statistics
            self.stats.total_videos = len(registry)
            self.stats.last_sync_time = datetime.utcnow()
            self.last_registry_sync = datetime.utcnow()
            
            sync_time = time.time() - start_time
            logger.info(f"Registry sync completed: {len(registry)} videos ({sync_time:.2f}s)")
            
            # Check for videos that need indexing
            self._check_videos_for_indexing(registry)
            
            return registry
            
        except Exception as e:
            error_msg = f"Failed to sync video registry: {str(e)}"
            logger.error(error_msg)
            self.stats.errors.append(error_msg)
            raise
    
    def _check_videos_for_indexing(self, registry: List[VideoMetadata]) -> None:
        """
        Check which videos need indexing and queue them.
        
        Args:
            registry: List of video metadata from registry
        """
        videos_to_index = []
        
        for video in registry:
            try:
                # Check if video is already indexed
                existing_entry = self.index_store.get_video_index(video.video_id)
                
                if existing_entry is None:
                    # Video not indexed at all
                    videos_to_index.append((video, 1, "New video"))
                    
                elif existing_entry.status == IndexStatus.ERROR and existing_entry.retry_count < Config.RETRY_MAX_ATTEMPTS:
                    # Retry failed videos
                    videos_to_index.append((video, 2, "Retry after error"))
                    
                elif existing_entry.updated_at < video.updated_at:
                    # Video has been updated since last index
                    videos_to_index.append((video, 3, "Video updated"))
                    
            except Exception as e:
                logger.error(f"Error checking video {video.video_id} for indexing: {str(e)}")
                continue
        
        # Queue videos for indexing
        for video, priority, reason in videos_to_index:
            self.queue_video_for_indexing(video.video_id, priority=priority)
            logger.info(f"Queued {video.video_id} for indexing: {reason}")
    
    def queue_video_for_indexing(self, video_id: str, priority: int = 1) -> bool:
        """
        Queue a video for indexing.
        
        Args:
            video_id: Video ID to queue
            priority: Priority level (higher = more urgent)
            
        Returns:
            True if successfully queued
        """
        try:
            # Check if already queued or processing
            if video_id in self.processing_videos:
                logger.debug(f"Video {video_id} already being processed")
                return False
            
            # Check if already in queue
            if self._is_video_in_queue(video_id):
                logger.debug(f"Video {video_id} already in queue")
                return False
            
            # Create queue item
            queue_item = IndexingQueueItem(
                video_id=video_id,
                priority=priority,
                queued_at=datetime.utcnow()
            )
            
            # Add to queue
            self.indexing_queue.put(queue_item, block=False)
            self.stats.queued_videos += 1
            
            logger.info(f"Queued video {video_id} for indexing (priority: {priority})")
            self._notify_status_change(video_id, IndexStatus.QUEUED)
            
            # Start processing if not already running
            if not self.is_processing:
                self.start_background_processing()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to queue video {video_id}: {str(e)}")
            return False
    
    def _is_video_in_queue(self, video_id: str) -> bool:
        """Check if video is already in the indexing queue."""
        # This is a simplified check - in production you'd want a more efficient method
        temp_items = []
        found = False
        
        try:
            while True:
                try:
                    item = self.indexing_queue.get_nowait()
                    temp_items.append(item)
                    if item.video_id == video_id:
                        found = True
                except Empty:
                    break
            
            # Put items back in queue
            for item in temp_items:
                self.indexing_queue.put(item)
                
        except Exception as e:
            logger.error(f"Error checking queue for video {video_id}: {str(e)}")
        
        return found
    
    def start_background_processing(self) -> None:
        """Start background processing of indexing queue."""
        if self.is_processing:
            logger.debug("Background processing already running")
            return
        
        self.is_processing = True
        self.stop_processing.clear()
        
        # Start processing thread
        processing_thread = threading.Thread(
            target=self._process_indexing_queue,
            name="IndexingProcessor",
            daemon=True
        )
        processing_thread.start()
        
        logger.info("Started background indexing processing")
    
    def stop_background_processing(self) -> None:
        """Stop background processing."""
        if not self.is_processing:
            return
        
        logger.info("Stopping background indexing processing")
        self.stop_processing.set()
        self.is_processing = False
        
        # Cancel pending futures
        for video_id, future in self.processing_futures.items():
            if not future.done():
                future.cancel()
                logger.debug(f"Cancelled processing for {video_id}")
        
        self.processing_futures.clear()
    
    def _process_indexing_queue(self) -> None:
        """Main processing loop for indexing queue."""
        logger.info("Indexing queue processor started")
        
        while not self.stop_processing.is_set():
            try:
                # Get next item from queue (with timeout)
                try:
                    queue_item = self.indexing_queue.get(timeout=1.0)
                except Empty:
                    continue
                
                # Check if we should stop
                if self.stop_processing.is_set():
                    # Put item back in queue
                    self.indexing_queue.put(queue_item)
                    break
                
                # Process the video
                self._process_video_async(queue_item)
                
            except Exception as e:
                logger.error(f"Error in indexing queue processor: {str(e)}")
                time.sleep(1)  # Brief pause before continuing
        
        logger.info("Indexing queue processor stopped")
    
    def _process_video_async(self, queue_item: IndexingQueueItem) -> None:
        """
        Process a video asynchronously.
        
        Args:
            queue_item: Queue item to process
        """
        video_id = queue_item.video_id
        
        # Mark as processing
        self.processing_videos.add(video_id)
        self.processing_start_times[video_id] = datetime.utcnow()
        self._notify_status_change(video_id, IndexStatus.INDEXING)
        
        # Check for queue alerts
        self._check_queue_alerts()
        
        # Submit to thread pool
        future = self.executor.submit(self._process_video, queue_item)
        self.processing_futures[video_id] = future
        
        # Add completion callback
        future.add_done_callback(lambda f: self._on_video_processed(video_id, f))
    
    def _process_video(self, queue_item: IndexingQueueItem) -> VideoIndexEntry:
        """
        Process a single video for indexing.
        
        Args:
            queue_item: Queue item containing video information
            
        Returns:
            Processed VideoIndexEntry
            
        Raises:
            Exception: If processing fails
        """
        video_id = queue_item.video_id
        start_time = time.time()
        
        try:
            logger.info(f"Processing video for indexing: {video_id}")
            
            # Get video metadata from registry
            registry = self.ic_client.get_video_registry(use_cache=True)
            video_metadata = None
            
            for video in registry:
                if video.video_id == video_id:
                    video_metadata = video
                    break
            
            if not video_metadata:
                raise ValueError(f"Video {video_id} not found in registry")
            
            # Get video manifest
            try:
                manifest = self.ic_client.get_video_manifest(video_id)
                manifest_data = {
                    "video_id": manifest.video_id,
                    "scenes": manifest.scenes,
                    "captions.vtt": manifest.captions_vtt,
                    "audio-transcript.txt": manifest.audio_transcript,
                    "tts-transcript.txt": manifest.tts_transcript,
                    "metadata": manifest.metadata or {}
                }
            except Exception as e:
                logger.warning(f"Failed to get manifest for {video_id}: {str(e)}")
                manifest_data = {"video_id": video_id, "scenes": []}
            
            # Create index entry
            index_entry = create_video_index_entry_from_metadata(video_metadata, manifest_data)
            
            # Process searchable content with spaCy
            self._process_searchable_content(index_entry)
            
            # Mark as successfully indexed
            manifest_validator = validate_manifest_json(manifest_data)
            index_entry.mark_indexed(manifest_validator.calculate_hash())
            
            # Store in index
            self.index_store.store_video_index(index_entry)
            
            processing_time = time.time() - start_time
            logger.info(f"Successfully indexed video {video_id} ({processing_time:.2f}s)")
            
            # Update statistics
            self.stats.indexed_videos += 1
            self.stats.processing_time += processing_time
            
            return index_entry
            
        except Exception as e:
            processing_time = time.time() - start_time
            error_msg = f"Failed to process video {video_id}: {str(e)}"
            logger.error(error_msg)
            
            # Create error entry
            try:
                registry = self.ic_client.get_video_registry(use_cache=True)
                video_metadata = next((v for v in registry if v.video_id == video_id), None)
                
                if video_metadata:
                    index_entry = create_video_index_entry_from_metadata(video_metadata)
                    index_entry.mark_error(error_msg)
                    index_entry.retry_count = queue_item.retry_count + 1
                    
                    self.index_store.store_video_index(index_entry)
                
            except Exception as store_error:
                logger.error(f"Failed to store error entry for {video_id}: {str(store_error)}")
            
            # Update statistics
            self.stats.failed_videos += 1
            self.stats.processing_time += processing_time
            self.stats.errors.append(error_msg)
            self.failed_videos[video_id] = error_msg
            
            raise    
    d
ef _process_searchable_content(self, index_entry: VideoIndexEntry) -> None:
        """
        Process searchable content with spaCy for enhanced indexing.
        
        Args:
            index_entry: Index entry to process content for
        """
        try:
            for content in index_entry.searchable_content:
                if not content.text:
                    continue
                
                # Clean and preprocess text
                cleaned_text = self.text_preprocessor.clean_text(content.text)
                if not cleaned_text:
                    continue
                
                # Process with spaCy for additional metadata
                try:
                    processed_doc = self.spacy_processor.process_document(cleaned_text)
                    
                    # Update content with processed information
                    content.text = processed_doc.text
                    content.word_count = len(processed_doc.tokens)
                    
                    # Add linguistic metadata
                    content.metadata.update({
                        "entities": processed_doc.entities,
                        "sentence_count": len(processed_doc.sentences),
                        "has_vector": processed_doc.vector is not None,
                        "processed_at": datetime.utcnow().isoformat()
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to process content with spaCy for {index_entry.video_id}: {str(e)}")
                    # Continue with basic preprocessing
                    content.text = cleaned_text
                    content.word_count = len(cleaned_text.split())
                    
        except Exception as e:
            logger.error(f"Error processing searchable content for {index_entry.video_id}: {str(e)}")
    
    def _on_video_processed(self, video_id: str, future: Future) -> None:
        """
        Callback for when video processing completes.
        
        Args:
            video_id: Video ID that was processed
            future: Future object with processing result
        """
        # Remove from processing set
        self.processing_videos.discard(video_id)
        
        # Remove from futures dict
        self.processing_futures.pop(video_id, None)
        
        # Calculate processing time
        start_time = self.processing_start_times.pop(video_id, None)
        if start_time:
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            self._update_performance_metrics(video_id, processing_time, future.exception() is None)
        
        # Update queue statistics
        if self.stats.queued_videos > 0:
            self.stats.queued_videos -= 1
        
        try:
            # Get result (this will raise exception if processing failed)
            index_entry = future.result()
            
            logger.debug(f"Video {video_id} processing completed successfully")
            self._notify_status_change(video_id, IndexStatus.INDEXED)
            
        except Exception as e:
            logger.error(f"Video {video_id} processing failed: {str(e)}")
            self._notify_status_change(video_id, IndexStatus.ERROR, str(e))
    
    def force_reindex_video(self, video_id: str) -> bool:
        """
        Force reindexing of a specific video.
        
        Args:
            video_id: Video ID to reindex
            
        Returns:
            True if successfully queued for reindexing
        """
        try:
            # Remove from failed videos if present
            self.failed_videos.pop(video_id, None)
            
            # Remove existing index entry
            self.index_store.delete_video_index(video_id)
            
            # Queue for high-priority indexing
            return self.queue_video_for_indexing(video_id, priority=10)
            
        except Exception as e:
            logger.error(f"Failed to force reindex video {video_id}: {str(e)}")
            return False
    
    def get_indexing_status(self) -> Dict[str, any]:
        """
        Get current indexing status and statistics.
        
        Returns:
            Dictionary with indexing status information
        """
        return {
            "is_processing": self.is_processing,
            "queue_size": self.indexing_queue.qsize(),
            "processing_count": len(self.processing_videos),
            "failed_count": len(self.failed_videos),
            "statistics": {
                "total_videos": self.stats.total_videos,
                "indexed_videos": self.stats.indexed_videos,
                "queued_videos": self.stats.queued_videos,
                "failed_videos": self.stats.failed_videos,
                "average_processing_time": (
                    self.stats.processing_time / max(1, self.stats.indexed_videos + self.stats.failed_videos)
                ),
                "last_sync_time": self.stats.last_sync_time.isoformat() if self.stats.last_sync_time else None,
                "error_count": len(self.stats.errors)
            },
            "currently_processing": list(self.processing_videos),
            "recent_errors": self.stats.errors[-10:],  # Last 10 errors
            "failed_videos": dict(list(self.failed_videos.items())[-10:])  # Last 10 failed videos
        }
    
    def get_queue_status(self) -> List[Dict[str, any]]:
        """
        Get current queue contents.
        
        Returns:
            List of queue items with their status
        """
        queue_items = []
        temp_items = []
        
        try:
            # Extract all items from queue
            while True:
                try:
                    item = self.indexing_queue.get_nowait()
                    temp_items.append(item)
                    queue_items.append(item.to_dict())
                except Empty:
                    break
            
            # Put items back in queue
            for item in temp_items:
                self.indexing_queue.put(item)
                
        except Exception as e:
            logger.error(f"Error getting queue status: {str(e)}")
        
        return queue_items
    
    def clear_failed_videos(self) -> int:
        """
        Clear the failed videos list.
        
        Returns:
            Number of failed videos cleared
        """
        count = len(self.failed_videos)
        self.failed_videos.clear()
        logger.info(f"Cleared {count} failed videos")
        return count
    
    def get_video_index_status(self, video_id: str) -> Dict[str, any]:
        """
        Get indexing status for a specific video.
        
        Args:
            video_id: Video ID to check
            
        Returns:
            Dictionary with video indexing status
        """
        try:
            # Check if currently processing
            if video_id in self.processing_videos:
                return {
                    "video_id": video_id,
                    "status": "processing",
                    "in_queue": False,
                    "indexed": False,
                    "error": None
                }
            
            # Check if in queue
            in_queue = self._is_video_in_queue(video_id)
            if in_queue:
                return {
                    "video_id": video_id,
                    "status": "queued",
                    "in_queue": True,
                    "indexed": False,
                    "error": None
                }
            
            # Check if indexed
            index_entry = self.index_store.get_video_index(video_id)
            if index_entry:
                return {
                    "video_id": video_id,
                    "status": index_entry.status.value,
                    "in_queue": False,
                    "indexed": index_entry.status == IndexStatus.INDEXED,
                    "indexed_at": index_entry.indexed_at.isoformat() if index_entry.indexed_at else None,
                    "error": index_entry.error_message,
                    "retry_count": index_entry.retry_count,
                    "content_types": [c.content_type.value for c in index_entry.searchable_content]
                }
            
            # Not found anywhere
            return {
                "video_id": video_id,
                "status": "not_found",
                "in_queue": False,
                "indexed": False,
                "error": None
            }
            
        except Exception as e:
            logger.error(f"Error getting video index status for {video_id}: {str(e)}")
            return {
                "video_id": video_id,
                "status": "error",
                "error": str(e)
            }
    
    def cleanup_old_entries(self, days: int = 30) -> int:
        """
        Clean up old index entries that haven't been updated recently.
        
        Args:
            days: Number of days to keep entries
            
        Returns:
            Number of entries cleaned up
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            return self.index_store.cleanup_old_entries(cutoff_date)
            
        except Exception as e:
            logger.error(f"Error cleaning up old entries: {str(e)}")
            return 0
    
    def get_indexing_metrics(self) -> Dict[str, any]:
        """
        Get detailed indexing metrics for monitoring.
        
        Returns:
            Dictionary with detailed metrics
        """
        try:
            total_indexed = self.index_store.get_total_indexed_count()
            
            return {
                "queue_metrics": {
                    "current_size": self.indexing_queue.qsize(),
                    "max_size": Config.MAX_QUEUE_SIZE,
                    "utilization": self.indexing_queue.qsize() / Config.MAX_QUEUE_SIZE
                },
                "processing_metrics": {
                    "active_workers": len(self.processing_videos),
                    "max_workers": Config.MAX_CONCURRENT_REQUESTS,
                    "utilization": len(self.processing_videos) / Config.MAX_CONCURRENT_REQUESTS
                },
                "index_metrics": {
                    "total_indexed": total_indexed,
                    "success_rate": (
                        self.stats.indexed_videos / max(1, self.stats.indexed_videos + self.stats.failed_videos)
                    ),
                    "average_processing_time": (
                        self.stats.processing_time / max(1, self.stats.indexed_videos + self.stats.failed_videos)
                    )
                },
                "error_metrics": {
                    "total_errors": len(self.stats.errors),
                    "failed_videos": len(self.failed_videos),
                    "error_rate": self.stats.failed_videos / max(1, self.stats.total_videos)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting indexing metrics: {str(e)}")
            return {}
    
    def shutdown(self) -> None:
        """Shutdown the index manager and clean up resources."""
        logger.info("Shutting down IndexManager")
        
        # Stop background processing
        self.stop_background_processing()
        
        # Shutdown executor
        self.executor.shutdown(wait=True)
        
        # Clear callbacks
        self.status_callbacks.clear()
        
        logger.info("IndexManager shutdown complete")
    
    def _check_queue_alerts(self) -> None:
        """Check for queue-related alerts."""
        try:
            queue_size = self.indexing_queue.qsize()
            max_size = Config.MAX_QUEUE_SIZE
            
            # Queue size alerts
            if queue_size > max_size * 0.9:
                self._send_alert(
                    'queue_nearly_full',
                    f'Indexing queue is {queue_size}/{max_size} ({queue_size/max_size*100:.1f}% full)',
                    {'queue_size': queue_size, 'max_size': max_size}
                )
            
            # Processing time alerts
            current_time = datetime.utcnow()
            for video_id, start_time in self.processing_start_times.items():
                processing_time = (current_time - start_time).total_seconds()
                if processing_time > 300:  # 5 minutes
                    self._send_alert(
                        'long_processing_time',
                        f'Video {video_id} has been processing for {processing_time:.1f} seconds',
                        {'video_id': video_id, 'processing_time': processing_time}
                    )
            
            # Error rate alerts
            if len(self.performance_metrics['error_rates']) >= 10:
                recent_error_rate = sum(self.performance_metrics['error_rates'][-10:]) / 10
                if recent_error_rate > 0.5:  # 50% error rate
                    self._send_alert(
                        'high_error_rate',
                        f'High error rate detected: {recent_error_rate*100:.1f}%',
                        {'error_rate': recent_error_rate}
                    )
                    
        except Exception as e:
            logger.error(f"Error checking queue alerts: {str(e)}")
    
    def _update_performance_metrics(self, video_id: str, processing_time: float, success: bool) -> None:
        """Update performance metrics."""
        try:
            self.performance_metrics['total_processed'] += 1
            
            if not success:
                self.performance_metrics['total_failed'] += 1
            
            # Update average processing time
            current_avg = self.performance_metrics['average_processing_time']
            total_processed = self.performance_metrics['total_processed']
            
            if total_processed == 1:
                self.performance_metrics['average_processing_time'] = processing_time
            else:
                # Running average
                self.performance_metrics['average_processing_time'] = (
                    (current_avg * (total_processed - 1) + processing_time) / total_processed
                )
            
            # Track error rates (sliding window of last 100 operations)
            error_rate = 1.0 if not success else 0.0
            self.performance_metrics['error_rates'].append(error_rate)
            if len(self.performance_metrics['error_rates']) > 100:
                self.performance_metrics['error_rates'].pop(0)
            
            logger.debug(f"Updated metrics for {video_id}: time={processing_time:.2f}s, success={success}")
            
        except Exception as e:
            logger.error(f"Error updating performance metrics: {str(e)}")
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get detailed performance metrics."""
        try:
            current_error_rate = 0.0
            if self.performance_metrics['error_rates']:
                current_error_rate = sum(self.performance_metrics['error_rates']) / len(self.performance_metrics['error_rates'])
            
            return {
                'total_processed': self.performance_metrics['total_processed'],
                'total_failed': self.performance_metrics['total_failed'],
                'success_rate': (
                    (self.performance_metrics['total_processed'] - self.performance_metrics['total_failed']) /
                    max(1, self.performance_metrics['total_processed'])
                ),
                'current_error_rate': current_error_rate,
                'average_processing_time': self.performance_metrics['average_processing_time'],
                'currently_processing_count': len(self.processing_videos),
                'longest_processing_time': self._get_longest_processing_time(),
                'queue_utilization': self.indexing_queue.qsize() / Config.MAX_QUEUE_SIZE
            }
            
        except Exception as e:
            logger.error(f"Error getting performance metrics: {str(e)}")
            return {}
    
    def _get_longest_processing_time(self) -> float:
        """Get the longest current processing time."""
        try:
            if not self.processing_start_times:
                return 0.0
            
            current_time = datetime.utcnow()
            longest_time = 0.0
            
            for start_time in self.processing_start_times.values():
                processing_time = (current_time - start_time).total_seconds()
                longest_time = max(longest_time, processing_time)
            
            return longest_time
            
        except Exception as e:
            logger.error(f"Error getting longest processing time: {str(e)}")
            return 0.0
    
    def get_queue_health_status(self) -> Dict[str, Any]:
        """Get queue health status for monitoring."""
        try:
            queue_size = self.indexing_queue.qsize()
            max_size = Config.MAX_QUEUE_SIZE
            
            # Determine health status
            if queue_size == 0:
                health_status = "idle"
            elif queue_size < max_size * 0.5:
                health_status = "healthy"
            elif queue_size < max_size * 0.8:
                health_status = "busy"
            elif queue_size < max_size * 0.95:
                health_status = "stressed"
            else:
                health_status = "critical"
            
            return {
                'status': health_status,
                'queue_size': queue_size,
                'max_size': max_size,
                'utilization': queue_size / max_size,
                'is_processing': self.is_processing,
                'active_workers': len(self.processing_videos),
                'max_workers': Config.MAX_CONCURRENT_REQUESTS,
                'worker_utilization': len(self.processing_videos) / Config.MAX_CONCURRENT_REQUESTS,
                'performance_metrics': self.get_performance_metrics()
            }
            
        except Exception as e:
            logger.error(f"Error getting queue health status: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.shutdown()


# Utility functions for index management
def create_index_manager(ic_client: ICClient = None, index_store = None) -> IndexManager:
    """Create IndexManager with default configuration."""
    if ic_client is None:
        from src.utils.ic_client import create_ic_client
        ic_client = create_ic_client()
    
    if index_store is None:
        from src.storage.memory_store import MemoryStore
        index_store = MemoryStore()
    
    return IndexManager(ic_client, index_store)