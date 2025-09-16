'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CreditCard, DollarSign, Zap, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ModelCost {
  name: string;
  cost: number;
  generations: number;
}

const modelCosts: ModelCost[] = [
  // Image Generation Models (from screenshot dropdown)
  { name: 'Nana Banana', cost: 0.0398, generations: 0 },
  { name: 'Runway T2I', cost: 0.0398, generations: 0 },
  { name: 'Seedream 4 Edit', cost: 0.0398, generations: 0 },
  { name: 'Seedream 4', cost: 0.0398, generations: 0 },
  { name: 'Gemini Flash Edit', cost: 0.0398, generations: 0 },
  { name: 'Luma Photon Reframe', cost: 0.0398, generations: 0 },
  
  // Video Generation Models (from screenshot dropdown)
  { name: 'Veo3 Fast', cost: 0.15, generations: 0 },
  { name: 'MiniMax End Frame', cost: 0.15, generations: 0 },
  { name: 'Kling 2.1 Master', cost: 0.15, generations: 0 },
  { name: 'Kling AI Avatar (2-60 min)', cost: 0.15, generations: 0 },
  { name: 'Lucy 14B Video', cost: 0.15, generations: 0 },
  { name: 'Stable Video Diffusion', cost: 0.15, generations: 0 },
  { name: 'Modelscope 12V', cost: 0.15, generations: 0 },
  { name: 'Text2Video Zero', cost: 0.15, generations: 0 },
];

const presetAmounts = [1.99, 4.99, 9.99, 19.99, 49.99];

// Stripe configuration
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '');

// Payment form component
function PaymentForm({ amount, onSuccess, onError }: { amount: number; onSuccess: () => void; onError: (error: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onError('Authentication required - please sign in');
        return;
      }

      // Create payment intent
      const response = await fetch('/api/purchase-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount,
          userId: session.user.id
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        onError(data.message);
        return;
      }

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (stripeError) {
        onError(stripeError.message || 'Payment failed');
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        onSuccess();
      } else {
        onError('Payment was not completed');
      }
    } catch (err) {
      console.error('Payment error:', err);
      onError(`Payment failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="border border-gray-300 rounded-lg p-3 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pay ${amount.toFixed(2)}
          </>
        )}
      </button>
    </form>
  );
}

export default function CreditPurchaseModal({ isOpen, onClose, onSuccess }: CreditPurchaseModalProps) {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number>(4.99);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  if (!isOpen) return null;

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setSelectedAmount(numValue);
    }
  };

  const getGenerationsForAmount = (amount: number) => {
    return modelCosts.map(model => ({
      ...model,
      generations: Math.floor(amount / model.cost)
    }));
  };

  const handleProceedToPayment = () => {
    if (!user) {
      setError('Please sign in to purchase credits');
      return;
    }

    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    
    if (!amount || amount <= 0 || amount > 1000) {
      setError('Please enter a valid amount between $0.01 and $1000');
      return;
    }

    setError(null);
    setSuccess(null);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    
    try {
      // Add credits to user account
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/add-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: session.user.id,
          amount,
          source: 'stripe_purchase'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Successfully purchased $${amount} worth of credits! Credits added to your account.`);
        
        // Trigger credit refresh in header
        window.dispatchEvent(new CustomEvent('creditUpdated', {
          detail: {
            type: 'purchase',
            amount: amount,
            timestamp: new Date().toISOString()
          }
        }));

        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }

        // Reset form after 3 seconds
        setTimeout(() => {
          setShowPaymentForm(false);
          setSuccess(null);
          setCustomAmount('');
          setSelectedAmount(4.99);
        }, 3000);
      } else {
        console.error('❌ [PURCHASE MODAL] Credit addition failed:', data);
        setError(`Payment successful but failed to add credits: ${data.message || 'Unknown error'}. Please contact support with this information.`);
      }
    } catch (err) {
      console.error('Credit addition error:', err);
      setError('Payment successful but failed to add credits. Please contact support.');
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setShowPaymentForm(false);
  };

  const handleBackToAmount = () => {
    setShowPaymentForm(false);
    setError(null);
    setSuccess(null);
  };

  const currentGenerations = getGenerationsForAmount(selectedAmount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-blue-600" />
              Purchase Credits
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-800 text-sm">{success}</span>
            </div>
          )}

          <div className="space-y-6">
            {!showPaymentForm ? (
              <>
                {/* Amount Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Select Amount</h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {presetAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleAmountSelect(amount)}
                        className={`p-3 border rounded-lg text-center transition-colors ${
                          selectedAmount === amount && !customAmount
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold">${amount}</div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Custom Amount
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        placeholder="Enter custom amount"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0.01"
                        max="1000"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                {/* Generation Preview */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    What You Get
                  </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-3">
                    With ${selectedAmount.toFixed(2)} in credits, you can generate:
                  </div>
                  
                  {/* Quick Summary */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 mb-1">Quick Summary:</div>
                    <div className="text-sm text-blue-700">
                      • <strong>{Math.floor(selectedAmount / 0.0398)}</strong> image generations (any image model)
                    </div>
                    <div className="text-sm text-blue-700">
                      • <strong>{Math.floor(selectedAmount / 0.15)}</strong> video generations (any video model)
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Mix and match any models within your credit budget!
                    </div>
                  </div>
                  
                  {/* Image Generation Models */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Image Generation Models ($0.0398 each)
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {currentGenerations.filter(model => model.cost === 0.0398).map((model) => (
                        <div key={model.name} className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="text-sm font-medium">{model.name}</span>
                          <span className="text-sm text-gray-600 font-medium">
                            {model.generations} images
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Video Generation Models */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Video Generation Models ($0.15 each)
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {currentGenerations.filter(model => model.cost === 0.15).map((model) => (
                        <div key={model.name} className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="text-sm font-medium">{model.name}</span>
                          <span className="text-sm text-gray-600 font-medium">
                            {model.generations} videos
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                </div>

                {/* Purchase Button */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProceedToPayment}
                    disabled={selectedAmount <= 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Proceed to Payment
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Payment Form */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Payment Information</h3>
                    <button
                      onClick={handleBackToAmount}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      ← Back to Amount
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-600 mb-2">Purchase Amount:</div>
                    <div className="text-2xl font-bold text-gray-900">${selectedAmount.toFixed(2)}</div>
                  </div>

                  <Elements stripe={stripePromise}>
                    <PaymentForm 
                      amount={selectedAmount} 
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  </Elements>
                </div>

                {/* Cancel Button */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
