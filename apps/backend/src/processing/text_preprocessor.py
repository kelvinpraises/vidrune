"""
Text preprocessing utilities for cleaning and normalizing text data.
Handles various text cleaning tasks, sentence segmentation, and document chunking.
"""

import re
import html
import unicodedata
from typing import List, Dict, Optional, Tuple, Iterator
import logging
from dataclasses import dataclass
from src.utils.config import Config

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    """Container for text chunks with metadata."""
    text: str
    start_index: int
    end_index: int
    chunk_id: int
    overlap_start: int = 0
    overlap_end: int = 0


@dataclass
class CleaningStats:
    """Statistics about text cleaning operations."""
    original_length: int
    cleaned_length: int
    characters_removed: int
    lines_processed: int
    sentences_found: int
    chunks_created: int


class TextPreprocessor:
    """
    Comprehensive text preprocessing utilities for cleaning and normalizing text.
    
    Provides methods for:
    - Text sanitization and normalization
    - HTML and markup removal
    - Sentence segmentation with custom boundaries
    - Document chunking for large texts
    - Character encoding normalization
    """
    
    def __init__(self):
        """Initialize TextPreprocessor with default settings."""
        self.max_text_length = Config.MAX_TEXT_LENGTH
        self.sentence_endings = r'[.!?]+(?:\s|$)'
        self.sentence_boundaries = re.compile(self.sentence_endings)
        
        # Common abbreviations that shouldn't trigger sentence breaks
        self.abbreviations = {
            'dr', 'mr', 'mrs', 'ms', 'prof', 'inc', 'ltd', 'corp', 'co',
            'vs', 'etc', 'ie', 'eg', 'al', 'st', 'ave', 'blvd', 'dept',
            'govt', 'min', 'max', 'approx', 'est', 'fig', 'vol', 'no',
            'pp', 'ch', 'sec', 'para', 'art', 'ref', 'ed', 'eds'
        }
        
        # Compile regex patterns for efficiency
        self._compile_patterns()
    
    def _compile_patterns(self) -> None:
        """Compile frequently used regex patterns for performance."""
        # HTML and markup patterns
        self.html_tag_pattern = re.compile(r'<[^>]+>')
        self.html_entity_pattern = re.compile(r'&[a-zA-Z0-9#]+;')
        
        # Whitespace patterns
        self.excessive_whitespace = re.compile(r'\s+')
        self.line_breaks = re.compile(r'\n+')
        self.tab_pattern = re.compile(r'\t+')
        
        # Special character patterns
        self.control_chars = re.compile(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]')
        self.unicode_quotes = re.compile(r'[""''‚„‹›«»]')
        self.unicode_dashes = re.compile(r'[–—―]')
        self.unicode_spaces = re.compile(r'[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]')
        
        # URL and email patterns
        self.url_pattern = re.compile(
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        )
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        
        # Sentence boundary patterns
        self.abbreviation_pattern = re.compile(
            r'\b(?:' + '|'.join(self.abbreviations) + r')\.\s*', re.IGNORECASE
        )
        self.sentence_starter = re.compile(r'[A-Z][a-z]')
    
    def clean_text(self, text: str, preserve_structure: bool = False) -> str:
        """
        Clean and normalize text with comprehensive preprocessing.
        
        Args:
            text: Raw input text to clean
            preserve_structure: Whether to preserve line breaks and paragraph structure
            
        Returns:
            Cleaned and normalized text
        """
        if not text or not isinstance(text, str):
            return ""
        
        original_text = text
        
        try:
            # Step 1: HTML decoding and tag removal
            text = html.unescape(text)
            text = self.html_tag_pattern.sub(' ', text)
            text = self.html_entity_pattern.sub(' ', text)
            
            # Step 2: Unicode normalization
            text = unicodedata.normalize('NFKC', text)
            
            # Step 3: Replace unicode characters with ASCII equivalents
            text = self.unicode_quotes.sub('"', text)
            text = self.unicode_dashes.sub('-', text)
            text = self.unicode_spaces.sub(' ', text)
            
            # Step 4: Remove control characters
            text = self.control_chars.sub('', text)
            
            # Step 5: Normalize whitespace
            if preserve_structure:
                # Preserve paragraph breaks but normalize other whitespace
                text = self.tab_pattern.sub(' ', text)
                text = re.sub(r' +', ' ', text)  # Multiple spaces to single space
                text = re.sub(r'\n +', '\n', text)  # Remove spaces after newlines
                text = re.sub(r' +\n', '\n', text)  # Remove spaces before newlines
                text = self.line_breaks.sub('\n\n', text)  # Multiple newlines to double
            else:
                # Normalize all whitespace to single spaces
                text = self.excessive_whitespace.sub(' ', text)
            
            # Step 6: Clean up URLs and emails (optional - replace with placeholders)
            # text = self.url_pattern.sub('[URL]', text)
            # text = self.email_pattern.sub('[EMAIL]', text)
            
            # Step 7: Final cleanup
            text = text.strip()
            
            # Step 8: Length limiting
            if len(text) > self.max_text_length:
                logger.warning(f"Text truncated from {len(text)} to {self.max_text_length} characters")
                text = text[:self.max_text_length]
                # Try to end at a word boundary
                last_space = text.rfind(' ')
                if last_space > self.max_text_length * 0.9:  # If space is reasonably close to end
                    text = text[:last_space]
            
            return text
            
        except Exception as e:
            logger.error(f"Error cleaning text: {str(e)}")
            logger.debug(f"Original text (first 100 chars): {original_text[:100]}")
            return original_text  # Return original text if cleaning fails
    
    def remove_html_markup(self, text: str) -> str:
        """
        Remove HTML tags and entities from text.
        
        Args:
            text: Text containing HTML markup
            
        Returns:
            Text with HTML removed
        """
        if not text:
            return ""
        
        try:
            # Decode HTML entities first
            text = html.unescape(text)
            
            # Remove HTML tags
            text = self.html_tag_pattern.sub(' ', text)
            
            # Remove any remaining HTML entities
            text = self.html_entity_pattern.sub(' ', text)
            
            # Normalize whitespace
            text = self.excessive_whitespace.sub(' ', text).strip()
            
            return text
            
        except Exception as e:
            logger.error(f"Error removing HTML markup: {str(e)}")
            return text
    
    def normalize_unicode(self, text: str) -> str:
        """
        Normalize Unicode characters to standard forms.
        
        Args:
            text: Text with Unicode characters
            
        Returns:
            Text with normalized Unicode
        """
        if not text:
            return ""
        
        try:
            # Normalize Unicode to canonical form
            text = unicodedata.normalize('NFKC', text)
            
            # Replace common Unicode variants with ASCII
            replacements = {
                # Quotes
                '"': '"', '"': '"', ''': "'", ''': "'",
                '‚': "'", '„': '"', '‹': '<', '›': '>',
                '«': '"', '»': '"',
                # Dashes
                '–': '-', '—': '-', '―': '-',
                # Spaces
                '\u00A0': ' ',  # Non-breaking space
                '\u1680': ' ',  # Ogham space mark
                '\u2000': ' ',  # En quad
                '\u2001': ' ',  # Em quad
                '\u2002': ' ',  # En space
                '\u2003': ' ',  # Em space
                '\u2004': ' ',  # Three-per-em space
                '\u2005': ' ',  # Four-per-em space
                '\u2006': ' ',  # Six-per-em space
                '\u2007': ' ',  # Figure space
                '\u2008': ' ',  # Punctuation space
                '\u2009': ' ',  # Thin space
                '\u200A': ' ',  # Hair space
                '\u200B': '',   # Zero width space
                '\u202F': ' ',  # Narrow no-break space
                '\u205F': ' ',  # Medium mathematical space
                '\u3000': ' ',  # Ideographic space
            }
            
            for unicode_char, replacement in replacements.items():
                text = text.replace(unicode_char, replacement)
            
            return text
            
        except Exception as e:
            logger.error(f"Error normalizing Unicode: {str(e)}")
            return text
    
    def segment_sentences(self, text: str, custom_boundaries: Optional[List[str]] = None) -> List[str]:
        """
        Segment text into sentences with custom boundary handling.
        
        Args:
            text: Input text to segment
            custom_boundaries: Additional sentence boundary patterns
            
        Returns:
            List of sentence strings
        """
        if not text or not isinstance(text, str):
            return []
        
        try:
            # Clean text first
            text = self.clean_text(text, preserve_structure=True)
            
            # Handle custom boundaries if provided
            if custom_boundaries:
                for boundary in custom_boundaries:
                    text = text.replace(boundary, boundary + '\n')
            
            # Split on sentence boundaries
            potential_sentences = self.sentence_boundaries.split(text)
            
            sentences = []
            current_sentence = ""
            
            for segment in potential_sentences:
                segment = segment.strip()
                if not segment:
                    continue
                
                current_sentence += segment
                
                # Check if this is likely a real sentence end
                if self._is_sentence_boundary(current_sentence):
                    sentences.append(current_sentence.strip())
                    current_sentence = ""
                else:
                    current_sentence += ". "  # Add back the period if it was part of abbreviation
            
            # Add any remaining text as a sentence
            if current_sentence.strip():
                sentences.append(current_sentence.strip())
            
            # Filter out very short sentences (likely fragments)
            sentences = [s for s in sentences if len(s.split()) >= 3]
            
            return sentences
            
        except Exception as e:
            logger.error(f"Error segmenting sentences: {str(e)}")
            return [text]  # Return original text as single sentence if segmentation fails
    
    def _is_sentence_boundary(self, text: str) -> bool:
        """
        Determine if text represents a complete sentence boundary.
        
        Args:
            text: Text segment to check
            
        Returns:
            True if this is likely a sentence boundary
        """
        if not text:
            return False
        
        # Check for abbreviations at the end
        words = text.split()
        if not words:
            return False
        
        last_word = words[-1].lower().rstrip('.')
        if last_word in self.abbreviations:
            return False
        
        # Check if next character (if any) starts with capital letter
        # This is a simple heuristic - more sophisticated NLP would be better
        if len(words) >= 2:
            return True
        
        # Single word sentences are usually not complete
        return len(words) > 1
    
    def chunk_text(self, text: str, chunk_size: int = 1000, 
                   overlap: int = 100, preserve_sentences: bool = True) -> List[TextChunk]:
        """
        Split large text into overlapping chunks for processing.
        
        Args:
            text: Input text to chunk
            chunk_size: Maximum size of each chunk in characters
            overlap: Number of characters to overlap between chunks
            preserve_sentences: Whether to avoid breaking sentences
            
        Returns:
            List of TextChunk objects
        """
        if not text or chunk_size <= 0:
            return []
        
        if len(text) <= chunk_size:
            return [TextChunk(text=text, start_index=0, end_index=len(text), chunk_id=0)]
        
        try:
            chunks = []
            chunk_id = 0
            start_index = 0
            
            if preserve_sentences:
                sentences = self.segment_sentences(text)
                current_chunk = ""
                sentence_start = 0
                
                for sentence in sentences:
                    # Check if adding this sentence would exceed chunk size
                    if len(current_chunk) + len(sentence) + 1 > chunk_size and current_chunk:
                        # Create chunk from current content
                        chunk_end = sentence_start + len(current_chunk)
                        chunks.append(TextChunk(
                            text=current_chunk.strip(),
                            start_index=sentence_start,
                            end_index=chunk_end,
                            chunk_id=chunk_id
                        ))
                        
                        # Start new chunk with overlap
                        chunk_id += 1
                        overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                        current_chunk = overlap_text + " " + sentence
                        sentence_start = chunk_end - len(overlap_text)
                    else:
                        # Add sentence to current chunk
                        if current_chunk:
                            current_chunk += " " + sentence
                        else:
                            current_chunk = sentence
                            sentence_start = start_index
                
                # Add final chunk
                if current_chunk:
                    chunks.append(TextChunk(
                        text=current_chunk.strip(),
                        start_index=sentence_start,
                        end_index=sentence_start + len(current_chunk),
                        chunk_id=chunk_id
                    ))
            
            else:
                # Simple character-based chunking
                while start_index < len(text):
                    end_index = min(start_index + chunk_size, len(text))
                    
                    # Try to end at word boundary if not at end of text
                    if end_index < len(text):
                        last_space = text.rfind(' ', start_index, end_index)
                        if last_space > start_index + chunk_size * 0.8:  # If space is reasonably close
                            end_index = last_space
                    
                    chunk_text = text[start_index:end_index]
                    chunks.append(TextChunk(
                        text=chunk_text,
                        start_index=start_index,
                        end_index=end_index,
                        chunk_id=chunk_id
                    ))
                    
                    chunk_id += 1
                    start_index = max(start_index + chunk_size - overlap, end_index)
            
            return chunks
            
        except Exception as e:
            logger.error(f"Error chunking text: {str(e)}")
            return [TextChunk(text=text, start_index=0, end_index=len(text), chunk_id=0)]
    
    def extract_text_from_vtt(self, vtt_content: str) -> str:
        """
        Extract clean text from WebVTT caption files.
        
        Args:
            vtt_content: Raw VTT file content
            
        Returns:
            Extracted text content
        """
        if not vtt_content:
            return ""
        
        try:
            lines = vtt_content.split('\n')
            text_lines = []
            
            # Skip VTT header and metadata
            in_cue = False
            
            for line in lines:
                line = line.strip()
                
                # Skip empty lines and VTT header
                if not line or line.startswith('WEBVTT') or line.startswith('NOTE'):
                    continue
                
                # Skip timestamp lines (contain -->)
                if '-->' in line:
                    in_cue = True
                    continue
                
                # Skip cue identifiers (usually just numbers or IDs)
                if line.isdigit() or (line.replace('-', '').replace('_', '').isalnum() and len(line) < 20):
                    continue
                
                # Extract actual caption text
                if in_cue and line:
                    # Remove VTT formatting tags
                    clean_line = re.sub(r'<[^>]+>', '', line)
                    clean_line = re.sub(r'\{[^}]+\}', '', clean_line)  # Remove style blocks
                    
                    if clean_line.strip():
                        text_lines.append(clean_line.strip())
                    
                    # Reset cue flag for next cue
                    if not line:
                        in_cue = False
            
            # Join lines and clean up
            extracted_text = ' '.join(text_lines)
            return self.clean_text(extracted_text)
            
        except Exception as e:
            logger.error(f"Error extracting text from VTT: {str(e)}")
            return ""
    
    def extract_text_from_transcript(self, transcript_content: str, 
                                   format_type: str = 'auto') -> str:
        """
        Extract clean text from various transcript formats.
        
        Args:
            transcript_content: Raw transcript content
            format_type: Format type ('auto', 'srt', 'vtt', 'txt', 'json')
            
        Returns:
            Extracted and cleaned text
        """
        if not transcript_content:
            return ""
        
        try:
            # Auto-detect format if not specified
            if format_type == 'auto':
                if 'WEBVTT' in transcript_content[:100]:
                    format_type = 'vtt'
                elif '-->' in transcript_content and transcript_content.strip().split('\n')[0].isdigit():
                    format_type = 'srt'
                elif transcript_content.strip().startswith('{') or transcript_content.strip().startswith('['):
                    format_type = 'json'
                else:
                    format_type = 'txt'
            
            # Process based on format
            if format_type == 'vtt':
                return self.extract_text_from_vtt(transcript_content)
            
            elif format_type == 'srt':
                return self.extract_text_from_srt(transcript_content)
            
            elif format_type == 'json':
                return self.extract_text_from_json_transcript(transcript_content)
            
            else:  # Plain text
                return self.clean_text(transcript_content)
                
        except Exception as e:
            logger.error(f"Error extracting text from transcript: {str(e)}")
            return self.clean_text(transcript_content)  # Fallback to basic cleaning
    
    def extract_text_from_srt(self, srt_content: str) -> str:
        """
        Extract clean text from SRT subtitle files.
        
        Args:
            srt_content: Raw SRT file content
            
        Returns:
            Extracted text content
        """
        if not srt_content:
            return ""
        
        try:
            lines = srt_content.split('\n')
            text_lines = []
            
            skip_next = False
            
            for line in lines:
                line = line.strip()
                
                # Skip empty lines
                if not line:
                    skip_next = False
                    continue
                
                # Skip sequence numbers
                if line.isdigit():
                    skip_next = True
                    continue
                
                # Skip timestamp lines
                if '-->' in line:
                    skip_next = True
                    continue
                
                # Extract subtitle text
                if not skip_next:
                    # Remove SRT formatting
                    clean_line = re.sub(r'<[^>]+>', '', line)
                    clean_line = re.sub(r'\{[^}]+\}', '', clean_line)
                    
                    if clean_line.strip():
                        text_lines.append(clean_line.strip())
            
            # Join and clean
            extracted_text = ' '.join(text_lines)
            return self.clean_text(extracted_text)
            
        except Exception as e:
            logger.error(f"Error extracting text from SRT: {str(e)}")
            return ""
    
    def extract_text_from_json_transcript(self, json_content: str) -> str:
        """
        Extract text from JSON transcript format.
        
        Args:
            json_content: JSON transcript content
            
        Returns:
            Extracted text content
        """
        try:
            import json
            
            data = json.loads(json_content)
            text_parts = []
            
            # Handle different JSON transcript structures
            if isinstance(data, list):
                # Array of transcript entries
                for entry in data:
                    if isinstance(entry, dict):
                        # Look for common text fields
                        text = entry.get('text') or entry.get('content') or entry.get('transcript')
                        if text:
                            text_parts.append(str(text))
                    elif isinstance(entry, str):
                        text_parts.append(entry)
            
            elif isinstance(data, dict):
                # Single object with transcript data
                if 'transcript' in data:
                    transcript = data['transcript']
                    if isinstance(transcript, list):
                        for item in transcript:
                            if isinstance(item, dict) and 'text' in item:
                                text_parts.append(item['text'])
                            elif isinstance(item, str):
                                text_parts.append(item)
                    elif isinstance(transcript, str):
                        text_parts.append(transcript)
                
                # Look for other common fields
                for field in ['text', 'content', 'captions', 'subtitles']:
                    if field in data and data[field]:
                        if isinstance(data[field], str):
                            text_parts.append(data[field])
                        elif isinstance(data[field], list):
                            text_parts.extend([str(item) for item in data[field] if item])
            
            # Join and clean extracted text
            extracted_text = ' '.join(text_parts)
            return self.clean_text(extracted_text)
            
        except Exception as e:
            logger.error(f"Error extracting text from JSON transcript: {str(e)}")
            return ""
    
    def get_cleaning_statistics(self, original_text: str, cleaned_text: str, 
                              sentences: Optional[List[str]] = None,
                              chunks: Optional[List[TextChunk]] = None) -> CleaningStats:
        """
        Generate statistics about text cleaning operations.
        
        Args:
            original_text: Original input text
            cleaned_text: Cleaned output text
            sentences: List of segmented sentences (optional)
            chunks: List of text chunks (optional)
            
        Returns:
            CleaningStats object with operation statistics
        """
        try:
            original_length = len(original_text) if original_text else 0
            cleaned_length = len(cleaned_text) if cleaned_text else 0
            characters_removed = original_length - cleaned_length
            
            lines_processed = len(original_text.split('\n')) if original_text else 0
            sentences_found = len(sentences) if sentences else 0
            chunks_created = len(chunks) if chunks else 0
            
            return CleaningStats(
                original_length=original_length,
                cleaned_length=cleaned_length,
                characters_removed=characters_removed,
                lines_processed=lines_processed,
                sentences_found=sentences_found,
                chunks_created=chunks_created
            )
            
        except Exception as e:
            logger.error(f"Error generating cleaning statistics: {str(e)}")
            return CleaningStats(0, 0, 0, 0, 0, 0)
    
    def batch_clean_texts(self, texts: List[str], preserve_structure: bool = False) -> List[str]:
        """
        Clean multiple texts efficiently.
        
        Args:
            texts: List of texts to clean
            preserve_structure: Whether to preserve line breaks and structure
            
        Returns:
            List of cleaned texts
        """
        if not texts:
            return []
        
        try:
            cleaned_texts = []
            
            for text in texts:
                cleaned = self.clean_text(text, preserve_structure=preserve_structure)
                cleaned_texts.append(cleaned)
            
            return cleaned_texts
            
        except Exception as e:
            logger.error(f"Error in batch text cleaning: {str(e)}")
            return texts  # Return original texts if cleaning fails
    
    def validate_text_quality(self, text: str) -> Dict[str, any]:
        """
        Validate text quality and provide quality metrics.
        
        Args:
            text: Text to validate
            
        Returns:
            Dictionary with quality metrics and validation results
        """
        if not text:
            return {
                'valid': False,
                'issues': ['Empty text'],
                'quality_score': 0.0,
                'metrics': {}
            }
        
        try:
            issues = []
            metrics = {}
            
            # Basic metrics
            metrics['length'] = len(text)
            metrics['word_count'] = len(text.split())
            metrics['sentence_count'] = len(self.segment_sentences(text))
            
            # Quality checks
            if metrics['length'] < 10:
                issues.append('Text too short')
            
            if metrics['word_count'] < 3:
                issues.append('Too few words')
            
            # Character distribution analysis
            alpha_chars = sum(1 for c in text if c.isalpha())
            digit_chars = sum(1 for c in text if c.isdigit())
            space_chars = sum(1 for c in text if c.isspace())
            punct_chars = sum(1 for c in text if c in '.,!?;:')
            
            metrics['alpha_ratio'] = alpha_chars / len(text) if text else 0
            metrics['digit_ratio'] = digit_chars / len(text) if text else 0
            metrics['space_ratio'] = space_chars / len(text) if text else 0
            metrics['punct_ratio'] = punct_chars / len(text) if text else 0
            
            # Quality score calculation (0-1)
            quality_score = 1.0
            
            if metrics['alpha_ratio'] < 0.5:
                quality_score -= 0.3
                issues.append('Low alphabetic character ratio')
            
            if metrics['space_ratio'] < 0.1 or metrics['space_ratio'] > 0.3:
                quality_score -= 0.2
                issues.append('Unusual whitespace ratio')
            
            if metrics['sentence_count'] == 0:
                quality_score -= 0.4
                issues.append('No sentences detected')
            
            # Check for excessive repetition
            words = text.lower().split()
            if len(words) > 10:
                unique_words = len(set(words))
                repetition_ratio = unique_words / len(words)
                metrics['repetition_ratio'] = repetition_ratio
                
                if repetition_ratio < 0.3:
                    quality_score -= 0.3
                    issues.append('High word repetition')
            
            quality_score = max(0.0, quality_score)
            
            return {
                'valid': len(issues) == 0,
                'issues': issues,
                'quality_score': quality_score,
                'metrics': metrics
            }
            
        except Exception as e:
            logger.error(f"Error validating text quality: {str(e)}")
            return {
                'valid': False,
                'issues': [f'Validation error: {str(e)}'],
                'quality_score': 0.0,
                'metrics': {}
            }


# Utility functions for common preprocessing tasks
def quick_clean(text: str) -> str:
    """Quick text cleaning for simple use cases."""
    preprocessor = TextPreprocessor()
    return preprocessor.clean_text(text)


def extract_sentences(text: str) -> List[str]:
    """Quick sentence extraction."""
    preprocessor = TextPreprocessor()
    return preprocessor.segment_sentences(text)


def chunk_large_text(text: str, chunk_size: int = 1000) -> List[str]:
    """Quick text chunking."""
    preprocessor = TextPreprocessor()
    chunks = preprocessor.chunk_text(text, chunk_size=chunk_size)
    return [chunk.text for chunk in chunks]