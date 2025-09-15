// Get Price IDs for vARY Products
// Run this with your Stripe secret key

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function getPriceIds() {
  try {
    console.log('🔍 Fetching price IDs for vARY products...\n');

    // Product IDs from your CSV
    const products = [
      { name: 'vARY Credits 25', id: 'prod_T3nycouRiti1cN' },
      { name: 'vARY Credits 10', id: 'prod_T3nyoaEryTJnaj' },
      { name: 'vARY Credits 5', id: 'prod_T3xt1tcb6Yof0' },
      { name: 'vARY Monthly', id: 'prod_T3nxInWbutJEIp' },
      { name: 'vARY_Weekly', id: 'prod_T3nwGpTfJhOd27' }
    ];

    console.log('🎯 PRODUCTS AND PRICE IDs:\n');
    console.log('='.repeat(80));

    for (const product of products) {
      console.log(`📦 ${product.name}`);
      console.log(`   Product ID: ${product.id}`);
      
      // Get prices for this product
      const prices = await stripe.prices.list({ 
        product: product.id,
        limit: 10 
      });
      
      if (prices.data.length > 0) {
        console.log(`   Price IDs:`);
        prices.data.forEach(price => {
          const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
          const interval = price.recurring ? `/${price.recurring.interval}` : ' (one-time)';
          console.log(`     - ${price.id}: $${amount}${interval}`);
        });
      } else {
        console.log(`   ⚠️ No prices found`);
      }
      
      console.log('   ' + '-'.repeat(60));
    }

    console.log('\n🔧 ENVIRONMENT VARIABLES FOR .env.local:');
    console.log('='.repeat(80));

    // Generate environment variables
    for (const product of products) {
      const prices = await stripe.prices.list({ 
        product: product.id,
        limit: 1 
      });
      
      if (prices.data.length > 0) {
        const priceId = prices.data[0].id;
        
        if (product.name.includes('Weekly')) {
          console.log(`STRIPE_WEEKLY_PRO_PRODUCT_ID=${product.id}`);
          console.log(`STRIPE_WEEKLY_PRO_PRICE_ID=${priceId}`);
        } else if (product.name.includes('Monthly')) {
          console.log(`STRIPE_MONTHLY_PRO_PRODUCT_ID=${product.id}`);
          console.log(`STRIPE_MONTHLY_PRO_PRICE_ID=${priceId}`);
        } else if (product.name.includes('Credits 5')) {
          console.log(`STRIPE_CREDIT_PACK_5_PRODUCT_ID=${product.id}`);
          console.log(`STRIPE_CREDIT_PACK_5_PRICE_ID=${priceId}`);
        } else if (product.name.includes('Credits 10')) {
          console.log(`STRIPE_CREDIT_PACK_10_PRODUCT_ID=${product.id}`);
          console.log(`STRIPE_CREDIT_PACK_10_PRICE_ID=${priceId}`);
        } else if (product.name.includes('Credits 25')) {
          console.log(`STRIPE_CREDIT_PACK_25_PRODUCT_ID=${product.id}`);
          console.log(`STRIPE_CREDIT_PACK_25_PRICE_ID=${priceId}`);
        }
      }
    }

    console.log('\n✅ Price IDs extracted successfully!');
    console.log('💡 Copy the environment variables above to your .env.local file');

  } catch (error) {
    console.log('❌ Error:', error.message);
    
    if (error.message.includes('Invalid API Key')) {
      console.log('💡 Make sure to set your Stripe secret key:');
      console.log('   Windows: set STRIPE_SECRET_KEY=sk_test_... && node get-price-ids.js');
      console.log('   Or add it to your .env.local file');
    }
  }
}

getPriceIds();
