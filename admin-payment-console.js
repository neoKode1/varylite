#!/usr/bin/env node

/**
 * Admin Payment Console
 * Advanced payment processing from command line
 */

const readline = require('readline');
const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  adminEmail: '1deeptechnology@gmail.com'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const request = client.request(url, options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: response.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: response.statusCode, data: data });
        }
      });
    });
    
    request.on('error', reject);
    
    if (options.body) {
      request.write(options.body);
    }
    
    request.end();
  });
}

async function processWeeklyPayment(amount, description) {
  colorLog('💰 Processing Weekly Payment...', 'blue');
  colorLog(`Amount: $${amount}`, 'green');
  colorLog(`Description: ${description}`, 'green');
  
  try {
    const response = await makeRequest(`${CONFIG.baseUrl}/api/process-weekly-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: parseFloat(amount),
        description: description
      })
    });
    
    if (response.status === 200) {
      colorLog('✅ Payment processed successfully!', 'green');
      colorLog(`Payment ID: ${response.data.paymentIntentId}`, 'green');
      colorLog(`Users charged: ${response.data.usersCharged}`, 'green');
      colorLog(`Total amount: $${response.data.totalAmount}`, 'green');
      colorLog(`Credits distributed: $${response.data.creditsDistributed}`, 'green');
    } else {
      colorLog(`❌ Error: ${response.data.error || 'Unknown error'}`, 'red');
    }
  } catch (error) {
    colorLog(`❌ Request failed: ${error.message}`, 'red');
  }
}

async function getPaymentStats() {
  colorLog('📊 Fetching Payment Statistics...', 'blue');
  
  try {
    const response = await makeRequest(`${CONFIG.baseUrl}/api/process-weekly-payment`, {
      method: 'GET'
    });
    
    if (response.status === 200) {
      colorLog('✅ Payment Statistics:', 'green');
      colorLog(`Users with credits: ${response.data.usersWithCredits}`, 'green');
      colorLog(`Total credits in circulation: $${response.data.totalCreditsInCirculation}`, 'green');
      colorLog(`Average credits per user: $${response.data.averageCreditsPerUser}`, 'green');
      colorLog(`Payment batches: ${response.data.paymentBatches}`, 'green');
    } else {
      colorLog(`❌ Error: ${response.data.error || 'Unknown error'}`, 'red');
    }
  } catch (error) {
    colorLog(`❌ Request failed: ${error.message}`, 'red');
  }
}

async function distributeCredits(amount, description) {
  colorLog('🎁 Processing Credit Distribution...', 'blue');
  colorLog(`Amount per user: $${amount}`, 'green');
  colorLog(`Description: ${description}`, 'green');
  
  try {
    const response = await makeRequest(`${CONFIG.baseUrl}/api/distribute-credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        creditsPerUser: parseFloat(amount),
        description: description
      })
    });
    
    if (response.status === 200) {
      colorLog('✅ Credits distributed successfully!', 'green');
      colorLog(`Users affected: ${response.data.usersAffected}`, 'green');
      colorLog(`Total credits distributed: $${response.data.totalCreditsDistributed}`, 'green');
    } else {
      colorLog(`❌ Error: ${response.data.error || 'Unknown error'}`, 'red');
    }
  } catch (error) {
    colorLog(`❌ Request failed: ${error.message}`, 'red');
  }
}

async function getUserCredits(userId) {
  colorLog(`👤 Fetching credits for user: ${userId}`, 'blue');
  
  try {
    const response = await makeRequest(`${CONFIG.baseUrl}/api/user-credits?userId=${userId}`, {
      method: 'GET'
    });
    
    if (response.status === 200) {
      colorLog('✅ User Credit Summary:', 'green');
      colorLog(`Current balance: $${response.data.currentBalance}`, 'green');
      colorLog(`Total transactions: ${response.data.totalTransactions}`, 'green');
      colorLog(`Available generations:`, 'green');
      
      if (response.data.generationCalculations) {
        response.data.generationCalculations.forEach(calc => {
          colorLog(`  ${calc.modelName}: ${calc.maxGenerations} generations`, 'cyan');
        });
      }
    } else {
      colorLog(`❌ Error: ${response.data.error || 'Unknown error'}`, 'red');
    }
  } catch (error) {
    colorLog(`❌ Request failed: ${error.message}`, 'red');
  }
}

