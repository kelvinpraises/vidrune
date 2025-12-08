#!/usr/bin/env python3
"""
Test runner script for spaCy NLP server.
Runs unit tests with proper configuration.
"""

import sys
import os
import pytest

# Add the server directory to the path
sys.path.insert(0, os.path.dirname(__file__))

if __name__ == "__main__":
    # Run tests with coverage and verbose output
    exit_code = pytest.main([
        "tests/",
        "-v",
        "--tb=short",
        "--disable-warnings",
        "-m", "not integration"  # Skip integration tests by default
    ])
    
    sys.exit(exit_code)