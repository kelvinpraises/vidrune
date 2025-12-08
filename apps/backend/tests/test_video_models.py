"""
Unit tests for video data models.
Tests data validation, serialization, and model operations.
"""

import pytest
from datetime import datetime
import json
import sys
import os

# Add the server directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.models.video_models import (
    ContentType, IndexStatus, SearchableContent, VideoIndexEntry,
    ManifestValidator, SearchResult, IndexingQueueItem,
    create_video_index_entry_from_metadata, validate_manifest_json,
    extract_searchable_text_from_manifest
)


class TestContentType:
    """Test ContentType enum."""
    
    def test_content_type_values(self):
        """Test ContentType enum values."""
        assert ContentType.CAPTIONS_VTT.value == "captions.vtt"
        assert ContentType.AUDIO_TRANSCRIPT.value == "audio-transcript.txt"
        assert ContentType.TTS_TRANSCRIPT.value == "tts-transcript.txt"
        assert ContentType.SCENE_DESCRIPTION.value == "scene-description"
        assert ContentType.METADATA.value == "metadata"


class TestIndexStatus:
    """Test IndexStatus enum."""
    
    def test_index_status_values(self):
        """Test IndexStatus enum values."""
        assert IndexStatus.NOT_INDEXED.value == "not_indexed"
        assert IndexStatus.QUEUED.value == "queued"
        assert IndexStatus.INDEXING.value == "indexing"
        assert IndexStatus.INDEXED.value == "indexed"
        assert IndexStatus.ERROR.value == "error"
        assert IndexStatus.OUTDATED.value == "outdated"


class TestSearchableContent:
    """Test SearchableContent dataclass."""
    
    def test_searchable_content_creation(self):
        """Test SearchableContent creation."""
        content = SearchableContent(
            content_type=ContentType.CAPTIONS_VTT,
            text="This is test content",
            source_file="test.vtt"
        )
        
        assert content.content_type == ContentType.CAPTIONS_VTT
        assert content.text == "This is test content"
        assert content.source_file == "test.vtt"
        assert content.word_count == 4  # Auto-calculated
        assert content.language == "en"  # Default
        assert content.timestamp is not None  # Auto-set
    
    def test_searchable_content_word_count(self):
        """Test automatic word count calculation."""
        content = SearchableContent(
            content_type=ContentType.AUDIO_TRANSCRIPT,
            text="One two three four five"
        )
        
        assert content.word_count == 5
    
    def test_searchable_content_serialization(self):
        """Test to_dict and from_dict methods."""
        original = SearchableContent(
            content_type=ContentType.TTS_TRANSCRIPT,
            text="Test text",
            source_file="test.txt",
            metadata={"key": "value"}
        )
        
        # Test serialization
        data = original.to_dict()
        assert data["content_type"] == "tts-transcript.txt"
        assert data["text"] == "Test text"
        assert data["source_file"] == "test.txt"
        assert data["metadata"] == {"key": "value"}
        
        # Test deserialization
        restored = SearchableContent.from_dict(data)
        assert restored.content_type == ContentType.TTS_TRANSCRIPT
        assert restored.text == "Test text"
        assert restored.source_file == "test.txt"
        assert restored.metadata == {"key": "value"}


