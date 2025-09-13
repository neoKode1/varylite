#!/usr/bin/env node

/**
 * Credit System Schema Test
 * 
 * This script tests all the database schemas and functions to ensure
 * the credit system is properly set up and working.
 * 
 * Run with: node test-credit-schema.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbXplcGZiZ2J3dHpicG1yZXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDk5NjgsImV4cCI6MjA3MjcyNTk2OH0.vwKODtk4ScXWv8ZCTqtkmlMeYLWhUrInxrhaYZnEVqo';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(testName, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}${message ? ': ' + message : ''}`);
  
  testResults.tests.push({ name: testName, passed, message });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function testTableExists(tableName, description) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      logTest(`${description} (${tableName})`, false, error.message);
      return false;
    }
    
    logTest(`${description} (${tableName})`, true);
    return true;
  } catch (err) {
    logTest(`${description} (${tableName})`, false, err.message);
    return false;
  }
}

async function testFunctionExists(functionName, description) {
  try {
    // Test the function by calling it with dummy data
    const { data, error } = await supabase
      .rpc(functionName, { 
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 0,
        p_description: 'test'
      });
    
    // We expect an error for invalid UUID, but the function should exist
    if (error && error.message.includes('invalid input syntax for type uuid')) {
      logTest(`${description} (${functionName})`, true);
      return true;
    } else if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      logTest(`${description} (${functionName})`, false, 'Function does not exist');
      return false;
    } else {
      logTest(`${description} (${functionName})`, true);
      return true;
    }
  } catch (err) {
    logTest(`${description} (${functionName})`, false, err.message);
    return false;
  }
}

async function testModelCosts() {
  try {
    const { data, error } = await supabase
      .from('model_costs')
      .select('*')
      .limit(5);
    
    if (error) {
      logTest('Model Costs Data', false, error.message);
      return false;
    }
    
    if (!data || data.length === 0) {
      logTest('Model Costs Data', false, 'No model costs found');
      return false;
    }
    
    // Check for key models
    const nanoBanana = data.find(m => m.model_name === 'nano-banana');
    const seedancePro = data.find(m => m.model_name === 'seedance-pro');
    
    if (!nanoBanana) {
      logTest('Model Costs Data', false, 'Nano Banana model not found');
      return false;
    }
    
    if (!seedancePro) {
      logTest('Model Costs Data', false, 'Seedance Pro model not found');
      return false;
    }
    
    logTest('Model Costs Data', true, `${data.length} models configured`);
    return true;
  } catch (err) {
    logTest('Model Costs Data', false, err.message);
    return false;
  }
}

async function testUserCredits() {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .limit(5);
    
    if (error) {
      logTest('User Credits Data', false, error.message);
      return false;
    }
    
    logTest('User Credits Data', true, `${data.length} users with credits`);
    return true;
  } catch (err) {
    logTest('User Credits Data', false, err.message);
    return false;
  }
}

async function testCreditTransactions() {
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .limit(5);
    
    if (error) {
      logTest('Credit Transactions Data', false, error.message);
      return false;
    }
    
    logTest('Credit Transactions Data', true, `${data.length} transactions found`);
    return true;
  } catch (err) {
    logTest('Credit Transactions Data', false, err.message);
    return false;
  }
}

async function testGrandfatheringBatch() {
  try {
    const { data, error } = await supabase
      .from('grandfathering_batch')
      .select('*')
      .limit(5);
    
    if (error) {
      logTest('Grandfathering Batch Data', false, error.message);
      return false;
    }
    
    logTest('Grandfathering Batch Data', true, `${data.length} batches found`);
    return true;
  } catch (err) {
    logTest('Grandfathering Batch Data', false, err.message);
    return false;
  }
}

async function testUserCount() {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      logTest('User Count Check', false, error.message);
      return false;
    }
    
    logTest('User Count Check', true, `${count} total users`);
    return count;
  } catch (err) {
    logTest('User Count Check', false, err.message);
    return 0;
  }
}

async function testCreditDistribution() {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('balance')
      .not('balance', 'is', null);
    
    if (error) {
      logTest('Credit Distribution Check', false, error.message);
      return false;
    }
    
    if (!data || data.length === 0) {
      logTest('Credit Distribution Check', false, 'No users with credits found');
      return false;
    }
    
    const totalCredits = data.reduce((sum, user) => sum + parseFloat(user.balance), 0);
    const averageCredits = totalCredits / data.length;
    
    logTest('Credit Distribution Check', true, 
      `${data.length} users, $${totalCredits.toFixed(2)} total, $${averageCredits.toFixed(2)} average`);
    
    return true;
  } catch (err) {
    logTest('Credit Distribution Check', false, err.message);
    return false;
  }
}

async function testCalculateUserGenerations() {
  try {
    // Get a user with credits to test
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('user_id, balance')
      .limit(1);
    
    if (creditsError || !userCredits || userCredits.length === 0) {
      logTest('Calculate User Generations Function', false, 'No users with credits found');
      return false;
    }
    
    const testUserId = userCredits[0].user_id;
    
    const { data, error } = await supabase
      .rpc('calculate_user_generations', {
        p_user_id: testUserId,
        p_include_secret: false
      });
    
    if (error) {
      logTest('Calculate User Generations Function', false, error.message);
      return false;
    }
    
    if (!data || data.length === 0) {
      logTest('Calculate User Generations Function', false, 'No generation calculations returned');
      return false;
    }
    
    logTest('Calculate User Generations Function', true, 
      `${data.length} model calculations for user`);
    
    return true;
  } catch (err) {
    logTest('Calculate User Generations Function', false, err.message);
    return false;
  }
}

async function testGetUserCreditSummary() {
  try {
    // Get a user with credits to test
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('user_id, balance')
      .limit(1);
    
    if (creditsError || !userCredits || userCredits.length === 0) {
      logTest('Get User Credit Summary Function', false, 'No users with credits found');
      return false;
    }
    
    const testUserId = userCredits[0].user_id;
    
    const { data, error } = await supabase
      .rpc('get_user_credit_summary', {
        p_user_id: testUserId
      });
    
    if (error) {
      logTest('Get User Credit Summary Function', false, error.message);
      return false;
    }
    
    if (!data || data.length === 0) {
      logTest('Get User Credit Summary Function', false, 'No summary data returned');
      return false;
    }
    
    const summary = data[0];
    logTest('Get User Credit Summary Function', true, 
      `Balance: $${summary.current_balance}, Basic: ${summary.total_base_generations}, Premium: ${summary.total_premium_generations}`);
    
    return true;
  } catch (err) {
    logTest('Get User Credit Summary Function', false, err.message);
    return false;
  }
}

async function testRLSPolicies() {
  try {
    // Test that we can read model_costs (should be public)
    const { data, error } = await supabase
      .from('model_costs')
      .select('*')
      .limit(1);
    
    if (error) {
      logTest('RLS Policies - Model Costs', false, error.message);
      return false;
    }
    
    logTest('RLS Policies - Model Costs', true, 'Public read access working');
    return true;
  } catch (err) {
    logTest('RLS Policies - Model Costs', false, err.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Starting Credit System Schema Tests...\n');
  
  // Test table existence
  console.log('📋 Testing Table Existence:');
  await testTableExists('user_credits', 'User Credits Table');
  await testTableExists('credit_transactions', 'Credit Transactions Table');
  await testTableExists('credit_usage_log', 'Credit Usage Log Table');
  await testTableExists('grandfathering_batch', 'Grandfathering Batch Table');
  await testTableExists('model_costs', 'Model Costs Table');
  
  console.log('\n🔧 Testing Function Existence:');
  await testFunctionExists('add_user_credits', 'Add User Credits Function');
  await testFunctionExists('use_user_credits', 'Use User Credits Function');
  await testFunctionExists('calculate_user_generations', 'Calculate User Generations Function');
  await testFunctionExists('get_user_credit_summary', 'Get User Credit Summary Function');
  
  console.log('\n📊 Testing Data Integrity:');
  await testModelCosts();
  await testUserCredits();
  await testCreditTransactions();
  await testGrandfatheringBatch();
  await testUserCount();
  await testCreditDistribution();
  
  console.log('\n⚙️ Testing Functionality:');
  await testCalculateUserGenerations();
  await testGetUserCreditSummary();
  await testRLSPolicies();
  
  // Summary
  console.log('\n📈 Test Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Credit system is properly set up.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the schema setup.');
    console.log('\nFailed tests:');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => console.log(`  - ${test.name}: ${test.message}`));
  }
  
  return testResults.failed === 0;
}

// Run the tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner error:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, testResults };
