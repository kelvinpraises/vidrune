"""
Unit tests for TextPreprocessor class.
Tests text cleaning, sentence segmentation, and chunking functionality.
"""

import pytest
import sys
import os

# Add the server directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.processing.text_preprocessor import (
    TextPreprocessor, TextChunk, CleaningStats,
    quick_clean, extract_sentences, chunk_large_text
)


class TestTextPreprocessor:
    """Test suite for TextPreprocessor class."""
    
    @pytest.fixture
    def preprocessor(self):
        """Create TextPreprocessor instance."""
        return TextPreprocessor()
    
    def test_init(self, preprocessor):
        """Test TextPreprocessor initialization."""
        assert preprocessor.max_text_length > 0
        assert len(preprocessor.abbreviations) > 0
        assert preprocessor.sentence_boundaries is not None
    
    def test_clean_text_basic(self, preprocessor):
        """Test basic text cleaning."""
        text = "  This is   a test\n\nwith   extra   spaces.  "
        result = preprocessor.clean_text(text)
        
        assert result == "This is a test with extra spaces."
    
    def test_clean_text_html(self, preprocessor):
        """Test HTML removal."""
        text = "<p>This is <strong>bold</strong> text with <a href='#'>links</a>.</p>"
        result = preprocessor.clean_text(text)
        
        assert "<p>" not in result
        assert "<strong>" not in result
        assert "<a href" not in result
        assert "This is bold text with links." in result
    
    def test_clean_text_html_entities(self, preprocessor):
        """Test HTML entity decoding."""
        text = "This &amp; that &lt;test&gt; &quot;quotes&quot; &#39;apostrophe&#39;"
        result = preprocessor.clean_text(text)
        
        assert "&amp;" not in result
        assert "&lt;" not in result
        assert "&quot;" not in result
        assert "This & that <test> \"quotes\" 'apostrophe'" in result
    
    def test_clean_text_unicode(self, preprocessor):
        """Test Unicode normalization."""
        text = "Text with "smart quotes" and 'apostrophes' and — dashes."
        result = preprocessor.clean_text(text)
        
        assert '"smart quotes"' in result
        assert "'apostrophes'" in result
        assert "- dashes" in result
    
    def test_clean_text_preserve_structure(self, preprocessor):
        """Test text cleaning with structure preservation."""
        text = "Paragraph 1.\n\nParagraph 2.\n\nParagraph 3."
        result = preprocessor.clean_text(text, preserve_structure=True)
        
        assert "\n\n" in result
        assert result.count("\n\n") >= 1
    
    def test_clean_text_empty_input(self, preprocessor):
        """Test cleaning empty or invalid input."""
        assert preprocessor.clean_text("") == ""
        assert preprocessor.clean_text("   ") == ""
        assert preprocessor.clean_text(None) == ""
        assert preprocessor.clean_text(123) == ""
    
    def test_clean_text_length_limit(self, preprocessor):
        """Test text length limiting."""
        long_text = "A" * (preprocessor.max_text_length + 100)
        result = preprocessor.clean_text(long_text)
        
        assert len(result) <= preprocessor.max_text_length
    
    def test_remove_html_markup(self, preprocessor):
        """Test HTML markup removal."""
        html_text = "<div class='content'><p>Hello <em>world</em>!</p></div>"
        result = preprocessor.remove_html_markup(html_text)
        
        assert result == "Hello world!"
        assert "<div" not in result
        assert "<p>" not in result
    
    def test_normalize_unicode(self, preprocessor):
        """Test Unicode normalization."""
        unicode_text = "Café naïve résumé"
        result = preprocessor.normalize_unicode(unicode_text)
        
        # Should normalize but preserve accented characters
        assert "Café" in result or "Cafe" in result
        assert len(result) > 0
    
    def test_segment_sentences_basic(self, preprocessor):
        """Test basic sentence segmentation."""
        text = "This is sentence one. This is sentence two! Is this sentence three?"
        sentences = preprocessor.segment_sentences(text)
        
        assert len(sentences) == 3
        assert "This is sentence one" in sentences[0]
        assert "This is sentence two" in sentences[1]
        assert "Is this sentence three" in sentences[2]
    
    def test_segment_sentences_abbreviations(self, preprocessor):
        """Test sentence segmentation with abbreviations."""
        text = "Dr. Smith went to the U.S.A. He met Mr. Jones there."
        sentences = preprocessor.segment_sentences(text)
        
        # Should not break on abbreviations
        assert len(sentences) >= 1
        assert "Dr. Smith" in sentences[0]
    
    def test_segment_sentences_empty(self, preprocessor):
        """Test sentence segmentation with empty input."""
        assert preprocessor.segment_sentences("") == []
        assert preprocessor.segment_sentences(None) == []
    
    def test_chunk_text_basic(self, preprocessor):
        """Test basic text chunking."""
        text = "A" * 2000  # Text longer than default chunk size
        chunks = preprocessor.chunk_text(text, chunk_size=500, overlap=50)
        
        assert len(chunks) > 1
        assert all(isinstance(chunk, TextChunk) for chunk in chunks)
        assert all(len(chunk.text) <= 500 for chunk in chunks)
        assert chunks[0].chunk_id == 0
        assert chunks[1].chunk_id == 1
    
    def test_chunk_text_preserve_sentences(self, preprocessor):
        """Test text chunking with sentence preservation."""
        sentences = ["This is sentence one. " * 10, "This is sentence two. " * 10, "This is sentence three. " * 10]
        text = " ".join(sentences)
        
        chunks = preprocessor.chunk_text(text, chunk_size=200, preserve_sentences=True)
        
        assert len(chunks) > 1
        # Each chunk should contain complete sentences
        for chunk in chunks:
            assert chunk.text.strip().endswith('.') or chunk == chunks[-1]  # Last chunk might not end with period
    
    def test_chunk_text_small_text(self, preprocessor):
        """Test chunking text smaller than chunk size."""
        text = "Short text."
        chunks = preprocessor.chunk_text(text, chunk_size=1000)
        
        assert len(chunks) == 1
        assert chunks[0].text == text
        assert chunks[0].start_index == 0
        assert chunks[0].end_index == len(text)
    
    def test_extract_text_from_vtt(self, preprocessor):
        """Test VTT caption text extraction."""
        vtt_content = """WEBVTT

1
00:00:01.000 --> 00:00:03.000
This is the first caption.

2
00:00:04.000 --> 00:00:06.000
This is the second caption.
"""
        
        result = preprocessor.extract_text_from_vtt(vtt_content)
        
        assert "This is the first caption" in result
        assert "This is the second caption" in result
        assert "WEBVTT" not in result
        assert "-->" not in result
    
    def test_extract_text_from_srt(self, preprocessor):
        """Test SRT subtitle text extraction."""
        srt_content = """1
00:00:01,000 --> 00:00:03,000
This is the first subtitle.

2
00:00:04,000 --> 00:00:06,000
This is the second subtitle.
"""
        
        result = preprocessor.extract_text_from_srt(srt_content)
        
        assert "This is the first subtitle" in result
        assert "This is the second subtitle" in result
        assert "00:00:01" not in result
        assert "-->" not in result
    
    def test_extract_text_from_json_transcript(self, preprocessor):
        """Test JSON transcript text extraction."""
        json_content = '''[
            {"text": "First transcript entry"},
            {"text": "Second transcript entry"}
        ]'''
        
        result = preprocessor.extract_text_from_json_transcript(json_content)
        
        assert "First transcript entry" in result
        assert "Second transcript entry" in result
    
    def test_extract_text_from_transcript_auto_detect(self, preprocessor):
        """Test automatic transcript format detection."""
        vtt_content = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nTest caption."
        result = preprocessor.extract_text_from_transcript(vtt_content, format_type='auto')
        
        assert "Test caption" in result
        assert "WEBVTT" not in result
    
    def test_get_cleaning_statistics(self, preprocessor):
        """Test cleaning statistics generation."""
        original = "  <p>This is   a test</p>  "
        cleaned = "This is a test"
        sentences = ["This is a test"]
        chunks = [TextChunk("This is a test", 0, 14, 0)]
        
        stats = preprocessor.get_cleaning_statistics(original, cleaned, sentences, chunks)
        
        assert isinstance(stats, CleaningStats)
        assert stats.original_length == len(original)
        assert stats.cleaned_length == len(cleaned)
        assert stats.characters_removed > 0
        assert stats.sentences_found == 1
        assert stats.chunks_created == 1
    
    def test_batch_clean_texts(self, preprocessor):
        """Test batch text cleaning."""
        texts = [
            "  Text one  ",
            "<p>Text two</p>",
            "Text   three   with   spaces"
        ]
        
        results = preprocessor.batch_clean_texts(texts)
        
        assert len(results) == 3
        assert results[0] == "Text one"
        assert "Text two" in results[1]
        assert "<p>" not in results[1]
        assert results[2] == "Text three with spaces"
    
    def test_validate_text_quality_good(self, preprocessor):
        """Test text quality validation for good text."""
        good_text = "This is a well-formed sentence with proper punctuation. It has multiple sentences and good structure."
        
        result = preprocessor.validate_text_quality(good_text)
        
        assert result['valid'] is True
        assert result['quality_score'] > 0.7
        assert len(result['issues']) == 0
        assert 'metrics' in result
    
    def test_validate_text_quality_poor(self, preprocessor):
        """Test text quality validation for poor text."""
        poor_text = "a"
        
        result = preprocessor.validate_text_quality(poor_text)
        
        assert result['valid'] is False
        assert result['quality_score'] < 0.5
        assert len(result['issues']) > 0
    
    def test_validate_text_quality_empty(self, preprocessor):
        """Test text quality validation for empty text."""
        result = preprocessor.validate_text_quality("")
        
        assert result['valid'] is False
        assert result['quality_score'] == 0.0
        assert 'Empty text' in result['issues']


