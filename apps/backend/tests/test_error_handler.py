"""
Unit tests for error handling utilities.
Tests error codes, responses, and handling mechanisms.
"""

import pytest
from unittest.mock import Mock, patch
import sys
import os
from datetime import datetime

# Add the server directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.utils.error_handler import (
    ErrorCode, ErrorResponse, ApplicationError, SpacyProcessorError,
    SearchEngineError, IndexManagerError, ICClientError, StorageError,
    handle_error, log_error, get_request_id, error_handler, retry_on_error
)


class TestErrorCode:
    """Test ErrorCode enum."""
    
    def test_error_code_values(self):
        """Test error code enum values."""
        assert ErrorCode.INTERNAL_ERROR.value == "INTERNAL_ERROR"
        assert ErrorCode.VALIDATION_ERROR.value == "VALIDATION_ERROR"
        assert ErrorCode.SPACY_MODEL_NOT_LOADED.value == "SPACY_MODEL_NOT_LOADED"
        assert ErrorCode.SEARCH_ENGINE_ERROR.value == "SEARCH_ENGINE_ERROR"


class TestErrorResponse:
    """Test ErrorResponse dataclass."""
    
    def test_error_response_creation(self):
        """Test ErrorResponse creation."""
        response = ErrorResponse(
            error_code=ErrorCode.VALIDATION_ERROR,
            message="Test error message",
            details={"field": "test_field"}
        )
        
        assert response.error_code == ErrorCode.VALIDATION_ERROR
        assert response.message == "Test error message"
        assert response.details == {"field": "test_field"}
        assert response.timestamp is not None
    
    def test_error_response_to_dict(self):
        """Test ErrorResponse to_dict method."""
        response = ErrorResponse(
            error_code=ErrorCode.NOT_FOUND,
            message="Resource not found",
            request_id="test-123"
        )
        
        result = response.to_dict()
        
        assert "error" in result
        assert result["error"]["code"] == "NOT_FOUND"
        assert result["error"]["message"] == "Resource not found"
        assert result["error"]["request_id"] == "test-123"
        assert "timestamp" in result["error"]


class TestApplicationError:
    """Test ApplicationError exception class."""
    
    def test_application_error_creation(self):
        """Test ApplicationError creation."""
        error = ApplicationError(
            error_code=ErrorCode.SPACY_PROCESSING_ERROR,
            message="spaCy processing failed",
            details={"model": "en_core_web_md"}
        )
        
        assert error.error_code == ErrorCode.SPACY_PROCESSING_ERROR
        assert error.message == "spaCy processing failed"
        assert error.details == {"model": "en_core_web_md"}
        assert error.timestamp is not None
    
    def test_application_error_to_response(self):
        """Test ApplicationError to_error_response method."""
        error = ApplicationError(
            error_code=ErrorCode.SEARCH_ENGINE_ERROR,
            message="Search failed"
        )
        
        response = error.to_error_response(request_id="req-456")
        
        assert isinstance(response, ErrorResponse)
        assert response.error_code == ErrorCode.SEARCH_ENGINE_ERROR
        assert response.message == "Search failed"
        assert response.request_id == "req-456"


class TestSpecificErrors:
    """Test specific error classes."""
    
    def test_spacy_processor_error(self):
        """Test SpacyProcessorError."""
        error = SpacyProcessorError(
            error_code=ErrorCode.SPACY_MODEL_NOT_LOADED,
            message="Model not loaded"
        )
        
        assert isinstance(error, ApplicationError)
        assert error.error_code == ErrorCode.SPACY_MODEL_NOT_LOADED
    
    def test_search_engine_error(self):
        """Test SearchEngineError."""
        error = SearchEngineError(
            error_code=ErrorCode.SEARCH_ENGINE_ERROR,
            message="Search failed"
        )
        
        assert isinstance(error, ApplicationError)
        assert error.error_code == ErrorCode.SEARCH_ENGINE_ERROR
    
    def test_index_manager_error(self):
        """Test IndexManagerError."""
        error = IndexManagerError(
            error_code=ErrorCode.INDEXING_FAILED,
            message="Indexing failed"
        )
        
        assert isinstance(error, ApplicationError)
        assert error.error_code == ErrorCode.INDEXING_FAILED
    
    def test_ic_client_error(self):
        """Test ICClientError."""
        error = ICClientError(
            error_code=ErrorCode.IC_CONNECTION_ERROR,
            message="Connection failed"
        )
        
        assert isinstance(error, ApplicationError)
        assert error.error_code == ErrorCode.IC_CONNECTION_ERROR
    
    def test_storage_error(self):
        """Test StorageError."""
        error = StorageError(
            error_code=ErrorCode.STORAGE_ERROR,
            message="Storage failed"
        )
        
        assert isinstance(error, ApplicationError)
        assert error.error_code == ErrorCode.STORAGE_ERROR


