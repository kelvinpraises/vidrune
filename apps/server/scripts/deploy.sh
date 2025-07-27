#!/bin/bash

# Deployment script for spaCy NLP server to Vercel
# This script prepares the application for deployment

set -e  # Exit on any error

echo "🚀 Starting deployment preparation for spaCy NLP server..."

# Check if we're in the correct directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Please run this script from the apps/server directory."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI is not installed."
    echo "Please install it with: npm install -g vercel"
    exit 1
fi

# Validate Python dependencies
echo "📦 Validating Python dependencies..."
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found."
    exit 1
fi

# Check for required environment variables
echo "🔧 Checking environment variables..."
REQUIRED_VARS=(
    "ACCESS_CONTROL_CANISTER_ID"
    "ASSETS_CANISTER_ID"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "⚠️  Warning: The following environment variables are not set:"
    printf '  - %s\n' "${MISSING_VARS[@]}"
    echo "Make sure to set these in your Vercel project settings."
fi

# Run tests before deployment (optional)
if [ "$1" = "--with-tests" ]; then
    echo "🧪 Running tests before deployment..."
    if command -v python3 &> /dev/null; then
        python3 -m pytest tests/ -v --tb=short -m "not integration" || {
            echo "❌ Tests failed. Deployment aborted."
            exit 1
        }
        echo "✅ Tests passed!"
    else
        echo "⚠️  Python3 not found. Skipping tests."
    fi
fi

# Validate vercel.json configuration
echo "📋 Validating Vercel configuration..."
if command -v python3 &> /dev/null; then
    python3 -c "
import json
try:
    with open('vercel.json', 'r') as f:
        config = json.load(f)
    print('✅ vercel.json is valid JSON')
    
    # Check required fields
    required_fields = ['version', 'builds', 'routes']
    for field in required_fields:
        if field not in config:
            print(f'❌ Missing required field: {field}')
            exit(1)
    
    print('✅ vercel.json configuration is valid')
except json.JSONDecodeError as e:
    print(f'❌ Invalid JSON in vercel.json: {e}')
    exit(1)
except Exception as e:
    print(f'❌ Error validating vercel.json: {e}')
    exit(1)
"
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."

if [ "$1" = "--production" ] || [ "$2" = "--production" ]; then
    echo "📦 Deploying to production..."
    vercel --prod
else
    echo "🔧 Deploying to preview..."
    vercel
fi

echo "✅ Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Set environment variables in Vercel dashboard if not already set:"
printf '   - %s\n' "${REQUIRED_VARS[@]}"
echo "2. Test the deployed endpoints"
echo "3. Monitor logs and performance"
echo ""
echo "🔗 Useful commands:"
echo "  vercel logs                 # View deployment logs"
echo "  vercel env ls               # List environment variables"
echo "  vercel domains              # Manage custom domains"