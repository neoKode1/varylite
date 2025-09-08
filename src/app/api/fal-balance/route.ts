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
  // Updated balance to $595.95
  const balance = 595.95;
    
    console.log(`💰 Using fal.com balance: $${balance}`);
    
    // Calculate energy level based on actual usage data with scaling projection
    // From fal.ai analytics (Sep 1-8, 2025): 5,857 images generated, $233.11 cost
    // Current: 24 users, growing trend from Sep 7, 2025 signups
    // Scaling projection: 2x users = 2x usage = ~11,714 images/week
    // Actual cost per successful generation: $0.0398 per image
    const baseWeeklyProjection = 5857; // Current ~5,857 images/week (Sep 1-8 data)
    const scalingFactor = 2; // Plan for 2x growth (48 users)
    const weeklyProjection = baseWeeklyProjection * scalingFactor; // ~11,714 images/week
    const costPerGeneration = 0.0398; // $0.0398 per image (actual FAL cost)
    const weeklyCost = Math.round(weeklyProjection * costPerGeneration); // ~$466
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
      usageStats: {
        totalRequests: baseWeeklyProjection, // 5,857 images from Sep 1-8 data
        successfulRequests: baseWeeklyProjection, // Assuming 100% success rate
        successRate: 100, // Based on actual usage data
        period: 'September 1-8, 2025',
        weeklyProjection: weeklyProjection, // 11,714 images (2x growth)
        costPerGeneration: costPerGeneration, // $0.0398 per image
        currentUsers: 24, // Estimated current user base
        scalingFactor: scalingFactor, // 2x growth factor
        baseWeeklyProjection: baseWeeklyProjection // 5,857 images/week
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