class TestErrorHandling:
    """Test error handling functions."""
    
    def test_get_request_id(self):
        """Test request ID generation."""
        request_id = get_request_id()
        
        assert isinstance(request_id, str)
        assert len(request_id) > 0
    
    def test_log_error(self):
        """Test error logging."""
        error = ValueError("Test error")
        context = {"function": "test_function"}
        
        # Should not raise exception
        log_error(error, context)
        assert True
    
    @patch('src.utils.error_handler.jsonify')
    def test_handle_error_application_error(self, mock_jsonify):
        """Test handling ApplicationError."""
        mock_jsonify.return_value = ("mocked_response", 400)
        
        error = ApplicationError(
            error_code=ErrorCode.VALIDATION_ERROR,
            message="Validation failed"
        )
        
        response, status_code = handle_error(error)
        
        assert status_code == 400
        mock_jsonify.assert_called_once()
    
    @patch('src.utils.error_handler.jsonify')
    def test_handle_error_value_error(self, mock_jsonify):
        """Test handling ValueError."""
        mock_jsonify.return_value = ("mocked_response", 400)
        
        error = ValueError("Invalid value")
        
        response, status_code = handle_error(error)
        
        assert status_code == 400
        mock_jsonify.assert_called_once()
    
    @patch('src.utils.error_handler.jsonify')
    def test_handle_error_generic_exception(self, mock_jsonify):
        """Test handling generic exception."""
        mock_jsonify.return_value = ("mocked_response", 500)
        
        error = Exception("Generic error")
        
        response, status_code = handle_error(error)
        
        assert status_code == 500
        mock_jsonify.assert_called_once()


class TestErrorDecorators:
    """Test error handling decorators."""
    
    def test_error_handler_decorator_success(self):
        """Test error_handler decorator with successful function."""
        @error_handler(ErrorCode.INTERNAL_ERROR, "Test failed")
        def test_function():
            return "success"
        
        result = test_function()
        assert result == "success"
    
    def test_error_handler_decorator_exception(self):
        """Test error_handler decorator with exception."""
        @error_handler(ErrorCode.INTERNAL_ERROR, "Test failed")
        def test_function():
            raise ValueError("Test error")
        
        with pytest.raises(ApplicationError) as exc_info:
            test_function()
        
        assert exc_info.value.error_code == ErrorCode.INTERNAL_ERROR
        assert "Test failed" in str(exc_info.value)
    
    def test_retry_on_error_decorator_success(self):
        """Test retry_on_error decorator with successful function."""
        call_count = 0
        
        @retry_on_error(max_attempts=3, delay=0.1)
        def test_function():
            nonlocal call_count
            call_count += 1
            return "success"
        
        result = test_function()
        assert result == "success"
        assert call_count == 1
    
    def test_retry_on_error_decorator_retry(self):
        """Test retry_on_error decorator with retries."""
        call_count = 0
        
        @retry_on_error(max_attempts=3, delay=0.01, retry_on=(ValueError,))
        def test_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Temporary error")
            return "success"
        
        result = test_function()
        assert result == "success"
        assert call_count == 3
    
    def test_retry_on_error_decorator_max_attempts(self):
        """Test retry_on_error decorator reaching max attempts."""
        call_count = 0
        
        @retry_on_error(max_attempts=2, delay=0.01, retry_on=(ValueError,))
        def test_function():
            nonlocal call_count
            call_count += 1
            raise ValueError("Persistent error")
        
        with pytest.raises(ValueError):
            test_function()
        
        assert call_count == 2


if __name__ == "__main__":
    pytest.main([__file__])