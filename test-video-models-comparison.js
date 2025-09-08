#!/usr/bin/env node

/**
 * Comparison test script for both Veo3 Fast and Minimax 2.0
 * Tests both models with the same inputs to compare performance and quality
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const VEO3_ENDPOINT = '/api/veo3-fast';
const MINIMAX_ENDPOINT = '/api/minimax-2';

// Test scenarios for comparison
const COMPARISON_TESTS = [
  {
    name: 'Character Animation',
    prompt: 'A person waves hello and smiles warmly at the camera',
    image_url: 'https://storage.googleapis.com/falserverless/example_inputs/veo3-i2v-input.png',
    duration: '8s',
    generate_audio: true,
    resolution: '720p'
  },
  {
    name: 'Nature Scene',
    prompt: 'Ocean waves gently lapping against the shore with seagulls flying overhead',
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=720&h=720&fit=crop',
    duration: '8s',
    generate_audio: true,
    resolution: '720p'
  },
  {
    name: 'Urban Scene',
    prompt: 'Cars driving down a busy street with people walking on the sidewalk',
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=720&h=720&fit=crop',
    duration: '8s',
    generate_audio: false,
    resolution: '1080p'
  }
];

// Utility function to make HTTP requests
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = require('http').request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Test a single model
async function testModel(endpoint, modelName, testData) {
  console.log(`\n🤖 Testing ${modelName}...`);
  console.log(`📝 Prompt: ${testData.prompt}`);
  console.log(`🖼️ Image: ${testData.image_url}`);
  
  try {
    const startTime = Date.now();
    const response = await makeRequest(`${BASE_URL}${endpoint}`, testData);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Success!');
      console.log(`🎥 Video URL: ${response.data.videoUrl}`);
      console.log(`🆔 Request ID: ${response.data.requestId}`);
      
      return {
        model: modelName,
        status: 'SUCCESS',
        duration: duration,
        videoUrl: response.data.videoUrl,
        requestId: response.data.requestId,
        responseTime: duration
      };
    } else {
      console.log('❌ Failed!');
      console.log(`Error: ${JSON.stringify(response.data, null, 2)}`);
      
      return {
        model: modelName,
        status: 'FAILED',
        duration: duration,
        error: response.data,
        responseTime: duration
      };
    }
    
  } catch (error) {
    console.log('❌ Error occurred:');
    console.log(error.message);
    
    return {
      model: modelName,
      status: 'ERROR',
      error: error.message,
      responseTime: 0
    };
  }
}

// Run comparison tests
async function runComparisonTests() {
  console.log('🎬 Starting Video Models Comparison Tests...\n');
  
  const results = [];
  
  for (let i = 0; i < COMPARISON_TESTS.length; i++) {
    const testCase = COMPARISON_TESTS[i];
    
    console.log(`\n📋 Test ${i + 1}: ${testCase.name}`);
    console.log('='.repeat(50));
    
    // Test Veo3 Fast
    const veo3Result = await testModel(VEO3_ENDPOINT, 'Veo3 Fast', testCase);
    
    // Wait between models
    console.log('⏳ Waiting 2 seconds before testing next model...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test Minimax 2.0
    const minimaxResult = await testModel(MINIMAX_ENDPOINT, 'Minimax 2.0', testCase);
    
    // Store results
    results.push({
      testName: testCase.name,
      testData: testCase,
      veo3: veo3Result,
      minimax: minimaxResult,
      comparison: {
        veo3Success: veo3Result.status === 'SUCCESS',
        minimaxSuccess: minimaxResult.status === 'SUCCESS',
        veo3Faster: veo3Result.responseTime < minimaxResult.responseTime,
        bothSuccessful: veo3Result.status === 'SUCCESS' && minimaxResult.status === 'SUCCESS'
      }
    });
    
    // Wait between test cases
    if (i < COMPARISON_TESTS.length - 1) {
      console.log('⏳ Waiting 3 seconds before next test case...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Print comparison summary
  console.log('\n📊 Comparison Summary:');
  console.log('======================');
  
  const veo3SuccessCount = results.filter(r => r.veo3.status === 'SUCCESS').length;
  const minimaxSuccessCount = results.filter(r => r.minimax.status === 'SUCCESS').length;
  const bothSuccessCount = results.filter(r => r.comparison.bothSuccessful).length;
  const veo3FasterCount = results.filter(r => r.comparison.veo3Faster).length;
  
  console.log(`✅ Veo3 Fast Success Rate: ${veo3SuccessCount}/${results.length} (${((veo3SuccessCount/results.length)*100).toFixed(1)}%)`);
  console.log(`✅ Minimax 2.0 Success Rate: ${minimaxSuccessCount}/${results.length} (${((minimaxSuccessCount/results.length)*100).toFixed(1)}%)`);
  console.log(`🎯 Both Models Successful: ${bothSuccessCount}/${results.length} (${((bothSuccessCount/results.length)*100).toFixed(1)}%)`);
  console.log(`⚡ Veo3 Fast Faster: ${veo3FasterCount}/${results.length} (${((veo3FasterCount/results.length)*100).toFixed(1)}%)`);
  
  // Calculate average response times
  const veo3AvgTime = results
    .filter(r => r.veo3.responseTime > 0)
    .reduce((sum, r) => sum + r.veo3.responseTime, 0) / results.length;
  
  const minimaxAvgTime = results
    .filter(r => r.minimax.responseTime > 0)
    .reduce((sum, r) => sum + r.minimax.responseTime, 0) / results.length;
  
  console.log(`⏱️ Average Response Time - Veo3 Fast: ${veo3AvgTime.toFixed(0)}ms`);
  console.log(`⏱️ Average Response Time - Minimax 2.0: ${minimaxAvgTime.toFixed(0)}ms`);
  
  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `video-models-comparison-${timestamp}.json`;
  
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    testType: 'Video Models Comparison',
    summary: {
      totalTests: results.length,
      veo3SuccessRate: `${((veo3SuccessCount/results.length)*100).toFixed(1)}%`,
      minimaxSuccessRate: `${((minimaxSuccessCount/results.length)*100).toFixed(1)}%`,
      bothSuccessful: `${((bothSuccessCount/results.length)*100).toFixed(1)}%`,
      veo3Faster: `${((veo3FasterCount/results.length)*100).toFixed(1)}%`,
      averageResponseTimes: {
        veo3Fast: `${veo3AvgTime.toFixed(0)}ms`,
        minimax2: `${minimaxAvgTime.toFixed(0)}ms`
      }
    },
    results: results
  }, null, 2));
  
  console.log(`\n💾 Detailed comparison results saved to: ${resultsFile}`);
  
  return results;
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run comparison tests
if (require.main === module) {
  runComparisonTests()
    .then((results) => {
      console.log('\n🎉 Comparison testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Comparison test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runComparisonTests };
