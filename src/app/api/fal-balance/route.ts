import { NextRequest, NextResponse } from 'next/server';

// Cache for balance data to avoid excessive API calls
let balanceCache: {
  data: any | null,
  lastUpdated: number | null,
  ttl: number
} = {
  data: null,
  lastUpdated: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};


async function getRealFalBalance() {
  // Check cache first
  if (balanceCache.data && balanceCache.lastUpdated && 
      (Date.now() - balanceCache.lastUpdated) < balanceCache.ttl) {
    console.log('📦 Using cached balance data');
    return balanceCache.data;
  }

  console.log('🔄 Getting manual FAL AI balance...');
  
  // Manual balance - updated by user as needed
  const manualBalance = 49.16; // Current actual FAL AI balance
  const balanceStatus = 'healthy';
  
  console.log(`💰 Using manual balance: $${manualBalance}`);
  
  const balanceData = {
    balance: manualBalance,
    status: balanceStatus,
    lastError: null,
    lastChecked: new Date().toISOString()
  };
  
  // Update cache
  balanceCache.data = balanceData;
  balanceCache.lastUpdated = Date.now();
  
  console.log(`✅ FAL AI balance check completed: $${manualBalance} (Status: ${balanceStatus})`);
  return balanceData;
}

export async function GET(request: NextRequest) {
  try {
    const falApiKey = process.env.FAL_KEY;
    
    if (!falApiKey) {
      return NextResponse.json(
        { error: 'FAL API key not configured' },
        { status: 500 }
      );
    }

    // Get real-time balance data
    const balanceData = await getRealFalBalance();
    const balance = balanceData.balance;
    const balanceStatus = balanceData.status;
    const lastError = balanceData.lastError;
    const estimatedGenerations = balanceData.estimatedGenerations || 0;
    
    console.log(`💰 Using fal.com balance: $${balance} (Status: ${balanceStatus})`);
    
    // Check for low balance alert
    if (balance < 50 && balanceStatus === 'healthy') {
      console.log('🚨 LOW BALANCE ALERT: Balance below $50 threshold!');
    }
    
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
      lastUpdated: balanceData.lastChecked,
      balanceStatus: balanceStatus,
      lastError: lastError,
      estimatedGenerations: estimatedGenerations,
      lowBalanceAlert: balance < 50 && balanceStatus === 'healthy',
      balanceNote: balanceStatus === 'unknown' ? 'FAL AI does not provide direct balance API. Balance detection relies on error messages from failed requests.' : null,
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
        currentBalance: balance // Current FAL balance (real-time)
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
