import { NextRequest, NextResponse } from 'next/server';
import { pricingService } from './pricingService';
import { UserTier } from '@/types/pricing';

export interface TierMiddlewareOptions {
  requiredTier?: UserTier;
  allowedModels?: string[];
  skipForAnonymous?: boolean;
}

/**
 * Middleware to check user tier limits before API calls
 */
export async function checkTierLimits(
  request: NextRequest,
  options: TierMiddlewareOptions = {}
): Promise<NextResponse | null> {
  try {
    const { requiredTier, allowedModels, skipForAnonymous = false } = options;

    // Get user ID from request (this will depend on your auth implementation)
    const userId = request.headers.get('x-user-id');
    const isAnonymous = !userId;

    // Skip check for anonymous users if specified
    if (isAnonymous && skipForAnonymous) {
      return null;
    }

    // For anonymous users, use default free tier limits
    if (isAnonymous) {
      const freeTierConfig = pricingService.getTierConfig('free');
      return NextResponse.json({
        canGenerate: true,
        tier: 'free',
        remainingGenerations: freeTierConfig.monthlyGenerations,
        isOverage: false,
        overageRate: freeTierConfig.overageRate,
      });
    }

    // Get model from request body or query params
    const url = new URL(request.url);
    const model = url.searchParams.get('model') || 'nano-banana';

    // Check if model is allowed for the required tier
    if (requiredTier && allowedModels) {
      const tierConfig = pricingService.getTierConfig(requiredTier);
      if (!tierConfig.allowedModels.includes(model)) {
        return NextResponse.json(
          { 
            error: 'Model not allowed for this tier',
            requiredTier,
            model,
            allowedModels: tierConfig.allowedModels
          },
          { status: 403 }
        );
      }
    }

    // Check user's generation limits
    const tierCheck = await pricingService.checkUserCanGenerate(userId, model);

    if (!tierCheck.canGenerate) {
      return NextResponse.json(
        { 
          error: tierCheck.reason,
          tier: tierCheck.tier,
          remainingGenerations: tierCheck.remainingGenerations,
          isOverage: tierCheck.isOverage,
          overageRate: tierCheck.overageRate
        },
        { status: 403 }
      );
    }

    // Check if user meets required tier
    if (requiredTier) {
      const tierHierarchy = { free: 0, pro: 1, premium: 2 };
      const userTierLevel = tierHierarchy[tierCheck.tier];
      const requiredTierLevel = tierHierarchy[requiredTier];

      if (userTierLevel < requiredTierLevel) {
        return NextResponse.json(
          { 
            error: 'Insufficient tier level',
            currentTier: tierCheck.tier,
            requiredTier,
            upgradeRequired: true
          },
          { status: 403 }
        );
      }
    }

    // Add tier information to request headers for downstream processing
    const response = NextResponse.next();
    response.headers.set('x-user-tier', tierCheck.tier);
    response.headers.set('x-remaining-generations', tierCheck.remainingGenerations.toString());
    response.headers.set('x-is-overage', tierCheck.isOverage.toString());
    response.headers.set('x-overage-rate', tierCheck.overageRate.toString());

    return response;

  } catch (error) {
    console.error('Error in tier middleware:', error);
    return NextResponse.json(
      { error: 'Tier check failed' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to extract tier information from request
 */
export function getTierInfo(request: NextRequest) {
  return {
    tier: request.headers.get('x-user-tier') as UserTier || 'free',
    remainingGenerations: parseInt(request.headers.get('x-remaining-generations') || '0'),
    isOverage: request.headers.get('x-is-overage') === 'true',
    overageRate: parseFloat(request.headers.get('x-overage-rate') || '0'),
  };
}

/**
 * Helper function to record generation after successful API call
 */
export async function recordGeneration(
  userId: string,
  model: string,
  cost: number,
  tier: UserTier,
  isOverage: boolean
): Promise<void> {
  try {
    await pricingService.recordGeneration({
      userId,
      model,
      timestamp: new Date().toISOString(),
      cost,
      tier,
      isOverage,
    });
  } catch (error) {
    console.error('Error recording generation:', error);
    // Don't throw error here as the generation was successful
  }
}
