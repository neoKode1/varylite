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
    
    // Calculate energy level based on your weekly cost
    const weeklyCost = 300; // Your weekly operational cost
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
      source: 'fal.com'
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
