"""
Data models for video content and IC integration.
Defines structures for video metadata, searchable content, and manifest data.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any, Union
from datetime import datetime
from enum import Enum
import json
import logging
from pydantic import BaseModel, validator, Field
from src.utils.config import Config

logger = logging.getLogger(__name__)


class ContentType(Enum):
    """Enumeration of supported content types."""
    CAPTIONS_VTT = "captions.vtt"
    AUDIO_TRANSCRIPT = "audio-transcript.txt"
    TTS_TRANSCRIPT = "tts-transcript.txt"
    SCENE_DESCRIPTION = "scene-description"
    METADATA = "metadata"


class IndexStatus(Enum):
    """Enumeration of indexing status values."""
    NOT_INDEXED = "not_indexed"
    QUEUED = "queued"
    INDEXING = "indexing"
    INDEXED = "indexed"
    ERROR = "error"
    OUTDATED = "outdated"


@dataclass
class SearchableContent:
    """Container for searchable text content extracted from video."""
    content_type: ContentType
    text: str
    source_file: Optional[str] = None
    timestamp: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    word_count: int = 0
    language: str = "en"
    
    def __post_init__(self):
        """Post-initialization processing."""
        if self.word_count == 0 and self.text:
            self.word_count = len(self.text.split())
        
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "content_type": self.content_type.value,
            "text": self.text,
            "source_file": self.source_file,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "metadata": self.metadata,
            "word_count": self.word_count,
            "language": self.language
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SearchableContent':
        """Create instance from dictionary."""
        return cls(
            content_type=ContentType(data["content_type"]),
            text=data["text"],
            source_file=data.get("source_file"),
            timestamp=datetime.fromisoformat(data["timestamp"]) if data.get("timestamp") else None,
            metadata=data.get("metadata", {}),
            word_count=data.get("word_count", 0),
            language=data.get("language", "en")
        )


@dataclass
class VideoIndexEntry:
    """Complete index entry for a video with all searchable content."""
    video_id: str
    title: str
    description: str
    owner: str
    created_at: datetime
    updated_at: datetime
    indexed_at: Optional[datetime] = None
    status: IndexStatus = IndexStatus.NOT_INDEXED
    tags: List[str] = field(default_factory=list)
    searchable_content: List[SearchableContent] = field(default_factory=list)
    manifest_hash: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    priority: int = 0
    
    def __post_init__(self):
        """Post-initialization processing."""
        if self.indexed_at is None and self.status == IndexStatus.INDEXED:
            self.indexed_at = datetime.utcnow()
    
    def add_searchable_content(self, content: SearchableContent) -> None:
        """Add searchable content to the entry."""
        # Remove existing content of the same type
        self.searchable_content = [
            c for c in self.searchable_content 
            if c.content_type != content.content_type
        ]
        self.searchable_content.append(content)
    
    def get_content_by_type(self, content_type: ContentType) -> Optional[SearchableContent]:
        """Get searchable content by type."""
        for content in self.searchable_content:
            if content.content_type == content_type:
                return content
        return None
    
    def get_all_text(self) -> str:
        """Get all searchable text combined."""
        texts = []
        
        # Add title and description
        if self.title:
            texts.append(self.title)
        if self.description:
            texts.append(self.description)
        
        # Add tags
        if self.tags:
            texts.append(" ".join(self.tags))
        
        # Add all searchable content
        for content in self.searchable_content:
            if content.text:
                texts.append(content.text)
        
        return " ".join(texts)
    
    def get_total_word_count(self) -> int:
        """Get total word count across all content."""
        total = 0
        
        # Count title and description words
        if self.title:
            total += len(self.title.split())
        if self.description:
            total += len(self.description.split())
        
        # Count tag words
        if self.tags:
            total += len(" ".join(self.tags).split())
        
        # Count searchable content words
        for content in self.searchable_content:
            total += content.word_count
        
        return total
    
    def is_outdated(self, manifest_hash: str) -> bool:
        """Check if index entry is outdated based on manifest hash."""
        return self.manifest_hash != manifest_hash
    
    def mark_error(self, error_message: str) -> None:
        """Mark entry as having an error."""
        self.status = IndexStatus.ERROR
        self.error_message = error_message
        self.retry_count += 1
    
    def mark_indexed(self, manifest_hash: str) -> None:
        """Mark entry as successfully indexed."""
        self.status = IndexStatus.INDEXED
        self.indexed_at = datetime.utcnow()
        self.manifest_hash = manifest_hash
        self.error_message = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "video_id": self.video_id,
            "title": self.title,
            "description": self.description,
            "owner": self.owner,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "indexed_at": self.indexed_at.isoformat() if self.indexed_at else None,
            "status": self.status.value,
            "tags": self.tags,
            "searchable_content": [content.to_dict() for content in self.searchable_content],
            "manifest_hash": self.manifest_hash,
            "error_message": self.error_message,
            "retry_count": self.retry_count,
            "priority": self.priority
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'VideoIndexEntry':
        """Create instance from dictionary."""
        searchable_content = [
            SearchableContent.from_dict(content_data)
            for content_data in data.get("searchable_content", [])
        ]
        
        return cls(
            video_id=data["video_id"],
            title=data["title"],
            description=data["description"],
            owner=data["owner"],
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            indexed_at=datetime.fromisoformat(data["indexed_at"]) if data.get("indexed_at") else None,
            status=IndexStatus(data.get("status", IndexStatus.NOT_INDEXED.value)),
            tags=data.get("tags", []),
            searchable_content=searchable_content,
            manifest_hash=data.get("manifest_hash"),
            error_message=data.get("error_message"),
            retry_count=data.get("retry_count", 0),
            priority=data.get("priority", 0)
        )


class ManifestValidator(BaseModel):
    """Pydantic model for validating video manifest structure."""
    
    class Config:
        """Pydantic configuration."""
        extra = "allow"  # Allow extra fields
        validate_assignment = True
    
    video_id: str = Field(..., min_length=1, description="Video identifier")
    scenes: List[Dict[str, Any]] = Field(default_factory=list, description="Scene descriptions")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Video metadata")
    
    # Optional content files
    captions_vtt: Optional[str] = Field(None, alias="captions.vtt")
    audio_transcript: Optional[str] = Field(None, alias="audio-transcript.txt")
    tts_transcript: Optional[str] = Field(None, alias="tts-transcript.txt")
    
    @validator('video_id')
    def validate_video_id(cls, v):
        """Validate video ID format."""
        if not v or not isinstance(v, str):
            raise ValueError('Video ID must be a non-empty string')
        return v.strip()
    
    @validator('scenes')
    def validate_scenes(cls, v):
        """Validate scenes structure."""
        if not isinstance(v, list):
            raise ValueError('Scenes must be a list')
        
        for i, scene in enumerate(v):
            if not isinstance(scene, dict):
                raise ValueError(f'Scene {i} must be a dictionary')
            
            # Check for required scene fields
            if 'description' not in scene:
                logger.warning(f'Scene {i} missing description field')
        
        return v
    
    def get_searchable_content(self) -> List[SearchableContent]:
        """Extract searchable content from validated manifest."""
        content_list = []
        
        # Process captions
        if self.captions_vtt:
            content_list.append(SearchableContent(
                content_type=ContentType.CAPTIONS_VTT,
                text=self.captions_vtt,
                source_file="captions.vtt"
            ))
        
        # Process audio transcript
        if self.audio_transcript:
            content_list.append(SearchableContent(
                content_type=ContentType.AUDIO_TRANSCRIPT,
                text=self.audio_transcript,
                source_file="audio-transcript.txt"
            ))
        
        # Process TTS transcript
        if self.tts_transcript:
            content_list.append(SearchableContent(
                content_type=ContentType.TTS_TRANSCRIPT,
                text=self.tts_transcript,
                source_file="tts-transcript.txt"
            ))
        
        # Process scene descriptions
        scene_texts = []
        for i, scene in enumerate(self.scenes):
            if 'description' in scene and scene['description']:
                scene_texts.append(f"Scene {i+1}: {scene['description']}")
        
        if scene_texts:
            content_list.append(SearchableContent(
                content_type=ContentType.SCENE_DESCRIPTION,
                text=" ".join(scene_texts),
                source_file="manifest.json",
                metadata={"scene_count": len(self.scenes)}
            ))
        
        return content_list
    
    def calculate_hash(self) -> str:
        """Calculate hash of manifest content for change detection."""
        import hashlib
        
        # Create a normalized representation for hashing
        hash_data = {
            "video_id": self.video_id,
            "scenes": self.scenes,
            "captions_vtt": self.captions_vtt,
            "audio_transcript": self.audio_transcript,
            "tts_transcript": self.tts_transcript,
            "metadata": self.metadata
        }
        
        # Convert to JSON string with sorted keys for consistent hashing
        json_str = json.dumps(hash_data, sort_keys=True, default=str)
        
        # Calculate SHA-256 hash
        return hashlib.sha256(json_str.encode('utf-8')).hexdigest()


@dataclass
class SearchResult:
    """Container for search result with relevance scoring."""
    video_id: str
    title: str
    description: str
    relevance_score: float
    matched_content: List[SearchableContent]
    snippet: str
    tags: List[str] = field(default_factory=list)
    created_at: Optional[datetime] = None
    owner: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "video_id": self.video_id,
            "title": self.title,
            "description": self.description,
            "relevance_score": self.relevance_score,
            "matched_content": [content.to_dict() for content in self.matched_content],
            "snippet": self.snippet,
            "tags": self.tags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "owner": self.owner
        }


@dataclass
class IndexingQueueItem:
    """Item in the indexing queue."""
    video_id: str
    priority: int
    queued_at: datetime
    retry_count: int = 0
    error_message: Optional[str] = None
    
    def __post_init__(self):
        """Post-initialization processing."""
        if self.queued_at is None:
            self.queued_at = datetime.utcnow()
    
    def __lt__(self, other: 'IndexingQueueItem') -> bool:
        """Compare for priority queue ordering (higher priority first)."""
        if self.priority != other.priority:
            return self.priority > other.priority
        return self.queued_at < other.queued_at
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "video_id": self.video_id,
            "priority": self.priority,
            "queued_at": self.queued_at.isoformat(),
            "retry_count": self.retry_count,
            "error_message": self.error_message
        }


# Utility functions for model operations
def create_video_index_entry_from_metadata(video_metadata, manifest_data: Optional[Dict] = None) -> VideoIndexEntry:
    """
    Create VideoIndexEntry from IC metadata and manifest.
    
    Args:
        video_metadata: VideoMetadata from IC client
        manifest_data: Optional manifest data dictionary
        
    Returns:
        VideoIndexEntry instance
    """
    entry = VideoIndexEntry(
        video_id=video_metadata.video_id,
        title=video_metadata.title,
        description=video_metadata.description,
        owner=video_metadata.owner,
        created_at=video_metadata.created_at,
        updated_at=video_metadata.updated_at,
        tags=video_metadata.tags
    )
    
    # Process manifest if provided
    if manifest_data:
        try:
            validator = ManifestValidator(**manifest_data)
            searchable_content = validator.get_searchable_content()
            
            for content in searchable_content:
                entry.add_searchable_content(content)
            
            entry.manifest_hash = validator.calculate_hash()
            
        except Exception as e:
            logger.error(f"Error processing manifest for {video_metadata.video_id}: {str(e)}")
            entry.mark_error(f"Manifest processing error: {str(e)}")
    
    return entry


def validate_manifest_json(manifest_data: Dict[str, Any]) -> ManifestValidator:
    """
    Validate manifest JSON structure.
    
    Args:
        manifest_data: Raw manifest data dictionary
        
    Returns:
        Validated ManifestValidator instance
        
    Raises:
        ValueError: If validation fails
    """
    try:
        return ManifestValidator(**manifest_data)
    except Exception as e:
        logger.error(f"Manifest validation failed: {str(e)}")
        raise ValueError(f"Invalid manifest structure: {str(e)}") from e


def extract_searchable_text_from_manifest(manifest_data: Dict[str, Any]) -> List[SearchableContent]:
    """
    Extract all searchable text content from manifest.
    
    Args:
        manifest_data: Manifest data dictionary
        
    Returns:
        List of SearchableContent objects
    """
    try:
        validator = validate_manifest_json(manifest_data)
        return validator.get_searchable_content()
    except Exception as e:
        logger.error(f"Error extracting searchable content: {str(e)}")
        return []