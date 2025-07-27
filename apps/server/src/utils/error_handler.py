"""
Comprehensive error handling and logging utilities.
Provides structured error responses and recovery mechanisms.
"""

import logging
import traceback
import functools
from typing import Dict, Any, Optional, Callable
from datetime import datetime
from enum import Enum
from dataclasses import dataclass
from flask import jsonify, request
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


class ErrorCode(Enum):
    """Standardized error codes for the application."""
    # General errors
    INTERNAL_ERROR = "INTERNAL_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    RATE_LIMITED = "RATE_LIMITED"
    
    # spaCy processor errors
    SPACY_MODEL_NOT_LOADED = "SPACY_MODEL_NOT_LOADED"
    SPACY_PROCESSING_ERROR = "SPACY_PROCESSING_ERROR"
    TEXT_TOO_LONG = "TEXT_TOO_LONG"
    INVALID_TEXT_INPUT = "INVALID_TEXT_INPUT"
    
    # Search engine errors
    SEARCH_ENGINE_ERROR = "SEARCH_ENGINE_ERROR"
    INVALID_SEARCH_QUERY = "INVALID_SEARCH_QUERY"
    SEARCH_TIMEOUT = "SEARCH_TIMEOUT"
    
    # Index management errors
    INDEX_MANAGER_ERROR = "INDEX_MANAGER_ERROR"
    INDEXING_FAILED = "INDEXING_FAILED"
    QUEUE_FULL = "QUEUE_FULL"
    VIDEO_NOT_FOUND = "VIDEO_NOT_FOUND"
    
    # IC client errors
    IC_CONNECTION_ERROR = "IC_CONNECTION_ERROR"
    IC_AUTH_ERROR = "IC_AUTH_ERROR"
    IC_TIMEOUT = "IC_TIMEOUT"
    CANISTER_ERROR = "CANISTER_ERROR"
    
    # Storage errors
    STORAGE_ERROR = "STORAGE_ERROR"
    STORAGE_FULL = "STORAGE_FULL"
    DATA_CORRUPTION = "DATA_CORRUPTION"


@dataclass
class ErrorResponse:
    """Structured error response."""
    error_code: ErrorCode
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None
    request_id: Optional[str] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response."""
        result = {
            "error": {
                "code": self.error_code.value,
                "message": self.message,
                "timestamp": self.timestamp
            }
        }
        
        if self.details:
            result["error"]["details"] = self.details
        
        if self.request_id:
            result["error"]["request_id"] = self.request_id
        
        return result


class ApplicationError(Exception):
    """Base application exception with structured error information."""
    
    def __init__(self, error_code: ErrorCode, message: str, 
                 details: Optional[Dict[str, Any]] = None, 
                 original_exception: Optional[Exception] = None):
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        self.original_exception = original_exception
        self.timestamp = datetime.utcnow()
        
        super().__init__(message)
    
    def to_error_response(self, request_id: Optional[str] = None) -> ErrorResponse:
        """Convert to ErrorResponse object."""
        return ErrorResponse(
            error_code=self.error_code,
            message=self.message,
            details=self.details,
            timestamp=self.timestamp.isoformat(),
            request_id=request_id
        )


class SpacyProcessorError(ApplicationError):
    """Errors related to spaCy processing."""
    pass


class SearchEngineError(ApplicationError):
    """Errors related to search operations."""
    pass


class IndexManagerError(ApplicationError):
    """Errors related to index management."""
    pass


class ICClientError(ApplicationError):
    """Errors related to IC client operations."""
    pass


class StorageError(ApplicationError):
    """Errors related to storage operations."""
    pass

de
f get_request_id() -> str:
    """Generate or retrieve request ID for tracking."""
    try:
        # Try to get from Flask request context
        if hasattr(request, 'headers'):
            request_id = request.headers.get('X-Request-ID')
            if request_id:
                return request_id
        
        # Generate new request ID
        import uuid
        return str(uuid.uuid4())[:8]
    except:
        return "unknown"


def log_error(error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
    """Log error with structured context."""
    try:
        error_context = {
            "error_type": type(error).__name__,
            "error_message": str(error),
            "request_id": get_request_id()
        }
        
        if context:
            error_context.update(context)
        
        if isinstance(error, ApplicationError):
            error_context.update({
                "error_code": error.error_code.value,
                "details": error.details,
                "timestamp": error.timestamp.isoformat()
            })
        
        # Add traceback for debugging
        error_context["traceback"] = traceback.format_exc()
        
        logger.error("Application error occurred", **error_context)
        
    except Exception as log_error:
        # Fallback logging if structured logging fails
        logging.error(f"Error logging failed: {log_error}")
        logging.error(f"Original error: {error}")


def handle_error(error: Exception, context: Optional[Dict[str, Any]] = None) -> tuple:
    """
    Handle error and return appropriate Flask response.
    
    Args:
        error: Exception to handle
        context: Additional context for logging
        
    Returns:
        Tuple of (response, status_code)
    """
    try:
        request_id = get_request_id()
        
        # Log the error
        log_error(error, context)
        
        # Handle different error types
        if isinstance(error, ApplicationError):
            error_response = error.to_error_response(request_id)
            status_code = _get_status_code_for_error(error.error_code)
        
        elif isinstance(error, ValueError):
            error_response = ErrorResponse(
                error_code=ErrorCode.VALIDATION_ERROR,
                message=str(error),
                request_id=request_id
            )
            status_code = 400
        
        elif isinstance(error, FileNotFoundError):
            error_response = ErrorResponse(
                error_code=ErrorCode.NOT_FOUND,
                message="Resource not found",
                request_id=request_id
            )
            status_code = 404
        
        elif isinstance(error, TimeoutError):
            error_response = ErrorResponse(
                error_code=ErrorCode.SEARCH_TIMEOUT,
                message="Operation timed out",
                request_id=request_id
            )
            status_code = 408
        
        else:
            # Generic internal error
            error_response = ErrorResponse(
                error_code=ErrorCode.INTERNAL_ERROR,
                message="An internal error occurred",
                details={"original_error": str(error)},
                request_id=request_id
            )
            status_code = 500
        
        return jsonify(error_response.to_dict()), status_code
        
    except Exception as handler_error:
        # Fallback error response if error handling fails
        logging.error(f"Error handler failed: {handler_error}")
        return jsonify({
            "error": {
                "code": "ERROR_HANDLER_FAILED",
                "message": "Error handling failed",
                "timestamp": datetime.utcnow().isoformat()
            }
        }), 500


def _get_status_code_for_error(error_code: ErrorCode) -> int:
    """Get HTTP status code for error code."""
    status_map = {
        ErrorCode.VALIDATION_ERROR: 400,
        ErrorCode.INVALID_TEXT_INPUT: 400,
        ErrorCode.INVALID_SEARCH_QUERY: 400,
        ErrorCode.TEXT_TOO_LONG: 400,
        
        ErrorCode.UNAUTHORIZED: 401,
        ErrorCode.IC_AUTH_ERROR: 401,
        
        ErrorCode.NOT_FOUND: 404,
        ErrorCode.VIDEO_NOT_FOUND: 404,
        
        ErrorCode.SEARCH_TIMEOUT: 408,
        ErrorCode.IC_TIMEOUT: 408,
        
        ErrorCode.QUEUE_FULL: 429,
        ErrorCode.RATE_LIMITED: 429,
        
        ErrorCode.SPACY_MODEL_NOT_LOADED: 503,
        ErrorCode.IC_CONNECTION_ERROR: 503,
        ErrorCode.STORAGE_ERROR: 503,
        
        ErrorCode.INTERNAL_ERROR: 500,
        ErrorCode.SPACY_PROCESSING_ERROR: 500,
        ErrorCode.SEARCH_ENGINE_ERROR: 500,
        ErrorCode.INDEX_MANAGER_ERROR: 500,
        ErrorCode.INDEXING_FAILED: 500,
        ErrorCode.CANISTER_ERROR: 500,
        ErrorCode.STORAGE_FULL: 500,
        ErrorCode.DATA_CORRUPTION: 500,
    }
    
    return status_map.get(error_code, 500)


def error_handler(error_code: ErrorCode, fallback_message: str = "Operation failed"):
    """
    Decorator for automatic error handling in functions.
    
    Args:
        error_code: Error code to use for caught exceptions
        fallback_message: Fallback error message
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except ApplicationError:
                # Re-raise application errors as-is
                raise
            except Exception as e:
                # Wrap other exceptions in ApplicationError
                raise ApplicationError(
                    error_code=error_code,
                    message=f"{fallback_message}: {str(e)}",
                    original_exception=e
                )
        return wrapper
    return decorator


