import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 Environment Variables Check:');
  console.log('================================');
  
  const keys = [
    'GOOGLE_API_KEY',
    'FAL_KEY', 
    'RUNWAYML_API_SECRET'
  ];
  
  const keyStatus = keys.map(key => {
    const value = process.env[key];
    const exists = !!value;
    const length = value?.length || 0;
    const preview = value ? value.substring(0, 8) + '...' : 'NOT SET';
    
    console.log(`🔑 ${key}:`);
    console.log(`   Exists: ${exists}`);
    console.log(`   Length: ${length} characters`);
    console.log(`   Preview: ${preview}`);
    console.log('');
    
    return {
      key,
      exists,
      length,
      preview
    };
  });
  
  return NextResponse.json({
    success: true,
    environment: 'development',
    keys: keyStatus,
    timestamp: new Date().toISOString()
  });
}