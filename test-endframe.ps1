# Test script for EndFrame API using PowerShell
# This script tests the video generation from start to end frame

Write-Host "🚀 Starting EndFrame API Tests" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

# Check if API key is set
if (-not $env:MINIMAX_API_KEY) {
    Write-Host "❌ MINIMAX_API_KEY environment variable is required" -ForegroundColor Red
    Write-Host "💡 Set it with: `$env:MINIMAX_API_KEY='your_api_key_here'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ API Key found: $($env:MINIMAX_API_KEY.Substring(0,8))..." -ForegroundColor Green

# Create a simple test image (1x1 pixel PNG in base64)
Write-Host "📸 Creating test images..." -ForegroundColor Blue
$testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

Write-Host "📤 Test 1: Submitting video generation task..." -ForegroundColor Blue
Write-Host "--------------------------------------------------" -ForegroundColor Cyan

# Submit video generation task
$requestBody = @{
    model = "MiniMax-Hailuo-02"
    prompt = "A woman is drinking coffee."
    first_frame_image = "data:image/png;base64,$testImageBase64"
    last_frame_image = "data:image/png;base64,$testImageBase64"
    duration = 6
    resolution = "1080P"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.minimax.io/v1/video_generation" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $env:MINIMAX_API_KEY"
        } `
        -Body $requestBody

    Write-Host "📊 Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3

    # Extract task ID
    $taskId = $response.task_id

    if (-not $taskId) {
        Write-Host "❌ No task ID found in response" -ForegroundColor Red
        Write-Host "🔍 Checking for errors..." -ForegroundColor Yellow
        
        # Check for API errors
        if ($response.base_resp -and $response.base_resp.status_code -ne 0) {
            $errorCode = $response.base_resp.status_code
            $errorMsg = $response.base_resp.status_msg
            Write-Host "❌ API Error: $errorCode - $errorMsg" -ForegroundColor Red
            
            if ($errorCode -eq 1008) {
                Write-Host "💡 This means insufficient balance in your Minimax account" -ForegroundColor Yellow
            }
        }
        
        exit 1
    }

    Write-Host "✅ Task submitted successfully! Task ID: $taskId" -ForegroundColor Green

    Write-Host ""
    Write-Host "🔍 Test 2: Polling task status..." -ForegroundColor Blue
    Write-Host "--------------------------------------------------" -ForegroundColor Cyan

    # Poll for task completion
    $maxAttempts = 30
    $attempt = 1

    while ($attempt -le $maxAttempts) {
        Write-Host "📊 Polling attempt $attempt/$maxAttempts..." -ForegroundColor Yellow
        
        try {
            $statusResponse = Invoke-RestMethod -Uri "https://api.minimax.io/v1/query/video_generation?task_id=$taskId" `
                -Method GET `
                -Headers @{
                    "Authorization" = "Bearer $env:MINIMAX_API_KEY"
                }

            Write-Host "📊 Status Response:" -ForegroundColor Yellow
            $statusResponse | ConvertTo-Json -Depth 3

            $status = $statusResponse.status

            if ($status -eq "completed" -or $status -eq "success" -or $status -eq "finished") {
                Write-Host "✅ Video generation completed!" -ForegroundColor Green
                
                # Extract video URL
                $videoUrl = $statusResponse.video_url
                if (-not $videoUrl) {
                    $videoUrl = $statusResponse.output.video_url
                }
                if (-not $videoUrl) {
                    $videoUrl = $statusResponse.data.video_url
                }
                if (-not $videoUrl) {
                    $videoUrl = $statusResponse.url
                }
                
                if ($videoUrl) {
                    Write-Host "🎬 Video URL: $videoUrl" -ForegroundColor Green
                } else {
                    Write-Host "⚠️  Video completed but no URL found in response" -ForegroundColor Yellow
                }
                
                break
            } elseif ($status -eq "failed" -or $status -eq "error") {
                Write-Host "❌ Video generation failed" -ForegroundColor Red
                if ($statusResponse.error) {
                    Write-Host "❌ Error: $($statusResponse.error)" -ForegroundColor Red
                }
                break
            } else {
                Write-Host "⏳ Task status: $status. Waiting 10 seconds..." -ForegroundColor Yellow
                Start-Sleep -Seconds 10
            }
        } catch {
            Write-Host "❌ Polling request failed: $($_.Exception.Message)" -ForegroundColor Red
            break
        }
        
        $attempt++
    }

    if ($attempt -gt $maxAttempts) {
        Write-Host "⏰ Polling timeout reached" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "🧪 Test 3: Testing our /api/endframe endpoint..." -ForegroundColor Blue
    Write-Host "--------------------------------------------------" -ForegroundColor Cyan

    # Test our API endpoint
    $ourApiBody = @{
        firstImage = $testImageBase64
        secondImage = $testImageBase64
        prompt = "A woman is drinking coffee."
        model = "MiniMax-Hailuo-02"
    } | ConvertTo-Json

    try {
        $ourApiResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/endframe" `
            -Method POST `
            -Headers @{
                "Content-Type" = "application/json"
            } `
            -Body $ourApiBody

        Write-Host "📊 Our API Response:" -ForegroundColor Yellow
        $ourApiResponse | ConvertTo-Json -Depth 3
    } catch {
        Write-Host "❌ Our API request failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 Make sure your development server is running on localhost:3000" -ForegroundColor Yellow
    }

} catch {
    Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🏁 Tests completed!" -ForegroundColor Green
