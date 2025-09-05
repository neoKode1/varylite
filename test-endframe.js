#!/usr/bin/env node

/**
 * Test script for EndFrame API using Minimax
 * This script tests the video generation from start to end frame
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = 'https://api.minimax.io/v1';

if (!API_KEY) {
  console.error('❌ MINIMAX_API_KEY environment variable is required');
  process.exit(1);
}

// Helper function to make HTTP requests
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const requestModule = isHttps ? https : http;
    const req = requestModule.request(url, options, (res) => {
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
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Helper function to convert image to base64
function imageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error(`❌ Error reading image file ${imagePath}:`, error.message);
    return null;
  }
}

// Test 1: Submit video generation task
async function testVideoGeneration() {
  console.log('🎬 Testing EndFrame Video Generation...\n');
  
  // Sample images (you'll need to provide actual image paths)
  const firstImagePath = './test-images/start-frame.jpg';
  const secondImagePath = './test-images/end-frame.jpg';
  
  // Check if test images exist
  if (!fs.existsSync(firstImagePath) || !fs.existsSync(secondImagePath)) {
    console.log('⚠️  Test images not found. Creating sample request with placeholder data...\n');
    
    // Use placeholder base64 data for testing
    const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const requestData = {
      model: "MiniMax-Hailuo-02",
      prompt: "A woman is drinking coffee.",
      first_frame_image: `data:image/jpeg;base64,${sampleBase64}`,
      last_frame_image: `data:image/jpeg;base64,${sampleBase64}`,
      duration: 6,
      resolution: "1080P"
    };
    
    return await submitVideoTask(requestData);
  }
  
  // Convert images to base64
  const firstImageBase64 = imageToBase64(firstImagePath);
  const secondImageBase64 = imageToBase64(secondImagePath);
  
  if (!firstImageBase64 || !secondImageBase64) {
    console.error('❌ Failed to convert images to base64');
    return null;
  }
  
  const requestData = {
    model: "MiniMax-Hailuo-02",
    prompt: "A woman is drinking coffee.",
    first_frame_image: `data:image/jpeg;base64,${firstImageBase64}`,
    last_frame_image: `data:image/jpeg;base64,${secondImageBase64}`,
    duration: 6,
    resolution: "1080P"
  };
  
  return await submitVideoTask(requestData);
}

// Submit video generation task
async function submitVideoTask(requestData) {
  console.log('📤 Submitting video generation task...');
  console.log('📋 Request data:', {
    model: requestData.model,
    prompt: requestData.prompt,
    duration: requestData.duration,
    resolution: requestData.resolution,
    first_frame_image: requestData.first_frame_image.substring(0, 50) + '...',
    last_frame_image: requestData.last_frame_image.substring(0, 50) + '...'
  });
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    }
  };
  
  try {
    const response = await makeRequest(`${BASE_URL}/video_generation`, options, requestData);
    
    console.log(`📊 Response Status: ${response.statusCode}`);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200) {
      if (response.data.base_resp && response.data.base_resp.status_code !== 0) {
        console.error(`❌ API Error: ${response.data.base_resp.status_code} - ${response.data.base_resp.status_msg}`);
        return null;
      }
      
      if (response.data.task_id) {
        console.log(`✅ Task submitted successfully! Task ID: ${response.data.task_id}`);
        return response.data.task_id;
      } else {
        console.error('❌ No task ID in response');
        return null;
      }
    } else {
      console.error(`❌ HTTP Error: ${response.statusCode}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

// Test 2: Poll task status
async function testTaskPolling(taskId) {
  if (!taskId) {
    console.log('⚠️  No task ID available for polling test');
    return;
  }
  
  console.log(`\n🔍 Testing task polling for ID: ${taskId}`);
  
  const maxAttempts = 30; // Poll for up to 5 minutes (30 * 10 seconds)
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\n📊 Polling attempt ${attempts}/${maxAttempts}...`);
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    };
    
    try {
      const response = await makeRequest(`${BASE_URL}/query/video_generation?task_id=${taskId}`, options);
      
      console.log(`📊 Response Status: ${response.statusCode}`);
      console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
      
      if (response.statusCode === 200) {
        const status = response.data.status;
        
        if (status === 'Success') {
          console.log('✅ Video generation completed!');
          
          // Extract video URL using file_id (per Minimax docs)
          // Note: In a real implementation, you'd need to call the retrieve endpoint
          // to get the actual download URL from the file_id with GroupId
          let videoUrl = response.data.file_id ? 
                        `[Would retrieve download URL for file_id: ${response.data.file_id} with GroupId]` :
                        response.data.video_url || 
                        response.data.output?.video_url || 
                        response.data.data?.video_url || 
                        response.data.url;
          
          if (videoUrl) {
            console.log(`🎬 Video URL: ${videoUrl}`);
            return videoUrl;
          } else {
            console.log('⚠️  Video completed but no URL found in response');
            return 'completed';
          }
        } else if (status === 'Fail') {
          console.error(`❌ Video generation failed: ${response.data.error || 'Unknown error'}`);
          return null;
        } else {
          console.log(`⏳ Task status: ${status}. Waiting 10 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      } else {
        console.error(`❌ Polling failed with status: ${response.statusCode}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Polling request failed:', error.message);
      return null;
    }
  }
  
  console.log('⏰ Polling timeout reached');
  return null;
}

// Test 3: Test our API endpoint
async function testOurAPI() {
  console.log('\n🧪 Testing our /api/endframe endpoint...\n');
  
  const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  
  const requestData = {
    firstImage: sampleBase64,
    secondImage: sampleBase64,
    prompt: "A woman is drinking coffee.",
    model: "MiniMax-Hailuo-02"
  };
  
  console.log('📤 Sending request to our API...');
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await makeRequest('http://localhost:3000/api/endframe', options, requestData);
    
    console.log(`📊 Response Status: ${response.statusCode}`);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.success && response.data.taskId) {
      console.log(`✅ Our API working! Task ID: ${response.data.taskId}`);
      return response.data.taskId;
    } else {
      console.error('❌ Our API test failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Our API request failed:', error.message);
    console.log('💡 Make sure your development server is running on localhost:3000');
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting EndFrame API Tests\n');
  console.log('=' .repeat(50));
  
  // Test 1: Direct Minimax API
  console.log('\n📋 TEST 1: Direct Minimax API');
  console.log('-'.repeat(30));
  const taskId = await testVideoGeneration();
  
  if (taskId) {
    // Test 2: Polling
    console.log('\n📋 TEST 2: Task Polling');
    console.log('-'.repeat(30));
    await testTaskPolling(taskId);
  }
  
  // Test 3: Our API endpoint
  console.log('\n📋 TEST 3: Our API Endpoint');
  console.log('-'.repeat(30));
  await testOurAPI();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Tests completed!');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testVideoGeneration,
  testTaskPolling,
  testOurAPI,
  runTests
};
