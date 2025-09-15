// Test Stripe Connection and Products
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeConnection() {
  try {
    console.log('🧪 Testing Stripe connection...');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('❌ STRIPE_SECRET_KEY environment variable not found');
      console.log('💡 You need to add it to your .env.local file');
      return;
    }

    // Test connection by listing products
    const products = await stripe.products.list({ limit: 10 });
    
    console.log('✅ Stripe connection successful!');
    console.log(`📦 Products found: ${products.data.length}`);
    
    if (products.data.length > 0) {
      console.log('\n🎯 Your Stripe Products:');
      products.data.forEach(product => {
        console.log(`  - ${product.name}: ${product.id}`);
      });
      
      // Check for our specific products
      const varyProducts = products.data.filter(p => 
        p.name.includes('vARY') || 
        p.name.includes('Weekly') || 
        p.name.includes('Monthly') ||
        p.name.includes('Credits')
      );
      
      if (varyProducts.length > 0) {
        console.log('\n🚀 vARY Pay-As-You-Go Products Found:');
        varyProducts.forEach(product => {
          console.log(`  ✅ ${product.name}: ${product.id}`);
        });
      } else {
        console.log('\n⚠️ No vARY pay-as-you-go products found');
        console.log('💡 You may need to run: node setup-stripe-products.js');
      }
    } else {
      console.log('📭 No products found in your Stripe account');
    }

  } catch (error) {
    console.log('❌ Stripe error:', error.message);
    
    if (error.message.includes('Invalid API Key')) {
      console.log('💡 Check your STRIPE_SECRET_KEY in .env.local');
    }
  }
}

testStripeConnection();
