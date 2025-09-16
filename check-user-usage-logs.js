require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables');
  console.log('Please ensure .env.local contains:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkUserUsageLogs(userId, username) {
  console.log(`🔍 Checking usage logs for user: ${username}`);
  console.log(`📋 User ID: ${userId}`);
  console.log('=' .repeat(60));

  try {
    // 1. Check galleries (generated content)
    console.log('\n🖼️ GALLERY ITEMS (Generated Content):');
    console.log('-'.repeat(40));
    const { data: galleries, error: galleryError } = await supabase
      .from('galleries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (galleryError) {
      console.log('❌ Gallery error:', galleryError.message);
    } else {
      console.log(`✅ Found ${galleries?.length || 0} gallery items`);
      if (galleries && galleries.length > 0) {
        galleries.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.file_type.toUpperCase()} - ${item.description}`);
          console.log(`     📅 Created: ${item.created_at}`);
          console.log(`     🎯 Angle: ${item.angle}, Pose: ${item.pose}`);
          console.log(`     📝 Prompt: ${item.original_prompt}`);
          console.log('');
        });
      } else {
        console.log('  No gallery items found');
      }
    }

    // 2. Check credit transactions
    console.log('\n💳 CREDIT TRANSACTIONS:');
    console.log('-'.repeat(40));
    const { data: transactions, error: transactionError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (transactionError) {
      console.log('❌ Transaction error:', transactionError.message);
    } else {
      console.log(`✅ Found ${transactions?.length || 0} credit transactions`);
      if (transactions && transactions.length > 0) {
        transactions.forEach((tx, index) => {
          console.log(`  ${index + 1}. ${tx.transaction_type.toUpperCase()}`);
          console.log(`     💰 Amount: ${tx.amount}`);
          console.log(`     📅 Date: ${tx.created_at}`);
          console.log(`     📝 Description: ${tx.description}`);
          if (tx.model_name) console.log(`     🤖 Model: ${tx.model_name}`);
          console.log('');
        });
      } else {
        console.log('  No credit transactions found');
      }
    }

    // 3. Check usage tracking
    console.log('\n📊 USAGE TRACKING:');
    console.log('-'.repeat(40));
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (usageError) {
      console.log('❌ Usage tracking error:', usageError.message);
    } else {
      console.log(`✅ Found ${usage?.length || 0} usage tracking records`);
      if (usage && usage.length > 0) {
        usage.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.action_type.toUpperCase()}`);
          console.log(`     🔧 Service: ${record.service_used}`);
          console.log(`     📅 Date: ${record.created_at}`);
          console.log(`     🆔 Session: ${record.session_id}`);
          if (record.metadata) {
            console.log(`     📋 Metadata: ${JSON.stringify(record.metadata)}`);
          }
          console.log('');
        });
      } else {
        console.log('  No usage tracking records found');
      }
    }

    // 4. Check credit usage log
    console.log('\n📈 CREDIT USAGE LOG:');
    console.log('-'.repeat(40));
    const { data: creditUsage, error: creditUsageError } = await supabase
      .from('credit_usage_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (creditUsageError) {
      console.log('❌ Credit usage log error:', creditUsageError.message);
    } else {
      console.log(`✅ Found ${creditUsage?.length || 0} credit usage records`);
      if (creditUsage && creditUsage.length > 0) {
        creditUsage.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.generation_type.toUpperCase()}`);
          console.log(`     🤖 Model: ${record.model_name}`);
          console.log(`     💰 Credits Used: ${record.credits_used}`);
          console.log(`     📅 Date: ${record.created_at}`);
          if (record.generation_id) {
            console.log(`     🆔 Generation ID: ${record.generation_id}`);
          }
          console.log('');
        });
      } else {
        console.log('  No credit usage records found');
      }
    }

    // 5. Check notifications
    console.log('\n🔔 NOTIFICATIONS:');
    console.log('-'.repeat(40));
    const { data: notifications, error: notificationError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (notificationError) {
      console.log('❌ Notifications error:', notificationError.message);
    } else {
      console.log(`✅ Found ${notifications?.length || 0} notifications`);
      if (notifications && notifications.length > 0) {
        notifications.forEach((notification, index) => {
          console.log(`  ${index + 1}. ${notification.type.toUpperCase()}`);
          console.log(`     📝 Title: ${notification.title}`);
          console.log(`     💬 Message: ${notification.message}`);
          console.log(`     📅 Date: ${notification.created_at}`);
          console.log(`     ✅ Read: ${notification.is_read ? 'Yes' : 'No'}`);
          console.log('');
        });
      } else {
        console.log('  No notifications found');
      }
    }

    // 6. Check model usage (if table exists)
    console.log('\n🤖 MODEL USAGE:');
    console.log('-'.repeat(40));
    const { data: modelUsage, error: modelUsageError } = await supabase
      .from('model_usage')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (modelUsageError) {
      console.log('❌ Model usage error:', modelUsageError.message);
    } else {
      console.log(`✅ Found ${modelUsage?.length || 0} model usage records`);
      if (modelUsage && modelUsage.length > 0) {
        modelUsage.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.model_name}`);
          console.log(`     🎯 Type: ${record.generation_type}`);
          console.log(`     💰 Cost: ${record.cost_credits} credits`);
          console.log(`     📅 Date: ${record.created_at}`);
          console.log('');
        });
      } else {
        console.log('  No model usage records found');
      }
    }

    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`👤 User: ${username} (${userId})`);
    console.log(`🖼️ Gallery Items: ${galleries?.length || 0}`);
    console.log(`💳 Credit Transactions: ${transactions?.length || 0}`);
    console.log(`📊 Usage Tracking: ${usage?.length || 0}`);
    console.log(`📈 Credit Usage Log: ${creditUsage?.length || 0}`);
    console.log(`🔔 Notifications: ${notifications?.length || 0}`);
    console.log(`🤖 Model Usage: ${modelUsage?.length || 0}`);

    // Calculate total credits used
    const totalCreditsUsed = transactions
      ?.filter(tx => tx.transaction_type === 'credit_used')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;
    
    console.log(`💰 Total Credits Used: ${totalCreditsUsed}`);

  } catch (error) {
    console.error('❌ Error during search:', error);
  }
}

// Run the search for the specific user
const userId = '7a851ddd-26ac-4dc7-bc7d-f0aa59b16f36';
const username = '9898989898989898';
checkUserUsageLogs(userId, username);
