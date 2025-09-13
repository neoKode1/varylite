# Admin Payment Processor Script
# This script allows you to process payments from the command line

param(
    [Parameter(Mandatory=$true)]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [string]$Amount = "120",
    
    [Parameter(Mandatory=$false)]
    [string]$Description = "Weekly payment batch",
    
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "http://localhost:3000"
)

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Blue = "Blue"

Write-Host "🔧 Admin Payment Processor" -ForegroundColor $Yellow
Write-Host "=========================" -ForegroundColor $Yellow

function Invoke-WeeklyPayment {
    param($Amount, $Description, $BaseUrl)
    
    Write-Host "💰 Processing Weekly Payment..." -ForegroundColor $Blue
    Write-Host "Amount: $$Amount" -ForegroundColor $Green
    Write-Host "Description: $Description" -ForegroundColor $Green
    
    try {
        $body = @{
            amount = [decimal]$Amount
            description = $Description
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/process-weekly-payment" -Method POST -Body $body -ContentType "application/json"
        
        Write-Host "✅ Payment processed successfully!" -ForegroundColor $Green
        Write-Host "Payment ID: $($response.paymentIntentId)" -ForegroundColor $Green
        Write-Host "Users charged: $($response.usersCharged)" -ForegroundColor $Green
        Write-Host "Total amount: $$($response.totalAmount)" -ForegroundColor $Green
        Write-Host "Credits distributed: $$($response.creditsDistributed)" -ForegroundColor $Green
        
    } catch {
        Write-Host "❌ Error processing payment: $($_.Exception.Message)" -ForegroundColor $Red
    }
}

function Get-PaymentStats {
    param($BaseUrl)
    
    Write-Host "📊 Fetching Payment Statistics..." -ForegroundColor $Blue
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/process-weekly-payment" -Method GET
        
        Write-Host "✅ Payment Statistics:" -ForegroundColor $Green
        Write-Host "Users with credits: $($response.usersWithCredits)" -ForegroundColor $Green
        Write-Host "Total credits in circulation: $$($response.totalCreditsInCirculation)" -ForegroundColor $Green
        Write-Host "Average credits per user: $$($response.averageCreditsPerUser)" -ForegroundColor $Green
        Write-Host "Payment batches: $($response.paymentBatches)" -ForegroundColor $Green
        
    } catch {
        Write-Host "❌ Error fetching stats: $($_.Exception.Message)" -ForegroundColor $Red
    }
}

function Invoke-CreditDistribution {
    param($Amount, $Description, $BaseUrl)
    
    Write-Host "🎁 Processing Credit Distribution..." -ForegroundColor $Blue
    Write-Host "Amount per user: $$Amount" -ForegroundColor $Green
    Write-Host "Description: $Description" -ForegroundColor $Green
    
    try {
        $body = @{
            creditsPerUser = [decimal]$Amount
            description = $Description
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/distribute-credits" -Method POST -Body $body -ContentType "application/json"
        
        Write-Host "✅ Credits distributed successfully!" -ForegroundColor $Green
        Write-Host "Users affected: $($response.usersAffected)" -ForegroundColor $Green
        Write-Host "Total credits distributed: $$($response.totalCreditsDistributed)" -ForegroundColor $Green
        
    } catch {
        Write-Host "❌ Error distributing credits: $($_.Exception.Message)" -ForegroundColor $Red
    }
}

# Main execution
switch ($Action.ToLower()) {
    "weekly" {
        Invoke-WeeklyPayment -Amount $Amount -Description $Description -BaseUrl $BaseUrl
    }
    "stats" {
        Get-PaymentStats -BaseUrl $BaseUrl
    }
    "distribute" {
        Invoke-CreditDistribution -Amount $Amount -Description $Description -BaseUrl $BaseUrl
    }
    default {
        Write-Host "❌ Invalid action. Use: weekly, stats, or distribute" -ForegroundColor $Red
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor $Yellow
        Write-Host "  .\admin-payment-processor.ps1 -Action weekly -Amount 120" -ForegroundColor $Blue
        Write-Host "  .\admin-payment-processor.ps1 -Action stats" -ForegroundColor $Blue
        Write-Host "  .\admin-payment-processor.ps1 -Action distribute -Amount 5.99" -ForegroundColor $Blue
    }
}

Write-Host ""
Write-Host "🏁 Script completed!" -ForegroundColor $Yellow
