#!/bin/bash

# Bash test script for video models
# Run this script to test both Veo3 Fast and Minimax 2.0

echo "🎬 Video Models Test Suite"
echo "========================="

# Check if Node.js is available
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js version: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if the development server is running
echo ""
echo "🔍 Checking if development server is running..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Development server is running"
else
    echo "❌ Development server not running. Please start it with 'npm run dev'"
    exit 1
fi

# Menu for test selection
echo ""
echo "📋 Select test type:"
echo "1. Quick Test (both models, basic functionality)"
echo "2. Veo3 Fast Only (comprehensive tests)"
echo "3. Minimax 2.0 Only (comprehensive tests)"
echo "4. Comparison Test (both models with same inputs)"
echo "5. Run All Tests"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Running Quick Test..."
        node test-video-models-quick.js
        ;;
    2)
        echo ""
        echo "🎬 Running Veo3 Fast Tests..."
        node test-veo3-fast.js
        ;;
    3)
        echo ""
        echo "🎬 Running Minimax 2.0 Tests..."
        node test-minimax-2.js
        ;;
    4)
        echo ""
        echo "⚖️ Running Comparison Tests..."
        node test-video-models-comparison.js
        ;;
    5)
        echo ""
        echo "🎯 Running All Tests..."
        
        echo ""
        echo "1️⃣ Quick Test..."
        node test-video-models-quick.js
        
        echo ""
        echo "2️⃣ Veo3 Fast Tests..."
        node test-veo3-fast.js
        
        echo ""
        echo "3️⃣ Minimax 2.0 Tests..."
        node test-minimax-2.js
        
        echo ""
        echo "4️⃣ Comparison Tests..."
        node test-video-models-comparison.js
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again and select 1-5."
        exit 1
        ;;
esac

echo ""
echo "🎉 Test execution completed!"
echo "📁 Check the generated JSON files for detailed results."
