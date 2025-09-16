require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function debugUser402Error(userId, username) {
  console.log(`🔍 Debugging 402 error for user: ${username}`);
  console.log(`📋 User ID: ${userId}`);
  console.log('=' .repeat(60));

  try {
    // 1. Check user data in users table
    console.log('\n👤 USER DATA CHECK:');
    console.log('-'.repeat(40));
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.log('❌ User data error:', userError.message);
    } else {
      console.log('✅ User data found:');
      console.log(`  - Email: ${userData.email}`);
      console.log(`  - Credit Balance: ${userData.credit_balance}`);
      console.log(`  - Tier: ${userData.tier}`);
      console.log(`  - Is Admin: ${userData.is_admin}`);
      console.log(`  - First Generation: ${userData.first_generation_at}`);
      console.log(`  - Created: ${userData.created_at}`);
    }

    // 2. Check user_credits table
    console.log('\n💰 USER_CREDITS TABLE CHECK:');
    console.log('-'.repeat(40));
    const { data: creditData, error: creditError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId);

    if (creditError) {
      console.log('❌ User credits error:', creditError.message);
    } else {
      console.log(`✅ Found ${creditData?.length || 0} credit records:`);
      creditData?.forEach((credit, index) => {
        console.log(`  ${index + 1}. Balance: ${credit.balance}`);
        console.log(`     Type: ${credit.credit_type}`);
        console.log(`     Active: ${credit.is_active}`);
        console.log(`     Created: ${credit.created_at}`);
        console.log('');
      });
    }

    // 3. Check model_costs table
    console.log('\n🤖 MODEL COSTS CHECK:');
    console.log('-'.repeat(40));
    const { data: modelCosts, error: modelError } = await supabase
      .from('model_costs')
      .select('*')
      .eq('is_active', true);

    if (modelError) {
      console.log('❌ Model costs error:', modelError.message);
    } else {
      console.log(`✅ Found ${modelCosts?.length || 0} active models:`);
      modelCosts?.forEach((model, index) => {
        console.log(`  ${index + 1}. ${model.model_name}: ${model.cost_per_generation} credits`);
      });
    }

    // 4. Test the RPC function directly
    console.log('\n🔧 RPC FUNCTION TEST:');
    console.log('-'.repeat(40));
    const { data: rpcData, error: rpcError } = await supabase.rpc('check_user_generation_permission', {
      p_user_id: userId
    });

    if (rpcError) {
      console.log('❌ RPC function error:', rpcError.message);
      console.log('❌ RPC error details:', rpcError.details);
      console.log('❌ RPC error hint:', rpcError.hint);
    } else {
      console.log('✅ RPC function result:', rpcData);
    }

    // 5. Check recent credit transactions
    console.log('\n📊 RECENT CREDIT TRANSACTIONS:');
    console.log('-'.repeat(40));
    const { data: transactions, error: transactionError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (transactionError) {
      console.log('❌ Transactions error:', transactionError.message);
    } else {
      console.log(`✅ Found ${transactions?.length || 0} recent transactions:`);
      transactions?.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.transaction_type}: ${tx.amount}`);
        console.log(`     Description: ${tx.description}`);
        console.log(`     Date: ${tx.created_at}`);
        console.log('');
      });
    }

    // 6. Summary and recommendations
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('=' .repeat(60));
    
    const userBalance = userData?.credit_balance || 0;
    const creditTableBalance = creditData?.[0]?.balance || 0;
    
    console.log(`👤 User: ${username}`);
    console.log(`💰 Users table balance: ${userBalance}`);
    console.log(`💰 User_credits table balance: ${creditTableBalance}`);
    console.log(`🤖 Active models: ${modelCosts?.length || 0}`);
    console.log(`📊 Recent transactions: ${transactions?.length || 0}`);
    
    console.log('\n💡 LIKELY CAUSES:');
    console.log('-'.repeat(40));
    
    if (userBalance === 0 && creditTableBalance === 0) {
      console.log('🔴 NO CREDITS: User has no credits in either table');
    } else if (userBalance > 0 && creditTableBalance === 0) {
      console.log('🟡 CREDIT MISMATCH: Credits in users table but not user_credits table');
    } else if (userBalance === 0 && creditTableBalance > 0) {
      console.log('🟡 CREDIT MISMATCH: Credits in user_credits table but not users table');
    } else if (userBalance !== creditTableBalance) {
      console.log('🟡 CREDIT MISMATCH: Different balances in the two tables');
    } else {
      console.log('🟢 CREDITS OK: User has credits, issue might be elsewhere');
    }
    
    if (rpcError) {
      console.log('🔴 RPC ERROR: The check_user_generation_permission function is failing');
    }
    
    if (!modelCosts || modelCosts.length === 0) {
      console.log('🔴 NO MODELS: No active models found in model_costs table');
    }

    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('-'.repeat(40));
    console.log('1. Sync credits between users.credit_balance and user_credits.balance');
    console.log('2. Check if check_user_generation_permission RPC function exists');
    console.log('3. Verify model_costs table has the models user is trying to use');
    console.log('4. Check if user has proper permissions in database');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the debug for the specific user
const userId = '7a851ddd-26ac-4dc7-bc7d-f0aa59b16f36';
const username = '9898989898989898';
debugUser402Error(userId, username);
