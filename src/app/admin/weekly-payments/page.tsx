'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Calendar, Users, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface PaymentBatch {
  id: string;
  batch_name: string;
  weekly_charge: number;
  credits_per_user: number;
  total_users: number;
  total_revenue: number;
  profit_margin: number;
  status: string;
  created_at: string;
  completed_at?: string;
}

interface CurrentStats {
  usersWithCredits: number;
  totalCreditsInCirculation: number;
  averageCreditsPerUser: number;
}

export default function WeeklyPaymentsPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [currentStats, setCurrentStats] = useState<CurrentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for new payment
  const [batchName, setBatchName] = useState('');
  const [weeklyCharge, setWeeklyCharge] = useState(5.99);
  const [creditsPerUser, setCreditsPerUser] = useState(5.00);

  useEffect(() => {
    if (user) {
      fetchPaymentData();
    }
  }, [user]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/process-weekly-payment');
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }

      const data = await response.json();
      setBatches(data.batches);
      setCurrentStats(data.currentStats);
      setError(null);
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!batchName.trim()) {
      setError('Batch name is required');
      return;
    }

    if (weeklyCharge - creditsPerUser < 0.99) {
      setError('Profit margin must be at least $0.99');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const response = await fetch('/api/process-weekly-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchName: batchName.trim(),
          weeklyCharge,
          creditsPerUser
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payment');
      }

      const result = await response.json();
      
      // Refresh data
      await fetchPaymentData();
      
      // Reset form
      setBatchName('');
      setWeeklyCharge(5.99);
      setCreditsPerUser(5.00);

      alert(`Payment processed successfully!\n\nUsers: ${result.totalUsers}\nRevenue: $${result.totalRevenue}\nProfit: $${result.profitMargin}`);

    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'processing':
        return 'text-blue-400 bg-blue-500/20';
      case 'failed':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading payment data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Weekly Payment Management
          </h1>
          <p className="text-white/60 mt-2">
            Manage weekly credit distributions and payment processing
          </p>
        </div>

        {/* Current Stats */}
        {currentStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{currentStats.usersWithCredits}</div>
                  <div className="text-white/60 text-sm">Users</div>
                </div>
              </div>
              <div className="text-white/80 text-sm">With Active Credits</div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">${currentStats.totalCreditsInCirculation.toFixed(2)}</div>
                  <div className="text-white/60 text-sm">Total</div>
                </div>
              </div>
              <div className="text-white/80 text-sm">Credits in Circulation</div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">${currentStats.averageCreditsPerUser.toFixed(2)}</div>
                  <div className="text-white/60 text-sm">Average</div>
                </div>
              </div>
              <div className="text-white/80 text-sm">Credits per User</div>
            </div>
          </div>
        )}

        {/* Process New Payment */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Process Weekly Payment</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Batch Name
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g., Weekly Payment - Sept 19"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Weekly Charge ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={weeklyCharge}
                onChange={(e) => setWeeklyCharge(parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Credits per User ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={creditsPerUser}
                onChange={(e) => setCreditsPerUser(parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-white/60">
              Profit Margin: ${(weeklyCharge - creditsPerUser).toFixed(2)}
            </div>
            <button
              onClick={handleProcessPayment}
              disabled={processing || !batchName.trim()}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all duration-300 flex items-center gap-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Process Payment
                </>
              )}
            </button>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Payment History</h2>
          
          {batches.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-white/60">No payment batches found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Batch</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Users</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Revenue</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Profit</th>
                    <th className="text-left py-3 px-4 text-white/80 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-b border-white/5">
                      <td className="py-3 px-4 text-white">{batch.batch_name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                          {getStatusIcon(batch.status)}
                          {batch.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white">{batch.total_users}</td>
                      <td className="py-3 px-4 text-green-400">${batch.total_revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-blue-400">${batch.profit_margin.toFixed(2)}</td>
                      <td className="py-3 px-4 text-white/60 text-sm">
                        {formatDate(batch.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
