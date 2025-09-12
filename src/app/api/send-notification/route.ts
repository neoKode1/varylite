import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { userId, message, subject, type = 'notification' } = await request.json();

    if (!userId || !message) {
      return NextResponse.json(
        { success: false, error: 'userId and message are required' },
        { status: 400 }
      );
    }

    // Get user email from database
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Call Supabase Edge Function to send email
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-notification', {
      body: {
        userId,
        message,
        subject: subject || 'VaryAI Notification',
        type
      }
    });

    if (emailError) {
      console.error('Email function error:', emailError);
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Log the notification in database
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: type,
        subject: subject || 'VaryAI Notification',
        message: message,
        sent_at: new Date().toISOString(),
        email_sent: true
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
    }

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      email: user.email,
      result: emailResult
    });

  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

