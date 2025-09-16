require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkNewUserStatus(userId, username, email) {
  console.log(`🔍 Checking new user status for: ${username}`);
  console.log(`📧 Email: ${email}`);
  console.log(`📋 User ID: ${userId}`);
  console.log('=' .repeat(60));

  try {
    // 1. Check user's new user status
    console.log('\n👤 NEW USER STATUS CHECK:');
    console.log('-'.repeat(40));
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_new_user, first_generation_at, grace_period_expires_at, created_at, credit_balance')
      .eq('id', userId)
      .single();

    if (userError) {
      console.log('❌ User data error:', userError.message);
    } else {
      console.log('✅ User status:');
      console.log(`  - Is New User: ${userData.is_new_user}`);
      console.log(`  - First Generation: ${userData.first_generation_at || 'Never'}`);
      console.log(`  - Grace Period Expires: ${userData.grace_period_expires_at || 'Not set'}`);
      console.log(`  - Account Created: ${userData.created_at}`);
      console.log(`  - Credit Balance: ${userData.credit_balance}`);
      
      // Check if user is in grace period
      if (userData.grace_period_expires_at) {
        const now = new Date();
        const graceExpires = new Date(userData.grace_period_expires_at);
        const isInGracePeriod = now <= graceExpires;
        
        console.log(`  - Currently in Grace Period: ${isInGracePeriod}`);
        if (isInGracePeriod) {
          const timeRemaining = Math.floor((graceExpires - now) / 1000 / 60); // minutes
          console.log(`  - Grace Period Time Remaining: ${timeRemaining} minutes`);
        }
      }
    }

    // 2. Test the RPC function for this user
    console.log('\n🔧 RPC FUNCTION TEST:');
    console.log('-'.repeat(40));
    const { data: rpcData, error: rpcError } = await supabase.rpc('check_user_generation_permission', {
      p_user_id: userId
    });

    if (rpcError) {
      console.log('❌ RPC function error:', rpcError.message);
      console.log('❌ RPC error details:', rpcError.details);
    } else {
      console.log('✅ RPC function result:');
      console.log(`  - Allowed: ${rpcData.allowed}`);
      console.log(`  - Reason: ${rpcData.reason}`);
      console.log(`  - Message: ${rpcData.message}`);
      if (rpcData.grace_period_expires_at) {
        console.log(`  - Grace Period Expires: ${rpcData.grace_period_expires_at}`);
      }
      if (rpcData.time_remaining) {
        console.log(`  - Time Remaining: ${rpcData.time_remaining} seconds`);
      }
    }

    // 3. Check if user has made any generations
    console.log('\n📊 GENERATION HISTORY:');
    console.log('-'.repeat(40));
    const { data: generations, error: genError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (genError) {
      console.log('❌ Generation history error:', genError.message);
    } else {
      console.log(`✅ Found ${generations?.length || 0} generation attempts:`);
      generations?.forEach((gen, index) => {
        console.log(`  ${index + 1}. ${gen.action_type} - ${gen.service_used}`);
        console.log(`     Date: ${gen.created_at}`);
        console.log(`     Session: ${gen.session_id}`);
        console.log('');
      });
    }

    // 4. Check credit transactions
    console.log('\n💳 CREDIT TRANSACTIONS:');
    console.log('-'.repeat(40));
    const { data: transactions, error: txError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (txError) {
      console.log('❌ Credit transactions error:', txError.message);
    } else {
      console.log(`✅ Found ${transactions?.length || 0} credit transactions:`);
      transactions?.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.transaction_type}: ${tx.amount}`);
        console.log(`     Description: ${tx.description}`);
        console.log(`     Date: ${tx.created_at}`);
        console.log('');
      });
    }

    // 5. Diagnosis
    console.log('\n📋 DIAGNOSIS:');
    console.log('=' .repeat(60));
    
    const isNewUser = userData?.is_new_user;
    const hasFirstGeneration = userData?.first_generation_at;
    const hasGracePeriod = userData?.grace_period_expires_at;
    const creditBalance = userData?.credit_balance || 0;
    const rpcAllowed = rpcData?.allowed;
    
    console.log(`👤 New User Status: ${isNewUser ? 'YES' : 'NO'}`);
    console.log(`🎯 First Generation: ${hasFirstGeneration ? 'YES' : 'NO'}`);
    console.log(`⏰ Grace Period: ${hasGracePeriod ? 'YES' : 'NO'}`);
    console.log(`💰 Credit Balance: ${creditBalance}`);
    console.log(`✅ RPC Allows Generation: ${rpcAllowed ? 'YES' : 'NO'}`);
    
    console.log('\n💡 LIKELY CAUSE OF 402 ERROR:');
    console.log('-'.repeat(40));
    
    if (isNewUser && !hasFirstGeneration && !hasGracePeriod) {
      console.log('🔴 NEW USER WITHOUT GRACE PERIOD:');
      console.log('  - User is marked as new user');
      console.log('  - Has never made a generation');
      console.log('  - No grace period set');
      console.log('  - This triggers the 402 "Payment Required" error');
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('  - Set grace_period_expires_at for this user');
      console.log('  - Or give them initial credits');
      console.log('  - Or mark them as not a new user');
    } else if (creditBalance === 0 && !hasGracePeriod) {
      console.log('🔴 NO CREDITS AND NO GRACE PERIOD:');
      console.log('  - User has 0 credits');
      console.log('  - No grace period active');
      console.log('  - This triggers the 402 error');
    } else if (!rpcAllowed) {
      console.log('🔴 RPC FUNCTION BLOCKING:');
      console.log('  - The check_user_generation_permission function is blocking the user');
      console.log('  - Reason:', rpcData?.reason);
      console.log('  - Message:', rpcData?.message);
    } else {
      console.log('🟢 USER SHOULD BE ALLOWED:');
      console.log('  - User has credits or grace period');
      console.log('  - RPC function allows generation');
      console.log('  - Issue might be elsewhere in the code');
    }

  } catch (error) {
    console.error('❌ Error during check:', error);
  }
}

// Run the check for the specific user
const userId = '7a851ddd-26ac-4dc7-bc7d-f0aa59b16f36';
const username = '9898989898989898';
const email = 'h365d@ya.ru';
checkNewUserStatus(userId, username, email);
