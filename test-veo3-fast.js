#!/usr/bin/env node

/**
 * Test script for Veo3 Fast video generation
 * Tests the /api/veo3-fast endpoint with various scenarios
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/veo3-fast';

// Test image URLs (using publicly available test images)
const TEST_IMAGES = [
  'https://storage.googleapis.com/falserverless/example_inputs/veo3-i2v-input.png',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=720&h=720&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=720&h=720&fit=crop'
];

// Test prompts for different scenarios
const TEST_PROMPTS = [
  {
    name: 'Basic Animation',
    prompt: 'A woman looks into the camera, breathes in, then exclaims energetically, "have you guys checked out Veo3 Image-to-Video on Fal? It\'s incredible!"',
    duration: '8s',
    generate_audio: true,
    resolution: '720p'
  },
  {
    name: 'Nature Scene',
    prompt: 'The ocean waves gently lap against the shore, seagulls fly overhead, and the sun sets in the distance',
    duration: '8s',
    generate_audio: true,
    resolution: '720p'
  },
  {
    name: 'Urban Scene',
    prompt: 'Cars drive down a busy street, people walk on the sidewalk, and city lights begin to turn on as evening approaches',
    duration: '8s',
    generate_audio: false,
    resolution: '1080p'
  },
  {
    name: 'Short Duration',
    prompt: 'A cat stretches and yawns lazily in the sunlight',
    duration: '8s',
    generate_audio: true,
    resolution: '720p'
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

// Test function
async function testVeo3Fast() {
  console.log('🎬 Starting Veo3 Fast API Tests...\n');
  
  const results = [];
  
  for (let i = 0; i < TEST_PROMPTS.length; i++) {
    const testCase = TEST_PROMPTS[i];
    const imageUrl = TEST_IMAGES[i % TEST_IMAGES.length];
    
    console.log(`\n📋 Test ${i + 1}: ${testCase.name}`);
    console.log(`📝 Prompt: ${testCase.prompt}`);
    console.log(`🖼️ Image: ${imageUrl}`);
    console.log(`⏱️ Duration: ${testCase.duration}`);
    console.log(`🔊 Audio: ${testCase.generate_audio}`);
    console.log(`📺 Resolution: ${testCase.resolution}`);
    
    const requestData = {
      prompt: testCase.prompt,
      image_url: imageUrl,
      duration: testCase.duration,
      generate_audio: testCase.generate_audio,
      resolution: testCase.resolution
    };
    
    try {
      console.log('⏳ Sending request...');
      const startTime = Date.now();
      
      const response = await makeRequest(`${BASE_URL}${API_ENDPOINT}`, requestData);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ Response time: ${duration}ms`);
      console.log(`📊 Status: ${response.statusCode}`);
      
      if (response.statusCode === 200) {
        console.log('✅ Success!');
        console.log(`🎥 Video URL: ${response.data.videoUrl}`);
        console.log(`🆔 Request ID: ${response.data.requestId}`);
        console.log(`🤖 Model: ${response.data.model}`);
        
        results.push({
          test: testCase.name,
          status: 'SUCCESS',
          duration: duration,
          videoUrl: response.data.videoUrl,
          requestId: response.data.requestId
        });
      } else {
        console.log('❌ Failed!');
        console.log(`Error: ${JSON.stringify(response.data, null, 2)}`);
        
        results.push({
          test: testCase.name,
          status: 'FAILED',
          duration: duration,
          error: response.data
        });
      }
      
    } catch (error) {
      console.log('❌ Error occurred:');
      console.log(error.message);
      
      results.push({
        test: testCase.name,
        status: 'ERROR',
        error: error.message
      });
    }
    
    // Wait between tests to avoid rate limiting
    if (i < TEST_PROMPTS.length - 1) {
      console.log('⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;
  
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`💥 Errors: ${errorCount}`);
  console.log(`📈 Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
  
  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `veo3-test-results-${timestamp}.json`;
  
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    testType: 'Veo3 Fast API',
    summary: {
      total: results.length,
      successful: successCount,
      failed: failedCount,
      errors: errorCount,
      successRate: `${((successCount / results.length) * 100).toFixed(1)}%`
    },
    results: results
  }, null, 2));
  
  console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
  
  return results;
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  testVeo3Fast()
    .then((results) => {
      console.log('\n🎉 Testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testVeo3Fast };