class TestTextChunk:
    """Test suite for TextChunk dataclass."""
    
    def test_text_chunk_creation(self):
        """Test TextChunk creation."""
        chunk = TextChunk(
            text="Test chunk",
            start_index=0,
            end_index=10,
            chunk_id=1,
            overlap_start=0,
            overlap_end=2
        )
        
        assert chunk.text == "Test chunk"
        assert chunk.start_index == 0
        assert chunk.end_index == 10
        assert chunk.chunk_id == 1
        assert chunk.overlap_start == 0
        assert chunk.overlap_end == 2


class TestCleaningStats:
    """Test suite for CleaningStats dataclass."""
    
    def test_cleaning_stats_creation(self):
        """Test CleaningStats creation."""
        stats = CleaningStats(
            original_length=100,
            cleaned_length=80,
            characters_removed=20,
            lines_processed=5,
            sentences_found=3,
            chunks_created=2
        )
        
        assert stats.original_length == 100
        assert stats.cleaned_length == 80
        assert stats.characters_removed == 20
        assert stats.lines_processed == 5
        assert stats.sentences_found == 3
        assert stats.chunks_created == 2


class TestUtilityFunctions:
    """Test suite for utility functions."""
    
    def test_quick_clean(self):
        """Test quick_clean utility function."""
        text = "  <p>Test   text</p>  "
        result = quick_clean(text)
        
        assert result == "Test text"
        assert "<p>" not in result
    
    def test_extract_sentences(self):
        """Test extract_sentences utility function."""
        text = "First sentence. Second sentence! Third sentence?"
        sentences = extract_sentences(text)
        
        assert len(sentences) == 3
        assert "First sentence" in sentences[0]
    
    def test_chunk_large_text(self):
        """Test chunk_large_text utility function."""
        text = "A" * 2000
        chunks = chunk_large_text(text, chunk_size=500)
        
        assert len(chunks) > 1
        assert all(isinstance(chunk, str) for chunk in chunks)
        assert all(len(chunk) <= 500 for chunk in chunks)


