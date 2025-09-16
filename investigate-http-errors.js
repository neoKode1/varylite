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

async function investigateHttpErrors(userId, username) {
  console.log(`🔍 Investigating HTTP errors for user: ${username}`);
  console.log(`📋 User ID: ${userId}`);
  console.log('=' .repeat(60));

  try {
    // 1. Check for any error logs in usage_tracking with HTTP-related errors
    console.log('\n🌐 HTTP ERROR ANALYSIS:');
    console.log('-'.repeat(40));
    
    const { data: httpErrors, error: httpError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .or('metadata->error.ilike.%http%,metadata->error.ilike.%network%,metadata->error.ilike.%timeout%,metadata->error.ilike.%connection%')
      .order('created_at', { ascending: false });

    if (httpError) {
      console.log('❌ HTTP error search failed:', httpError.message);
    } else {
      console.log(`✅ Found ${httpErrors?.length || 0} HTTP-related errors`);
      if (httpErrors && httpErrors.length > 0) {
        httpErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.action_type.toUpperCase()}`);
          console.log(`     🔧 Service: ${error.service_used}`);
          console.log(`     📅 Date: ${error.created_at}`);
          console.log(`     🆔 Session: ${error.session_id}`);
          if (error.metadata) {
            console.log(`     📋 Error Details: ${JSON.stringify(error.metadata)}`);
          }
          console.log('');
        });
      } else {
        console.log('  No HTTP-related errors found in usage_tracking');
      }
    }

    // 2. Check for mobile-specific issues in galleries
    console.log('\n📱 MOBILE DEVICE ANALYSIS:');
    console.log('-'.repeat(40));
    
    const { data: mobileIssues, error: mobileError } = await supabase
      .from('galleries')
      .select('*')
      .eq('user_id', userId)
      .or('description.ilike.%mobile%,description.ilike.%phone%,description.ilike.%android%,description.ilike.%ios%')
      .order('created_at', { ascending: false });

    if (mobileError) {
      console.log('❌ Mobile analysis failed:', mobileError.message);
    } else {
      console.log(`✅ Found ${mobileIssues?.length || 0} mobile-related entries`);
      if (mobileIssues && mobileIssues.length > 0) {
        mobileIssues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.file_type.toUpperCase()}`);
          console.log(`     📝 Description: ${issue.description}`);
          console.log(`     📅 Date: ${issue.created_at}`);
          console.log(`     🎯 Prompt: ${issue.original_prompt}`);
          console.log('');
        });
      } else {
        console.log('  No mobile-specific issues found');
      }
    }

    // 3. Check for HTTPS/SSL related issues
    console.log('\n🔒 HTTPS/SSL ANALYSIS:');
    console.log('-'.repeat(40));
    
    const { data: sslIssues, error: sslError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .or('metadata->error.ilike.%ssl%,metadata->error.ilike.%https%,metadata->error.ilike.%certificate%,metadata->error.ilike.%tls%')
      .order('created_at', { ascending: false });

    if (sslError) {
      console.log('❌ SSL analysis failed:', sslError.message);
    } else {
      console.log(`✅ Found ${sslIssues?.length || 0} SSL/HTTPS-related issues`);
      if (sslIssues && sslIssues.length > 0) {
        sslIssues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.action_type.toUpperCase()}`);
          console.log(`     🔧 Service: ${issue.service_used}`);
          console.log(`     📅 Date: ${issue.created_at}`);
          console.log(`     📋 SSL Details: ${JSON.stringify(issue.metadata)}`);
          console.log('');
        });
      } else {
        console.log('  No SSL/HTTPS issues found');
      }
    }

    // 4. Check for network timeout issues
    console.log('\n⏱️ TIMEOUT ANALYSIS:');
    console.log('-'.repeat(40));
    
    const { data: timeoutIssues, error: timeoutError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .or('metadata->error.ilike.%timeout%,metadata->error.ilike.%timed out%,metadata->error.ilike.%504%,metadata->error.ilike.%gateway timeout%')
      .order('created_at', { ascending: false });

    if (timeoutError) {
      console.log('❌ Timeout analysis failed:', timeoutError.message);
    } else {
      console.log(`✅ Found ${timeoutIssues?.length || 0} timeout-related issues`);
      if (timeoutIssues && timeoutIssues.length > 0) {
        timeoutIssues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.action_type.toUpperCase()}`);
          console.log(`     🔧 Service: ${issue.service_used}`);
          console.log(`     📅 Date: ${issue.created_at}`);
          console.log(`     📋 Timeout Details: ${JSON.stringify(issue.metadata)}`);
          console.log('');
        });
      } else {
        console.log('  No timeout issues found');
      }
    }

    // 5. Check for rate limiting issues
    console.log('\n🚦 RATE LIMITING ANALYSIS:');
    console.log('-'.repeat(40));
    
    const { data: rateLimitIssues, error: rateLimitError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .or('metadata->error.ilike.%rate limit%,metadata->error.ilike.%429%,metadata->error.ilike.%too many requests%')
      .order('created_at', { ascending: false });

    if (rateLimitError) {
      console.log('❌ Rate limit analysis failed:', rateLimitError.message);
    } else {
      console.log(`✅ Found ${rateLimitIssues?.length || 0} rate limiting issues`);
      if (rateLimitIssues && rateLimitIssues.length > 0) {
        rateLimitIssues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.action_type.toUpperCase()}`);
          console.log(`     🔧 Service: ${issue.service_used}`);
          console.log(`     📅 Date: ${issue.created_at}`);
          console.log(`     📋 Rate Limit Details: ${JSON.stringify(issue.metadata)}`);
          console.log('');
        });
      } else {
        console.log('  No rate limiting issues found');
      }
    }

    // Summary and recommendations
    console.log('\n📋 HTTP ERROR SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`👤 User: ${username} (${userId})`);
    console.log(`🌐 HTTP Errors: ${httpErrors?.length || 0}`);
    console.log(`📱 Mobile Issues: ${mobileIssues?.length || 0}`);
    console.log(`🔒 SSL/HTTPS Issues: ${sslIssues?.length || 0}`);
    console.log(`⏱️ Timeout Issues: ${timeoutIssues?.length || 0}`);
    console.log(`🚦 Rate Limit Issues: ${rateLimitIssues?.length || 0}`);

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('-'.repeat(40));
    
    if ((httpErrors?.length || 0) > 0) {
      console.log('🔧 HTTP Errors Found:');
      console.log('  - Check if user is on mobile device with poor connection');
      console.log('  - Verify HTTPS configuration is working properly');
      console.log('  - Check for proxy/firewall issues');
    }
    
    if ((sslIssues?.length || 0) > 0) {
      console.log('🔒 SSL/HTTPS Issues Found:');
      console.log('  - Verify SSL certificate is valid and not expired');
      console.log('  - Check for mixed content issues (HTTP resources on HTTPS page)');
      console.log('  - Ensure all API endpoints use HTTPS');
    }
    
    if ((timeoutIssues?.length || 0) > 0) {
      console.log('⏱️ Timeout Issues Found:');
      console.log('  - User may be on slow mobile connection');
      console.log('  - Consider increasing timeout values for mobile users');
      console.log('  - Implement progressive loading for large requests');
    }
    
    if ((rateLimitIssues?.length || 0) > 0) {
      console.log('🚦 Rate Limiting Issues Found:');
      console.log('  - User may be making too many requests too quickly');
      console.log('  - Consider implementing client-side rate limiting');
      console.log('  - Add retry logic with exponential backoff');
    }

    console.log('\n📱 MOBILE-SPECIFIC TIPS:');
    console.log('-'.repeat(40));
    console.log('  - Mobile users often have slower, less stable connections');
    console.log('  - HTTPS is required for modern mobile browsers');
    console.log('  - Consider implementing offline-first features');
    console.log('  - Add connection quality detection');
    console.log('  - Implement progressive image loading');

  } catch (error) {
    console.error('❌ Error during investigation:', error);
  }
}

// Run the investigation for the specific user
const userId = '7a851ddd-26ac-4dc7-bc7d-f0aa59b16f36';
const username = '9898989898989898';
investigateHttpErrors(userId, username);
