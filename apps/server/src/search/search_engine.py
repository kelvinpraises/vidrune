"""
Search engine for semantic video content search.
Provides advanced search capabilities using spaCy NLP and vector similarity.
"""

import logging
import time
from typing import List, Dict, Optional, Tuple, Set, Any
from dataclasses import dataclass
from datetime import datetime
import numpy as np
from collections import defaultdict, Counter
from sklearn.metrics.pairwise import cosine_similarity
from src.processing.spacy_processor import SpacyProcessor, ProcessedDocument, SimilarityResult
from src.storage.base_store import IndexStore
from src.models.video_models import VideoIndexEntry, SearchResult, ContentType, IndexStatus
from src.utils.config import Config
from src.utils.performance import performance_optimizer, performance_monitor

logger = logging.getLogger(__name__)


@dataclass
class SearchQuery:
    """Container for search query with processing options."""
    text: str
    limit: int = 10
    threshold: float = 0.5
    content_types: Optional[List[ContentType]] = None
    tags: Optional[List[str]] = None
    date_range: Optional[Tuple[datetime, datetime]] = None
    boost_recent: bool = False
    exact_match: bool = False


@dataclass
class SearchMetrics:
    """Metrics for search operations."""
    query_time: float
    total_candidates: int
    filtered_candidates: int
    final_results: int
    processing_time: float
    similarity_calculations: int


