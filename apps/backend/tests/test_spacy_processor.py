"""
Unit tests for SpacyProcessor class.
Tests model loading, text processing, and vector operations.
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the server directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.processing.spacy_processor import SpacyProcessor, ProcessedDocument, SimilarityResult
from src.utils.config import Config


class TestSpacyProcessor:
    """Test suite for SpacyProcessor class."""
    
    @pytest.fixture
    def mock_nlp(self):
        """Create a mock spaCy nlp object."""
        mock_nlp = Mock()
        mock_nlp.lang = 'en'
        mock_nlp.vocab.vectors_length = 300
        mock_nlp.vocab.__len__ = Mock(return_value=50000)
        mock_nlp.pipe_names = ['tok2vec', 'tagger', 'parser', 'ner', 'attribute_ruler', 'lemmatizer']
        return mock_nlp
    
    @pytest.fixture
    def mock_doc(self):
        """Create a mock spaCy document."""
        mock_doc = Mock()
        mock_doc.text = "This is a test document."
        mock_doc.has_vector = True
        mock_doc.vector = np.random.rand(300)
        
        # Mock tokens
        mock_tokens = []
        words = ["This", "is", "a", "test", "document", "."]
        lemmas = ["this", "be", "a", "test", "document", "."]
        pos_tags = ["PRON", "AUX", "DET", "NOUN", "NOUN", "PUNCT"]
        
        for i, (word, lemma, pos) in enumerate(zip(words, lemmas, pos_tags)):
            token = Mock()
            token.text = word
            token.lemma_ = lemma
            token.pos_ = pos
            token.is_space = False
            token.is_stop = word.lower() in ["this", "is", "a"]
            token.is_punct = word == "."
            token.has_vector = pos != "PUNCT"
            token.vector = np.random.rand(300) if token.has_vector else None
            mock_tokens.append(token)
        
        mock_doc.__iter__ = lambda: iter(mock_tokens)
        
        # Mock entities
        mock_entity = Mock()
        mock_entity.text = "test document"
        mock_entity.label_ = "PRODUCT"
        mock_entity.start_char = 10
        mock_entity.end_char = 23
        mock_doc.ents = [mock_entity]
        
        # Mock sentences
        mock_sent = Mock()
        mock_sent.text = "This is a test document."
        mock_doc.sents = [mock_sent]
        
        return mock_doc
    
    @pytest.fixture
    def processor(self, mock_nlp):
        """Create SpacyProcessor instance with mocked spaCy model."""
        with patch('spacy.load', return_value=mock_nlp):
            with patch('spacy.explain', return_value="Product or service"):
                processor = SpacyProcessor("en_core_web_md")
                return processor
    
    def test_init_default_model(self):
        """Test SpacyProcessor initialization with default model."""
        with patch('spacy.load') as mock_load:
            mock_nlp = Mock()
            mock_nlp.vocab.vectors_length = 300
            mock_load.return_value = mock_nlp
            
            processor = SpacyProcessor()
            
            mock_load.assert_called_once_with(Config.SPACY_MODEL)
            assert processor.model_name == Config.SPACY_MODEL
            assert processor.is_model_loaded()
    
    def test_init_custom_model(self):
        """Test SpacyProcessor initialization with custom model."""
        custom_model = "en_core_web_lg"
        
        with patch('spacy.load') as mock_load:
            mock_nlp = Mock()
            mock_nlp.vocab.vectors_length = 300
            mock_load.return_value = mock_nlp
            
            processor = SpacyProcessor(custom_model)
            
            mock_load.assert_called_once_with(custom_model)
            assert processor.model_name == custom_model
    
    def test_model_loading_failure(self):
        """Test handling of model loading failure."""
        with patch('spacy.load', side_effect=OSError("Model not found")):
            with pytest.raises(RuntimeError, match="spaCy model .* not found"):
                SpacyProcessor("nonexistent_model")
    
    def test_model_without_vectors(self):
        """Test handling of model without word vectors."""
        with patch('spacy.load') as mock_load:
            mock_nlp = Mock()
            mock_nlp.vocab.vectors_length = 0  # No vectors
            mock_load.return_value = mock_nlp
            
            with pytest.raises(ValueError, match="lacks word vectors"):
                SpacyProcessor("en_core_web_sm")
    
    def test_is_model_loaded(self, processor):
        """Test model loading status check."""
        assert processor.is_model_loaded() is True
        
        # Test with unloaded model
        processor._model_loaded = False
        assert processor.is_model_loaded() is False
    
    def test_get_model_info(self, processor):
        """Test model information retrieval."""
        info = processor.get_model_info()
        
        assert info["loaded"] is True
        assert info["model_name"] == "en_core_web_md"
        assert info["language"] == "en"
        assert info["vocabulary_size"] == 50000
        assert info["vector_dimensions"] == 300
        assert info["has_vectors"] is True
        assert "pipeline_components" in info
    
    def test_get_model_info_not_loaded(self):
        """Test model info when model is not loaded."""
        processor = SpacyProcessor.__new__(SpacyProcessor)
        processor._model_loaded = False
        processor.nlp = None
        
        info = processor.get_model_info()
        assert info["loaded"] is False
        assert "error" in info
    
    def test_preprocess_text_basic(self, processor):
        """Test basic text preprocessing."""
        text = "  This is   a test\n\nwith   extra   spaces.  "
        result = processor.preprocess_text(text)
        
        assert result == "This is a test with extra spaces."
    
    def test_preprocess_text_special_characters(self, processor):
        """Test preprocessing with special characters."""
        text = "Text with "smart quotes" and 'apostrophes' and — dashes."
        result = processor.preprocess_text(text)
        
        assert '"smart quotes"' in result
        assert "'apostrophes'" in result
        assert "- dashes" in result
    
    def test_preprocess_text_empty(self, processor):
        """Test preprocessing empty or invalid text."""
        assert processor.preprocess_text("") == ""
        assert processor.preprocess_text("   ") == ""
        assert processor.preprocess_text(None) == ""
        assert processor.preprocess_text(123) == ""
    
    def test_preprocess_text_length_limit(self, processor):
        """Test text length limiting."""
        long_text = "A" * (Config.MAX_TEXT_LENGTH + 100)
        result = processor.preprocess_text(long_text)
        
        assert len(result) == Config.MAX_TEXT_LENGTH
    
    def test_process_document_success(self, processor, mock_doc):
        """Test successful document processing."""
        with patch.object(processor.nlp, '__call__', return_value=mock_doc):
            result = processor.process_document("This is a test document.")
            
            assert isinstance(result, ProcessedDocument)
            assert result.text == "This is a test document."
            assert len(result.tokens) == 6
            assert len(result.lemmas) == 6
            assert len(result.pos_tags) == 6
            assert len(result.entities) == 1
            assert len(result.sentences) == 1
            assert result.vector is not None
            assert len(result.word_vectors) > 0
    
    def test_process_document_model_not_loaded(self):
        """Test document processing when model is not loaded."""
        processor = SpacyProcessor.__new__(SpacyProcessor)
        processor._model_loaded = False
        
        with pytest.raises(RuntimeError, match="spaCy model not loaded"):
            processor.process_document("Test text")
    
    def test_process_document_invalid_text(self, processor):
        """Test document processing with invalid text."""
        with pytest.raises(ValueError, match="Invalid text input"):
            processor.process_document("")
        
        with pytest.raises(ValueError, match="Invalid text input"):
            processor.process_document(None)
    
    def test_get_word_vector(self, processor):
        """Test word vector extraction."""
        mock_token = Mock()
        mock_token.has_vector = True
        mock_token.vector = np.array([0.1, 0.2, 0.3])
        
        with patch.object(processor.nlp, '__call__', return_value=[mock_token]):
            vector = processor.get_word_vector("test")
            
            assert vector is not None
            np.testing.assert_array_equal(vector, np.array([0.1, 0.2, 0.3]))
    
    def test_get_word_vector_no_vector(self, processor):
        """Test word vector extraction for word without vector."""
        mock_token = Mock()
        mock_token.has_vector = False
        
        with patch.object(processor.nlp, '__call__', return_value=[mock_token]):
            vector = processor.get_word_vector("test")
            
            assert vector is None
    
    def test_get_word_vector_model_not_loaded(self):
        """Test word vector extraction when model is not loaded."""
        processor = SpacyProcessor.__new__(SpacyProcessor)
        processor._model_loaded = False
        
        result = processor.get_word_vector("test")
        assert result is None
    
    def test_calculate_similarity(self, processor):
        """Test similarity calculation between words."""
        mock_token1 = Mock()
        mock_token1.has_vector = True
        mock_token1.similarity = Mock(return_value=0.8)
        
        mock_token2 = Mock()
        mock_token2.has_vector = True
        
        def mock_nlp_call(text):
            if "cat" in text:
                return [mock_token1]
            else:
                return [mock_token2]
        
        with patch.object(processor.nlp, '__call__', side_effect=mock_nlp_call):
            similarity = processor.calculate_similarity("cat", "dog")
            
            assert similarity == 0.8
            mock_token1.similarity.assert_called_once_with(mock_token2)
    
    def test_calculate_similarity_no_vectors(self, processor):
        """Test similarity calculation when words have no vectors."""
        mock_token1 = Mock()
        mock_token1.has_vector = False
        
        mock_token2 = Mock()
        mock_token2.has_vector = True
        
        with patch.object(processor.nlp, '__call__', return_value=[mock_token1]):
            similarity = processor.calculate_similarity("word1", "word2")
            
            assert similarity == 0.0
    
    def test_calculate_similarity_error(self, processor):
        """Test similarity calculation error handling."""
        with patch.object(processor.nlp, '__call__', side_effect=Exception("Test error")):
            similarity = processor.calculate_similarity("word1", "word2")
            
            assert similarity == 0.0
    
    def test_find_similar_words(self, processor):
        """Test finding similar words from a list."""
        target_word = "cat"
        word_list = ["dog", "animal", "car", "feline"]
        
        # Mock tokens with different similarities
        mock_target = Mock()
        mock_target.has_vector = True
        
        mock_tokens = {}
        similarities = {"dog": 0.8, "animal": 0.6, "car": 0.1, "feline": 0.9}
        
        for word, sim in similarities.items():
            token = Mock()
            token.has_vector = True
            token.pos_ = "NOUN"
            token.lemma_ = word
            mock_target.similarity = Mock(return_value=sim)
            mock_tokens[word] = token
        
        def mock_nlp_call(text):
            text = text.lower().strip()
            if text == target_word:
                return [mock_target]
            return [mock_tokens.get(text, Mock(has_vector=False))]
        
        with patch.object(processor.nlp, '__call__', side_effect=mock_nlp_call):
            results = processor.find_similar_words(target_word, word_list, limit=3, threshold=0.5)
            
            assert len(results) <= 3
            assert all(isinstance(r, SimilarityResult) for r in results)
            assert all(r.similarity >= 0.5 for r in results)
            # Results should be sorted by similarity (descending)
            similarities_list = [r.similarity for r in results]
            assert similarities_list == sorted(similarities_list, reverse=True)
    
    def test_find_similar_words_no_target_vector(self, processor):
        """Test finding similar words when target has no vector."""
        mock_token = Mock()
        mock_token.has_vector = False
        
        with patch.object(processor.nlp, '__call__', return_value=[mock_token]):
            results = processor.find_similar_words("target", ["word1", "word2"])
            
            assert results == []
    
    def test_find_similar_words_empty_input(self, processor):
        """Test finding similar words with empty input."""
        assert processor.find_similar_words("", ["word1"]) == []
        assert processor.find_similar_words("target", []) == []
    
    def test_calculate_document_similarity(self, processor):
        """Test document similarity calculation."""
        doc1 = ProcessedDocument(
            text="Text 1", tokens=[], lemmas=[], pos_tags=[], entities=[],
            sentences=[], vector=np.array([1, 0, 0]), word_vectors={}
        )
        doc2 = ProcessedDocument(
            text="Text 2", tokens=[], lemmas=[], pos_tags=[], entities=[],
            sentences=[], vector=np.array([0, 1, 0]), word_vectors={}
        )
        
        similarity = processor.calculate_document_similarity(doc1, doc2)
        
        assert 0.0 <= similarity <= 1.0
        assert similarity == 0.0  # Orthogonal vectors
    
    def test_calculate_document_similarity_no_vectors(self, processor):
        """Test document similarity when documents have no vectors."""
        doc1 = ProcessedDocument(
            text="Text 1", tokens=[], lemmas=[], pos_tags=[], entities=[],
            sentences=[], vector=None, word_vectors={}
        )
        doc2 = ProcessedDocument(
            text="Text 2", tokens=[], lemmas=[], pos_tags=[], entities=[],
            sentences=[], vector=np.array([1, 0, 0]), word_vectors={}
        )
        
        similarity = processor.calculate_document_similarity(doc1, doc2)
        assert similarity == 0.0
    
    def test_extract_keywords(self, processor):
        """Test keyword extraction from processed document."""
        word_vectors = {
            "test": np.array([1, 0, 0]),
            "document": np.array([0, 1, 0]),
            "example": np.array([0, 0, 1])
        }
        
        doc = ProcessedDocument(
            text="This is a test document example test.",
            tokens=["This", "is", "a", "test", "document", "example", "test"],
            lemmas=["this", "be", "a", "test", "document", "example", "test"],
            pos_tags=["PRON", "AUX", "DET", "NOUN", "NOUN", "NOUN", "NOUN"],
            entities=[],
            sentences=["This is a test document example test."],
            vector=np.array([1, 1, 1]),
            word_vectors=word_vectors
        )
        
        keywords = processor.extract_keywords(doc, limit=5)
        
        assert len(keywords) <= 5
        assert all("word" in kw and "frequency" in kw for kw in keywords)
        # "test" should have highest frequency (appears twice)
        if keywords:
            assert keywords[0]["word"] == "test"
            assert keywords[0]["frequency"] == 2
    
    def test_extract_keywords_no_vectors(self, processor):
        """Test keyword extraction when document has no word vectors."""
        doc = ProcessedDocument(
            text="Test", tokens=[], lemmas=[], pos_tags=[], entities=[],
            sentences=[], vector=None, word_vectors={}
        )
        
        keywords = processor.extract_keywords(doc)
        assert keywords == []
    
    def test_batch_process_texts(self, processor, mock_doc):
        """Test batch processing of multiple texts."""
        texts = ["Text 1", "Text 2", "Text 3"]
        
        with patch.object(processor.nlp, 'pipe', return_value=[mock_doc] * 3):
            results = processor.batch_process_texts(texts)
            
            assert len(results) == 3
            assert all(isinstance(doc, ProcessedDocument) for doc in results)
    
    def test_batch_process_texts_empty(self, processor):
        """Test batch processing with empty input."""
        results = processor.batch_process_texts([])
        assert results == []
    
    def test_batch_process_texts_model_not_loaded(self):
        """Test batch processing when model is not loaded."""
        processor = SpacyProcessor.__new__(SpacyProcessor)
        processor._model_loaded = False
        
        with pytest.raises(RuntimeError, match="spaCy model not loaded"):
            processor.batch_process_texts(["text"])
    
    def test_get_cached_word_vector(self, processor):
        """Test cached word vector retrieval."""
        mock_token = Mock()
        mock_token.has_vector = True
        mock_token.vector = np.array([0.1, 0.2, 0.3])
        
        with patch.object(processor.nlp, '__call__', return_value=[mock_token]):
            # First call should cache the result
            vector1 = processor.get_cached_word_vector("test")
            vector2 = processor.get_cached_word_vector("test")
            
            assert vector1 == vector2
            assert vector1 == (0.1, 0.2, 0.3)
    
    def test_get_model_statistics(self, processor):
        """Test model statistics retrieval."""
        # Call cached method to generate cache stats
        processor.get_cached_word_vector("test")
        
        stats = processor.get_model_statistics()
        
        assert "model_info" in stats
        assert "cache_stats" in stats
        assert "configuration" in stats
        assert stats["cache_stats"]["current_size"] >= 0
        assert stats["cache_stats"]["max_size"] == Config.CACHE_SIZE
    
    def test_get_model_statistics_not_loaded(self):
        """Test model statistics when model is not loaded."""
        processor = SpacyProcessor.__new__(SpacyProcessor)
        processor._model_loaded = False
        
        stats = processor.get_model_statistics()
        assert "error" in stats


class TestProcessedDocument:
    """Test suite for ProcessedDocument dataclass."""
    
    def test_processed_document_creation(self):
        """Test ProcessedDocument creation with all fields."""
        doc = ProcessedDocument(
            text="Test text",
            tokens=["Test", "text"],
            lemmas=["test", "text"],
            pos_tags=["NOUN", "NOUN"],
            entities=[{"text": "Test", "label": "ORG"}],
            sentences=["Test text."],
            vector=np.array([1, 2, 3]),
            word_vectors={"test": np.array([1, 0, 0])}
        )
        
        assert doc.text == "Test text"
        assert len(doc.tokens) == 2
        assert len(doc.entities) == 1
        assert doc.vector is not None
        assert "test" in doc.word_vectors


class TestSimilarityResult:
    """Test suite for SimilarityResult dataclass."""
    
    def test_similarity_result_creation(self):
        """Test SimilarityResult creation."""
        result = SimilarityResult(
            word="test",
            similarity=0.85,
            pos="NOUN",
            lemma="test"
        )
        
        assert result.word == "test"
        assert result.similarity == 0.85
        assert result.pos == "NOUN"
        assert result.lemma == "test"


# Integration tests
class TestSpacyProcessorIntegration:
    """Integration tests for SpacyProcessor (require actual spaCy model)."""
    
    @pytest.mark.integration
    def test_real_model_loading(self):
        """Test loading actual spaCy model (requires model installation)."""
        try:
            processor = SpacyProcessor("en_core_web_md")
            assert processor.is_model_loaded()
            
            info = processor.get_model_info()
            assert info["loaded"] is True
            assert info["has_vectors"] is True
            
        except RuntimeError:
            pytest.skip("spaCy model en_core_web_md not available")
    
    @pytest.mark.integration
    def test_real_text_processing(self):
        """Test processing real text with actual model."""
        try:
            processor = SpacyProcessor("en_core_web_md")
            
            text = "Apple Inc. is a technology company based in Cupertino, California."
            doc = processor.process_document(text)
            
            assert doc.text == text
            assert len(doc.tokens) > 0
            assert len(doc.entities) > 0  # Should detect "Apple Inc." as ORG
            assert doc.vector is not None
            
        except RuntimeError:
            pytest.skip("spaCy model en_core_web_md not available")
    
    @pytest.mark.integration
    def test_real_similarity_calculation(self):
        """Test similarity calculation with actual model."""
        try:
            processor = SpacyProcessor("en_core_web_md")
            
            # These words should have high similarity
            similarity = processor.calculate_similarity("cat", "kitten")
            assert similarity > 0.5
            
            # These words should have low similarity
            similarity = processor.calculate_similarity("cat", "computer")
            assert similarity < 0.5
            
        except RuntimeError:
            pytest.skip("spaCy model en_core_web_md not available")


if __name__ == "__main__":
    pytest.main([__file__])