class TestVideoIndexEntry:
    """Test VideoIndexEntry dataclass."""
    
    @pytest.fixture
    def sample_entry(self):
        """Create sample VideoIndexEntry."""
        return VideoIndexEntry(
            video_id="test-video-123",
            title="Test Video",
            description="A test video description",
            owner="test-owner",
            created_at=datetime(2023, 1, 1, 12, 0, 0),
            updated_at=datetime(2023, 1, 2, 12, 0, 0),
            tags=["test", "video", "sample"]
        )
    
    def test_video_index_entry_creation(self, sample_entry):
        """Test VideoIndexEntry creation."""
        assert sample_entry.video_id == "test-video-123"
        assert sample_entry.title == "Test Video"
        assert sample_entry.status == IndexStatus.NOT_INDEXED
        assert len(sample_entry.tags) == 3
        assert len(sample_entry.searchable_content) == 0
    
    def test_add_searchable_content(self, sample_entry):
        """Test adding searchable content."""
        content1 = SearchableContent(
            content_type=ContentType.CAPTIONS_VTT,
            text="Caption text"
        )
        content2 = SearchableContent(
            content_type=ContentType.AUDIO_TRANSCRIPT,
            text="Transcript text"
        )
        
        sample_entry.add_searchable_content(content1)
        sample_entry.add_searchable_content(content2)
        
        assert len(sample_entry.searchable_content) == 2
        
        # Test replacing content of same type
        content1_updated = SearchableContent(
            content_type=ContentType.CAPTIONS_VTT,
            text="Updated caption text"
        )
        sample_entry.add_searchable_content(content1_updated)
        
        assert len(sample_entry.searchable_content) == 2
        captions = sample_entry.get_content_by_type(ContentType.CAPTIONS_VTT)
        assert captions.text == "Updated caption text" 
   
    def test_get_content_by_type(self, sample_entry):
        """Test getting content by type."""
        content = SearchableContent(
            content_type=ContentType.SCENE_DESCRIPTION,
            text="Scene description"
        )
        sample_entry.add_searchable_content(content)
        
        found = sample_entry.get_content_by_type(ContentType.SCENE_DESCRIPTION)
        assert found is not None
        assert found.text == "Scene description"
        
        not_found = sample_entry.get_content_by_type(ContentType.CAPTIONS_VTT)
        assert not_found is None
    
    def test_get_all_text(self, sample_entry):
        """Test getting all text combined."""
        content = SearchableContent(
            content_type=ContentType.AUDIO_TRANSCRIPT,
            text="Transcript content"
        )
        sample_entry.add_searchable_content(content)
        
        all_text = sample_entry.get_all_text()
        
        assert "Test Video" in all_text
        assert "A test video description" in all_text
        assert "test video sample" in all_text
        assert "Transcript content" in all_text
    
    def test_get_total_word_count(self, sample_entry):
        """Test total word count calculation."""
        content = SearchableContent(
            content_type=ContentType.CAPTIONS_VTT,
            text="One two three"  # 3 words
        )
        sample_entry.add_searchable_content(content)
        
        # Title: 2 words, Description: 5 words, Tags: 3 words, Content: 3 words = 13 total
        total = sample_entry.get_total_word_count()
        assert total == 13
    
    def test_is_outdated(self, sample_entry):
        """Test outdated check."""
        sample_entry.manifest_hash = "old-hash"
        
        assert sample_entry.is_outdated("new-hash") is True
        assert sample_entry.is_outdated("old-hash") is False
    
    def test_mark_error(self, sample_entry):
        """Test marking entry as error."""
        sample_entry.mark_error("Test error message")
        
        assert sample_entry.status == IndexStatus.ERROR
        assert sample_entry.error_message == "Test error message"
        assert sample_entry.retry_count == 1
    
    def test_mark_indexed(self, sample_entry):
        """Test marking entry as indexed."""
        sample_entry.mark_indexed("test-hash")
        
        assert sample_entry.status == IndexStatus.INDEXED
        assert sample_entry.manifest_hash == "test-hash"
        assert sample_entry.error_message is None
        assert sample_entry.indexed_at is not None
    
    def test_serialization(self, sample_entry):
        """Test VideoIndexEntry serialization."""
        content = SearchableContent(
            content_type=ContentType.CAPTIONS_VTT,
            text="Test content"
        )
        sample_entry.add_searchable_content(content)
        sample_entry.mark_indexed("test-hash")
        
        # Test to_dict
        data = sample_entry.to_dict()
        assert data["video_id"] == "test-video-123"
        assert data["status"] == "indexed"
        assert len(data["searchable_content"]) == 1
        
        # Test from_dict
        restored = VideoIndexEntry.from_dict(data)
        assert restored.video_id == "test-video-123"
        assert restored.status == IndexStatus.INDEXED
        assert len(restored.searchable_content) == 1


class TestManifestValidator:
    """Test ManifestValidator Pydantic model."""
    
    def test_valid_manifest(self):
        """Test valid manifest validation."""
        manifest_data = {
            "video_id": "test-123",
            "scenes": [
                {"description": "Scene 1 description"},
                {"description": "Scene 2 description"}
            ],
            "captions.vtt": "Caption content",
            "audio-transcript.txt": "Audio transcript content",
            "metadata": {"duration": 120}
        }
        
        validator = ManifestValidator(**manifest_data)
        
        assert validator.video_id == "test-123"
        assert len(validator.scenes) == 2
        assert validator.captions_vtt == "Caption content"
        assert validator.audio_transcript == "Audio transcript content"
    
    def test_invalid_manifest(self):
        """Test invalid manifest validation."""
        with pytest.raises(ValueError):
            ManifestValidator(video_id="", scenes=[])  # Empty video_id
        
        with pytest.raises(ValueError):
            ManifestValidator(video_id="test", scenes="not-a-list")  # Invalid scenes
    
    def test_get_searchable_content(self):
        """Test extracting searchable content from manifest."""
        manifest_data = {
            "video_id": "test-123",
            "scenes": [
                {"description": "First scene"},
                {"description": "Second scene"}
            ],
            "captions.vtt": "Caption text",
            "audio-transcript.txt": "Audio text"
        }
        
        validator = ManifestValidator(**manifest_data)
        content = validator.get_searchable_content()
        
        assert len(content) == 3  # captions, audio, scenes
        
        # Check content types
        content_types = [c.content_type for c in content]
        assert ContentType.CAPTIONS_VTT in content_types
        assert ContentType.AUDIO_TRANSCRIPT in content_types
        assert ContentType.SCENE_DESCRIPTION in content_types
    
    def test_calculate_hash(self):
        """Test manifest hash calculation."""
        manifest_data = {
            "video_id": "test-123",
            "scenes": [{"description": "Scene"}],
            "captions.vtt": "Captions"
        }
        
        validator = ManifestValidator(**manifest_data)
        hash1 = validator.calculate_hash()
        
        # Same data should produce same hash
        validator2 = ManifestValidator(**manifest_data)
        hash2 = validator2.calculate_hash()
        assert hash1 == hash2
        
        # Different data should produce different hash
        manifest_data["captions.vtt"] = "Different captions"
        validator3 = ManifestValidator(**manifest_data)
        hash3 = validator3.calculate_hash()
        assert hash1 != hash3


