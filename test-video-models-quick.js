#!/usr/bin/env node

/**
 * Quick test script for video models
 * Simple, fast tests to verify basic functionality
 */

const https = require('https');

// Configuration
const BASE_URL = 'http://localhost:3000';

// Quick test data
const QUICK_TEST = {
  prompt: 'A person waves hello and smiles at the camera',
  image_url: 'https://storage.googleapis.com/falserverless/example_inputs/veo3-i2v-input.png',
  duration: '8s',
  generate_audio: true,
  resolution: '720p'
};

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
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
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

// Quick test function
async function quickTest() {
  console.log('🚀 Quick Video Models Test\n');
  
  // Test Veo3 Fast
  console.log('🤖 Testing Veo3 Fast...');
  try {
    const startTime = Date.now();
    const veo3Response = await makeRequest(`${BASE_URL}/api/veo3-fast`, QUICK_TEST);
    const veo3Time = Date.now() - startTime;
    
    if (veo3Response.statusCode === 200) {
      console.log(`✅ Veo3 Fast: SUCCESS (${veo3Time}ms)`);
      console.log(`🎥 Video: ${veo3Response.data.videoUrl}`);
    } else {
      console.log(`❌ Veo3 Fast: FAILED (${veo3Response.statusCode})`);
      console.log(`Error: ${JSON.stringify(veo3Response.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`💥 Veo3 Fast: ERROR - ${error.message}`);
  }
  
  console.log('\n⏳ Waiting 2 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test Minimax 2.0
  console.log('🤖 Testing Minimax 2.0...');
  try {
    const startTime = Date.now();
    const minimaxResponse = await makeRequest(`${BASE_URL}/api/minimax-2`, QUICK_TEST);
    const minimaxTime = Date.now() - startTime;
    
    if (minimaxResponse.statusCode === 200) {
      console.log(`✅ Minimax 2.0: SUCCESS (${minimaxTime}ms)`);
      console.log(`🎥 Video: ${minimaxResponse.data.videoUrl}`);
    } else {
      console.log(`❌ Minimax 2.0: FAILED (${minimaxResponse.statusCode})`);
      console.log(`Error: ${JSON.stringify(minimaxResponse.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`💥 Minimax 2.0: ERROR - ${error.message}`);
  }
  
  console.log('\n🎉 Quick test completed!');
}

// Run quick test
if (require.main === module) {
  quickTest()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Quick test failed:', error);
      process.exit(1);
    });
}

module.exports = { quickTest };
