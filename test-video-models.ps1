# PowerShell test script for video models
# Run this script to test both Veo3 Fast and Minimax 2.0

Write-Host "🎬 Video Models Test Suite" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if the development server is running
Write-Host "`n🔍 Checking if development server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5
    Write-Host "✅ Development server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Development server not running. Please start it with 'npm run dev'" -ForegroundColor Red
    exit 1
}

# Menu for test selection
Write-Host "`n📋 Select test type:" -ForegroundColor Yellow
Write-Host "1. Quick Test (both models, basic functionality)" -ForegroundColor White
Write-Host "2. Veo3 Fast Only (comprehensive tests)" -ForegroundColor White
Write-Host "3. Minimax 2.0 Only (comprehensive tests)" -ForegroundColor White
Write-Host "4. Comparison Test (both models with same inputs)" -ForegroundColor White
Write-Host "5. Run All Tests" -ForegroundColor White

$choice = Read-Host "`nEnter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host "`n🚀 Running Quick Test..." -ForegroundColor Green
        node test-video-models-quick.js
    }
    "2" {
        Write-Host "`n🎬 Running Veo3 Fast Tests..." -ForegroundColor Green
        node test-veo3-fast.js
    }
    "3" {
        Write-Host "`n🎬 Running Minimax 2.0 Tests..." -ForegroundColor Green
        node test-minimax-2.js
    }
    "4" {
        Write-Host "`n⚖️ Running Comparison Tests..." -ForegroundColor Green
        node test-video-models-comparison.js
    }
    "5" {
        Write-Host "`n🎯 Running All Tests..." -ForegroundColor Green
        
        Write-Host "`n1️⃣ Quick Test..." -ForegroundColor Cyan
        node test-video-models-quick.js
        
        Write-Host "`n2️⃣ Veo3 Fast Tests..." -ForegroundColor Cyan
        node test-veo3-fast.js
        
        Write-Host "`n3️⃣ Minimax 2.0 Tests..." -ForegroundColor Cyan
        node test-minimax-2.js
        
        Write-Host "`n4️⃣ Comparison Tests..." -ForegroundColor Cyan
        node test-video-models-comparison.js
    }
    default {
        Write-Host "❌ Invalid choice. Please run the script again and select 1-5." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n🎉 Test execution completed!" -ForegroundColor Green
Write-Host "📁 Check the generated JSON files for detailed results." -ForegroundColor Yellow
