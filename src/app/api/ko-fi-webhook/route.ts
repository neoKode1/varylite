import { NextRequest, NextResponse } from 'next/server';

// Store funding data in memory (in production, you'd use a database)
let fundingData = {
  current: 0,
  goal: 300,
  weeklyCost: 265,
  lastUpdated: new Date().toISOString(),
  donations: [] as any[]
};

// Helper function to format donation data
const formatDonation = (data: any) => ({
  id: data.message_id,
  type: data.type,
  amount: parseFloat(data.amount),
  from_name: data.from_name || 'Anonymous',
  message: data.message || '',
  timestamp: data.timestamp,
  is_subscription: data.is_subscription_payment || false,
  tier_name: data.tier_name || null,
  currency: data.currency || 'USD'
});

// Ko-fi webhook verification token
const KOFI_VERIFICATION_TOKEN = process.env.KOFI_VERIFICATION_TOKEN || '31c45be4-fa06-4c91-869c-6c0b199d5222';

// Ko-fi configuration
const KOFI_CONFIG = {
  pageUrl: 'https://ko-fi.com/vari-ai',
  weeklyGoal: 300,
  weeklyCost: 265,
  webhookUrl: 'https://vary-ai.vercel.app/api/ko-fi-webhook'
};

export async function POST(request: NextRequest) {
  try {
    // Parse the form data
    const formData = await request.formData();
    const dataString = formData.get('data') as string;
    
    if (!dataString) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    // Parse the JSON data
    const data = JSON.parse(dataString);
    
    // Verify the webhook token
    if (data.verification_token !== KOFI_VERIFICATION_TOKEN) {
      console.error('Invalid verification token');
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 401 });
    }

    // Only process public donations
    if (!data.is_public) {
      console.log('Skipping private donation');
      return NextResponse.json({ status: 'skipped' });
    }

    // Process the payment
    const amount = parseFloat(data.amount);
    const paymentType = data.type;
    
    console.log(`Received ${paymentType}: $${amount} from ${data.from_name}`);
    
    // Add to current funding
    fundingData.current += amount;
    fundingData.lastUpdated = new Date().toISOString();
    
    // Store donation details using the formatted helper
    fundingData.donations.push(formatDonation(data));

    // Keep only last 100 donations to prevent memory issues
    if (fundingData.donations.length > 100) {
      fundingData.donations = fundingData.donations.slice(-100);
    }

    console.log(`Updated funding: $${fundingData.current} (${((fundingData.current / fundingData.weeklyCost) * 100).toFixed(1)}%)`);

    return NextResponse.json({ 
      status: 'success',
      current: fundingData.current,
      percentage: (fundingData.current / fundingData.weeklyCost) * 100
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to retrieve current funding data
export async function GET() {
  return NextResponse.json(fundingData);
}