# Edge case and error handling tests
class TestTextPreprocessorEdgeCases:
    """Test edge cases and error handling."""
    
    @pytest.fixture
    def preprocessor(self):
        return TextPreprocessor()
    
    def test_malformed_html(self, preprocessor):
        """Test handling of malformed HTML."""
        malformed_html = "<p>Unclosed tag <div>nested <span>content"
        result = preprocessor.remove_html_markup(malformed_html)
        
        # Should handle gracefully without crashing
        assert isinstance(result, str)
        assert len(result) > 0
    
    def test_very_long_text(self, preprocessor):
        """Test handling of very long text."""
        very_long_text = "Word " * 100000  # Very long text
        result = preprocessor.clean_text(very_long_text)
        
        # Should handle without crashing and respect length limits
        assert isinstance(result, str)
        assert len(result) <= preprocessor.max_text_length
    
    def test_special_unicode_characters(self, preprocessor):
        """Test handling of special Unicode characters."""
        unicode_text = "Text with emoji 😀 and symbols ∑∆∏"
        result = preprocessor.clean_text(unicode_text)
        
        # Should handle gracefully
        assert isinstance(result, str)
        assert len(result) > 0
    
    def test_mixed_line_endings(self, preprocessor):
        """Test handling of mixed line endings."""
        mixed_text = "Line 1\nLine 2\r\nLine 3\rLine 4"
        result = preprocessor.clean_text(mixed_text, preserve_structure=True)
        
        # Should normalize line endings
        assert isinstance(result, str)
        assert "\r" not in result
    
    def test_empty_sentences(self, preprocessor):
        """Test sentence segmentation with empty sentences."""
        text = "Sentence one. . . Sentence two."
        sentences = preprocessor.segment_sentences(text)
        
        # Should filter out empty sentences
        assert all(len(s.strip()) > 0 for s in sentences)
    
    def test_chunking_edge_cases(self, preprocessor):
        """Test text chunking edge cases."""
        # Test with chunk size larger than text
        small_text = "Small text"
        chunks = preprocessor.chunk_text(small_text, chunk_size=1000)
        assert len(chunks) == 1
        
        # Test with zero chunk size
        chunks = preprocessor.chunk_text("Text", chunk_size=0)
        assert len(chunks) == 0
        
        # Test with negative overlap
        chunks = preprocessor.chunk_text("Text", chunk_size=100, overlap=-10)
        assert len(chunks) >= 0  # Should handle gracefully


if __name__ == "__main__":
    pytest.main([__file__])