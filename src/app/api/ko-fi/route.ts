import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Fetch data from the webhook endpoint
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/ko-fi-webhook`);
    
    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      return NextResponse.json({
        current: webhookData.current,
        goal: webhookData.goal,
        weeklyCost: webhookData.weeklyCost,
        lastUpdated: webhookData.lastUpdated,
        status: 'live',
        donations: webhookData.donations
      });
    }
    
    // Fallback to mock data if webhook is not available
    const mockData = {
      current: Math.floor(Math.random() * 100),
      goal: 300,
      weeklyCost: 265,
      lastUpdated: new Date().toISOString(),
      status: 'mock',
      donations: [
        {
          id: 'mock-1',
          type: 'Donation',
          amount: 5.00,
          from_name: 'Anonymous Supporter',
          message: 'Great work on the AI tools!',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          is_subscription: false,
          tier_name: null
        },
        {
          id: 'mock-2',
          type: 'Donation',
          amount: 10.00,
          from_name: 'AI Enthusiast',
          message: 'Keep up the amazing work!',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
          is_subscription: false,
          tier_name: null
        }
      ]
    };
    
    return NextResponse.json(mockData);
    
  } catch (error) {
    console.error('Ko-fi API error:', error);
    
    // Return fallback data on error
    const fallbackData = {
      current: 0,
      goal: 300,
      weeklyCost: 265,
      lastUpdated: new Date().toISOString(),
      status: 'error',
      donations: []
    };
    
    return NextResponse.json(fallbackData);
  }
}
