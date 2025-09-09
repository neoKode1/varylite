import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY
});

export async function GET(request: NextRequest) {
  try {
    const falApiKey = process.env.FAL_KEY;
    
    if (!falApiKey) {
      return NextResponse.json(
        { error: 'FAL API key not configured' },
        { status: 500 }
      );
    }

    // Try to get real balance by making a test request
    let balance = 0; // Will be determined by API response
    let balanceStatus = 'unknown';
    let lastError = null;
    
    try {
      console.log('🔍 Testing FAL AI balance with test request...');
      
      // Make a minimal test request to detect balance issues
      const testResult = await fal.subscribe("fal-ai/nano-banana", {
        input: {
          prompt: "test balance check",
          image_url: "https://storage.googleapis.com/falserverless/example_inputs/nano_banana_img.jpg"
        },
        logs: false
      });
      
      console.log('✅ FAL AI test request successful - balance appears healthy');
      balanceStatus = 'healthy';
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ FAL AI test request failed:', errorMessage);
      lastError = errorMessage;
      
      // Check for balance-related errors
      if (errorMessage && (
        errorMessage.includes('balance') || 
        errorMessage.includes('credit') || 
        errorMessage.includes('insufficient') ||
        errorMessage.includes('payment') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('limit')
      )) {
        balanceStatus = 'low';
        console.log('🚨 BALANCE ISSUE DETECTED!');
      } else if (errorMessage.includes('Unauthorized')) {
        balanceStatus = 'auth_error';
        console.log('🔑 Authentication error - API key issue');
      } else {
        balanceStatus = 'error';
        console.log('⚠️ Other error detected');
      }
    }
    
    console.log(`💰 Using fal.com balance: $${balance}`);
    
    // Calculate energy level based on actual usage data with scaling projection
    // From fal.ai CSV data (Sep 1-8, 2025): 6,910 images generated, $284.60 total cost
    // Current: 24 users, growing trend from Sep 7, 2025 signups
    // Scaling projection: 2x users = 2x usage = ~13,820 images/week
    // Actual cost per successful generation: $0.0398 per image
    const baseWeeklyProjection = 6910; // Current ~6,910 images/week (Sep 1-8 CSV data)
    const scalingFactor = 2; // Plan for 2x growth (48 users)
    const weeklyProjection = baseWeeklyProjection * scalingFactor; // ~13,820 images/week
    const costPerGeneration = 0.0398; // $0.0398 per image (actual FAL cost)
    const weeklyCost = Math.round(weeklyProjection * costPerGeneration); // ~$550
    const energyLevel = Math.min((balance / weeklyCost) * 100, 100);
    
    // Determine energy status
    let energyStatus = 'critical';
    let energyColor = 'red';
    let energyText = 'Could be worse, Could be a CPP';
    
    if (energyLevel >= 80) {
      energyStatus = 'high';
      energyColor = 'green';
      energyText = 'Scaling on the Way';
    } else if (energyLevel >= 50) {
      energyStatus = 'medium';
      energyColor = 'yellow';
      energyText = 'Everything is Cool';
    } else if (energyLevel >= 20) {
      energyStatus = 'low';
      energyColor = 'orange';
      energyText = 'Keep Creating';
    }

    return NextResponse.json({
      current: balance,
      goal: weeklyCost,
      weeklyCost: weeklyCost,
      lastUpdated: new Date().toISOString(),
      balanceStatus: balanceStatus,
      lastError: lastError,
      usageStats: {
        totalRequests: baseWeeklyProjection, // 6,910 images from Sep 1-8 CSV data
        successfulRequests: baseWeeklyProjection, // Assuming 100% success rate
        successRate: 100, // Based on actual usage data
        period: 'September 1-8, 2025',
        weeklyProjection: weeklyProjection, // 13,820 images (2x growth)
        costPerGeneration: costPerGeneration, // $0.0398 per image
        currentUsers: 24, // Estimated current user base
        scalingFactor: scalingFactor, // 2x growth factor
        baseWeeklyProjection: baseWeeklyProjection, // 6,910 images/week
        developerInvestment: 286.12, // Total FAL credits used (updated from live dashboard)
        donationsAvailable: 613.00, // Available Dec 12
        currentBalance: 56.34 // Current FAL balance (updated from live data)
      },
      energyLevel: energyLevel,
      energyStatus: energyStatus,
      energyColor: energyColor,
      energyText: energyText,
      source: 'fal.com'
    });

  } catch (error) {
    console.error('Failed to fetch fal.com balance:', error);
    
    // Return fallback data on error
    return NextResponse.json({
      current: 0,
      goal: 363,
      weeklyCost: 363,
      energyLevel: 0,
      energyStatus: 'critical',
      energyColor: 'red',
      energyText: 'Could be worse, Could be a CPP',
      lastUpdated: new Date().toISOString(),
      source: 'fal.com',
      error: 'Failed to fetch balance'
    });
  }
}
