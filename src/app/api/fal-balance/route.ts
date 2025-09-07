import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const falApiKey = process.env.FAL_KEY;
    
    if (!falApiKey) {
      return NextResponse.json(
        { error: 'FAL API key not configured' },
        { status: 500 }
      );
    }

    // For now, we'll use a mock balance since fal.ai balance API endpoint is not publicly documented
    // TODO: Replace with actual fal.ai balance API when available
    // You mentioned the balance is $21.73, so we'll use that as the current balance
    const balance = 21.73;
    
    console.log(`💰 Using fal.com balance: $${balance}`);
    
    // Calculate energy level based on actual usage data with scaling projection
    // From fal.ai analytics (Sep 2-6, 2025): 4,216 total requests, 3,323 successful
    // Current: 24 users, growing trend from Sep 7, 2025 signups
    // Scaling projection: 2x users = 2x usage = ~9,300 generations/week
    // Actual cost per successful generation: $0.039 per image
    const baseWeeklyProjection = 4650; // Current ~4,650 successful generations/week
    const scalingFactor = 2; // Plan for 2x growth (48 users)
    const weeklyProjection = baseWeeklyProjection * scalingFactor; // ~9,300 generations/week
    const costPerGeneration = 0.039; // $0.039 per image
    const weeklyCost = Math.round(weeklyProjection * costPerGeneration); // ~$363
    const energyLevel = Math.min((balance / weeklyCost) * 100, 100);
    
    // Determine energy status
    let energyStatus = 'critical';
    let energyColor = 'red';
    let energyText = 'Critical Energy';
    
    if (energyLevel >= 80) {
      energyStatus = 'high';
      energyColor = 'green';
      energyText = 'High Energy';
    } else if (energyLevel >= 50) {
      energyStatus = 'medium';
      energyColor = 'yellow';
      energyText = 'Medium Energy';
    } else if (energyLevel >= 20) {
      energyStatus = 'low';
      energyColor = 'orange';
      energyText = 'Low Energy';
    }

    return NextResponse.json({
      current: balance,
      goal: weeklyCost,
      weeklyCost: weeklyCost,
      energyLevel: energyLevel,
      energyStatus: energyStatus,
      energyColor: energyColor,
      energyText: energyText,
      lastUpdated: new Date().toISOString(),
      source: 'fal.com',
      usageStats: {
        totalRequests: 4216,
        successfulRequests: 3323,
        successRate: 79,
        period: 'Sep 2-6, 2025',
        weeklyProjection: weeklyProjection,
        costPerGeneration: costPerGeneration,
        currentUsers: 24,
        scalingFactor: scalingFactor,
        baseWeeklyProjection: baseWeeklyProjection
      }
    });

  } catch (error) {
    console.error('Failed to fetch fal.com balance:', error);
    
    // Return fallback data on error
    return NextResponse.json({
      current: 0,
      goal: 300,
      weeklyCost: 300,
      energyLevel: 0,
      energyStatus: 'critical',
      energyColor: 'red',
      energyText: 'Critical Energy',
      lastUpdated: new Date().toISOString(),
      source: 'fal.com',
      error: 'Failed to fetch balance'
    });
  }
}
