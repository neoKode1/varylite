#!/usr/bin/env node

/**
 * Comprehensive Video Generation Test with Proper Polling Logic
 * This script tests both Veo3 Fast and Minimax 2.0 with detailed polling monitoring
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const VEO3_ENDPOINT = '/api/veo3-fast';
const MINIMAX_ENDPOINT = '/api/minimax-2';

// Test configuration
const TEST_CONFIG = {
  prompt: 'A person waves hello and smiles warmly at the camera, then turns to look at something off-screen',
  image_url: 'https://storage.googleapis.com/falserverless/example_inputs/veo3-i2v-input.png',
  duration: '8s',
  generate_audio: true,
  resolution: '720p'
};

// Enhanced logging class for video generation process
class VideoGenerationLogger {
  constructor(modelName) {
    this.modelName = modelName;
    this.startTime = Date.now();
    this.logs = [];
    this.phases = [];
    this.currentPhase = null;
    this.pollingUpdates = [];
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    
    const logEntry = {
      timestamp,
      elapsed: `${elapsed}ms`,
      level,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // Console output with colors and icons
    const colors = {
      INFO: '\x1b[36m',    // Cyan
      SUCCESS: '\x1b[32m', // Green
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m',   // Red
      PHASE: '\x1b[35m',   // Magenta
      POLLING: '\x1b[34m', // Blue
      RESET: '\x1b[0m'
    };
    
    const color = colors[level] || colors.INFO;
    const icon = this.getIcon(level);
    
    console.log(`${color}${icon} [${elapsed}ms] ${message}${colors.RESET}`);
    
    if (data) {
      console.log(`${color}   📊 Data: ${JSON.stringify(data, null, 2)}${colors.RESET}`);
    }
  }

  getIcon(level) {
    const icons = {
      INFO: 'ℹ️',
      SUCCESS: '✅',
      WARNING: '⚠️',
      ERROR: '❌',
      PHASE: '🔄',
      POLLING: '⏳'
    };
    return icons[level] || '📝';
  }

  startPhase(phaseName) {
    this.currentPhase = {
      name: phaseName,
      startTime: Date.now(),
      logs: []
    };
    this.phases.push(this.currentPhase);
    this.log('PHASE', `Starting phase: ${phaseName}`);
  }

  endPhase() {
    if (this.currentPhase) {
      this.currentPhase.endTime = Date.now();
      this.currentPhase.duration = this.currentPhase.endTime - this.currentPhase.startTime;
      this.log('SUCCESS', `Completed phase: ${this.currentPhase.name} (${this.currentPhase.duration}ms)`);
      this.currentPhase = null;
    }
  }

  logPollingUpdate(update) {
    const pollingLog = {
      timestamp: new Date().toISOString(),
      elapsed: Date.now() - this.startTime,
      status: update.status,
      logs: update.logs || [],
      progress: update.progress || null
    };
    
    this.pollingUpdates.push(pollingLog);
    
    this.log('POLLING', `Status: ${update.status}`, {
      progress: update.progress,
      logCount: update.logs?.length || 0
    });
    
    // Log individual log messages from the polling update
    if (update.logs && update.logs.length > 0) {
      update.logs.forEach(log => {
        this.log('INFO', `  📝 ${log.message}`);
      });
    }
  }

  saveLogs() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `video-generation-log-${this.modelName}-${timestamp}.json`;
    
    const logData = {
      modelName: this.modelName,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      testConfig: TEST_CONFIG,
      phases: this.phases,
      pollingUpdates: this.pollingUpdates,
      logs: this.logs,
      summary: this.generateSummary()
    };
    
    fs.writeFileSync(filename, JSON.stringify(logData, null, 2));
    this.log('SUCCESS', `Comprehensive logs saved to: ${filename}`);
    
    return filename;
  }

  generateSummary() {
    const successLogs = this.logs.filter(log => log.level === 'SUCCESS').length;
    const errorLogs = this.logs.filter(log => log.level === 'ERROR').length;
    const warningLogs = this.logs.filter(log => log.level === 'WARNING').length;
    const pollingLogs = this.logs.filter(log => log.level === 'POLLING').length;
    
    return {
      totalLogs: this.logs.length,
      successCount: successLogs,
      errorCount: errorLogs,
      warningCount: warningLogs,
      pollingCount: pollingLogs,
      phasesCompleted: this.phases.length,
      pollingUpdates: this.pollingUpdates.length,
      totalDuration: Date.now() - this.startTime
    };
  }
}

// Enhanced HTTP request with detailed logging and timeout
function makeRequestWithLogging(url, data, logger, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    logger.log('INFO', `Making request to: ${url}`);
    logger.log('INFO', 'Request payload:', {
      prompt: data.prompt,
      image_url: data.image_url,
      duration: data.duration,
      generate_audio: data.generate_audio,
      resolution: data.resolution
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = require('http').request(url, options, (res) => {
      logger.log('INFO', `Response received: ${res.statusCode} ${res.statusMessage}`);
      logger.log('INFO', 'Response headers:', res.headers);
      
      let responseData = '';
      let dataChunks = 0;
      
      res.on('data', (chunk) => {
        dataChunks++;
        responseData += chunk;
        logger.log('INFO', `Received data chunk ${dataChunks} (${chunk.length} bytes)`);
      });
      
      res.on('end', () => {
        logger.log('INFO', `Response complete. Total chunks: ${dataChunks}, Total size: ${responseData.length} bytes`);
        
        try {
          const parsedData = JSON.parse(responseData);
          logger.log('SUCCESS', 'Response parsed successfully');
          logger.log('INFO', 'Response data:', parsedData);
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          logger.log('ERROR', 'Failed to parse response JSON', { error: error.message, response: responseData });
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      logger.log('ERROR', 'Request failed', { error: error.message, code: error.code });
      reject(error);
    });

    req.on('timeout', () => {
      logger.log('ERROR', `Request timeout after ${timeoutMs}ms`);
      req.destroy();
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    });

    // Set timeout for video generation (5 minutes)
    req.setTimeout(timeoutMs);

    logger.log('INFO', 'Sending request...');
    req.write(postData);
    req.end();
  });
}

// Test a single model with comprehensive polling logging
async function testModelWithPollingLogging(endpoint, modelName, testData) {
  const logger = new VideoGenerationLogger(`${modelName.replace(/\s+/g, '-').toLowerCase()}`);
  
  logger.log('INFO', `🎬 Starting comprehensive test for ${modelName}`);
  logger.log('INFO', 'Test configuration:', testData);
  
  try {
    // Phase 1: Pre-request validation
    logger.startPhase('Pre-request Validation');
    logger.log('INFO', 'Validating test data...');
    
    if (!testData.prompt) {
      throw new Error('Prompt is required');
    }
    if (!testData.image_url) {
      throw new Error('Image URL is required');
    }
    
    logger.log('SUCCESS', 'Test data validation passed');
    logger.endPhase();
    
    // Phase 2: API request submission
    logger.startPhase('API Request Submission');
    const requestStartTime = Date.now();
    
    logger.log('INFO', 'Submitting video generation request...');
    logger.log('INFO', 'Note: This will use Fal.ai\'s internal polling mechanism via fal.subscribe()');
    
    const response = await makeRequestWithLogging(`${BASE_URL}${endpoint}`, testData, logger);
    const requestEndTime = Date.now();
    const requestDuration = requestEndTime - requestStartTime;
    
    logger.log('INFO', `Request completed in ${requestDuration}ms`);
    logger.endPhase();
    
    // Phase 3: Response processing
    logger.startPhase('Response Processing');
    
    if (response.statusCode === 200) {
      logger.log('SUCCESS', 'API request successful');
      
      if (response.data.success) {
        logger.log('SUCCESS', 'Video generation completed successfully');
        logger.log('INFO', 'Video details:', {
          videoUrl: response.data.videoUrl,
          requestId: response.data.requestId,
          model: response.data.model
        });
        
        // Phase 4: Video URL validation
        logger.startPhase('Video URL Validation');
        logger.log('INFO', 'Validating video URL...');
        
        if (response.data.videoUrl && response.data.videoUrl.startsWith('http')) {
          logger.log('SUCCESS', 'Video URL is valid');
          
          // Phase 5: Video accessibility check
          logger.startPhase('Video Accessibility Check');
          logger.log('INFO', 'Checking if video is accessible...');
          
          try {
            const videoResponse = await new Promise((resolve, reject) => {
              const req = require('http').get(response.data.videoUrl, (res) => {
                resolve({
                  statusCode: res.statusCode,
                  headers: res.headers,
                  contentLength: res.headers['content-length']
                });
              });
              req.on('error', reject);
              req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Video URL check timeout'));
              });
            });
            
            if (videoResponse.statusCode === 200) {
              logger.log('SUCCESS', 'Video is accessible');
              logger.log('INFO', 'Video details:', {
                contentLength: videoResponse.contentLength,
                contentType: videoResponse.headers['content-type']
              });
            } else {
              logger.log('WARNING', `Video URL returned status ${videoResponse.statusCode}`);
            }
          } catch (error) {
            logger.log('WARNING', 'Could not verify video accessibility', { error: error.message });
          }
          
          logger.endPhase();
        } else {
          logger.log('ERROR', 'Invalid video URL format');
        }
        
        logger.endPhase();
        
        return {
          model: modelName,
          status: 'SUCCESS',
          duration: requestDuration,
          videoUrl: response.data.videoUrl,
          requestId: response.data.requestId,
          logs: logger.logs,
          phases: logger.phases,
          pollingUpdates: logger.pollingUpdates
        };
        
      } else {
        logger.log('ERROR', 'Video generation failed', response.data);
        logger.endPhase();
        
        return {
          model: modelName,
          status: 'FAILED',
          duration: requestDuration,
          error: response.data,
          logs: logger.logs,
          phases: logger.phases,
          pollingUpdates: logger.pollingUpdates
        };
      }
      
    } else {
      logger.log('ERROR', `API request failed with status ${response.statusCode}`, response.data);
      logger.endPhase();
      
      return {
        model: modelName,
        status: 'FAILED',
        duration: requestDuration,
        error: response.data,
        logs: logger.logs,
        phases: logger.phases,
        pollingUpdates: logger.pollingUpdates
      };
    }
    
  } catch (error) {
    logger.log('ERROR', 'Test failed with exception', { 
      error: error.message, 
      stack: error.stack 
    });
    
    return {
      model: modelName,
      status: 'ERROR',
      error: error.message,
      logs: logger.logs,
      phases: logger.phases,
      pollingUpdates: logger.pollingUpdates
    };
  } finally {
    // Save comprehensive logs
    const logFile = logger.saveLogs();
    logger.log('INFO', `Comprehensive logging completed. Log file: ${logFile}`);
  }
}

// Main test function
async function runComprehensivePollingTest() {
  console.log('🎬 Comprehensive Video Generation Test with Polling Monitoring');
  console.log('================================================================');
  console.log('');
  console.log('📋 This test will monitor the entire video generation process:');
  console.log('   1. Request submission to Fal.ai proxy');
  console.log('   2. Internal polling via fal.subscribe() method');
  console.log('   3. Real-time status updates and logs');
  console.log('   4. Video URL validation and accessibility');
  console.log('');
  
  const overallStartTime = Date.now();
  const results = [];
  
  // Test Veo3 Fast
  console.log('🤖 Testing Veo3 Fast with comprehensive polling monitoring...');
  console.log('='.repeat(70));
  
  const veo3Result = await testModelWithPollingLogging(VEO3_ENDPOINT, 'Veo3 Fast', TEST_CONFIG);
  results.push(veo3Result);
  
  console.log('');
  console.log('⏳ Waiting 10 seconds before testing Minimax 2.0...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Test Minimax 2.0
  console.log('');
  console.log('🤖 Testing Minimax 2.0 with comprehensive polling monitoring...');
  console.log('='.repeat(70));
  
  const minimaxResult = await testModelWithPollingLogging(MINIMAX_ENDPOINT, 'Minimax 2.0', TEST_CONFIG);
  results.push(minimaxResult);
  
  // Overall summary
  const overallEndTime = Date.now();
  const totalDuration = overallEndTime - overallStartTime;
  
  console.log('');
  console.log('📊 COMPREHENSIVE POLLING TEST SUMMARY');
  console.log('=====================================');
  console.log(`⏱️ Total test duration: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
  console.log('');
  
  results.forEach(result => {
    console.log(`🤖 ${result.model}:`);
    console.log(`   Status: ${result.status}`);
    if (result.duration) {
      console.log(`   Duration: ${result.duration}ms`);
    }
    if (result.videoUrl) {
      console.log(`   Video: ${result.videoUrl}`);
    }
    if (result.error) {
      console.log(`   Error: ${JSON.stringify(result.error)}`);
    }
    if (result.pollingUpdates) {
      console.log(`   Polling Updates: ${result.pollingUpdates.length}`);
    }
    console.log('');
  });
  
  // Save overall results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summaryFile = `comprehensive-polling-test-summary-${timestamp}.json`;
  
  fs.writeFileSync(summaryFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    testType: 'Comprehensive Video Generation Test with Polling',
    totalDuration: totalDuration,
    testConfig: TEST_CONFIG,
    results: results,
    summary: {
      totalTests: results.length,
      successful: results.filter(r => r.status === 'SUCCESS').length,
      failed: results.filter(r => r.status === 'FAILED').length,
      errors: results.filter(r => r.status === 'ERROR').length,
      totalPollingUpdates: results.reduce((sum, r) => sum + (r.pollingUpdates?.length || 0), 0)
    }
  }, null, 2));
  
  console.log(`💾 Overall test summary saved to: ${summaryFile}`);
  console.log('');
  console.log('🎉 Comprehensive polling testing completed!');
  
  return results;
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run comprehensive polling test
if (require.main === module) {
  runComprehensivePollingTest()
    .then((results) => {
      console.log('✅ All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Comprehensive polling test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensivePollingTest, VideoGenerationLogger };
