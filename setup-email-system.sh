#!/bin/bash

echo "🚀 Setting up VaryAI Email System..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "🔐 Please login to Supabase first:"
    echo "supabase login"
    exit 1
fi

echo "📧 Setting up email functions..."

# Deploy the email functions
echo "Deploying send-email function..."
supabase functions deploy send-email

echo "Deploying send-notification function..."
supabase functions deploy send-notification

echo "📊 Setting up database schema..."
echo "Run this SQL in your Supabase SQL editor:"
echo "----------------------------------------"
cat notifications-schema.sql
echo "----------------------------------------"

echo "✅ Email system setup complete!"
echo ""
echo "🎯 How to use:"
echo "1. Run the SQL schema in Supabase"
echo "2. Use the useNotifications hook in your React components"
echo "3. Call sendNotification() with user ID and message"
echo ""
echo "📝 Example usage:"
echo "const { sendWelcomeEmail } = useNotifications();"
echo "await sendWelcomeEmail(user.id);"
