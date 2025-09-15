import { NextRequest, NextResponse } from 'next/server';
import { CreditNotificationService } from '@/lib/creditNotificationService';

export async function POST(request: NextRequest) {
  try {
    const { action, userId, ...data } = await request.json();

    if (!action || !userId) {
      return NextResponse.json(
        { success: false, error: 'action and userId are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'check_low_balance':
        result = await CreditNotificationService.checkLowBalanceNotification(userId);
        break;

      case 'send_low_balance':
        result = await CreditNotificationService.sendLowBalanceNotification({
          userId,
          currentBalance: data.currentBalance,
          threshold: data.threshold,
          modelName: data.modelName,
          generationType: data.generationType
        });
        break;

      case 'send_purchase_confirmation':
        result = await CreditNotificationService.sendCreditPurchaseNotification(
          userId,
          data.creditsPurchased,
          data.totalCost,
          data.purchaseType
        );
        break;

      case 'send_weekly_summary':
        result = await CreditNotificationService.sendWeeklyUsageSummary(userId);
        break;

      case 'check_after_usage':
        result = await CreditNotificationService.checkAndNotifyAfterUsage(
          userId,
          data.modelName,
          data.generationType,
          data.creditsUsed,
          data.remainingCredits
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in credit notifications API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
