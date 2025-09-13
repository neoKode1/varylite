# Credit System Schema Test Runner
# Run this PowerShell script to test your credit system setup

Write-Host "🧪 Credit System Schema Test Runner" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if the test file exists
if (-not (Test-Path "test-credit-schema.js")) {
    Write-Host "❌ test-credit-schema.js not found in current directory" -ForegroundColor Red
    exit 1
}

# Install required dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
try {
    npm list @supabase/supabase-js > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "📦 Installing @supabase/supabase-js..." -ForegroundColor Yellow
        npm install @supabase/supabase-js
    } else {
        Write-Host "✅ Dependencies already installed" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to check/install dependencies" -ForegroundColor Red
    exit 1
}

# Run the test
Write-Host "🚀 Running credit system tests..." -ForegroundColor Yellow
Write-Host ""

try {
    node test-credit-schema.js
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "🎉 All tests completed successfully!" -ForegroundColor Green
        Write-Host "Your credit system is properly set up and ready to use." -ForegroundColor Green
    } else {
        Write-Host "⚠️ Some tests failed. Please check the output above." -ForegroundColor Yellow
        Write-Host "You may need to run the database schemas first." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to run tests: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. If tests failed, run the SQL schemas in Supabase:" -ForegroundColor White
Write-Host "   - credit-system-schema.sql" -ForegroundColor Gray
Write-Host "   - user-credit-display-schema.sql" -ForegroundColor Gray
Write-Host "   - grandfather-existing-users.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "2. If tests passed, your credit system is ready!" -ForegroundColor White
Write-Host "   - Users can see their credit balance" -ForegroundColor Gray
Write-Host "   - Users can see generation calculations" -ForegroundColor Gray
Write-Host "   - Admin users bypass credit system" -ForegroundColor Gray
Write-Host "   - Purchase system is ready" -ForegroundColor Gray
