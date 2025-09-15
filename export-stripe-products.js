// Export Stripe Products Script
// Run this with: STRIPE_SECRET_KEY=your_key node export-stripe-products.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function exportStripeProducts() {
  try {
    console.log('📦 Exporting Stripe products...\n');

    // Get all products
    const products = await stripe.products.list({ limit: 100 });
    
    // Get all prices
    const prices = await stripe.prices.list({ limit: 100 });
    
    console.log('🎯 PRODUCT EXPORT RESULTS:\n');
    console.log('='.repeat(80));
    
    // Group prices by product
    const productPrices = {};
    prices.data.forEach(price => {
      if (!productPrices[price.product]) {
        productPrices[price.product] = [];
      }
      productPrices[price.product].push(price);
    });
    
    // Display products with their prices
    products.data.forEach(product => {
      console.log(`📦 PRODUCT: ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Description: ${product.description || 'N/A'}`);
      console.log(`   Active: ${product.active}`);
      
      if (productPrices[product.id]) {
        console.log(`   PRICES:`);
        productPrices[product.id].forEach(price => {
          const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
          const interval = price.recurring ? `/${price.recurring.interval}` : ' (one-time)';
          console.log(`     - ${price.id}: $${amount}${interval}`);
        });
      } else {
        console.log(`   PRICES: None found`);
      }
      
      console.log('   ' + '-'.repeat(60));
    });
    
    console.log('\n🔧 ENVIRONMENT VARIABLES FOR .env.local:');
    console.log('='.repeat(80));
    
    // Generate environment variables for vARY products
    const varyProducts = products.data.filter(p => 
      p.name.includes('vARY') || 
      p.name.includes('Weekly') || 
      p.name.includes('Monthly') ||
      p.name.includes('Credits')
    );
    
    if (varyProducts.length > 0) {
      varyProducts.forEach(product => {
        const productPrices = prices.data.filter(p => p.product === product.id);
        
        if (product.name.includes('Weekly')) {
          console.log(`STRIPE_WEEKLY_PRO_PRODUCT_ID=${product.id}`);
          if (productPrices[0]) console.log(`STRIPE_WEEKLY_PRO_PRICE_ID=${productPrices[0].id}`);
        } else if (product.name.includes('Monthly')) {
          console.log(`STRIPE_MONTHLY_PRO_PRODUCT_ID=${product.id}`);
          if (productPrices[0]) console.log(`STRIPE_MONTHLY_PRO_PRICE_ID=${productPrices[0].id}`);
        } else if (product.name.includes('Credits 5')) {
          console.log(`STRIPE_CREDIT_PACK_5_PRODUCT_ID=${product.id}`);
          if (productPrices[0]) console.log(`STRIPE_CREDIT_PACK_5_PRICE_ID=${productPrices[0].id}`);
        } else if (product.name.includes('Credits 10')) {
          console.log(`STRIPE_CREDIT_PACK_10_PRODUCT_ID=${product.id}`);
          if (productPrices[0]) console.log(`STRIPE_CREDIT_PACK_10_PRICE_ID=${productPrices[0].id}`);
        } else if (product.name.includes('Credits 25')) {
          console.log(`STRIPE_CREDIT_PACK_25_PRODUCT_ID=${product.id}`);
          if (productPrices[0]) console.log(`STRIPE_CREDIT_PACK_25_PRICE_ID=${productPrices[0].id}`);
        }
      });
    } else {
      console.log('⚠️ No vARY products found. You may need to create them first.');
    }
    
    console.log('\n✅ Export complete!');
    console.log('💡 Copy the environment variables above to your .env.local file');

  } catch (error) {
    console.log('❌ Error:', error.message);
    
    if (error.message.includes('Invalid API Key')) {
      console.log('💡 Make sure to set your Stripe secret key:');
      console.log('   Windows: set STRIPE_SECRET_KEY=sk_test_... && node export-stripe-products.js');
      console.log('   Or add it to your .env.local file');
    }
  }
}

exportStripeProducts();
