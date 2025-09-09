#!/usr/bin/env node

/**
 * FAL AI Balance Check Script
 * Runs before build to verify FAL AI balance and API connectivity
 */

const https = require('https');
const http = require('http');

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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function checkFalBalance() {
  try {
    log('🔍 Checking FAL AI balance...', 'cyan');
    
    // Check if we have a local server running
    const localUrl = 'http://localhost:3000/api/fal-balance';
    
    try {
      const response = await makeRequest(localUrl);
      
      if (response.statusCode === 200) {
        const balance = response.data.current;
        const status = response.data.balanceStatus;
        const lastUpdated = new Date(response.data.lastUpdated).toLocaleString();
        
        log(`✅ FAL AI Balance Check Successful`, 'green');
        log(`💰 Current Balance: $${balance}`, 'bright');
        log(`📊 Status: ${status}`, status === 'healthy' ? 'green' : 'yellow');
        log(`🕒 Last Updated: ${lastUpdated}`, 'blue');
        
        // Check if balance is critically low
        if (balance < 10) {
          log(`⚠️  WARNING: Balance is critically low ($${balance})`, 'red');
          log(`💡 Consider adding funds to FAL AI account`, 'yellow');
        } else if (balance < 50) {
          log(`⚠️  Balance is getting low ($${balance})`, 'yellow');
          log(`💡 Consider adding funds soon to avoid service interruption`, 'yellow');
        } else {
          log(`✅ Balance is healthy ($${balance})`, 'green');
        }
        
        // Show estimated generations if available
        if (response.data.estimatedGenerations !== undefined) {
          log(`📊 Estimated generations remaining: ${response.data.estimatedGenerations}`, 'cyan');
        }
        
        // Show low balance alert if present
        if (response.data.lowBalanceAlert) {
          log(`🚨 LOW BALANCE ALERT: Balance below $50 threshold!`, 'red');
        }
        
        return true;
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.data?.error || 'Unknown error'}`);
      }
      
    } catch (localError) {
      log(`❌ Local server not available: ${localError.message}`, 'red');
      log(`💡 Make sure to run 'npm run dev' first to test the balance check`, 'yellow');
      
      // Don't fail the build if local server isn't running
      log(`⚠️  Skipping balance check - local server not available`, 'yellow');
      return true;
    }
    
  } catch (error) {
    log(`❌ FAL AI Balance Check Failed: ${error.message}`, 'red');
    log(`💡 This might indicate API connectivity issues`, 'yellow');
    
    // Don't fail the build for balance check failures
    log(`⚠️  Continuing build despite balance check failure`, 'yellow');
    return true;
  }
}

async function main() {
  log('🚀 VaryAI Build Pre-Check', 'magenta');
  log('=' .repeat(50), 'magenta');
  
  const balanceCheckPassed = await checkFalBalance();
  
  log('=' .repeat(50), 'magenta');
  
  if (balanceCheckPassed) {
    log('✅ All pre-build checks completed', 'green');
    log('🏗️  Proceeding with build...', 'cyan');
    process.exit(0);
  } else {
    log('❌ Pre-build checks failed', 'red');
    process.exit(1);
  }
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`, 'red');
  log('⚠️  Continuing build despite error', 'yellow');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  log(`❌ Unhandled Rejection: ${reason}`, 'red');
  log('⚠️  Continuing build despite error', 'yellow');
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  log(`❌ Script Error: ${error.message}`, 'red');
  log('⚠️  Continuing build despite error', 'yellow');
  process.exit(0);
});
