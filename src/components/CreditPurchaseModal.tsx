'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, DollarSign, Zap, AlertCircle, CheckCircle } from 'lucide-react';

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
  { name: 'Nano Banana', cost: 0.0398, generations: 0 },
  { name: 'Runway T2I', cost: 0.0398, generations: 0 },
  { name: 'Minimax 2.0', cost: 0.0398, generations: 0 },
  { name: 'Kling 2.1 Master', cost: 0.0398, generations: 0 },
  { name: 'Veo3 Fast', cost: 0.15, generations: 0 },
  { name: 'Runway Video', cost: 0.15, generations: 0 },
  { name: 'Seedance Pro', cost: 2.50, generations: 0 },
];

const presetAmounts = [1.99, 4.99, 9.99, 19.99, 49.99];

export default function CreditPurchaseModal({ isOpen, onClose, onSuccess }: CreditPurchaseModalProps) {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number>(4.99);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handlePurchase = async () => {
    if (!user) {
      setError('Please sign in to purchase credits');
      return;
    }

    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    
    if (!amount || amount <= 0 || amount > 1000) {
      setError('Please enter a valid amount between $0.01 and $1000');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Create payment intent
      const response = await fetch('/api/purchase-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          userId: user.id
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        setError(data.message);
        return;
      }

      // Initialize Stripe
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

      if (!stripe) {
        setError('Failed to load payment system');
        return;
      }

      // For now, simulate successful payment
      // In a real implementation, this would use Stripe Elements for card input
      setSuccess(`Successfully purchased $${amount} worth of credits!`);
      setLoading(false);
      return;

    } catch (err) {
      setError('An error occurred during purchase');
    } finally {
      setLoading(false);
    }
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentGenerations.map((model) => (
                    <div key={model.name} className="flex justify-between items-center p-2 bg-white rounded border">
                      <span className="text-sm font-medium">{model.name}</span>
                      <span className="text-sm text-gray-600">
                        {model.generations} generations
                      </span>
                    </div>
                  ))}
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
                onClick={handlePurchase}
                disabled={loading || selectedAmount <= 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Purchase ${selectedAmount.toFixed(2)} Credits
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
