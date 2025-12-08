"""
Configuration management for spaCy NLP server.
Handles environment variables and application settings.
"""

import os
from typing import Optional


class Config:
    """Configuration class for managing environment variables and settings."""
    
    # Environment
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
    
    # spaCy Configuration
    SPACY_MODEL = os.getenv('SPACY_MODEL', 'en_core_web_md')
    
    # Internet Computer Configuration
    IC_NETWORK = os.getenv('IC_NETWORK', 'https://ic0.app')
    ACCESS_CONTROL_CANISTER_ID = os.getenv('ACCESS_CONTROL_CANISTER_ID', '')
    ASSETS_CANISTER_ID = os.getenv('ASSETS_CANISTER_ID', '')
    
    # Index Storage Configuration
    INDEX_STORAGE_TYPE = os.getenv('INDEX_STORAGE_TYPE', 'memory')
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # Performance Configuration
    MAX_TEXT_LENGTH = int(os.getenv('MAX_TEXT_LENGTH', '1000000'))  # 1MB default
    MAX_CONCURRENT_REQUESTS = int(os.getenv('MAX_CONCURRENT_REQUESTS', '10'))
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '30'))  # seconds
    
    # Search Configuration
    DEFAULT_SEARCH_LIMIT = int(os.getenv('DEFAULT_SEARCH_LIMIT', '10'))
    MAX_SEARCH_LIMIT = int(os.getenv('MAX_SEARCH_LIMIT', '100'))
    SIMILARITY_THRESHOLD = float(os.getenv('SIMILARITY_THRESHOLD', '0.5'))
    
    # Indexing Configuration
    MAX_QUEUE_SIZE = int(os.getenv('MAX_QUEUE_SIZE', '1000'))
    INDEXING_BATCH_SIZE = int(os.getenv('INDEXING_BATCH_SIZE', '10'))
    RETRY_MAX_ATTEMPTS = int(os.getenv('RETRY_MAX_ATTEMPTS', '3'))
    RETRY_BACKOFF_FACTOR = float(os.getenv('RETRY_BACKOFF_FACTOR', '2.0'))
    
    # Cache Configuration
    CACHE_SIZE = int(os.getenv('CACHE_SIZE', '1000'))
    CACHE_TTL = int(os.getenv('CACHE_TTL', '3600'))  # 1 hour default
    
    @classmethod
    def validate_config(cls) -> list:
        """
        Validate configuration settings and return list of errors.
        
        Returns:
            List of configuration error messages
        """
        errors = []
        
        # Validate required IC canister IDs
        if not cls.ACCESS_CONTROL_CANISTER_ID:
            errors.append("ACCESS_CONTROL_CANISTER_ID environment variable is required")
        
        if not cls.ASSETS_CANISTER_ID:
            errors.append("ASSETS_CANISTER_ID environment variable is required")
        
        # Validate numeric configurations
        if cls.MAX_TEXT_LENGTH <= 0:
            errors.append("MAX_TEXT_LENGTH must be positive")
        
        if cls.MAX_CONCURRENT_REQUESTS <= 0:
            errors.append("MAX_CONCURRENT_REQUESTS must be positive")
        
        if cls.REQUEST_TIMEOUT <= 0:
            errors.append("REQUEST_TIMEOUT must be positive")
        
        if cls.DEFAULT_SEARCH_LIMIT <= 0:
            errors.append("DEFAULT_SEARCH_LIMIT must be positive")
        
        if cls.MAX_SEARCH_LIMIT <= 0:
            errors.append("MAX_SEARCH_LIMIT must be positive")
        
        if cls.SIMILARITY_THRESHOLD < 0 or cls.SIMILARITY_THRESHOLD > 1:
            errors.append("SIMILARITY_THRESHOLD must be between 0 and 1")
        
        if cls.MAX_QUEUE_SIZE <= 0:
            errors.append("MAX_QUEUE_SIZE must be positive")
        
        if cls.INDEXING_BATCH_SIZE <= 0:
            errors.append("INDEXING_BATCH_SIZE must be positive")
        
        if cls.RETRY_MAX_ATTEMPTS <= 0:
            errors.append("RETRY_MAX_ATTEMPTS must be positive")
        
        if cls.RETRY_BACKOFF_FACTOR <= 1:
            errors.append("RETRY_BACKOFF_FACTOR must be greater than 1")
        
        if cls.CACHE_SIZE <= 0:
            errors.append("CACHE_SIZE must be positive")
        
        if cls.CACHE_TTL <= 0:
            errors.append("CACHE_TTL must be positive")
        
        # Validate log level
        valid_log_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if cls.LOG_LEVEL.upper() not in valid_log_levels:
            errors.append(f"LOG_LEVEL must be one of: {', '.join(valid_log_levels)}")
        
        # Validate environment
        valid_environments = ['development', 'staging', 'production']
        if cls.ENVIRONMENT not in valid_environments:
            errors.append(f"ENVIRONMENT must be one of: {', '.join(valid_environments)}")
        
        # Validate storage type
        valid_storage_types = ['memory', 'redis', 'file']
        if cls.INDEX_STORAGE_TYPE not in valid_storage_types:
            errors.append(f"INDEX_STORAGE_TYPE must be one of: {', '.join(valid_storage_types)}")
        
        return errors
    
    @classmethod
    def get_config_summary(cls) -> dict:
        """
        Get a summary of current configuration settings.
        
        Returns:
            Dictionary containing configuration summary
        """
        return {
            'environment': cls.ENVIRONMENT,
            'spacy_model': cls.SPACY_MODEL,
            'ic_network': cls.IC_NETWORK,
            'log_level': cls.LOG_LEVEL,
            'max_text_length': cls.MAX_TEXT_LENGTH,
            'max_concurrent_requests': cls.MAX_CONCURRENT_REQUESTS,
            'request_timeout': cls.REQUEST_TIMEOUT,
            'default_search_limit': cls.DEFAULT_SEARCH_LIMIT,
            'max_search_limit': cls.MAX_SEARCH_LIMIT,
            'similarity_threshold': cls.SIMILARITY_THRESHOLD,
            'max_queue_size': cls.MAX_QUEUE_SIZE,
            'indexing_batch_size': cls.INDEXING_BATCH_SIZE,
            'retry_max_attempts': cls.RETRY_MAX_ATTEMPTS,
            'retry_backoff_factor': cls.RETRY_BACKOFF_FACTOR,
            'cache_size': cls.CACHE_SIZE,
            'cache_ttl': cls.CACHE_TTL,
            'index_storage_type': cls.INDEX_STORAGE_TYPE
        }
    
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production environment."""
        return cls.ENVIRONMENT == 'production'
    
    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development environment."""
        return cls.ENVIRONMENT == 'development'


# Validate configuration on import
config_errors = Config.validate_config()
if config_errors:
    import logging
    logger = logging.getLogger(__name__)
    for error in config_errors:
        logger.warning(f"Configuration warning: {error}")