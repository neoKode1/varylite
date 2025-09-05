#!/bin/bash

# Test script for EndFrame API using curl
# This script tests the video generation from start to end frame

echo "🚀 Starting EndFrame API Tests"
echo "=================================================="

# Check if API key is set
if [ -z "$MINIMAX_API_KEY" ]; then
    echo "❌ MINIMAX_API_KEY environment variable is required"
    echo "💡 Set it with: export MINIMAX_API_KEY='your_api_key_here'"
    exit 1
fi

echo "✅ API Key found: ${MINIMAX_API_KEY:0:8}..."

# Create a simple test image (1x1 pixel PNG)
echo "📸 Creating test images..."
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > test-start.png
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > test-end.png

# Convert images to base64
START_IMAGE_B64=$(base64 -w 0 test-start.png)
END_IMAGE_B64=$(base64 -w 0 test-end.png)

echo "📤 Test 1: Submitting video generation task..."
echo "--------------------------------------------------"

# Submit video generation task
RESPONSE=$(curl -s -X POST "https://api.minimax.io/v1/video_generation" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -d "{
    \"model\": \"MiniMax-Hailuo-02\",
    \"prompt\": \"A woman is drinking coffee.\",
    \"first_frame_image\": \"data:image/png;base64,$START_IMAGE_B64\",
    \"last_frame_image\": \"data:image/png;base64,$END_IMAGE_B64\",
    \"duration\": 6,
    \"resolution\": \"1080P\"
  }")

echo "📊 Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Extract task ID
TASK_ID=$(echo "$RESPONSE" | jq -r '.task_id' 2>/dev/null)

if [ "$TASK_ID" = "null" ] || [ -z "$TASK_ID" ]; then
    echo "❌ No task ID found in response"
    echo "🔍 Checking for errors..."
    
    # Check for API errors
    ERROR_CODE=$(echo "$RESPONSE" | jq -r '.base_resp.status_code' 2>/dev/null)
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.base_resp.status_msg' 2>/dev/null)
    
    if [ "$ERROR_CODE" != "null" ] && [ "$ERROR_CODE" != "0" ]; then
        echo "❌ API Error: $ERROR_CODE - $ERROR_MSG"
        if [ "$ERROR_CODE" = "1008" ]; then
            echo "💡 This means insufficient balance in your Minimax account"
        fi
    fi
    
    exit 1
fi

echo "✅ Task submitted successfully! Task ID: $TASK_ID"

echo ""
echo "🔍 Test 2: Polling task status..."
echo "--------------------------------------------------"

# Poll for task completion
MAX_ATTEMPTS=30
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "📊 Polling attempt $ATTEMPT/$MAX_ATTEMPTS..."
    
    STATUS_RESPONSE=$(curl -s -X GET "https://api.minimax.io/v1/query/video_generation?task_id=$TASK_ID" \
      -H "Authorization: Bearer $MINIMAX_API_KEY")
    
    echo "📊 Status Response:"
    echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
    
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status' 2>/dev/null)
    
    if [ "$STATUS" = "completed" ] || [ "$STATUS" = "success" ] || [ "$STATUS" = "finished" ]; then
        echo "✅ Video generation completed!"
        
        # Extract video URL
        VIDEO_URL=$(echo "$STATUS_RESPONSE" | jq -r '.video_url // .output.video_url // .data.video_url // .url' 2>/dev/null)
        
        if [ "$VIDEO_URL" != "null" ] && [ -n "$VIDEO_URL" ]; then
            echo "🎬 Video URL: $VIDEO_URL"
        else
            echo "⚠️  Video completed but no URL found in response"
        fi
        
        break
    elif [ "$STATUS" = "failed" ] || [ "$STATUS" = "error" ]; then
        echo "❌ Video generation failed"
        ERROR_MSG=$(echo "$STATUS_RESPONSE" | jq -r '.error' 2>/dev/null)
        if [ "$ERROR_MSG" != "null" ]; then
            echo "❌ Error: $ERROR_MSG"
        fi
        break
    else
        echo "⏳ Task status: $STATUS. Waiting 10 seconds..."
        sleep 10
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo "⏰ Polling timeout reached"
fi

echo ""
echo "🧪 Test 3: Testing our /api/endframe endpoint..."
echo "--------------------------------------------------"

# Test our API endpoint
OUR_API_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/endframe" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstImage\": \"$START_IMAGE_B64\",
    \"secondImage\": \"$END_IMAGE_B64\",
    \"prompt\": \"A woman is drinking coffee.\",
    \"model\": \"MiniMax-Hailuo-02\"
  }")

echo "📊 Our API Response:"
echo "$OUR_API_RESPONSE" | jq '.' 2>/dev/null || echo "$OUR_API_RESPONSE"

# Clean up test files
echo ""
echo "🧹 Cleaning up test files..."
rm -f test-start.png test-end.png

echo ""
echo "=================================================="
echo "🏁 Tests completed!"
