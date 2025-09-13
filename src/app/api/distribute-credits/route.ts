import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CreditDistributionCalculator } from '@/lib/creditDistributionCalculator';

export interface DistributeCreditsRequest {
  totalBalance: number;
  estimatedUsers?: number;
  batchName: string;
}

export interface DistributeCreditsResponse {
  success: boolean;
  distribution?: {
    totalBalance: number;
    estimatedUsers: number;
    creditsPerUser: number;
    generationsPerUser: {
      nanoBanana: number;
      veo3Fast: number;
      seedancePro: number;
      runwayVideo: number;
    };
    totalGenerations: {
      nanoBanana: number;
      veo3Fast: number;
      seedancePro: number;
      runwayVideo: number;
    };
    recommendations: string[];
  };
  scenarios?: Array<{
    scenario: string;
    userCount: number;
    creditsPerUser: number;
    generationsPerUser: {
      nanoBanana: number;
      veo3Fast: number;
      seedancePro: number;
    };
  }>;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<DistributeCreditsResponse>> {
  try {
    const body: DistributeCreditsRequest = await request.json();
    const { totalBalance, estimatedUsers = 24, batchName } = body;

    // Validate input
    if (!totalBalance || totalBalance <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid total balance' },
        { status: 400 }
      );
    }

    if (!batchName || batchName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Batch name is required' },
        { status: 400 }
      );
    }

    // Calculate distribution
    const distribution = CreditDistributionCalculator.calculateDistribution(
      totalBalance,
      estimatedUsers
    );

    // Calculate multiple scenarios
    const scenarios = CreditDistributionCalculator.calculateMultipleScenarios(totalBalance);

    // Log the distribution calculation
    console.log('📊 [DistributeCredits] Distribution calculated:', {
      totalBalance,
      estimatedUsers,
      creditsPerUser: distribution.creditsPerUser,
      batchName,
    });

    return NextResponse.json({
      success: true,
      distribution,
      scenarios,
    });

  } catch (error) {
    console.error('❌ [DistributeCredits] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current credit statistics
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Get total users with credits
    const { data: usersWithCredits, error: usersError } = await supabaseAdmin
      .from('user_credits')
      .select('user_id')
      .eq('is_active', true);

    if (usersError) {
      console.error('❌ [DistributeCredits] Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    // Get total credits distributed
    const { data: totalCredits, error: creditsError } = await supabaseAdmin
      .from('user_credits')
      .select('total_credits')
      .eq('is_active', true);

    if (creditsError) {
      console.error('❌ [DistributeCredits] Error fetching credits:', creditsError);
      return NextResponse.json(
        { error: 'Failed to fetch credit data' },
        { status: 500 }
      );
    }

    const totalCreditsDistributed = totalCredits?.reduce(
      (sum, credit) => sum + Number(credit.total_credits),
      0
    ) || 0;

    const userCount = usersWithCredits?.length || 0;

    // Calculate current distribution
    const currentDistribution = CreditDistributionCalculator.calculateDistribution(
      120, // Current balance
      userCount
    );

    return NextResponse.json({
      success: true,
      currentStats: {
        totalUsers: userCount,
        totalCreditsDistributed,
        remainingBalance: 120 - totalCreditsDistributed,
      },
      currentDistribution,
      scenarios: CreditDistributionCalculator.calculateMultipleScenarios(120),
    });

  } catch (error) {
    console.error('❌ [DistributeCredits] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
