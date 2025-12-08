#!/bin/bash

# Test script for deployed spaCy NLP server
# Tests all major endpoints to ensure deployment is working

set -e

# Configuration
DEPLOYMENT_URL="${1:-http://localhost:5000}"
TIMEOUT=30

echo "🧪 Testing spaCy NLP server deployment at: $DEPLOYMENT_URL"
echo "⏱️  Request timeout: ${TIMEOUT}s"
echo ""

# Function to make HTTP requests with error handling
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local expected_status="$4"
    
    echo "Testing $method $endpoint..."
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$DEPLOYMENT_URL$endpoint" || echo -e "\n000")
    else
        response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT \
            -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$DEPLOYMENT_URL$endpoint" || echo -e "\n000")
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    # Extract body (all but last line)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "000" ]; then
        echo "❌ Request failed (timeout or connection error)"
        return 1
    elif [ "$status_code" = "$expected_status" ]; then
        echo "✅ Status: $status_code"
        return 0
    else
        echo "❌ Expected status $expected_status, got $status_code"
        echo "Response: $body"
        return 1
    fi
}

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test with error handling
run_test() {
    if "$@"; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
    echo ""
}

echo "🏥 Health Check Tests"
echo "===================="

run_test make_request "GET" "/api/health" "" "200"

echo "🔍 Search Engine Tests"
echo "====================="

# Basic search test
run_test make_request "POST" "/api/search" '{"query": "test", "limit": 5}' "200"

# Similar words test
run_test make_request "POST" "/api/similar-words" '{"keyword": "test", "limit": 5}' "200"

# Text processing test
run_test make_request "POST" "/api/process" '{"text": "This is a test document for processing."}' "200"

# Search suggestions test
run_test make_request "GET" "/api/search/suggestions?q=test&limit=3" "" "200"

echo "📊 Index Management Tests"
echo "========================"

# Index status test
run_test make_request "GET" "/api/index/status" "" "200"

# Queue status test
run_test make_request "GET" "/api/index/queue" "" "200"

# Registry sync test (may fail if IC canisters not configured)
echo "Testing POST /api/index/sync... (may fail if canisters not configured)"
if make_request "POST" "/api/index/sync" '{"force": false}' "200"; then
    ((TESTS_PASSED++))
    echo "✅ Registry sync working"
else
    echo "⚠️  Registry sync failed (expected if canisters not configured)"
fi
echo ""

echo "📈 Monitoring Tests"
echo "=================="

# Metrics test
run_test make_request "GET" "/api/metrics" "" "200"

# System status test
run_test make_request "GET" "/api/status" "" "200"

echo "🚀 Performance Tests"
echo "==================="

# Performance summary test
run_test make_request "GET" "/api/performance/summary" "" "200"

echo "❌ Error Handling Tests"
echo "======================"

# Test error handling with invalid requests
run_test make_request "POST" "/api/search" '{}' "400"
run_test make_request "POST" "/api/search" '{"query": ""}' "400"
run_test make_request "POST" "/api/similar-words" '{}' "400"
run_test make_request "POST" "/api/process" '{}' "400"

# Test 404 handling
run_test make_request "GET" "/api/nonexistent" "" "404"

echo "📊 Test Summary"
echo "==============="
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $TESTS_FAILED"
echo "Total tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo "🎉 All tests passed! Deployment is working correctly."
    exit 0
else
    echo "⚠️  Some tests failed. Please check the deployment."
    exit 1
fi