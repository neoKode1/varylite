import { fal } from '@fal-ai/client';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY
});

export interface BalanceStatus {
  status: 'healthy' | 'low' | 'auth_error' | 'error' | 'unknown';
  lastError: string | null;
  lastChecked: Date;
  testSuccessful: boolean;
}

let balanceCache: BalanceStatus | null = null;
let lastBalanceCheck = 0;
const BALANCE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check FAL AI balance status by making a test request
 * This function detects balance issues by attempting a minimal API call
 */
export async function checkFalBalance(): Promise<BalanceStatus> {
  const now = Date.now();
  
  // Return cached result if it's still fresh
  if (balanceCache && (now - lastBalanceCheck) < BALANCE_CACHE_DURATION) {
    return balanceCache;
  }

  const balanceStatus: BalanceStatus = {
    status: 'unknown',
    lastError: null,
    lastChecked: new Date(),
    testSuccessful: false
  };

  try {
    console.log('🔍 Checking FAL AI balance status...');
    
    // Make a minimal test request to detect balance issues
    const testResult = await fal.subscribe("fal-ai/nano-banana", {
      input: {
        prompt: "balance check test",
        image_url: "https://storage.googleapis.com/falserverless/example_inputs/nano_banana_img.jpg"
      },
      logs: false
    });
    
    console.log('✅ FAL AI balance check successful');
    balanceStatus.status = 'healthy';
    balanceStatus.testSuccessful = true;
    
  } catch (error: any) {
    console.log('❌ FAL AI balance check failed:', error.message);
    balanceStatus.lastError = error.message;
    balanceStatus.testSuccessful = false;
    
    // Check for balance-related errors
    if (error.message && (
      error.message.includes('balance') || 
      error.message.includes('credit') || 
      error.message.includes('insufficient') ||
      error.message.includes('payment') ||
      error.message.includes('quota') ||
      error.message.includes('limit') ||
      error.message.includes('exceeded')
    )) {
      balanceStatus.status = 'low';
      console.log('🚨 BALANCE ISSUE DETECTED!');
    } else if (error.message.includes('Unauthorized')) {
      balanceStatus.status = 'auth_error';
      console.log('🔑 Authentication error - API key issue');
    } else {
      balanceStatus.status = 'error';
      console.log('⚠️ Other error detected');
    }
  }

  // Cache the result
  balanceCache = balanceStatus;
  lastBalanceCheck = now;
  
  return balanceStatus;
}

/**
 * Get balance status with caching
 */
export async function getBalanceStatus(): Promise<BalanceStatus> {
  return checkFalBalance();
}

/**
 * Clear balance cache (useful for testing or when you want fresh data)
 */
export function clearBalanceCache(): void {
  balanceCache = null;
  lastBalanceCheck = 0;
}