function showHelp() {
  colorLog('🔧 Admin Payment Console - Available Commands:', 'yellow');
  colorLog('', 'reset');
  colorLog('1. weekly <amount> <description> - Process weekly payment', 'blue');
  colorLog('   Example: weekly 120 "September 19th payment"', 'cyan');
  colorLog('', 'reset');
  colorLog('2. stats - Get payment statistics', 'blue');
  colorLog('', 'reset');
  colorLog('3. distribute <amount> <description> - Distribute credits', 'blue');
  colorLog('   Example: distribute 5.99 "Weekly credit grant"', 'cyan');
  colorLog('', 'reset');
  colorLog('4. user <userId> - Get user credit info', 'blue');
  colorLog('   Example: user abc123', 'cyan');
  colorLog('', 'reset');
  colorLog('5. help - Show this help', 'blue');
  colorLog('6. exit - Exit the console', 'blue');
  colorLog('', 'reset');
}

function createInterface() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'admin> '
  });
  
  colorLog('🔧 Admin Payment Console', 'yellow');
  colorLog('========================', 'yellow');
  colorLog('Type "help" for available commands or "exit" to quit', 'cyan');
  colorLog('', 'reset');
  
  rl.prompt();
  
  rl.on('line', async (line) => {
    const [command, ...args] = line.trim().split(' ');
    
    switch (command.toLowerCase()) {
      case 'weekly':
        if (args.length >= 1) {
          await processWeeklyPayment(args[0], args.slice(1).join(' ') || 'Weekly payment');
        } else {
          colorLog('❌ Usage: weekly <amount> [description]', 'red');
        }
        break;
        
      case 'stats':
        await getPaymentStats();
        break;
        
      case 'distribute':
        if (args.length >= 1) {
          await distributeCredits(args[0], args.slice(1).join(' ') || 'Credit distribution');
        } else {
          colorLog('❌ Usage: distribute <amount> [description]', 'red');
        }
        break;
        
      case 'user':
        if (args.length >= 1) {
          await getUserCredits(args[0]);
        } else {
          colorLog('❌ Usage: user <userId>', 'red');
        }
        break;
        
      case 'help':
        showHelp();
        break;
        
      case 'exit':
        colorLog('👋 Goodbye!', 'yellow');
        rl.close();
        return;
        
      default:
        if (command) {
          colorLog(`❌ Unknown command: ${command}. Type "help" for available commands.`, 'red');
        }
    }
    
    rl.prompt();
  });
  
  rl.on('close', () => {
    process.exit(0);
  });
}

// Handle command line arguments
if (process.argv.length > 2) {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command.toLowerCase()) {
    case 'weekly':
      if (args.length >= 1) {
        processWeeklyPayment(args[0], args.slice(1).join(' ') || 'Weekly payment')
          .then(() => process.exit(0))
          .catch(err => {
            colorLog(`❌ Error: ${err.message}`, 'red');
            process.exit(1);
          });
      } else {
        colorLog('❌ Usage: node admin-payment-console.js weekly <amount> [description]', 'red');
        process.exit(1);
      }
      break;
      
    case 'stats':
      getPaymentStats()
        .then(() => process.exit(0))
        .catch(err => {
          colorLog(`❌ Error: ${err.message}`, 'red');
          process.exit(1);
        });
      break;
      
    case 'distribute':
      if (args.length >= 1) {
        distributeCredits(args[0], args.slice(1).join(' ') || 'Credit distribution')
          .then(() => process.exit(0))
          .catch(err => {
            colorLog(`❌ Error: ${err.message}`, 'red');
            process.exit(1);
          });
      } else {
        colorLog('❌ Usage: node admin-payment-console.js distribute <amount> [description]', 'red');
        process.exit(1);
      }
      break;
      
    default:
      colorLog('❌ Unknown command. Available: weekly, stats, distribute', 'red');
      process.exit(1);
  }
} else {
  // Interactive mode
  createInterface();
}