def retry_on_error(max_attempts: int = 3, delay: float = 1.0, 
                  backoff_factor: float = 2.0, 
                  retry_on: tuple = (Exception,)):
    """
    Decorator for retrying operations on specific errors.
    
    Args:
        max_attempts: Maximum number of retry attempts
        delay: Initial delay between retries
        backoff_factor: Multiplier for delay on each retry
        retry_on: Tuple of exception types to retry on
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except retry_on as e:
                    last_exception = e
                    
                    if attempt == max_attempts - 1:
                        # Last attempt failed, raise the exception
                        break
                    
                    # Log retry attempt
                    logger.warning(
                        "Function failed, retrying",
                        function=func.__name__,
                        attempt=attempt + 1,
                        max_attempts=max_attempts,
                        error=str(e),
                        delay=current_delay
                    )
                    
                    # Wait before retry
                    import time
                    time.sleep(current_delay)
                    current_delay *= backoff_factor
                
                except Exception as e:
                    # Don't retry on other exceptions
                    raise e
            
            # All retries failed
            if last_exception:
                raise last_exception
        
        return wrapper
    return decorator


# Utility functions for common error scenarios
def raise_spacy_error(message: str, details: Optional[Dict] = None):
    """Raise a spaCy-related error."""
    raise SpacyProcessorError(
        error_code=ErrorCode.SPACY_PROCESSING_ERROR,
        message=message,
        details=details
    )


def raise_search_error(message: str, details: Optional[Dict] = None):
    """Raise a search-related error."""
    raise SearchEngineError(
        error_code=ErrorCode.SEARCH_ENGINE_ERROR,
        message=message,
        details=details
    )


def raise_index_error(message: str, details: Optional[Dict] = None):
    """Raise an index-related error."""
    raise IndexManagerError(
        error_code=ErrorCode.INDEX_MANAGER_ERROR,
        message=message,
        details=details
    )


def raise_ic_error(message: str, details: Optional[Dict] = None):
    """Raise an IC client-related error."""
    raise ICClientError(
        error_code=ErrorCode.IC_CONNECTION_ERROR,
        message=message,
        details=details
    )


def raise_storage_error(message: str, details: Optional[Dict] = None):
    """Raise a storage-related error."""
    raise StorageError(
        error_code=ErrorCode.STORAGE_ERROR,
        message=message,
        details=details
    )