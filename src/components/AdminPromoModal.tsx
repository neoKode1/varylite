'use client';

import { useState } from 'react';
import { X, Copy, Check, Sparkles, Calendar, Users, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AdminPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPromoModal: React.FC<AdminPromoModalProps> = ({ isOpen, onClose }) => {
  const [description, setDescription] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please enter a description for the promo code');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      console.log('Session token:', session.access_token); // Debug log

      const response = await fetch('/api/admin/promo-generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description.trim(),
          maxUses: maxUses,
          expiresAt: expiresAt || null
        })
      });

      const data = await response.json();
      console.log('API Response:', { status: response.status, data });

      if (response.ok && data.success) {
        setGeneratedCode(data.promoCode);
        setCopied(false);
      } else {
        console.error('API Error:', data);
        setError(data.error || `Failed to generate promo code (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Error generating promo code:', error);
      setError('Failed to generate promo code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (generatedCode) {
      try {
        await navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const handleClose = () => {
    setDescription('');
    setMaxUses(1);
    setExpiresAt('');
    setGeneratedCode(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Generate Promo Code</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {!generatedCode ? (
            <>
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Beta Tester Access, Early Bird Special"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Max Uses */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Max Uses
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-600 bg-opacity-20 border border-red-500 rounded-xl p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !description.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Promo Code</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Generated Code Display */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-center">
                <div className="text-white/80 text-sm mb-2">Generated Promo Code</div>
                <div className="text-2xl font-bold text-white mb-4 font-mono tracking-wider">
                  {generatedCode}
                </div>
                <button
                  onClick={handleCopy}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Details */}
              <div className="bg-gray-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Description:</span>
                  <span className="text-white">{description}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Max Uses:</span>
                  <span className="text-white">{maxUses}</span>
                </div>
                {expiresAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Expires:</span>
                    <span className="text-white">{new Date(expiresAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setGeneratedCode(null);
                    setDescription('');
                    setMaxUses(1);
                    setExpiresAt('');
                    setError(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-xl transition-colors"
                >
                  Generate Another
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
