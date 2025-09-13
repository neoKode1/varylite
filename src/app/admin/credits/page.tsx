'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CreditCard, 
  Users, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface GrandfatherBatch {
  id: string;
  batch_name: string;
  total_users: number;
  total_budget: number;
  credits_per_user: number;
  processed_users: number;
  successful_charges: number;
  failed_charges: number;
  status: string;
  created_at: string;
}

interface CreditStats {
  totalUsersWithCredits: number;
  totalCreditsDistributed: number;
  totalCreditsUsed: number;
  totalRevenue: number;
}

interface ModelCost {
  model_name: string;
  cost_per_generation: number;
  is_active: boolean;
}

export default function AdminCreditsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [batches, setBatches] = useState<GrandfatherBatch[]>([]);
  const [creditStats, setCreditStats] = useState<CreditStats | null>(null);
  const [modelCosts, setModelCosts] = useState<ModelCost[]>([]);
  
  // Form state
  const [batchName, setBatchName] = useState('');
  const [weeklyCharge, setWeeklyCharge] = useState(5.99);
  const [creditsPerUser, setCreditsPerUser] = useState(5.00);
  const [maxUsers, setMaxUsers] = useState(64);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load batches
      const batchesResponse = await fetch('/api/admin/batches');
      if (batchesResponse.ok) {
        const batchesData = await batchesResponse.json();
        setBatches(batchesData.batches || []);
      }

      // Load credit stats
      const statsResponse = await fetch('/api/admin/credit-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setCreditStats(statsData);
      }

      // Load model costs
      const modelsResponse = await fetch('/api/admin/model-costs');
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        setModelCosts(modelsData.models || []);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGrandfather = async () => {
    if (!batchName.trim()) {
      setError('Batch name is required');
      return;
    }

    if (weeklyCharge <= creditsPerUser) {
      setError('Weekly charge must be greater than credits per user to ensure profit');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/grandfather-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchName,
          weeklyCharge,
          creditsPerUser,
          maxUsers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to grandfather users');
      }

      setSuccess(`Successfully initiated grandfathering batch: ${data.batchName}`);
      setBatchName('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grandfather users');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Please sign in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Credit System Admin</h1>
          <p className="text-blue-200">Manage user credits and grandfathering process</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-200">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/20 border border-green-500/50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-200">{success}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm">Total Users</p>
                    <p className="text-2xl font-bold text-white">{creditStats?.totalUsersWithCredits || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm">Credits Distributed</p>
                    <p className="text-2xl font-bold text-white">${creditStats?.totalCreditsDistributed?.toFixed(2) || '0.00'}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-400" />
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-200 text-sm">Credits Used</p>
                    <p className="text-2xl font-bold text-white">${creditStats?.totalCreditsUsed?.toFixed(2) || '0.00'}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-400" />
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-200 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">${creditStats?.totalRevenue?.toFixed(2) || '0.00'}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Grandfather Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Grandfather Users with Credits</h2>
            <p className="text-blue-200 mb-6">
              Charge users $5.99 each week and give them $5.00 worth of credits. This will use their stored payment methods.
              <br />
              <span className="text-green-600 font-medium">Admin users have unlimited access and don&apos;t require credits.</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white text-sm font-medium mb-2">Batch Name</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter batch name"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Weekly Charge ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={weeklyCharge}
                  onChange={(e) => setWeeklyCharge(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Credits Per User ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditsPerUser}
                  onChange={(e) => setCreditsPerUser(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Max Users</label>
                <input
                  type="number"
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGrandfather}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Processing...
                  </>
                ) : (
                  'Start Grandfathering Process'
                )}
              </button>
            </div>

            {/* Model Costs Display */}
            <div className="mt-8">
              <h3 className="text-xl font-bold text-white mb-4">Model Costs & Estimated Generations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modelCosts.map((model) => (
                  <div key={model.model_name} className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-semibold text-white">{model.model_name}</h4>
                    <p className="text-blue-200 text-sm">Cost: ${model.cost_per_generation}</p>
                    <p className="text-green-200 text-sm">
                      Est. Generations: {Math.floor(creditsPerUser / model.cost_per_generation)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Batches History */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Grandfathering Batches</h2>
            <div className="space-y-4">
              {batches.map((batch) => (
                <div key={batch.id} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{batch.batch_name}</h3>
                      <p className="text-blue-200 text-sm">
                        {batch.processed_users}/{batch.total_users} users processed
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        batch.status === 'completed' ? 'bg-green-500/20 text-green-200' :
                        batch.status === 'processing' ? 'bg-yellow-500/20 text-yellow-200' :
                        batch.status === 'failed' ? 'bg-red-500/20 text-red-200' :
                        'bg-blue-500/20 text-blue-200'
                      }`}>
                        {batch.status}
                      </div>
                      <p className="text-blue-200 text-sm mt-1">
                        ${batch.total_budget.toFixed(2)} total
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}