class TestSearchResult:
    """Test SearchResult dataclass."""
    
    def test_search_result_creation(self):
        """Test SearchResult creation."""
        content = SearchableContent(
            content_type=ContentType.CAPTIONS_VTT,
            text="Matched content"
        )
        
        result = SearchResult(
            video_id="video-123",
            title="Video Title",
            description="Video description",
            relevance_score=0.85,
            matched_content=[content],
            snippet="This is a snippet...",
            tags=["tag1", "tag2"]
        )
        
        assert result.video_id == "video-123"
        assert result.relevance_score == 0.85
        assert len(result.matched_content) == 1
        assert result.snippet == "This is a snippet..."
    
    def test_search_result_serialization(self):
        """Test SearchResult to_dict method."""
        content = SearchableContent(
            content_type=ContentType.AUDIO_TRANSCRIPT,
            text="Audio content"
        )
        
        result = SearchResult(
            video_id="video-456",
            title="Another Video",
            description="Another description",
            relevance_score=0.75,
            matched_content=[content],
            snippet="Another snippet...",
            created_at=datetime(2023, 1, 1, 12, 0, 0)
        )
        
        data = result.to_dict()
        
        assert data["video_id"] == "video-456"
        assert data["relevance_score"] == 0.75
        assert len(data["matched_content"]) == 1
        assert data["created_at"] == "2023-01-01T12:00:00"


class TestIndexingQueueItem:
    """Test IndexingQueueItem dataclass."""
    
    def test_queue_item_creation(self):
        """Test IndexingQueueItem creation."""
        item = IndexingQueueItem(
            video_id="queue-video-123",
            priority=5
        )
        
        assert item.video_id == "queue-video-123"
        assert item.priority == 5
        assert item.retry_count == 0
        assert item.queued_at is not None
    
    def test_queue_item_ordering(self):
        """Test queue item priority ordering."""
        item1 = IndexingQueueItem("video1", priority=1)
        item2 = IndexingQueueItem("video2", priority=5)
        item3 = IndexingQueueItem("video3", priority=3)
        
        # Higher priority should come first
        assert item2 < item1  # priority 5 < priority 1
        assert item3 < item1  # priority 3 < priority 1
        assert item2 < item3  # priority 5 < priority 3
    
    def test_queue_item_serialization(self):
        """Test IndexingQueueItem serialization."""
        item = IndexingQueueItem(
            video_id="serialize-test",
            priority=2,
            retry_count=1,
            error_message="Test error"
        )
        
        data = item.to_dict()
        
        assert data["video_id"] == "serialize-test"
        assert data["priority"] == 2
        assert data["retry_count"] == 1
        assert data["error_message"] == "Test error"
        assert "queued_at" in data


class TestUtilityFunctions:
    """Test utility functions."""
    
    def test_validate_manifest_json(self):
        """Test manifest JSON validation."""
        valid_manifest = {
            "video_id": "test-video",
            "scenes": [{"description": "Test scene"}]
        }
        
        # Should not raise exception
        validator = validate_manifest_json(valid_manifest)
        assert validator.video_id == "test-video"
        
        # Invalid manifest should raise ValueError
        invalid_manifest = {"video_id": ""}
        with pytest.raises(ValueError):
            validate_manifest_json(invalid_manifest)
    
    def test_extract_searchable_text_from_manifest(self):
        """Test extracting searchable text from manifest."""
        manifest = {
            "video_id": "extract-test",
            "scenes": [{"description": "Scene description"}],
            "captions.vtt": "Caption content"
        }
        
        content = extract_searchable_text_from_manifest(manifest)
        
        assert len(content) == 2  # scenes and captions
        content_types = [c.content_type for c in content]
        assert ContentType.SCENE_DESCRIPTION in content_types
        assert ContentType.CAPTIONS_VTT in content_types


if __name__ == "__main__":
    pytest.main([__file__])