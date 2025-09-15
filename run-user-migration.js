// User Migration Script: Convert existing users to credit system
// Run this script to migrate all users to the pay-as-you-go system

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runUserMigration() {
  try {
    console.log('🚀 Starting user migration to pay-as-you-go system...\n');

    // 1. Read the migration SQL file
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrate-users-to-credits.sql'), 'utf8');

    // 2. Execute the migration
    console.log('📊 Executing migration SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Error executing migration:', error);
      process.exit(1);
    }

    console.log('✅ Migration SQL executed successfully\n');

    // 3. Get migration summary
    console.log('📈 Migration Summary:');
    const { data: summary, error: summaryError } = await supabase
      .from('migration_summary')
      .select('*')
      .single();

    if (summaryError) {
      console.error('❌ Error getting migration summary:', summaryError);
    } else {
      console.log(`   Total users migrated: ${summary.total_users_migrated}`);
      console.log(`   Average credits assigned: ${summary.average_credits_assigned}`);
      console.log(`   Total credits assigned: ${summary.total_credits_assigned}`);
      console.log(`   Heavy users (50+ credits): ${summary.heavy_users}`);
      console.log(`   Moderate users (20-49 credits): ${summary.moderate_users}`);
      console.log(`   Light users (<20 credits): ${summary.light_users}\n`);
    }

    // 4. Get tier recommendations
    console.log('🎯 Top 10 User Tier Recommendations:');
    const { data: recommendations, error: recError } = await supabase
      .from('user_tier_recommendations')
      .select('*')
      .limit(10);

    if (recError) {
      console.error('❌ Error getting recommendations:', recError);
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.email}: ${rec.credit_balance} credits → ${rec.recommended_tier}`);
        console.log(`      Reason: ${rec.recommendation_reason}`);
      });
      console.log('');
    }

    // 5. Get credit distribution
    console.log('📊 Credit Distribution:');
    const { data: distribution, error: distError } = await supabase
      .from('users')
      .select('credit_balance')
      .gt('credit_balance', 0);

    if (distError) {
      console.error('❌ Error getting distribution:', distError);
    } else {
      const ranges = {
        '50+ credits': 0,
        '20-49 credits': 0,
        '10-19 credits': 0,
        'Under 10 credits': 0
      };

      distribution.forEach(user => {
        const balance = user.credit_balance;
        if (balance >= 50) ranges['50+ credits']++;
        else if (balance >= 20) ranges['20-49 credits']++;
        else if (balance >= 10) ranges['10-19 credits']++;
        else ranges['Under 10 credits']++;
      });

      Object.entries(ranges).forEach(([range, count]) => {
        console.log(`   ${range}: ${count} users`);
      });
      console.log('');
    }

    // 6. Verify credit transactions
    console.log('🔍 Verifying credit transactions...');
    const { data: transactions, error: transError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('transaction_type', 'credit_added')
      .like('description', '%pay-as-you-go migration%');

    if (transError) {
      console.error('❌ Error getting transactions:', transError);
    } else {
      console.log(`   Total migration transactions: ${transactions.length}`);
      console.log(`   Total credits added: ${transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(2)}`);
      console.log('');
    }

    // 7. Create migration report
    const report = {
      timestamp: new Date().toISOString(),
      summary: summary,
      recommendations: recommendations?.slice(0, 20) || [],
      distribution: ranges,
      transactions: {
        count: transactions?.length || 0,
        totalCredits: transactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0
      }
    };

    const reportPath = path.join(__dirname, `migration-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Migration report saved to: ${reportPath}`);

    console.log('🎉 User migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the migration report');
    console.log('   2. Test the credit system with a few users');
    console.log('   3. Update the UI to show credit balances');
    console.log('   4. Deploy the pay-as-you-go system');
    console.log('   5. Monitor user adoption and usage patterns');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runUserMigration();
