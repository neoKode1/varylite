// Test script to demonstrate Ko-fi API donation fetching
const fetch = require('node-fetch');

async function testKoFiAPI() {
  try {
    console.log('🧪 Testing Ko-fi API...\n');
    
    // Test the main Ko-fi API endpoint
    const response = await fetch('http://localhost:3000/api/ko-fi');
    const data = await response.json();
    
    console.log('📊 Ko-fi API Response:');
    console.log('Status:', data.status);
    console.log('Current Funding: $' + data.current);
    console.log('Goal: $' + data.goal);
    console.log('Weekly Cost: $' + data.weeklyCost);
    console.log('Last Updated:', data.lastUpdated);
    console.log('Recent Donations:', data.donations.length);
    
    if (data.donations.length > 0) {
      console.log('\n💰 Recent Donations:');
      data.donations.forEach((donation, index) => {
        console.log(`${index + 1}. $${donation.amount} from ${donation.from_name}`);
        if (donation.message) {
          console.log(`   Message: "${donation.message}"`);
        }
        console.log(`   Time: ${new Date(donation.timestamp).toLocaleString()}`);
        console.log(`   Type: ${donation.type}`);
        console.log('');
      });
    }
    
    // Test the webhook endpoint directly
    console.log('\n🔗 Testing Webhook Endpoint...');
    const webhookResponse = await fetch('http://localhost:3000/api/ko-fi-webhook');
    const webhookData = await webhookResponse.json();
    
    console.log('Webhook Data:');
    console.log('Current:', webhookData.current);
    console.log('Donations Count:', webhookData.donations.length);
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('\n💡 Make sure the dev server is running: npm run dev');
  }
}

// Run the test
testKoFiAPI();
