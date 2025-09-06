// Test individual tables directly
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sjjzsjchpurdwldcdrdb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqanpzamNocHVyZHdsZGNkcmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNTAzMTQsImV4cCI6MjA3MjcyNjMxNH0.hskfPNhBZF-fAqhDpPt3ptDxQaR6K85rWtZOR5nplu8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTables() {
  console.log('🧪 Testing individual tables...');
  
  const tables = [
    { name: 'users', description: 'User profiles' },
    { name: 'galleries', description: 'User galleries' },
    { name: 'usage_tracking', description: 'Usage analytics' }
  ];
  
  for (const table of tables) {
    try {
      console.log(`\n📋 Testing table: ${table.name} (${table.description})`);
      
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table.name}: ${error.message}`);
      } else {
        console.log(`✅ ${table.name}: Accessible (${data.length} rows returned)`);
      }
    } catch (err) {
      console.log(`❌ ${table.name}: ${err.message}`);
    }
  }
  
  // Test auth
  console.log('\n🔐 Testing authentication...');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log(`❌ Auth: ${error.message}`);
    } else {
      console.log(`✅ Auth: Working (session: ${data.session ? 'Active' : 'None'})`);
    }
  } catch (err) {
    console.log(`❌ Auth: ${err.message}`);
  }
}

testTables();
