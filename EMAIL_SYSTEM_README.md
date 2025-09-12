# 📧 VaryAI Email Notification System

A complete email notification system built with Supabase Edge Functions that sends emails directly from your database without external email APIs.

## 🚀 Features

- ✅ **No External APIs**: Uses Supabase's built-in email service
- ✅ **Database Integration**: Automatically gets user emails from your existing Supabase database
- ✅ **Beautiful Templates**: Professional HTML email templates
- ✅ **Notification Tracking**: Logs all sent notifications in database
- ✅ **Easy Integration**: Simple React hooks and components
- ✅ **Type Safety**: Full TypeScript support

## 📋 Setup Instructions

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Deploy Edge Functions
```bash
# Make the setup script executable
chmod +x setup-email-system.sh

# Run the setup script
./setup-email-system.sh
```

### 4. Set Up Database Schema
Run the SQL commands in `notifications-schema.sql` in your Supabase SQL editor:

```sql
-- Creates notifications table and functions
-- Enables RLS policies
-- Sets up notification tracking
```

### 5. Environment Variables
Make sure you have these in your `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_SUPABASE_URL=https://vqmzepfbgbwtzbpmrevx.supabase.co
```

## 🎯 Usage Examples

### Basic Usage with Hook
```tsx
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { sendNotification, isLoading } = useNotifications();

  const handleSendEmail = async () => {
    const result = await sendNotification({
      userId: 'user-uuid-here',
      subject: 'Welcome to VaryAI!',
      message: 'Thanks for joining our platform!',
      type: 'welcome'
    });

    if (result.success) {
      console.log(`Email sent to ${result.email}`);
    }
  };

  return (
    <button onClick={handleSendEmail} disabled={isLoading}>
      Send Welcome Email
    </button>
  );
}
```

### Using Pre-built Components
```tsx
import { WelcomeEmailButton, LevelUpEmailButton } from '@/components/NotificationButton';

function UserProfile({ user }) {
  return (
    <div>
      <WelcomeEmailButton userId={user.id} />
      <LevelUpEmailButton userId={user.id} newLevel={2} />
    </div>
  );
}
```

### Direct API Usage
```javascript
// Send a custom notification
const response = await fetch('/api/send-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    subject: 'Your Generation is Ready!',
    message: 'Your AI-generated content has been completed.',
    type: 'generation_complete'
  })
});

const result = await response.json();
console.log(result);
```

## 📧 Email Templates

The system includes beautiful HTML email templates with:
- **VaryAI Branding**: Gradient header with logo
- **Responsive Design**: Works on all devices
- **Professional Layout**: Clean, modern design
- **Call-to-Action Buttons**: Direct links back to your app
- **Fallback Text**: Plain text version for all email clients

## 🔧 Available Functions

### Hook Functions
- `sendNotification()` - Send custom notification
- `sendWelcomeEmail()` - Send welcome email to new users
- `sendLevelUpEmail()` - Send level up congratulations
- `sendUsageLimitEmail()` - Send usage limit notifications
- `sendCustomNotification()` - Send any custom message

### Database Functions
- `send_user_notification()` - PostgreSQL function for direct database calls
- Automatic notification logging
- User email lookup
- Error handling

## 📊 Notification Types

The system supports different notification types:
- `welcome` - New user welcome emails
- `level_up` - User progression notifications
- `usage_limit` - Usage limit reached
- `generation_complete` - AI generation finished
- `custom` - Any custom notification
- `notification` - General notifications

## 🛡️ Security Features

- **Row Level Security (RLS)**: Users can only see their own notifications
- **Service Role Protection**: Only authorized functions can send emails
- **Input Validation**: All inputs are validated and sanitized
- **Error Handling**: Comprehensive error handling and logging

## 📈 Tracking & Analytics

All notifications are logged in the `notifications` table with:
- User ID and email
- Message content and type
- Send timestamp
- Read status
- Success/failure tracking

## 🚨 Troubleshooting

### Common Issues

1. **"User not found" error**
   - Ensure user exists in `profiles` table
   - Check user ID is correct UUID format

2. **"Email service error"**
   - Verify Supabase service role key is correct
   - Check Supabase project email limits

3. **Functions not deploying**
   - Ensure you're logged into Supabase CLI
   - Check project connection

### Debug Mode
Enable debug logging by setting:
```env
SUPABASE_DEBUG=true
```

## 🎨 Customization

### Custom Email Templates
Edit the HTML template in `supabase/functions/send-notification/index.ts`:

```typescript
html: `
  <div style="your-custom-styles">
    <h1>Your Custom Template</h1>
    <p>${message}</p>
  </div>
`
```

### Custom Notification Types
Add new types in the database schema:
```sql
-- Add new type constraint
ALTER TABLE notifications ADD CONSTRAINT check_type 
CHECK (type IN ('notification', 'welcome', 'level_up', 'usage_limit', 'custom', 'your_new_type'));
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase Edge Functions documentation
3. Check your Supabase project logs
4. Verify environment variables

---

**Built with ❤️ for VaryAI** - No external email APIs required!
