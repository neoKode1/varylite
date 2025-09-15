// Setup Stripe Products for Pay-As-You-Go System
// Run this script to create the new Stripe products

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createStripeProducts() {
  try {
    console.log('🚀 Creating Stripe products for pay-as-you-go system...\n');

    // 1. Create vARY Weekly Product ($5.99/week)
    console.log('📦 Creating vARY Weekly product...');
    const weeklyProduct = await stripe.products.create({
      name: 'vARY Weekly',
      description: 'Weekly access to premium AI models with 150 credits included. Perfect for casual creators and weekend projects.',
      metadata: {
        tier: 'weekly_pro',
        credits_included: '150',
        billing_cycle: 'weekly'
      }
    });

    const weeklyPrice = await stripe.prices.create({
      product: weeklyProduct.id,
      unit_amount: 599, // $5.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'week'
      },
      metadata: {
        tier: 'weekly_pro',
        credits_included: '150'
      }
    });

    console.log(`✅ vARY Weekly created:`);
    console.log(`   Product ID: ${weeklyProduct.id}`);
    console.log(`   Price ID: ${weeklyPrice.id}`);
    console.log(`   Price: $5.99/week`);
    console.log(`   Credits: 150\n`);

    // 2. Create vARY Monthly Product ($14.99/month)
    console.log('📦 Creating vARY Monthly product...');
    const monthlyProduct = await stripe.products.create({
      name: 'vARY Monthly',
      description: 'Monthly access to all AI models with 375 credits included. Ideal for regular content creators and professionals.',
      metadata: {
        tier: 'monthly_pro',
        credits_included: '375',
        billing_cycle: 'monthly'
      }
    });

    const monthlyPrice = await stripe.prices.create({
      product: monthlyProduct.id,
      unit_amount: 1499, // $14.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        tier: 'monthly_pro',
        credits_included: '375'
      }
    });

    console.log(`✅ vARY Monthly created:`);
    console.log(`   Product ID: ${monthlyProduct.id}`);
    console.log(`   Price ID: ${monthlyPrice.id}`);
    console.log(`   Price: $14.99/month`);
    console.log(`   Credits: 375\n`);

    // 3. Create Credit Pack Products
    console.log('📦 Creating Credit Pack products...');
    
    // $5 Credit Pack (125 credits)
    const creditPack5Product = await stripe.products.create({
      name: 'vARY Credits 5',
      description: '125 credits for pay-as-you-go usage. Perfect for trying out premium models.',
      metadata: {
        tier: 'credit_pack',
        credits_included: '125',
        billing_cycle: 'one_time'
      }
    });

    const creditPack5Price = await stripe.prices.create({
      product: creditPack5Product.id,
      unit_amount: 500, // $5.00 in cents
      currency: 'usd',
      metadata: {
        tier: 'credit_pack',
        credits_included: '125'
      }
    });

    // $10 Credit Pack (250 credits)
    const creditPack10Product = await stripe.products.create({
      name: 'vARY Credits 10',
      description: '250 credits for pay-as-you-go usage. Great value for regular users.',
      metadata: {
        tier: 'credit_pack',
        credits_included: '250',
        billing_cycle: 'one_time'
      }
    });

    const creditPack10Price = await stripe.prices.create({
      product: creditPack10Product.id,
      unit_amount: 1000, // $10.00 in cents
      currency: 'usd',
      metadata: {
        tier: 'credit_pack',
        credits_included: '250'
      }
    });

    // $25 Credit Pack (625 credits)
    const creditPack25Product = await stripe.products.create({
      name: 'vARY Credits 25',
      description: '625 credits for pay-as-you-go usage. Best value for power users.',
      metadata: {
        tier: 'credit_pack',
        credits_included: '625',
        billing_cycle: 'one_time'
      }
    });

    const creditPack25Price = await stripe.prices.create({
      product: creditPack25Product.id,
      unit_amount: 2500, // $25.00 in cents
      currency: 'usd',
      metadata: {
        tier: 'credit_pack',
        credits_included: '625'
      }
    });

    console.log(`✅ Credit Packs created:`);
    console.log(`   $5 Pack: ${creditPack5Product.id} / ${creditPack5Price.id} (125 credits)`);
    console.log(`   $10 Pack: ${creditPack10Product.id} / ${creditPack10Price.id} (250 credits)`);
    console.log(`   $25 Pack: ${creditPack25Product.id} / ${creditPack25Price.id} (625 credits)\n`);

    // 4. Output environment variables for .env.local
    console.log('🔧 Add these to your .env.local file:\n');
    console.log('# Pay-As-You-Go Stripe Products');
    console.log(`STRIPE_WEEKLY_PRO_PRODUCT_ID=${weeklyProduct.id}`);
    console.log(`STRIPE_WEEKLY_PRO_PRICE_ID=${weeklyPrice.id}`);
    console.log(`STRIPE_MONTHLY_PRO_PRODUCT_ID=${monthlyProduct.id}`);
    console.log(`STRIPE_MONTHLY_PRO_PRICE_ID=${monthlyPrice.id}`);
    console.log(`STRIPE_CREDIT_PACK_5_PRODUCT_ID=${creditPack5Product.id}`);
    console.log(`STRIPE_CREDIT_PACK_5_PRICE_ID=${creditPack5Price.id}`);
    console.log(`STRIPE_CREDIT_PACK_10_PRODUCT_ID=${creditPack10Product.id}`);
    console.log(`STRIPE_CREDIT_PACK_10_PRICE_ID=${creditPack10Price.id}`);
    console.log(`STRIPE_CREDIT_PACK_25_PRODUCT_ID=${creditPack25Product.id}`);
    console.log(`STRIPE_CREDIT_PACK_25_PRICE_ID=${creditPack25Price.id}\n`);

    console.log('🎉 All Stripe products created successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Add the environment variables to .env.local');
    console.log('   2. Run the database schema update');
    console.log('   3. Update the Stripe service configuration');
    console.log('   4. Test the payment flows');

  } catch (error) {
    console.error('❌ Error creating Stripe products:', error);
    process.exit(1);
  }
}

// Run the script
createStripeProducts();
