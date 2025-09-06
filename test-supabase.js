// Simple test script to verify Supabase connection
// Run with: node test-supabase.js

const { createClient } = require('@supabase/supabase-js');

// Test environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sjjzsjchpurdwldcdrdb.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqanpzamNocHVyZHdsZGNkcmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNTAzMTQsImV4cCI6MjA3MjcyNjMxNH0.hskfPNhBZF-fAqhDpPt3ptDxQaR6K85rWtZOR5nplu8';

console.log('🧪 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n1. Testing basic connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Basic connection successful');
    
    // Test auth
    console.log('\n2. Testing auth service...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('❌ Auth test failed:', authError.message);
      return false;
    }
    
    console.log('✅ Auth service accessible');
    console.log('Current session:', authData.session ? 'Active' : 'None');
    
    // Test database tables
    console.log('\n3. Testing database tables...');
    
    const tables = ['users', 'galleries', 'usage_tracking'];
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (tableError) {
          console.log(`❌ Table '${table}' test failed:`, tableError.message);
        } else {
          console.log(`✅ Table '${table}' accessible`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}' error:`, err.message);
      }
    }
    
    console.log('\n🎉 Supabase connection test completed!');
    return true;
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
