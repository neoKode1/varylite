import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a server-side Supabase client
const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching storage statistics...');

    // Get storage stats from database
    const { data: stats, error } = await supabase.rpc('get_storage_stats');

    if (error) {
      console.error('❌ Failed to get storage stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch storage statistics' },
        { status: 500 }
      );
    }

    // Get recent uploads for monitoring
    const { data: recentUploads, error: uploadsError } = await supabase
      .from('image_uploads')
      .select('file_size, created_at, is_processed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(100);

    if (uploadsError) {
      console.warn('⚠️ Failed to get recent uploads:', uploadsError.message);
    }

    // Calculate additional metrics
    const totalSizeMB = stats[0]?.total_size ? Math.round(stats[0].total_size / (1024 * 1024)) : 0;
    const sizeTodayMB = stats[0]?.size_today ? Math.round(stats[0].size_today / (1024 * 1024)) : 0;
    const avgFileSizeKB = stats[0]?.avg_file_size ? Math.round(stats[0].avg_file_size / 1024) : 0;

    // Calculate storage usage percentage (1GB free tier limit)
    const storageLimitMB = 1024; // 1GB
    const storageUsagePercent = Math.round((totalSizeMB / storageLimitMB) * 100);

    // Calculate daily growth rate
    const dailyGrowthRate = recentUploads ? 
      recentUploads.reduce((sum, upload) => sum + upload.file_size, 0) / (1024 * 1024) : 0;

    const response = {
      storage: {
        totalFiles: stats[0]?.total_files || 0,
        totalSizeMB,
        filesToday: stats[0]?.files_today || 0,
        sizeTodayMB,
        avgFileSizeKB,
        storageUsagePercent,
        storageLimitMB,
        dailyGrowthRateMB: Math.round(dailyGrowthRate)
      },
      limits: {
        maxFileSize: '50MB',
        maxStorage: '1GB',
        maxBandwidth: '5GB/month'
      },
      recentUploads: recentUploads?.slice(0, 10) || [],
      timestamp: new Date().toISOString()
    };

    console.log('✅ Storage stats retrieved:', {
      totalFiles: response.storage.totalFiles,
      totalSizeMB: response.storage.totalSizeMB,
      usagePercent: response.storage.storageUsagePercent
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Storage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage statistics' },
      { status: 500 }
    );
  }
}

// Cleanup endpoint for manual cleanup
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'cleanup') {
      console.log('🧹 Running manual cleanup...');

      // Call the cleanup function
      const { data, error } = await supabase.rpc('cleanup_expired_images');

      if (error) {
        console.error('❌ Cleanup failed:', error);
        return NextResponse.json(
          { error: 'Failed to run cleanup' },
          { status: 500 }
        );
      }

      console.log('✅ Cleanup completed successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Cleanup completed successfully',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to run cleanup' },
      { status: 500 }
    );
  }
}
