// Simple user search script
// Run this in your browser console on localhost:3000

async function searchUser(username) {
  console.log(`🔍 Searching for user: ${username}`);
  
  try {
    // Search in users table
    const usersResponse = await fetch('/api/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
      }
    });
    
    // You can also search directly in the database using the admin API
    console.log('📊 To search in Supabase dashboard:');
    console.log('1. Go to supabase.com → Your Project → SQL Editor');
    console.log('2. Run this query:');
    console.log(`
SELECT * FROM auth.users 
WHERE email ILIKE '%${username}%' 
   OR id::text ILIKE '%${username}%';
    `);
    
    console.log('3. Or search in Table Editor for:');
    console.log(`   - users table: email or name containing "${username}"`);
    console.log(`   - galleries table: user_id or description containing "${username}"`);
    console.log(`   - credit_transactions table: user_id or description containing "${username}"`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the search
searchUser('9898989898989898');
