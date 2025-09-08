# Video Models Test Suite

This directory contains comprehensive test scripts for testing the new video generation models: **Veo3 Fast** and **Minimax 2.0**.

## 🎯 Overview

The test suite includes multiple test scripts to verify the functionality of both video models that use the Fal proxy:

- **Veo3 Fast** (`/api/veo3-fast`) - Image-to-video generation
- **Minimax 2.0** (`/api/minimax-2`) - Image-to-video generation

## 📁 Test Scripts

### 1. `test-video-models-quick.js`
**Quick functionality test**
- Tests both models with a single, simple prompt
- Fast execution (under 30 seconds)
- Good for basic verification

```bash
node test-video-models-quick.js
```

### 2. `test-veo3-fast.js`
**Comprehensive Veo3 Fast testing**
- 4 different test scenarios
- Various prompts, durations, and resolutions
- Detailed logging and results

```bash
node test-veo3-fast.js
```

### 3. `test-minimax-2.js`
**Comprehensive Minimax 2.0 testing**
- 5 different test scenarios
- Character animations, nature scenes, urban scenes
- Performance metrics and error handling

```bash
node test-minimax-2.js
```

### 4. `test-video-models-comparison.js`
**Side-by-side comparison testing**
- Tests both models with identical inputs
- Performance comparison
- Success rate analysis
- Response time metrics

```bash
node test-video-models-comparison.js
```

### 5. `test-video-models.ps1` (PowerShell)
**Interactive test runner for Windows**
- Menu-driven interface
- Server health checks
- Option to run individual or all tests

```powershell
.\test-video-models.ps1
```

### 6. `test-video-models.sh` (Bash)
**Interactive test runner for Unix/Linux/Mac**
- Menu-driven interface
- Server health checks
- Option to run individual or all tests

```bash
chmod +x test-video-models.sh
./test-video-models.sh
```

## 🚀 Quick Start

### Prerequisites
1. **Node.js** installed
2. **Development server running** (`npm run dev`)
3. **FAL_KEY** environment variable set
4. **Internet connection** for test images

### Running Tests

#### Option 1: Quick Test (Recommended for first run)
```bash
node test-video-models-quick.js
```

#### Option 2: Interactive Menu
```bash
# Windows
.\test-video-models.ps1

# Unix/Linux/Mac
./test-video-models.sh
```

#### Option 3: Individual Tests
```bash
# Test Veo3 Fast only
node test-veo3-fast.js

# Test Minimax 2.0 only
node test-minimax-2.js

# Compare both models
node test-video-models-comparison.js
```

## 📊 Test Results

Each test script generates detailed JSON result files:

- `veo3-test-results-[timestamp].json`
- `minimax2-test-results-[timestamp].json`
- `video-models-comparison-[timestamp].json`

### Result File Structure
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "testType": "Veo3 Fast API",
  "summary": {
    "total": 4,
    "successful": 3,
    "failed": 1,
    "errors": 0,
    "successRate": "75.0%"
  },
  "results": [
    {
      "test": "Basic Animation",
      "status": "SUCCESS",
      "duration": 2500,
      "videoUrl": "https://...",
      "requestId": "req_123..."
    }
  ]
}
```

## 🧪 Test Scenarios

### Veo3 Fast Tests
1. **Basic Animation** - Character speaking to camera
2. **Nature Scene** - Ocean waves and seagulls
3. **Urban Scene** - City traffic and pedestrians
4. **Short Duration** - Cat stretching animation

### Minimax 2.0 Tests
1. **Character Animation** - Person waving and smiling
2. **Action Scene** - Dog running through flowers
3. **Cinematic Shot** - City skyline at sunset
4. **Nature Movement** - Leaves swaying in wind
5. **Minimal Animation** - Geometric shape rotation

### Comparison Tests
- Same prompts tested on both models
- Performance metrics comparison
- Success rate analysis
- Response time benchmarking

## 🔧 Configuration

### Test Images
The tests use publicly available images:
- Fal.ai example image
- Unsplash stock photos (720x720, cropped)

### Test Parameters
- **Duration**: 8 seconds (standard)
- **Resolution**: 720p and 1080p
- **Audio**: Enabled/disabled based on scenario
- **Rate Limiting**: 2-3 second delays between requests

## 🐛 Troubleshooting

### Common Issues

#### 1. "Development server not running"
```bash
npm run dev
```

#### 2. "FAL API key not configured"
Check your `.env.local` file:
```
FAL_KEY=your_fal_api_key_here
```

#### 3. "Connection refused"
- Ensure the server is running on `localhost:3000`
- Check for port conflicts

#### 4. "Request timeout"
- Check internet connection
- Verify Fal.ai service status
- Try reducing test frequency

### Debug Mode
Add `DEBUG=true` to see detailed request/response logs:
```bash
DEBUG=true node test-video-models-quick.js
```

## 📈 Performance Expectations

### Typical Response Times
- **Veo3 Fast**: 2-5 seconds (API response)
- **Minimax 2.0**: 3-6 seconds (API response)
- **Video Generation**: 30-120 seconds (actual processing)

### Success Rates
- **Expected**: 80-95% success rate
- **Factors**: Network, API limits, image quality

## 🔄 Continuous Testing

### Automated Testing
For CI/CD integration, use the quick test:
```bash
node test-video-models-quick.js
```

### Monitoring
Set up regular testing to monitor:
- API availability
- Response times
- Success rates
- Error patterns

## 📝 Notes

- Tests use real API calls and may consume credits
- Results include actual video URLs for verification
- All tests include proper error handling and logging
- Scripts are designed to be non-destructive and safe to run

## 🤝 Contributing

To add new test scenarios:
1. Update the `TEST_PROMPTS` array in the relevant script
2. Add new test images to `TEST_IMAGES`
3. Update this README with new test descriptions
4. Test the new scenarios thoroughly

---

**Happy Testing! 🎬✨**
