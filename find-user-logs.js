require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function findUserLogs(username) {
  console.log(`🔍 Searching for user logs: ${username}`);
  console.log('=' .repeat(50));

  try {
    // 1. Search in auth.users table by email (if username is an email)
    console.log('\n📧 Searching auth.users table...');
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('*')
      .or(`email.ilike.%${username}%,id.ilike.%${username}%`);

    if (authError) {
      console.log('❌ Auth users search error:', authError.message);
    } else {
      console.log(`✅ Found ${authUsers?.length || 0} auth users`);
      authUsers?.forEach(user => {
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Email: ${user.email}`);
        console.log(`  - Created: ${user.created_at}`);
        console.log(`  - Last Sign In: ${user.last_sign_in_at}`);
        console.log('');
      });
    }

    // 2. Search in public.users table
    console.log('\n👤 Searching public.users table...');
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.%${username}%,name.ilike.%${username}%,id.ilike.%${username}%`);

    if (publicError) {
      console.log('❌ Public users search error:', publicError.message);
    } else {
      console.log(`✅ Found ${publicUsers?.length || 0} public users`);
      publicUsers?.forEach(user => {
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Email: ${user.email}`);
        console.log(`  - Name: ${user.name}`);
        console.log(`  - Created: ${user.created_at}`);
        console.log(`  - Tier: ${user.tier}`);
        console.log(`  - Credit Balance: ${user.credit_balance}`);
        console.log('');
      });
    }

    // 3. Search in galleries table
    console.log('\n🖼️ Searching galleries table...');
    const { data: galleries, error: galleryError } = await supabase
      .from('galleries')
      .select('*')
      .or(`user_id.ilike.%${username}%,description.ilike.%${username}%`);

    if (galleryError) {
      console.log('❌ Galleries search error:', galleryError.message);
    } else {
      console.log(`✅ Found ${galleries?.length || 0} gallery items`);
      galleries?.forEach(gallery => {
        console.log(`  - ID: ${gallery.id}`);
        console.log(`  - User ID: ${gallery.user_id}`);
        console.log(`  - Description: ${gallery.description}`);
        console.log(`  - File Type: ${gallery.file_type}`);
        console.log(`  - Created: ${gallery.created_at}`);
        console.log('');
      });
    }

    // 4. Search in credit_transactions table
    console.log('\n💳 Searching credit_transactions table...');
    const { data: transactions, error: transactionError } = await supabase
      .from('credit_transactions')
      .select('*')
      .or(`user_id.ilike.%${username}%,description.ilike.%${username}%`);

    if (transactionError) {
      console.log('❌ Credit transactions search error:', transactionError.message);
    } else {
      console.log(`✅ Found ${transactions?.length || 0} credit transactions`);
      transactions?.forEach(transaction => {
        console.log(`  - ID: ${transaction.id}`);
        console.log(`  - User ID: ${transaction.user_id}`);
        console.log(`  - Type: ${transaction.transaction_type}`);
        console.log(`  - Amount: ${transaction.amount}`);
        console.log(`  - Description: ${transaction.description}`);
        console.log(`  - Created: ${transaction.created_at}`);
        console.log('');
      });
    }

    // 5. Search in usage_tracking table
    console.log('\n📊 Searching usage_tracking table...');
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .or(`user_id.ilike.%${username}%,session_id.ilike.%${username}%`);

    if (usageError) {
      console.log('❌ Usage tracking search error:', usageError.message);
    } else {
      console.log(`✅ Found ${usage?.length || 0} usage tracking records`);
      usage?.forEach(record => {
        console.log(`  - ID: ${record.id}`);
        console.log(`  - User ID: ${record.user_id}`);
        console.log(`  - Session ID: ${record.session_id}`);
        console.log(`  - Action: ${record.action_type}`);
        console.log(`  - Service: ${record.service_used}`);
        console.log(`  - Created: ${record.created_at}`);
        console.log('');
      });
    }

    // 6. Search in credit_usage_log table
    console.log('\n📈 Searching credit_usage_log table...');
    const { data: creditUsage, error: creditUsageError } = await supabase
      .from('credit_usage_log')
      .select('*')
      .or(`user_id.ilike.%${username}%,model_name.ilike.%${username}%`);

    if (creditUsageError) {
      console.log('❌ Credit usage log search error:', creditUsageError.message);
    } else {
      console.log(`✅ Found ${creditUsage?.length || 0} credit usage records`);
      creditUsage?.forEach(record => {
        console.log(`  - ID: ${record.id}`);
        console.log(`  - User ID: ${record.user_id}`);
        console.log(`  - Model: ${record.model_name}`);
        console.log(`  - Generation Type: ${record.generation_type}`);
        console.log(`  - Credits Used: ${record.credits_used}`);
        console.log(`  - Created: ${record.created_at}`);
        console.log('');
      });
    }

    // 7. Search in notifications table
    console.log('\n🔔 Searching notifications table...');
    const { data: notifications, error: notificationError } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.ilike.%${username}%,title.ilike.%${username}%,message.ilike.%${username}%`);

    if (notificationError) {
      console.log('❌ Notifications search error:', notificationError.message);
    } else {
      console.log(`✅ Found ${notifications?.length || 0} notifications`);
      notifications?.forEach(notification => {
        console.log(`  - ID: ${notification.id}`);
        console.log(`  - User ID: ${notification.user_id}`);
        console.log(`  - Type: ${notification.type}`);
        console.log(`  - Title: ${notification.title}`);
        console.log(`  - Message: ${notification.message}`);
        console.log(`  - Read: ${notification.is_read}`);
        console.log(`  - Created: ${notification.created_at}`);
        console.log('');
      });
    }

    console.log('\n🎯 Search Summary:');
    console.log(`- Auth Users: ${authUsers?.length || 0}`);
    console.log(`- Public Users: ${publicUsers?.length || 0}`);
    console.log(`- Gallery Items: ${galleries?.length || 0}`);
    console.log(`- Credit Transactions: ${transactions?.length || 0}`);
    console.log(`- Usage Tracking: ${usage?.length || 0}`);
    console.log(`- Credit Usage Log: ${creditUsage?.length || 0}`);
    console.log(`- Notifications: ${notifications?.length || 0}`);

  } catch (error) {
    console.error('❌ Error during search:', error);
  }
}

// Run the search
const username = process.argv[2] || '9898989898989898';
findUserLogs(username);
