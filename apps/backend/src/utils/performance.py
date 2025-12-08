"""
Performance optimization utilities.
Provides caching, memory management, and batch processing optimizations.
"""

import gc
import time
import psutil
import threading
from typing import Any, Dict, List, Optional, Callable, Tuple
from functools import wraps, lru_cache
from collections import OrderedDict
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
from src.utils.config import Config

logger = logging.getLogger(__name__)


@dataclass
class MemoryStats:
    """Memory usage statistics."""
    rss_mb: float
    vms_mb: float
    percent: float
    available_mb: float
    threshold_exceeded: bool


@dataclass
class PerformanceMetrics:
    """Performance metrics container."""
    execution_time: float
    memory_before: float
    memory_after: float
    memory_delta: float
    cache_hits: int
    cache_misses: int


class LRUCache:
    """
    Enhanced LRU cache with memory management and statistics.
    """
    
    def __init__(self, max_size: int = 1000, ttl_seconds: Optional[int] = None):
        """
        Initialize LRU cache.
        
        Args:
            max_size: Maximum number of items to cache
            ttl_seconds: Time-to-live for cache entries (optional)
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache = OrderedDict()
        self._timestamps = {}
        self._lock = threading.RLock()
        
        # Statistics
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache."""
        with self._lock:
            # Check if key exists and is not expired
            if key in self._cache:
                if self._is_expired(key):
                    self._remove(key)
                    self.misses += 1
                    return None
                
                # Move to end (most recently used)
                self._cache.move_to_end(key)
                self.hits += 1
                return self._cache[key]
            
            self.misses += 1
            return None
    
    def put(self, key: str, value: Any) -> None:
        """Put item in cache."""
        with self._lock:
            # Remove if already exists
            if key in self._cache:
                self._remove(key)
            
            # Add new item
            self._cache[key] = value
            self._timestamps[key] = time.time()
            
            # Evict oldest items if over capacity
            while len(self._cache) > self.max_size:
                oldest_key = next(iter(self._cache))
                self._remove(oldest_key)
                self.evictions += 1
    
    def _remove(self, key: str) -> None:
        """Remove item from cache."""
        self._cache.pop(key, None)
        self._timestamps.pop(key, None)
    
    def _is_expired(self, key: str) -> bool:
        """Check if cache entry is expired."""
        if self.ttl_seconds is None:
            return False
        
        timestamp = self._timestamps.get(key, 0)
        return time.time() - timestamp > self.ttl_seconds
    
    def clear(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()
            self._timestamps.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total_requests = self.hits + self.misses
            hit_rate = self.hits / total_requests if total_requests > 0 else 0.0
            
            return {
                'size': len(self._cache),
                'max_size': self.max_size,
                'hits': self.hits,
                'misses': self.misses,
                'hit_rate': hit_rate,
                'evictions': self.evictions,
                'utilization': len(self._cache) / self.max_size
            }


class MemoryManager:
    """
    Memory management utilities for optimization.
    """
    
    def __init__(self, memory_threshold_mb: int = 1024):
        """
        Initialize memory manager.
        
        Args:
            memory_threshold_mb: Memory threshold in MB for alerts
        """
        self.memory_threshold_mb = memory_threshold_mb
        self.last_gc_time = time.time()
        self.gc_interval = 60  # Run GC every 60 seconds
        
    def get_memory_stats(self) -> MemoryStats:
        """Get current memory statistics."""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            system_memory = psutil.virtual_memory()
            
            rss_mb = memory_info.rss / 1024 / 1024
            vms_mb = memory_info.vms / 1024 / 1024
            available_mb = system_memory.available / 1024 / 1024
            
            return MemoryStats(
                rss_mb=rss_mb,
                vms_mb=vms_mb,
                percent=process.memory_percent(),
                available_mb=available_mb,
                threshold_exceeded=rss_mb > self.memory_threshold_mb
            )
            
        except Exception as e:
            logger.error(f"Error getting memory stats: {str(e)}")
            return MemoryStats(0, 0, 0, 0, False)
    
    def should_run_gc(self) -> bool:
        """Check if garbage collection should be run."""
        current_time = time.time()
        memory_stats = self.get_memory_stats()
        
        # Run GC if memory threshold exceeded or interval passed
        return (
            memory_stats.threshold_exceeded or
            current_time - self.last_gc_time > self.gc_interval
        )
    
    def run_gc(self) -> Dict[str, Any]:
        """Run garbage collection and return statistics."""
        try:
            memory_before = self.get_memory_stats()
            
            # Run garbage collection
            collected = gc.collect()
            
            memory_after = self.get_memory_stats()
            self.last_gc_time = time.time()
            
            freed_mb = memory_before.rss_mb - memory_after.rss_mb
            
            logger.info(f"Garbage collection completed: freed {freed_mb:.2f}MB, collected {collected} objects")
            
            return {
                'objects_collected': collected,
                'memory_freed_mb': freed_mb,
                'memory_before_mb': memory_before.rss_mb,
                'memory_after_mb': memory_after.rss_mb,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error running garbage collection: {str(e)}")
            return {'error': str(e)}
    
    def optimize_memory(self) -> Dict[str, Any]:
        """Perform memory optimization."""
        try:
            results = {}
            
            # Run garbage collection if needed
            if self.should_run_gc():
                results['gc'] = self.run_gc()
            
            # Get final memory stats
            results['memory_stats'] = self.get_memory_stats()
            
            return results
            
        except Exception as e:
            logger.error(f"Error optimizing memory: {str(e)}")
            return {'error': str(e)}


class BatchProcessor:
    """
    Batch processing utilities for improved performance.
    """
    
    def __init__(self, batch_size: int = 10, max_wait_time: float = 5.0):
        """
        Initialize batch processor.
        
        Args:
            batch_size: Maximum items per batch
            max_wait_time: Maximum time to wait for batch to fill
        """
        self.batch_size = batch_size
        self.max_wait_time = max_wait_time
        self._batch = []
        self._batch_start_time = None
        self._lock = threading.Lock()
        
    def add_item(self, item: Any) -> Optional[List[Any]]:
        """
        Add item to batch. Returns batch if ready for processing.
        
        Args:
            item: Item to add to batch
            
        Returns:
            Batch list if ready, None otherwise
        """
        with self._lock:
            # Initialize batch if empty
            if not self._batch:
                self._batch_start_time = time.time()
            
            self._batch.append(item)
            
            # Check if batch is ready
            if self._is_batch_ready():
                batch = self._batch.copy()
                self._reset_batch()
                return batch
            
            return None
    
    def get_pending_batch(self) -> Optional[List[Any]]:
        """Get pending batch if wait time exceeded."""
        with self._lock:
            if self._batch and self._is_wait_time_exceeded():
                batch = self._batch.copy()
                self._reset_batch()
                return batch
            return None
    
    def _is_batch_ready(self) -> bool:
        """Check if batch is ready for processing."""
        return len(self._batch) >= self.batch_size
    
    def _is_wait_time_exceeded(self) -> bool:
        """Check if maximum wait time is exceeded."""
        if not self._batch_start_time:
            return False
        return time.time() - self._batch_start_time > self.max_wait_time
    
    def _reset_batch(self) -> None:
        """Reset batch state."""
        self._batch.clear()
        self._batch_start_time = None


def performance_monitor(track_memory: bool = True, track_time: bool = True):
    """
    Decorator for monitoring function performance.
    
    Args:
        track_memory: Whether to track memory usage
        track_time: Whether to track execution time
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Initialize metrics
            start_time = time.time() if track_time else 0
            memory_before = 0
            
            if track_memory:
                try:
                    process = psutil.Process()
                    memory_before = process.memory_info().rss / 1024 / 1024
                except:
                    memory_before = 0
            
            try:
                # Execute function
                result = func(*args, **kwargs)
                
                # Calculate metrics
                execution_time = time.time() - start_time if track_time else 0
                memory_after = 0
                
                if track_memory:
                    try:
                        process = psutil.Process()
                        memory_after = process.memory_info().rss / 1024 / 1024
                    except:
                        memory_after = memory_before
                
                # Log performance metrics
                if track_time or track_memory:
                    logger.debug(
                        f"Performance metrics for {func.__name__}",
                        execution_time=execution_time,
                        memory_before_mb=memory_before,
                        memory_after_mb=memory_after,
                        memory_delta_mb=memory_after - memory_before
                    )
                
                return result
                
            except Exception as e:
                # Log error with performance context
                execution_time = time.time() - start_time if track_time else 0
                logger.error(
                    f"Function {func.__name__} failed after {execution_time:.3f}s",
                    error=str(e)
                )
                raise
        
        return wrapper
    return decorator


def memory_efficient_chunking(data: List[Any], chunk_size: int = 100) -> List[List[Any]]:
    """
    Split data into memory-efficient chunks.
    
    Args:
        data: Data to chunk
        chunk_size: Size of each chunk
        
    Returns:
        List of data chunks
    """
    try:
        chunks = []
        for i in range(0, len(data), chunk_size):
            chunk = data[i:i + chunk_size]
            chunks.append(chunk)
        
        return chunks
        
    except Exception as e:
        logger.error(f"Error chunking data: {str(e)}")
        return [data]  # Return original data as single chunk


class PerformanceOptimizer:
    """
    Main performance optimization coordinator.
    """
    
    def __init__(self):
        """Initialize performance optimizer."""
        self.memory_manager = MemoryManager(memory_threshold_mb=Config.MAX_TEXT_LENGTH // 1024)
        self.caches = {}
        self.batch_processors = {}
        
        # Performance tracking
        self.optimization_runs = 0
        self.last_optimization = None
        
    def get_cache(self, name: str, max_size: int = 1000, ttl_seconds: Optional[int] = None) -> LRUCache:
        """Get or create named cache."""
        if name not in self.caches:
            self.caches[name] = LRUCache(max_size=max_size, ttl_seconds=ttl_seconds)
        return self.caches[name]
    
    def get_batch_processor(self, name: str, batch_size: int = 10, max_wait_time: float = 5.0) -> BatchProcessor:
        """Get or create named batch processor."""
        if name not in self.batch_processors:
            self.batch_processors[name] = BatchProcessor(batch_size=batch_size, max_wait_time=max_wait_time)
        return self.batch_processors[name]
    
    def optimize_system(self) -> Dict[str, Any]:
        """Run system-wide performance optimization."""
        try:
            self.optimization_runs += 1
            start_time = time.time()
            
            results = {
                'optimization_run': self.optimization_runs,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Memory optimization
            memory_results = self.memory_manager.optimize_memory()
            results['memory_optimization'] = memory_results
            
            # Cache statistics
            cache_stats = {}
            for name, cache in self.caches.items():
                cache_stats[name] = cache.get_stats()
            results['cache_statistics'] = cache_stats
            
            # System metrics
            results['system_metrics'] = {
                'optimization_time': time.time() - start_time,
                'active_caches': len(self.caches),
                'active_batch_processors': len(self.batch_processors)
            }
            
            self.last_optimization = datetime.utcnow()
            
            logger.info(f"Performance optimization completed in {results['system_metrics']['optimization_time']:.3f}s")
            
            return results
            
        except Exception as e:
            logger.error(f"Error during performance optimization: {str(e)}")
            return {'error': str(e)}
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary."""
        try:
            return {
                'memory_stats': self.memory_manager.get_memory_stats().__dict__,
                'cache_statistics': {name: cache.get_stats() for name, cache in self.caches.items()},
                'optimization_history': {
                    'total_runs': self.optimization_runs,
                    'last_optimization': self.last_optimization.isoformat() if self.last_optimization else None
                },
                'system_info': {
                    'active_caches': len(self.caches),
                    'active_batch_processors': len(self.batch_processors)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting performance summary: {str(e)}")
            return {'error': str(e)}


# Global performance optimizer instance
performance_optimizer = PerformanceOptimizer()


# Utility functions
def get_memory_usage() -> float:
    """Get current memory usage in MB."""
    try:
        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024
    except:
        return 0.0


def optimize_for_vercel():
    """Apply Vercel-specific optimizations."""
    try:
        # Reduce cache sizes for memory constraints
        Config.CACHE_SIZE = min(Config.CACHE_SIZE, 500)
        
        # More aggressive garbage collection
        gc.set_threshold(700, 10, 10)  # More frequent GC
        
        # Run initial optimization
        return performance_optimizer.optimize_system()
        
    except Exception as e:
        logger.error(f"Error applying Vercel optimizations: {str(e)}")
        return {'error': str(e)}