class SearchEngine:
    """
    Advanced search engine for video content using spaCy NLP.
    
    Provides functionality for:
    - Semantic text search using word vectors
    - Similar word finding with cosine similarity
    - Result ranking and relevance scoring
    - Search result deduplication and context preservation
    """
    
    def __init__(self, spacy_processor: SpacyProcessor, index_store: IndexStore):
        """
        Initialize SearchEngine.
        
        Args:
            spacy_processor: SpaCy processor for NLP operations
            index_store: Storage interface for index data
        """
        self.spacy_processor = spacy_processor
        self.index_store = index_store
        
        # Search statistics
        self.search_count = 0
        self.total_search_time = 0.0
        self.cache_hits = 0
        
        # Enhanced query cache using performance optimizer
        self._query_cache = performance_optimizer.get_cache('search_queries', max_size=500, ttl_seconds=300)
        
        logger.info("SearchEngine initialized")
    
    @performance_monitor(track_memory=True, track_time=True)
    def search(self, query: SearchQuery) -> Tuple[List[SearchResult], SearchMetrics]:
        """
        Perform semantic search across indexed video content.
        
        Args:
            query: SearchQuery object with search parameters
            
        Returns:
            Tuple of (search results, search metrics)
        """
        start_time = time.time()
        self.search_count += 1
        
        try:
            # Check cache first
            cache_key = self._generate_cache_key(query)
            cached_results = self._get_cached_results(cache_key)
            if cached_results:
                self.cache_hits += 1
                metrics = SearchMetrics(
                    query_time=time.time() - start_time,
                    total_candidates=0,
                    filtered_candidates=0,
                    final_results=len(cached_results),
                    processing_time=0.0,
                    similarity_calculations=0
                )
                return cached_results, metrics
            
            # Process search query
            processed_query = self._process_search_query(query.text)
            if not processed_query:
                return [], SearchMetrics(0, 0, 0, 0, 0, 0)
            
            # Get candidate videos
            candidates = self._get_search_candidates(query)
            
            # Calculate similarities and rank results
            ranked_results = self._rank_search_results(
                processed_query, candidates, query
            )
            
            # Apply final filtering and limiting
            final_results = self._apply_final_filters(ranked_results, query)
            
            # Cache results
            self._cache_results(cache_key, final_results)
            
            # Calculate metrics
            query_time = time.time() - start_time
            self.total_search_time += query_time
            
            metrics = SearchMetrics(
                query_time=query_time,
                total_candidates=len(candidates),
                filtered_candidates=len(ranked_results),
                final_results=len(final_results),
                processing_time=query_time,
                similarity_calculations=len(candidates)
            )
            
            logger.info(f"Search completed: '{query.text}' -> {len(final_results)} results ({query_time:.3f}s)")
            
            return final_results, metrics
            
        except Exception as e:
            logger.error(f"Search error for query '{query.text}': {str(e)}")
            return [], SearchMetrics(0, 0, 0, 0, 0, 0)    
   
 def _process_search_query(self, query_text: str) -> Optional[ProcessedDocument]:
        """
        Process search query with spaCy.
        
        Args:
            query_text: Raw query text
            
        Returns:
            ProcessedDocument or None if processing fails
        """
        try:
            if not query_text or not query_text.strip():
                return None
            
            return self.spacy_processor.process_document(query_text.strip())
            
        except Exception as e:
            logger.error(f"Error processing search query: {str(e)}")
            return None
    
    def _get_search_candidates(self, query: SearchQuery) -> List[VideoIndexEntry]:
        """
        Get candidate videos for search.
        
        Args:
            query: Search query parameters
            
        Returns:
            List of candidate VideoIndexEntry objects
        """
        try:
            # Start with all indexed videos
            candidates = self.index_store.get_videos_by_status(IndexStatus.INDEXED.value)
            
            # Filter by content types if specified
            if query.content_types:
                filtered_candidates = []
                for candidate in candidates:
                    has_content_type = any(
                        candidate.get_content_by_type(ct) is not None
                        for ct in query.content_types
                    )
                    if has_content_type:
                        filtered_candidates.append(candidate)
                candidates = filtered_candidates
            
            # Filter by tags if specified
            if query.tags:
                query_tags_set = set(tag.lower() for tag in query.tags)
                filtered_candidates = []
                for candidate in candidates:
                    candidate_tags_set = set(tag.lower() for tag in candidate.tags)
                    if query_tags_set.intersection(candidate_tags_set):
                        filtered_candidates.append(candidate)
                candidates = filtered_candidates
            
            # Filter by date range if specified
            if query.date_range:
                start_date, end_date = query.date_range
                filtered_candidates = []
                for candidate in candidates:
                    if start_date <= candidate.created_at <= end_date:
                        filtered_candidates.append(candidate)
                candidates = filtered_candidates
            
            return candidates
            
        except Exception as e:
            logger.error(f"Error getting search candidates: {str(e)}")
            return []
    
    def _rank_search_results(self, processed_query: ProcessedDocument, 
                           candidates: List[VideoIndexEntry], 
                           query: SearchQuery) -> List[Tuple[VideoIndexEntry, float]]:
        """
        Rank search results by relevance.
        
        Args:
            processed_query: Processed search query
            candidates: Candidate videos
            query: Original search query
            
        Returns:
            List of (VideoIndexEntry, relevance_score) tuples
        """
        try:
            ranked_results = []
            
            for candidate in candidates:
                try:
                    # Calculate relevance score
                    relevance_score = self._calculate_relevance_score(
                        processed_query, candidate, query
                    )
                    
                    if relevance_score >= query.threshold:
                        ranked_results.append((candidate, relevance_score))
                        
                except Exception as e:
                    logger.warning(f"Error calculating relevance for {candidate.video_id}: {str(e)}")
                    continue
            
            # Sort by relevance score (descending)
            ranked_results.sort(key=lambda x: x[1], reverse=True)
            
            return ranked_results
            
        except Exception as e:
            logger.error(f"Error ranking search results: {str(e)}")
            return []
    
    def _calculate_relevance_score(self, processed_query: ProcessedDocument,
                                 candidate: VideoIndexEntry,
                                 query: SearchQuery) -> float:
        """
        Calculate relevance score between query and candidate video.
        
        Args:
            processed_query: Processed search query
            candidate: Candidate video entry
            query: Original search query
            
        Returns:
            Relevance score (0.0 to 1.0)
        """
        try:
            total_score = 0.0
            score_components = 0
            
            # Text similarity scoring
            if processed_query.vector is not None:
                # Score against title (high weight)
                if candidate.title:
                    title_doc = self.spacy_processor.process_document(candidate.title)
                    if title_doc.vector is not None:
                        title_similarity = self._calculate_vector_similarity(
                            processed_query.vector, title_doc.vector
                        )
                        total_score += title_similarity * 3.0  # High weight for title
                        score_components += 3.0
                
                # Score against description (medium weight)
                if candidate.description:
                    desc_doc = self.spacy_processor.process_document(candidate.description)
                    if desc_doc.vector is not None:
                        desc_similarity = self._calculate_vector_similarity(
                            processed_query.vector, desc_doc.vector
                        )
                        total_score += desc_similarity * 2.0  # Medium weight for description
                        score_components += 2.0
                
                # Score against searchable content (normal weight)
                for content in candidate.searchable_content:
                    if content.text:
                        try:
                            content_doc = self.spacy_processor.process_document(content.text[:1000])  # Limit length
                            if content_doc.vector is not None:
                                content_similarity = self._calculate_vector_similarity(
                                    processed_query.vector, content_doc.vector
                                )
                                
                                # Weight by content type
                                weight = self._get_content_type_weight(content.content_type)
                                total_score += content_similarity * weight
                                score_components += weight
                                
                        except Exception as e:
                            logger.debug(f"Error processing content for similarity: {str(e)}")
                            continue
            
            # Keyword matching bonus
            keyword_score = self._calculate_keyword_score(processed_query, candidate)
            total_score += keyword_score
            score_components += 1.0
            
            # Tag matching bonus
            if query.tags:
                tag_score = self._calculate_tag_score(query.tags, candidate.tags)
                total_score += tag_score
                score_components += 1.0
            
            # Recency boost if requested
            if query.boost_recent:
                recency_score = self._calculate_recency_score(candidate)
                total_score += recency_score * 0.5  # Lower weight for recency
                score_components += 0.5
            
            # Calculate final normalized score
            if score_components > 0:
                final_score = total_score / score_components
                return min(1.0, max(0.0, final_score))  # Clamp to [0, 1]
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating relevance score: {str(e)}")
            return 0.0    
   
 def _calculate_vector_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors."""
        try:
            # Reshape for sklearn
            v1 = vec1.reshape(1, -1)
            v2 = vec2.reshape(1, -1)
            
            similarity = cosine_similarity(v1, v2)[0][0]
            return float(max(0.0, min(1.0, similarity)))
            
        except Exception as e:
            logger.debug(f"Error calculating vector similarity: {str(e)}")
            return 0.0
    
    def _get_content_type_weight(self, content_type: ContentType) -> float:
        """Get weight for different content types."""
        weights = {
            ContentType.CAPTIONS_VTT: 1.5,
            ContentType.AUDIO_TRANSCRIPT: 1.3,
            ContentType.TTS_TRANSCRIPT: 1.2,
            ContentType.SCENE_DESCRIPTION: 1.0,
            ContentType.METADATA: 0.8
        }
        return weights.get(content_type, 1.0)
    
    def _calculate_keyword_score(self, processed_query: ProcessedDocument,
                               candidate: VideoIndexEntry) -> float:
        """Calculate keyword matching score."""
        try:
            if not processed_query.tokens:
                return 0.0
            
            # Get query keywords (lemmatized)
            query_keywords = set(lemma.lower() for lemma in processed_query.lemmas 
                               if len(lemma) > 2 and lemma.isalpha())
            
            if not query_keywords:
                return 0.0
            
            # Get candidate text
            candidate_text = candidate.get_all_text().lower()
            candidate_words = set(candidate_text.split())
            
            # Calculate overlap
            matches = query_keywords.intersection(candidate_words)
            if matches:
                return len(matches) / len(query_keywords)
            
            return 0.0
            
        except Exception as e:
            logger.debug(f"Error calculating keyword score: {str(e)}")
            return 0.0
    
    def _calculate_tag_score(self, query_tags: List[str], candidate_tags: List[str]) -> float:
        """Calculate tag matching score."""
        try:
            if not query_tags or not candidate_tags:
                return 0.0
            
            query_tags_set = set(tag.lower() for tag in query_tags)
            candidate_tags_set = set(tag.lower() for tag in candidate_tags)
            
            matches = query_tags_set.intersection(candidate_tags_set)
            if matches:
                return len(matches) / len(query_tags_set)
            
            return 0.0
            
        except Exception as e:
            logger.debug(f"Error calculating tag score: {str(e)}")
            return 0.0
    
    def _calculate_recency_score(self, candidate: VideoIndexEntry) -> float:
        """Calculate recency boost score."""
        try:
            now = datetime.utcnow()
            days_old = (now - candidate.created_at).days
            
            # Boost recent videos (decay over 30 days)
            if days_old <= 30:
                return (30 - days_old) / 30.0
            
            return 0.0
            
        except Exception as e:
            logger.debug(f"Error calculating recency score: {str(e)}")
            return 0.0
    
    def _apply_final_filters(self, ranked_results: List[Tuple[VideoIndexEntry, float]],
                           query: SearchQuery) -> List[SearchResult]:
        """
        Apply final filtering and create SearchResult objects.
        
        Args:
            ranked_results: Ranked (entry, score) tuples
            query: Original search query
            
        Returns:
            List of SearchResult objects
        """
        try:
            final_results = []
            
            for entry, score in ranked_results[:query.limit]:
                # Create snippet from most relevant content
                snippet = self._create_snippet(entry, query.text)
                
                # Find matched content
                matched_content = []
                for content in entry.searchable_content:
                    if self._content_matches_query(content.text, query.text):
                        matched_content.append(content)
                
                # Create SearchResult
                result = SearchResult(
                    video_id=entry.video_id,
                    title=entry.title,
                    description=entry.description,
                    relevance_score=score,
                    matched_content=matched_content,
                    snippet=snippet,
                    tags=entry.tags,
                    created_at=entry.created_at,
                    owner=entry.owner
                )
                
                final_results.append(result)
            
            return final_results
            
        except Exception as e:
            logger.error(f"Error applying final filters: {str(e)}")
            return []
    
    def _create_snippet(self, entry: VideoIndexEntry, query_text: str) -> str:
        """Create a snippet highlighting relevant content."""
        try:
            # Get all text and find best matching section
            all_text = entry.get_all_text()
            
            if not all_text:
                return ""
            
            # Simple snippet creation - find first occurrence of query words
            query_words = query_text.lower().split()
            text_lower = all_text.lower()
            
            best_pos = 0
            for word in query_words:
                pos = text_lower.find(word)
                if pos != -1:
                    best_pos = max(0, pos - 50)  # Start 50 chars before match
                    break
            
            # Extract snippet
            snippet_start = best_pos
            snippet_end = min(len(all_text), snippet_start + 200)
            snippet = all_text[snippet_start:snippet_end]
            
            # Add ellipsis if truncated
            if snippet_start > 0:
                snippet = "..." + snippet
            if snippet_end < len(all_text):
                snippet = snippet + "..."
            
            return snippet.strip()
            
        except Exception as e:
            logger.debug(f"Error creating snippet: {str(e)}")
            return entry.description[:200] if entry.description else ""
    
    def _content_matches_query(self, content_text: str, query_text: str) -> bool:
        """Check if content matches query."""
        try:
            if not content_text or not query_text:
                return False
            
            content_lower = content_text.lower()
            query_words = query_text.lower().split()
            
            # Check if any query word appears in content
            return any(word in content_lower for word in query_words if len(word) > 2)
            
        except Exception as e:
            logger.debug(f"Error checking content match: {str(e)}")
            return False
    
    def _generate_cache_key(self, query: SearchQuery) -> str:
        """Generate cache key for query."""
        try:
            key_parts = [
                query.text,
                str(query.limit),
                str(query.threshold),
                str(query.content_types),
                str(query.tags),
                str(query.date_range),
                str(query.boost_recent),
                str(query.exact_match)
            ]
            return "|".join(key_parts)
            
        except Exception as e:
            logger.debug(f"Error generating cache key: {str(e)}")
            return query.text
    
    def _get_cached_results(self, cache_key: str) -> Optional[List[SearchResult]]:
        """Get cached search results if valid."""
        try:
            return self._query_cache.get(cache_key)
        except Exception as e:
            logger.debug(f"Error getting cached results: {str(e)}")
            return None
    
    def _cache_results(self, cache_key: str, results: List[SearchResult]) -> None:
        """Cache search results."""
        try:
            self._query_cache.put(cache_key, results)
        except Exception as e:
            logger.debug(f"Error caching results: {str(e)}")
    
    def find_similar_words(self, target_word: str, limit: int = 10) -> List[SimilarityResult]:
        """
        Find words similar to target word using spaCy vectors.
        
        Args:
            target_word: Word to find similarities for
            limit: Maximum number of results
            
        Returns:
            List of SimilarityResult objects
        """
        try:
            # Get all indexed videos to build vocabulary
            all_videos = self.index_store.get_videos_by_status(IndexStatus.INDEXED.value)
            
            # Extract vocabulary from all content
            vocabulary = set()
            for video in all_videos:
                all_text = video.get_all_text()
                words = all_text.split()
                vocabulary.update(word.lower().strip('.,!?;:"()[]{}') 
                                for word in words if len(word) > 2)
            
            # Use spaCy processor to find similar words
            return self.spacy_processor.find_similar_words(
                target_word, list(vocabulary), limit=limit
            )
            
        except Exception as e:
            logger.error(f"Error finding similar words for '{target_word}': {str(e)}")
            return []
    
    def get_search_suggestions(self, partial_query: str, limit: int = 5) -> List[str]:
        """
        Get search suggestions based on partial query.
        
        Args:
            partial_query: Partial search query
            limit: Maximum number of suggestions
            
        Returns:
            List of suggested queries
        """
        try:
            if not partial_query or len(partial_query) < 2:
                return []
            
            # Get common words from indexed content
            all_videos = self.index_store.get_videos_by_status(IndexStatus.INDEXED.value)
            word_counts = Counter()
            
            for video in all_videos:
                all_text = video.get_all_text().lower()
                words = all_text.split()
                for word in words:
                    clean_word = word.strip('.,!?;:"()[]{}')
                    if len(clean_word) > 2 and clean_word.startswith(partial_query.lower()):
                        word_counts[clean_word] += 1
            
            # Return most common matching words
            suggestions = [word for word, count in word_counts.most_common(limit)]
            return suggestions
            
        except Exception as e:
            logger.error(f"Error getting search suggestions for '{partial_query}': {str(e)}")
            return []
    
    def search_with_phrase_support(self, query_text: str, limit: int = 10) -> List[SearchResult]:
        """
        Advanced search with phrase support and spell correction.
        
        Args:
            query_text: Search query with potential phrases in quotes
            limit: Maximum number of results
            
        Returns:
            List of SearchResult objects
        """
        try:
            # Parse phrases and individual words
            phrases, words = self._parse_query_phrases(query_text)
            
            # Apply spell correction to individual words
            corrected_words = []
            for word in words:
                corrected = self._spell_correct_word(word)
                corrected_words.append(corrected)
            
            # Reconstruct query with corrections
            corrected_query = " ".join(corrected_words)
            if phrases:
                corrected_query += " " + " ".join(f'"{phrase}"' for phrase in phrases)
            
            # Create advanced search query
            search_query = SearchQuery(
                text=corrected_query,
                limit=limit,
                threshold=Config.SIMILARITY_THRESHOLD
            )
            
            # Perform search with phrase matching
            results, _ = self._search_with_phrases(search_query, phrases)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in advanced search: {str(e)}")
            return []
    
    def _parse_query_phrases(self, query_text: str) -> Tuple[List[str], List[str]]:
        """Parse query to extract phrases (in quotes) and individual words."""
        try:
            import re
            
            # Find phrases in quotes
            phrase_pattern = r'"([^"]*)"'
            phrases = re.findall(phrase_pattern, query_text)
            
            # Remove phrases from query to get individual words
            remaining_text = re.sub(phrase_pattern, '', query_text)
            words = [word.strip() for word in remaining_text.split() if word.strip()]
            
            return phrases, words
            
        except Exception as e:
            logger.error(f"Error parsing query phrases: {str(e)}")
            return [], query_text.split()
    
    def _spell_correct_word(self, word: str) -> str:
        """
        Simple spell correction using spaCy lemmatization and vocabulary.
        
        Args:
            word: Word to correct
            
        Returns:
            Corrected word or original if no correction found
        """
        try:
            if len(word) < 3:
                return word
            
            # Use spaCy to get lemma
            doc = self.spacy_processor.nlp(word)
            if doc and len(doc) > 0:
                lemma = doc[0].lemma_.lower()
                
                # If lemma is different and seems more standard, use it
                if lemma != word.lower() and lemma.isalpha():
                    return lemma
            
            # Simple character-based corrections for common typos
            corrections = {
                'teh': 'the',
                'adn': 'and',
                'taht': 'that',
                'wiht': 'with',
                'thier': 'their',
                'recieve': 'receive',
                'seperate': 'separate',
                'definately': 'definitely'
            }
            
            return corrections.get(word.lower(), word)
            
        except Exception as e:
            logger.debug(f"Error in spell correction for '{word}': {str(e)}")
            return word
    
    def _search_with_phrases(self, query: SearchQuery, phrases: List[str]) -> Tuple[List[SearchResult], SearchMetrics]:
        """
        Perform search with phrase matching support.
        
        Args:
            query: Search query
            phrases: List of phrases that must appear exactly
            
        Returns:
            Tuple of (search results, metrics)
        """
        try:
            # First perform regular search
            results, metrics = self.search(query)
            
            # If no phrases, return regular results
            if not phrases:
                return results, metrics
            
            # Filter results to only include those with all phrases
            phrase_filtered_results = []
            
            for result in results:
                all_text = (result.title + " " + result.description + " " + 
                           " ".join(content.text for content in result.matched_content)).lower()
                
                # Check if all phrases are present
                has_all_phrases = all(phrase.lower() in all_text for phrase in phrases)
                
                if has_all_phrases:
                    # Boost relevance score for exact phrase matches
                    result.relevance_score = min(1.0, result.relevance_score * 1.2)
                    phrase_filtered_results.append(result)
            
            # Re-sort by updated relevance scores
            phrase_filtered_results.sort(key=lambda x: x.relevance_score, reverse=True)
            
            return phrase_filtered_results, metrics
            
        except Exception as e:
            logger.error(f"Error in phrase search: {str(e)}")
            return [], SearchMetrics(0, 0, 0, 0, 0, 0)
    
    def search_with_filters(self, query_text: str, filters: Dict[str, Any]) -> List[SearchResult]:
        """
        Advanced search with multiple filters and confidence scoring.
        
        Args:
            query_text: Search query text
            filters: Dictionary of filters (tags, date_range, content_types, etc.)
            
        Returns:
            List of SearchResult objects with confidence scores
        """
        try:
            # Create search query with filters
            search_query = SearchQuery(
                text=query_text,
                limit=filters.get('limit', Config.DEFAULT_SEARCH_LIMIT),
                threshold=filters.get('threshold', Config.SIMILARITY_THRESHOLD),
                content_types=filters.get('content_types'),
                tags=filters.get('tags'),
                date_range=filters.get('date_range'),
                boost_recent=filters.get('boost_recent', False),
                exact_match=filters.get('exact_match', False)
            )
            
            # Perform search
            results, _ = self.search(search_query)
            
            # Add confidence scoring
            for result in results:
                result.relevance_score = self._calculate_confidence_score(result, query_text, filters)
            
            # Re-sort by confidence score
            results.sort(key=lambda x: x.relevance_score, reverse=True)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in filtered search: {str(e)}")
            return []
    
    def _calculate_confidence_score(self, result: SearchResult, query_text: str, 
                                  filters: Dict[str, Any]) -> float:
        """
        Calculate confidence score for search result.
        
        Args:
            result: Search result
            query_text: Original query text
            filters: Applied filters
            
        Returns:
            Confidence score (0.0 to 1.0)
        """
        try:
            base_score = result.relevance_score
            confidence_factors = []
            
            # Factor 1: Exact word matches
            query_words = set(query_text.lower().split())
            result_text = (result.title + " " + result.description).lower()
            exact_matches = sum(1 for word in query_words if word in result_text)
            if query_words:
                exact_match_ratio = exact_matches / len(query_words)
                confidence_factors.append(exact_match_ratio)
            
            # Factor 2: Content type relevance
            if filters.get('content_types'):
                preferred_types = set(filters['content_types'])
                result_types = set(content.content_type for content in result.matched_content)
                type_overlap = len(preferred_types.intersection(result_types))
                if preferred_types:
                    type_relevance = type_overlap / len(preferred_types)
                    confidence_factors.append(type_relevance)
            
            # Factor 3: Tag matching
            if filters.get('tags') and result.tags:
                filter_tags = set(tag.lower() for tag in filters['tags'])
                result_tags = set(tag.lower() for tag in result.tags)
                tag_overlap = len(filter_tags.intersection(result_tags))
                if filter_tags:
                    tag_relevance = tag_overlap / len(filter_tags)
                    confidence_factors.append(tag_relevance)
            
            # Factor 4: Content quality (length, completeness)
            total_content_length = sum(len(content.text) for content in result.matched_content)
            content_quality = min(1.0, total_content_length / 1000)  # Normalize to 1000 chars
            confidence_factors.append(content_quality)
            
            # Calculate weighted confidence score
            if confidence_factors:
                confidence_boost = sum(confidence_factors) / len(confidence_factors)
                final_score = (base_score * 0.7) + (confidence_boost * 0.3)
            else:
                final_score = base_score
            
            return min(1.0, max(0.0, final_score))
            
        except Exception as e:
            logger.debug(f"Error calculating confidence score: {str(e)}")
            return result.relevance_score
    
    def search_with_pagination(self, query_text: str, page: int = 1, 
                             page_size: int = 10, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Search with pagination support.
        
        Args:
            query_text: Search query
            page: Page number (1-based)
            page_size: Results per page
            filters: Optional filters
            
        Returns:
            Dictionary with results and pagination info
        """
        try:
            # Calculate offset
            offset = (page - 1) * page_size
            
            # Get more results than needed for pagination
            total_limit = offset + page_size * 2  # Get extra for accurate total count
            
            # Perform search
            if filters:
                all_results = self.search_with_filters(query_text, {**filters, 'limit': total_limit})
            else:
                search_query = SearchQuery(text=query_text, limit=total_limit)
                all_results, _ = self.search(search_query)
            
            # Calculate pagination info
            total_results = len(all_results)
            total_pages = (total_results + page_size - 1) // page_size
            
            # Get page results
            page_results = all_results[offset:offset + page_size]
            
            return {
                'results': page_results,
                'pagination': {
                    'current_page': page,
                    'page_size': page_size,
                    'total_results': total_results,
                    'total_pages': total_pages,
                    'has_next': page < total_pages,
                    'has_previous': page > 1
                },
                'query': query_text,
                'filters': filters or {}
            }
            
        except Exception as e:
            logger.error(f"Error in paginated search: {str(e)}")
            return {
                'results': [],
                'pagination': {
                    'current_page': page,
                    'page_size': page_size,
                    'total_results': 0,
                    'total_pages': 0,
                    'has_next': False,
                    'has_previous': False
                },
                'query': query_text,
                'filters': filters or {}
            }
    
    def get_search_statistics(self) -> Dict[str, Any]:
        """Get search engine statistics."""
        try:
            avg_search_time = (
                self.total_search_time / self.search_count 
                if self.search_count > 0 else 0.0
            )
            
            cache_hit_rate = (
                self.cache_hits / self.search_count 
                if self.search_count > 0 else 0.0
            )
            
            return {
                "total_searches": self.search_count,
                "total_search_time": self.total_search_time,
                "average_search_time": avg_search_time,
                "cache_hits": self.cache_hits,
                "cache_hit_rate": cache_hit_rate,
                "cache_size": len(self._query_cache),
                "indexed_videos": self.index_store.get_total_indexed_count()
            }
            
        except Exception as e:
            logger.error(f"Error getting search statistics: {str(e)}")
            return {}
    
    def clear_cache(self) -> None:
        """Clear search result cache."""
        try:
            stats = self._query_cache.get_stats()
            self._query_cache.clear()
            logger.info(f"Cleared search cache ({stats['size']} entries)")
            
        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")


# Utility functions for search operations
def create_search_query(text: str, **kwargs) -> SearchQuery:
    """Create SearchQuery with default parameters."""
    return SearchQuery(text=text, **kwargs)


def create_search_engine(spacy_processor: SpacyProcessor = None, 
                        index_store: IndexStore = None) -> SearchEngine:
    """Create SearchEngine with default components."""
    if spacy_processor is None:
        spacy_processor = SpacyProcessor()
    
    if index_store is None:
        from src.storage.memory_store import MemoryStore
        index_store = MemoryStore()
    
    return SearchEngine(spacy_processor, index_store)