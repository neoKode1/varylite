# Stripe Integration Setup Guide

## 🔧 Environment Variables Required

Add these to your `.env.local` file:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product and Price IDs
STRIPE_PRO_PRODUCT_ID=prod_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRODUCT_ID=prod_...
STRIPE_PREMIUM_PRICE_ID=price_...
```

## 📋 Stripe Dashboard Setup Steps

### 1. Create Products in Stripe Dashboard

#### **Pro Tier Product**
- **Name**: "VaryAI Pro"
- **Description**: "Unlimited access to core AI models with 50 generations/month"
- **Price**: $14.99/month (recurring)
- **Billing**: Monthly

#### **Premium Tier Product**
- **Name**: "VaryAI Premium"
- **Description**: "Unlimited access to all AI models with 100 generations/month"
- **Price**: $19.99/month (recurring)
- **Billing**: Monthly

### 2. Get Product and Price IDs

After creating products, copy the IDs:
- **Product ID**: `prod_xxxxxxxxxxxxx`
- **Price ID**: `price_xxxxxxxxxxxxx`

### 3. Set Up Webhooks

#### **Webhook Endpoint URL**
```
https://your-domain.com/api/stripe/webhook
```

#### **Events to Listen For**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`
- `customer.subscription.trial_ended`

### 4. Test Webhook Endpoint

Use Stripe CLI to test:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 🗄️ Database Setup

Run the SQL commands in `database-schema-pricing-updates.sql` in your Supabase SQL editor:

1. **Add tier columns to users table**
2. **Create usage tracking tables**
3. **Create tier limits configuration**
4. **Create model costs configuration**
5. **Insert default data**

## 🚀 Implementation Steps

### 1. Install Stripe Dependencies
```bash
npm install stripe
npm install @types/stripe --save-dev
```

### 2. Update Existing API Routes

Add tier checking to your existing API routes:

```typescript
import { checkTierLimits, recordGeneration } from '@/lib/tierMiddleware';

export async function POST(request: NextRequest) {
  // Check tier limits
  const tierCheck = await checkTierLimits(request, {
    allowedModels: ['nano-banana', 'runway-t2i']
  });
  
  if (tierCheck) {
    return tierCheck; // Returns error if limits exceeded
  }
  
  // Your existing generation logic...
  
  // Record the generation
  const tierInfo = getTierInfo(request);
  await recordGeneration(
    userId,
    model,
    cost,
    tierInfo.tier,
    tierInfo.isOverage
  );
}
```

### 3. Frontend Integration (When Ready)

```typescript
// Create checkout session
const response = await fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    tier: 'pro',
    successUrl: `${window.location.origin}/success`,
    cancelUrl: `${window.location.origin}/cancel`
  })
});

const { url } = await response.json();
window.location.href = url;
```

## 🧪 Testing

### 1. Test Cards
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### 2. Test Webhook Events
Use Stripe CLI to trigger test events:
```bash
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

## 📊 Monitoring

### 1. Stripe Dashboard
- Monitor subscriptions
- Track revenue
- Handle failed payments

### 2. Application Logs
- Webhook event processing
- Tier limit enforcement
- Usage tracking

## 🔒 Security Considerations

1. **Webhook Signature Verification**: Always verify webhook signatures
2. **Environment Variables**: Never commit Stripe keys to version control
3. **Rate Limiting**: Implement rate limiting on API endpoints
4. **User Validation**: Always validate user permissions

## 📈 Next Steps

1. **Set up Stripe products and prices**
2. **Configure webhook endpoint**
3. **Test the integration**
4. **Deploy to production**
5. **Monitor usage and revenue**

---

**Note**: This infrastructure is built but not exposed to users yet. The frontend integration will be added when you're ready to launch the pricing system.
