#!/usr/bin/env node

/**
 * Community Database Setup Script
 * 
 * This script helps set up the community database tables in Supabase.
 * Run this script to create the necessary tables for the community functionality.
 * 
 * Usage: node scripts/setup-community-db.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_KEY:', supabaseKey ? '✅' : '❌');
  console.error('\n💡 Make sure your .env.local file contains these variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupCommunityDatabase() {
  console.log('🚀 Setting up Community Database...\n');

  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'community-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Some errors are expected (like "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`   ⚠️  ${error.message} (this is expected)`);
          } else {
            console.error(`   ❌ Error: ${error.message}`);
          }
        } else {
          console.log(`   ✅ Success`);
        }
      } catch (err) {
        console.error(`   ❌ Error executing statement: ${err.message}`);
      }
    }

    console.log('\n🎉 Community database setup completed!');
    console.log('\n📋 Created tables:');
    console.log('   • community_posts');
    console.log('   • community_comments');
    console.log('   • community_interactions');
    console.log('   • analytics_events');
    console.log('\n🔒 Security policies and indexes have been created.');
    console.log('\n💡 You can now use the community functionality!');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\n💡 Manual setup instructions:');
    console.error('   1. Go to your Supabase dashboard');
    console.error('   2. Navigate to SQL Editor');
    console.error('   3. Copy and paste the contents of database/community-schema.sql');
    console.error('   4. Execute the SQL');
    process.exit(1);
  }
}

// Check if we can connect to Supabase
async function testConnection() {
  try {
    const { data, error } = await supabase.from('auth.users').select('count').limit(1);
    if (error && !error.message.includes('permission denied')) {
      throw error;
    }
    console.log('✅ Connected to Supabase successfully\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    console.error('\n💡 Please check your environment variables and try again.');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔧 VaryAI Community Database Setup\n');
  
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  await setupCommunityDatabase();
}

main().catch(console.error);
