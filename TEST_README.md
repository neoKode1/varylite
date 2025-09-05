# EndFrame API Test Scripts

This directory contains test scripts for the EndFrame video generation feature using the Minimax API.

## Test Scripts

### 1. `test-endframe.js` (Node.js)
A comprehensive Node.js test script that tests:
- Direct Minimax API video generation
- Task polling and status checking
- Our custom `/api/endframe` endpoint

**Usage:**
```bash
npm run test:endframe
```

### 2. `test-endframe.ps1` (PowerShell)
A PowerShell script for Windows users that tests the same functionality.

**Usage:**
```bash
npm run test:endframe:ps1
```

### 3. `test-endframe.sh` (Bash)
A bash script for Unix/Linux/macOS users.

**Usage:**
```bash
./test-endframe.sh
```

## Prerequisites

1. **Set your Minimax API key:**
   ```bash
   export MINIMAX_API_KEY="your_api_key_here"
   ```

2. **For PowerShell (Windows):**
   ```powershell
   $env:MINIMAX_API_KEY="your_api_key_here"
   ```

3. **Make sure your development server is running** (for testing our API endpoint):
   ```bash
   npm run dev
   ```

## What the Tests Do

### Test 1: Direct Minimax API
- Creates a simple test image (1x1 pixel PNG)
- Submits a video generation task to Minimax API
- Uses the exact curl format you provided:
  ```json
  {
    "model": "MiniMax-Hailuo-02",
    "prompt": "A woman is drinking coffee.",
    "first_frame_image": "data:image/jpeg;base64,{image_file}",
    "last_frame_image": "data:image/jpeg;base64,{image_file}",
    "duration": 6,
    "resolution": "1080P"
  }
  ```

### Test 2: Task Polling
- Polls the task status every 10 seconds
- Tests the polling endpoint: `https://api.minimax.io/v1/videos/status/{task_id}`
- Handles different status responses (completed, failed, processing)
- Extracts video URL when generation is complete

### Test 3: Our API Endpoint
- Tests our custom `/api/endframe` endpoint
- Verifies the integration between frontend and backend
- Ensures proper error handling and response formatting

## Expected Results

### Successful Test Run:
```
🚀 Starting EndFrame API Tests
==================================================

📋 TEST 1: Direct Minimax API
------------------------------
📤 Submitting video generation task...
✅ Task submitted successfully! Task ID: 309248204734683

📋 TEST 2: Task Polling
------------------------------
📊 Polling attempt 1/30...
⏳ Task status: processing. Waiting 10 seconds...
📊 Polling attempt 2/30...
✅ Video generation completed!
🎬 Video URL: https://example.com/generated-video.mp4

📋 TEST 3: Our API Endpoint
------------------------------
✅ Our API working! Task ID: 309248204734684

==================================================
🏁 Tests completed!
```

### Common Issues:

1. **Insufficient Balance (Error 1008):**
   ```
   ❌ API Error: 1008 - insufficient balance
   💡 This means insufficient balance in your Minimax account
   ```

2. **Polling Endpoint 404:**
   ```
   ❌ Minimax polling error: 404 - 404 page not found
   ```

3. **Our API Not Running:**
   ```
   ❌ Our API request failed: connect ECONNREFUSED 127.0.0.1:3000
   💡 Make sure your development server is running on localhost:3000
   ```

## Troubleshooting

1. **Check your API key** is set correctly
2. **Verify your Minimax account balance** (should be > $0)
3. **Ensure your dev server is running** for Test 3
4. **Check the console logs** for detailed error information

## Customization

You can modify the test scripts to:
- Use your own test images
- Change the prompt text
- Adjust polling intervals
- Test different video resolutions/durations
- Add more comprehensive error handling
