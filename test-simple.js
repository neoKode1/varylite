// Simple Supabase connection test
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sjjzsjchpurdwldcdrdb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqanpzamNocHVyZHdsZGNkcmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNTAzMTQsImV4cCI6MjA3MjcyNjMxNH0.hskfPNhBZF-fAqhDpPt3ptDxQaR6K85rWtZOR5nplu8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    console.log('🧪 Testing basic Supabase connection...');
    
    // Test auth service
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.log('❌ Auth error:', authError.message);
      return;
    }
    console.log('✅ Auth service working');
    
    // Test a simple query to see what tables exist
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.log('❌ Schema query error:', error.message);
      return;
    }
    
    console.log('✅ Database accessible');
    console.log('📋 Available tables:', data.map(t => t.table_name));
    
    // Check if our tables exist
    const tableNames = data.map(t => t.table_name);
    const expectedTables = ['users', 'galleries', 'usage_tracking'];
    
    for (const table of expectedTables) {
      if (tableNames.includes(table)) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' missing`);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

test();
