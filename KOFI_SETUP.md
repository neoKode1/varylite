# Ko-fi Integration Setup

## Configuration Details
- **Ko-fi Page**: https://ko-fi.com/varyai
- **Webhook URL**: https://vary-ai.vercel.app/api/ko-fi-webhook
- **Verification Token**: 31c45be4-fa06-4c91-869c-6c0b199d5222
- **Weekly Goal**: $300
- **Weekly Cost**: $265

## Environment Variables Needed
Add these to your production environment (Vercel):
```
KOFI_VERIFICATION_TOKEN=31c45be4-fa06-4c91-869c-6c0b199d5222
```

## Ko-fi Webhook Settings
1. Go to: https://ko-fi.com/manage/webhooks
2. Set Webhook URL to: `https://vary-ai.vercel.app/api/ko-fi-webhook`
3. Use the verification token: `31c45be4-fa06-4c91-869c-6c0b199d5222`

## How It Works
- Ko-fi sends POST requests to `/api/ko-fi-webhook` when payments are received
- The webhook validates the verification token
- Only public donations are processed and displayed
- Funding data is stored in memory and displayed in the community funding meter
- The meter shows current funding vs weekly goal with energy bar visualization

## Testing
- Make a test donation to https://ko-fi.com/varyai
- Check the funding meter on your app to see if it updates
- Monitor the webhook endpoint logs for incoming requests
