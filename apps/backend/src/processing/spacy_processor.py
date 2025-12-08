"""
SpacyProcessor class for natural language processing using spaCy.
Handles model loading, text processing, and vector operations.
"""

import spacy
import numpy as np
from typing import List, Dict, Optional, Tuple, Any
import logging
from functools import lru_cache
from sklearn.metrics.pairwise import cosine_similarity
import re
from dataclasses import dataclass
from src.utils.config import Config
from src.processing.text_preprocessor import TextPreprocessor

logger = logging.getLogger(__name__)


@dataclass
class ProcessedDocument:
    """Container for processed spaCy document with metadata."""
    text: str
    tokens: List[str]
    lemmas: List[str]
    pos_tags: List[str]
    entities: List[Dict[str, Any]]
    sentences: List[str]
    vector: Optional[np.ndarray]
    word_vectors: Dict[str, np.ndarray]


@dataclass
class SimilarityResult:
    """Container for word similarity results."""
    word: str
    similarity: float
    pos: str
    lemma: str


class SpacyProcessor:
    """
    SpaCy-based natural language processor for text analysis and vector operations.
    
    Provides methods for:
    - Loading and managing spaCy models
    - Text preprocessing and document creation
    - Word vector extraction and similarity calculations
    - Entity recognition and linguistic analysis
    """
    
    def __init__(self, model_name: str = None):
        """
        Initialize SpacyProcessor with specified model.
        
        Args:
            model_name: Name of spaCy model to load (default from config)
        """
        self.model_name = model_name or Config.SPACY_MODEL
        self.nlp = None
        self._model_loaded = False
        self.text_preprocessor = TextPreprocessor()
        self._load_model()
    
    def _load_model(self) -> None:
        """Load spaCy model with error handling and validation."""
        try:
            logger.info(f"Loading spaCy model: {self.model_name}")
            self.nlp = spacy.load(self.model_name)
            
            # Verify model has word vectors
            if not self.nlp.vocab.vectors_length:
                logger.warning(f"Model {self.model_name} does not have word vectors")
                raise ValueError(f"Model {self.model_name} lacks word vectors for similarity calculations")
            
            # Configure pipeline for optimal performance
            if "ner" not in self.nlp.pipe_names:
                logger.warning("Named Entity Recognition not available in model")
            
            self._model_loaded = True
            logger.info(f"Successfully loaded spaCy model: {self.model_name}")
            logger.info(f"Model vocabulary size: {len(self.nlp.vocab)}")
            logger.info(f"Vector dimensions: {self.nlp.vocab.vectors_length}")
            
        except OSError as e:
            logger.error(f"Failed to load spaCy model {self.model_name}: {str(e)}")
            logger.error("Try installing the model with: python -m spacy download en_core_web_md")
            raise RuntimeError(f"spaCy model {self.model_name} not found") from e
        except Exception as e:
            logger.error(f"Unexpected error loading spaCy model: {str(e)}")
            raise
    
    def is_model_loaded(self) -> bool:
        """Check if spaCy model is successfully loaded."""
        return self._model_loaded and self.nlp is not None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded spaCy model."""
        if not self.is_model_loaded():
            return {"loaded": False, "error": "Model not loaded"}
        
        return {
            "loaded": True,
            "model_name": self.model_name,
            "language": self.nlp.lang,
            "vocabulary_size": len(self.nlp.vocab),
            "vector_dimensions": self.nlp.vocab.vectors_length,
            "pipeline_components": self.nlp.pipe_names,
            "has_vectors": self.nlp.vocab.vectors_length > 0
        }
    
    def preprocess_text(self, text: str) -> str:
        """
        Clean and preprocess text for spaCy processing using TextPreprocessor.
        
        Args:
            text: Raw input text
            
        Returns:
            Cleaned and normalized text
        """
        if not text or not isinstance(text, str):
            return ""
        
        # Use the comprehensive text preprocessor
        return self.text_preprocessor.clean_text(text)
    
    def process_document(self, text: str) -> ProcessedDocument:
        """
        Process text document with spaCy and extract linguistic features.
        
        Args:
            text: Input text to process
            
        Returns:
            ProcessedDocument with extracted features
            
        Raises:
            RuntimeError: If model is not loaded
            ValueError: If text is invalid
        """
        if not self.is_model_loaded():
            raise RuntimeError("spaCy model not loaded")
        
        if not text or not isinstance(text, str):
            raise ValueError("Invalid text input")
        
        # Preprocess text
        cleaned_text = self.preprocess_text(text)
        if not cleaned_text:
            raise ValueError("Text is empty after preprocessing")
        
        try:
            # Process with spaCy
            doc = self.nlp(cleaned_text)
            
            # Extract tokens and linguistic features
            tokens = [token.text for token in doc if not token.is_space]
            lemmas = [token.lemma_ for token in doc if not token.is_space]
            pos_tags = [token.pos_ for token in doc if not token.is_space]
            
            # Extract named entities
            entities = []
            for ent in doc.ents:
                entities.append({
                    "text": ent.text,
                    "label": ent.label_,
                    "start": ent.start_char,
                    "end": ent.end_char,
                    "description": spacy.explain(ent.label_) or ent.label_
                })
            
            # Extract sentences
            sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
            
            # Get document vector
            doc_vector = doc.vector if doc.has_vector else None
            
            # Extract word vectors for content words
            word_vectors = {}
            for token in doc:
                if (not token.is_stop and not token.is_punct and 
                    not token.is_space and token.has_vector and
                    len(token.text) > 1):
                    word_vectors[token.lemma_.lower()] = token.vector
            
            return ProcessedDocument(
                text=cleaned_text,
                tokens=tokens,
                lemmas=lemmas,
                pos_tags=pos_tags,
                entities=entities,
                sentences=sentences,
                vector=doc_vector,
                word_vectors=word_vectors
            )
            
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}")
            raise RuntimeError(f"Failed to process document: {str(e)}") from e

    
    def get_word_vector(self, word: str) -> Optional[np.ndarray]:
        """
        Get word vector for a specific word.
        
        Args:
            word: Word to get vector for
            
        Returns:
            Word vector as numpy array or None if not found
        """
        if not self.is_model_loaded():
            return None
        
        word = word.lower().strip()
        if not word:
            return None
        
        token = self.nlp(word)[0]
        return token.vector if token.has_vector else None
    
    def calculate_similarity(self, word1: str, word2: str) -> float:
        """
        Calculate cosine similarity between two words.
        
        Args:
            word1: First word
            word2: Second word
            
        Returns:
            Similarity score between 0 and 1
        """
        if not self.is_model_loaded():
            return 0.0
        
        try:
            token1 = self.nlp(word1.lower().strip())[0]
            token2 = self.nlp(word2.lower().strip())[0]
            
            if not token1.has_vector or not token2.has_vector:
                return 0.0
            
            return float(token1.similarity(token2))
            
        except Exception as e:
            logger.error(f"Error calculating similarity between '{word1}' and '{word2}': {str(e)}")
            return 0.0
    
    def find_similar_words(self, target_word: str, word_list: List[str], 
                          limit: int = 10, threshold: float = None) -> List[SimilarityResult]:
        """
        Find words similar to target word from a given list.
        
        Args:
            target_word: Word to find similarities for
            word_list: List of words to compare against
            limit: Maximum number of results to return
            threshold: Minimum similarity threshold (default from config)
            
        Returns:
            List of SimilarityResult objects sorted by similarity
        """
        if not self.is_model_loaded():
            return []
        
        threshold = threshold or Config.SIMILARITY_THRESHOLD
        target_word = target_word.lower().strip()
        
        if not target_word or not word_list:
            return []
        
        try:
            target_token = self.nlp(target_word)[0]
            if not target_token.has_vector:
                logger.warning(f"Target word '{target_word}' has no vector")
                return []
            
            results = []
            for word in word_list:
                if word.lower().strip() == target_word:
                    continue  # Skip the target word itself
                
                try:
                    token = self.nlp(word.lower().strip())[0]
                    if not token.has_vector:
                        continue
                    
                    similarity = float(target_token.similarity(token))
                    if similarity >= threshold:
                        results.append(SimilarityResult(
                            word=word,
                            similarity=similarity,
                            pos=token.pos_,
                            lemma=token.lemma_
                        ))
                        
                except Exception as e:
                    logger.debug(f"Error processing word '{word}': {str(e)}")
                    continue
            
            # Sort by similarity (descending) and limit results
            results.sort(key=lambda x: x.similarity, reverse=True)
            return results[:limit]
            
        except Exception as e:
            logger.error(f"Error finding similar words for '{target_word}': {str(e)}")
            return []
    
    @lru_cache(maxsize=Config.CACHE_SIZE)
    def get_cached_word_vector(self, word: str) -> Optional[Tuple[float, ...]]:
        """
        Get word vector with LRU caching for performance.
        
        Args:
            word: Word to get vector for
            
        Returns:
            Word vector as tuple (for caching) or None
        """
        vector = self.get_word_vector(word)
        return tuple(vector) if vector is not None else None
    
    def calculate_document_similarity(self, doc1: ProcessedDocument, 
                                    doc2: ProcessedDocument) -> float:
        """
        Calculate similarity between two processed documents.
        
        Args:
            doc1: First processed document
            doc2: Second processed document
            
        Returns:
            Similarity score between 0 and 1
        """
        if not doc1.vector or not doc2.vector:
            return 0.0
        
        try:
            # Reshape vectors for cosine_similarity
            vec1 = doc1.vector.reshape(1, -1)
            vec2 = doc2.vector.reshape(1, -1)
            
            similarity = cosine_similarity(vec1, vec2)[0][0]
            return float(max(0.0, min(1.0, similarity)))  # Clamp to [0, 1]
            
        except Exception as e:
            logger.error(f"Error calculating document similarity: {str(e)}")
            return 0.0
    
    def extract_keywords(self, processed_doc: ProcessedDocument, 
                        limit: int = 20) -> List[Dict[str, Any]]:
        """
        Extract important keywords from processed document.
        
        Args:
            processed_doc: Processed document
            limit: Maximum number of keywords to return
            
        Returns:
            List of keyword dictionaries with scores
        """
        if not processed_doc.word_vectors:
            return []
        
        try:
            # Simple keyword extraction based on word frequency and POS tags
            word_freq = {}
            important_pos = {'NOUN', 'VERB', 'ADJ', 'PROPN'}
            
            for i, (token, lemma, pos) in enumerate(zip(
                processed_doc.tokens, processed_doc.lemmas, processed_doc.pos_tags
            )):
                if pos in important_pos and lemma.lower() in processed_doc.word_vectors:
                    word_freq[lemma.lower()] = word_freq.get(lemma.lower(), 0) + 1
            
            # Sort by frequency and create keyword objects
            keywords = []
            for word, freq in sorted(word_freq.items(), key=lambda x: x[1], reverse=True):
                if word in processed_doc.word_vectors:
                    keywords.append({
                        'word': word,
                        'frequency': freq,
                        'vector': processed_doc.word_vectors[word],
                        'score': freq  # Simple scoring based on frequency
                    })
            
            return keywords[:limit]
            
        except Exception as e:
            logger.error(f"Error extracting keywords: {str(e)}")
            return []
    
    def batch_process_texts(self, texts: List[str]) -> List[ProcessedDocument]:
        """
        Process multiple texts efficiently using spaCy's batch processing.
        
        Args:
            texts: List of texts to process
            
        Returns:
            List of ProcessedDocument objects
        """
        if not self.is_model_loaded():
            raise RuntimeError("spaCy model not loaded")
        
        if not texts:
            return []
        
        try:
            # Preprocess all texts
            cleaned_texts = [self.preprocess_text(text) for text in texts]
            
            # Filter out empty texts
            valid_texts = [(i, text) for i, text in enumerate(cleaned_texts) if text]
            
            if not valid_texts:
                return []
            
            # Batch process with spaCy
            docs = list(self.nlp.pipe([text for _, text in valid_texts]))
            
            # Convert to ProcessedDocument objects
            results = []
            for (original_index, text), doc in zip(valid_texts, docs):
                try:
                    # Extract features (similar to process_document)
                    tokens = [token.text for token in doc if not token.is_space]
                    lemmas = [token.lemma_ for token in doc if not token.is_space]
                    pos_tags = [token.pos_ for token in doc if not token.is_space]
                    
                    entities = []
                    for ent in doc.ents:
                        entities.append({
                            "text": ent.text,
                            "label": ent.label_,
                            "start": ent.start_char,
                            "end": ent.end_char,
                            "description": spacy.explain(ent.label_) or ent.label_
                        })
                    
                    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
                    doc_vector = doc.vector if doc.has_vector else None
                    
                    word_vectors = {}
                    for token in doc:
                        if (not token.is_stop and not token.is_punct and 
                            not token.is_space and token.has_vector and
                            len(token.text) > 1):
                            word_vectors[token.lemma_.lower()] = token.vector
                    
                    results.append(ProcessedDocument(
                        text=text,
                        tokens=tokens,
                        lemmas=lemmas,
                        pos_tags=pos_tags,
                        entities=entities,
                        sentences=sentences,
                        vector=doc_vector,
                        word_vectors=word_vectors
                    ))
                    
                except Exception as e:
                    logger.error(f"Error processing document {original_index}: {str(e)}")
                    continue
            
            return results
            
        except Exception as e:
            logger.error(f"Error in batch processing: {str(e)}")
            raise RuntimeError(f"Batch processing failed: {str(e)}") from e
    
    def get_model_statistics(self) -> Dict[str, Any]:
        """
        Get detailed statistics about the loaded model and its usage.
        
        Returns:
            Dictionary with model statistics
        """
        if not self.is_model_loaded():
            return {"error": "Model not loaded"}
        
        try:
            # Get cache statistics
            cache_info = self.get_cached_word_vector.cache_info()
            
            return {
                "model_info": self.get_model_info(),
                "cache_stats": {
                    "hits": cache_info.hits,
                    "misses": cache_info.misses,
                    "current_size": cache_info.currsize,
                    "max_size": cache_info.maxsize,
                    "hit_rate": cache_info.hits / (cache_info.hits + cache_info.misses) 
                              if (cache_info.hits + cache_info.misses) > 0 else 0.0
                },
                "configuration": {
                    "max_text_length": Config.MAX_TEXT_LENGTH,
                    "similarity_threshold": Config.SIMILARITY_THRESHOLD,
                    "cache_size": Config.CACHE_SIZE
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting model statistics: {str(e)}")
            return {"error": str(e)}
    
    def process_transcript_file(self, transcript_content: str, 
                              format_type: str = 'auto') -> ProcessedDocument:
        """
        Process transcript files (VTT, SRT, JSON) and extract text for NLP processing.
        
        Args:
            transcript_content: Raw transcript file content
            format_type: Format type ('auto', 'srt', 'vtt', 'txt', 'json')
            
        Returns:
            ProcessedDocument with extracted and processed text
        """
        if not self.is_model_loaded():
            raise RuntimeError("spaCy model not loaded")
        
        try:
            # Extract clean text from transcript
            extracted_text = self.text_preprocessor.extract_text_from_transcript(
                transcript_content, format_type=format_type
            )
            
            if not extracted_text:
                raise ValueError("No text could be extracted from transcript")
            
            # Process the extracted text
            return self.process_document(extracted_text)
            
        except Exception as e:
            logger.error(f"Error processing transcript file: {str(e)}")
            raise RuntimeError(f"Failed to process transcript: {str(e)}") from e
    
    def chunk_and_process_large_document(self, text: str, chunk_size: int = 1000) -> List[ProcessedDocument]:
        """
        Process large documents by chunking them into smaller pieces.
        
        Args:
            text: Large text document to process
            chunk_size: Size of each chunk in characters
            
        Returns:
            List of ProcessedDocument objects for each chunk
        """
        if not self.is_model_loaded():
            raise RuntimeError("spaCy model not loaded")
        
        try:
            # Chunk the text using the preprocessor
            chunks = self.text_preprocessor.chunk_text(text, chunk_size=chunk_size, preserve_sentences=True)
            
            if not chunks:
                return []
            
            # Process each chunk
            processed_chunks = []
            for chunk in chunks:
                try:
                    processed_doc = self.process_document(chunk.text)
                    processed_chunks.append(processed_doc)
                except Exception as e:
                    logger.warning(f"Failed to process chunk {chunk.chunk_id}: {str(e)}")
                    continue
            
            return processed_chunks
            
        except Exception as e:
            logger.error(f"Error chunking and processing large document: {str(e)}")
            raise RuntimeError(f"Failed to process large document: {str(e)}") from e
