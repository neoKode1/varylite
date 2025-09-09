'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, ThumbsUp, User, Send, Loader2, Image, X, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';

interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  images?: string[];
  timestamp: Date;
  likes: number;
  reposts: number;
  comments: number;
  isLiked: boolean;
  isReposted: boolean;
}

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [fundingData, setFundingData] = useState({
    current: 57.85,
    goal: 550,
    weeklyCost: 550,
    lastUpdated: new Date(),
    usageStats: {
      totalRequests: 6910,
      successfulRequests: 6910,
      successRate: 100,
      period: 'September 1-8, 2025',
      weeklyProjection: 13820,
      costPerGeneration: 0.0398,
      currentUsers: 24,
      scalingFactor: 2,
      baseWeeklyProjection: 6910,
      modelBreakdown: {
        nanoBanana: 6910,
        videoModels: 40.25,
        totalImages: 6910,
        totalVideoSeconds: 40.25
      }
    }
  });

  const [userStats, setUserStats] = useState({
    totalUsers: 47,
    activeUsers: 17,
    newUsers24h: 12,
    totalGenerations: 439,
    recentActivity: 439,
    lastUpdated: new Date(),
    period: 'Loading...'
  });

  // Fetch funding data
  const fetchFundingData = async () => {
    try {
      const response = await fetch('/api/fal-balance');
      const data = await response.json();
      
      setFundingData({
        current: data.current || 57.85,
        goal: data.goal || 550,
        weeklyCost: data.weeklyCost || 550,
        lastUpdated: new Date(data.lastUpdated || new Date()),
        usageStats: {
          totalRequests: data.usageStats?.totalRequests || 6910,
          successfulRequests: data.usageStats?.successfulRequests || 6910,
          successRate: data.usageStats?.successRate || 100,
          period: data.usageStats?.period || 'September 1-8, 2025',
          weeklyProjection: data.usageStats?.weeklyProjection || 13820,
          costPerGeneration: data.usageStats?.costPerGeneration || 0.0398,
          currentUsers: data.usageStats?.currentUsers || 24,
          scalingFactor: data.usageStats?.scalingFactor || 2,
          baseWeeklyProjection: data.usageStats?.baseWeeklyProjection || 6910,
          modelBreakdown: {
            nanoBanana: data.usageStats?.modelBreakdown?.nanoBanana || 6910,
            videoModels: data.usageStats?.modelBreakdown?.videoModels || 40.25,
            totalImages: data.usageStats?.modelBreakdown?.totalImages || 6910,
            totalVideoSeconds: data.usageStats?.modelBreakdown?.totalVideoSeconds || 40.25
          }
        }
      });
    } catch (error) {
      console.error('Failed to fetch funding data:', error);
    }
  };

  // Fetch user statistics from Supabase
  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user-stats');
      const data = await response.json();
      
      if (data.success && data.data) {
        setUserStats({
          totalUsers: data.data.totalUsers || 24,
          activeUsers: data.data.activeUsers || 8,
          newUsers24h: data.data.newUsers24h || 3,
          totalGenerations: data.data.totalGenerations || 6910,
          recentActivity: data.data.recentActivity || 150,
          lastUpdated: new Date(data.data.lastUpdated || new Date()),
          period: data.data.period || 'Real-time data'
        });
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  // Calculate energy level
  const getEnergyLevel = () => {
    const currentBalance = fundingData.current;
    const weeklyCost = fundingData.weeklyCost;
    const percentage = (currentBalance / weeklyCost) * 100;
    return Math.min(percentage, 100);
  };

  const getEnergyStatus = () => {
    const level = getEnergyLevel();
    if (level >= 80) return { status: 'high', color: 'green', text: 'High Energy' };
    if (level >= 50) return { status: 'medium', color: 'yellow', text: 'Medium Energy' };
    if (level >= 20) return { status: 'low', color: 'orange', text: 'Low Energy' };
    return { status: 'critical', color: 'red', text: 'Critical Energy' };
  };

  // Load sample posts and fetch data
  useEffect(() => {
    const samplePosts: Post[] = [
      {
        id: '1',
        userId: 'user1',
        userName: 'CreativeArtist',
        userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        content: 'Just created an amazing character variation with VaryAI! The Nano Banana model is incredible for character design. 🎨✨',
        images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop'],
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        likes: 12,
        reposts: 3,
        comments: 5,
        isLiked: false,
        isReposted: false
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'VideoCreator',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        content: 'Veo3 Fast is a game changer! Generated a stunning video from my artwork in just minutes. The quality is mind-blowing! 🚀',
        images: ['https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop'],
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        likes: 8,
        reposts: 2,
        comments: 3,
        isLiked: true,
        isReposted: false
      },
      {
        id: '3',
        userId: 'user3',
        userName: 'AICreator',
        userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
        content: 'Love how the community supports VaryAI! The funding meter shows we\'re all in this together. Keep creating! 💜',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        likes: 15,
        reposts: 7,
        comments: 8,
        isLiked: false,
        isReposted: true
      }
    ];
    setPosts(samplePosts);
    
    // Fetch initial data
    fetchFundingData();
    fetchUserStats();
    
    // Set up real-time polling every 30 seconds
    const interval = setInterval(() => {
      fetchFundingData();
      fetchUserStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPost.trim() && uploadedImages.length === 0) || !user) return;

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newPostData: Post = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      userAvatar: user.user_metadata?.avatar_url,
      content: newPost.trim(),
      images: uploadedImages.length > 0 ? uploadedImages : undefined,
      timestamp: new Date(),
      likes: 0,
      reposts: 0,
      comments: 0,
      isLiked: false,
      isReposted: false
    };

    setPosts(prev => [newPostData, ...prev]);
    setNewPost('');
    setUploadedImages([]);
    setIsLoading(false);
  };

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            isLiked: !post.isLiked,
            likes: post.isLiked ? post.likes - 1 : post.likes + 1
          }
        : post
    ));
  };

  const handleRepost = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            isReposted: !post.isReposted,
            reposts: post.isReposted ? post.reposts - 1 : post.reposts + 1
          }
        : post
    ));
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Handle file upload
  const handleFileUpload = (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Remove uploaded image
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Handle authentication modal
  const handleSignIn = () => {
    setAuthModalMode('signin');
    setShowAuthModal(true);
  };

  const handleSignUp = () => {
    setAuthModalMode('signup');
    setShowAuthModal(true);
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative"
      style={{
        backgroundImage: `url('/adarkorchestra_28188_In_the_style_of_glitch_transcendental_co_657b00f6-f6c5-41b4-8e19-425331e21112_1.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Subtle overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      {/* Header */}
      <div className="bg-black bg-opacity-10 backdrop-blur-md border-b border-purple-500 border-opacity-20 relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Tha Communita</h1>
            </div>
            <div className="text-right">
              <div className="text-gray-300 text-sm">Community Members</div>
              <div className="text-white font-medium">
                {userStats.totalUsers} Total • {userStats.activeUsers} Active
              </div>
              <div className="text-green-400 text-xs">
                +{userStats.newUsers24h} new today
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 relative z-10">
        {/* Community Funding Meter */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-purple-900 to-blue-900 bg-opacity-40 backdrop-blur-md rounded-lg p-4 border border-purple-500 border-opacity-20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse"></div>
                <h3 className="text-white font-semibold text-lg">Community Energy</h3>
              </div>
              <div className="text-right">
                <p className="text-gray-300 text-sm">Community Energy</p>
                <p className="text-white font-medium">Balance: ${fundingData.current.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Energy Bar */}
            <div className="relative">
              <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${
                    getEnergyStatus().status === 'high' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                    getEnergyStatus().status === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                    getEnergyStatus().status === 'low' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                    'bg-gradient-to-r from-red-400 to-red-600'
                  }`}
                  style={{ width: `${getEnergyLevel()}%` }}
                ></div>
              </div>
              
              {/* Energy Status */}
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  getEnergyStatus().color === 'green' ? 'text-green-400' :
                  getEnergyStatus().color === 'yellow' ? 'text-yellow-400' :
                  getEnergyStatus().color === 'orange' ? 'text-orange-400' :
                  'text-red-400'
                }`}>
                  {getEnergyStatus().text} ({Math.round(getEnergyLevel())}%)
                </span>
                
                {getEnergyLevel() < 80 && (
                  <div className="flex gap-2">
                    <a 
                      href="https://ko-fi.com/varyai" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white text-sm rounded-full transition-colors"
                      title="Weekly Injection - Funds take time to be released"
                    >
                      ⚡ Weekly Injection
                    </a>
                    <a 
                      href="https://cash.app/$VaryAi" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-full transition-colors"
                      title="Daily Injection - Funds go directly into the pot"
                    >
                      💚 Daily Injection
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-gray-400 text-xs mt-2">
              {getEnergyLevel() >= 80 
                ? "🎉 High energy! Generate freely while the balance stays healthy! Data based on real-time usage." 
                : getEnergyLevel() >= 50 
                ? "⚡ Good energy levels. Keep creating! Data based on real-time usage." 
                : getEnergyLevel() >= 20 
                ? "💡 Energy running low. Community support helps keep VaryAI running! Data based on real-time usage." 
                : "💜 Low energy. Your support helps keep the community thriving! Data based on real-time usage."
              }
            </p>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-900 to-purple-900 bg-opacity-40 backdrop-blur-md rounded-lg p-4 border border-blue-500 border-opacity-20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse"></div>
                <h3 className="text-white font-semibold text-lg">Usage Statistics</h3>
              </div>
              <div className="text-right">
                <p className="text-gray-300 text-sm">Last Updated: {userStats.period}</p>
                <p className="text-white font-medium">{userStats.totalUsers} Total Users</p>
                <p className="text-green-400 text-xs">{userStats.activeUsers} Active • +{userStats.newUsers24h} New</p>
              </div>
            </div>
            
            {/* Usage Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{userStats.totalGenerations.toLocaleString()}</div>
                <div className="text-xs text-gray-300">Total Generations</div>
              </div>
              <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{userStats.activeUsers}</div>
                <div className="text-xs text-gray-300">Active Users</div>
              </div>
              <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{userStats.recentActivity}</div>
                <div className="text-xs text-gray-300">Recent Activity</div>
              </div>
              <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-400">{userStats.newUsers24h}</div>
                <div className="text-xs text-gray-300">New Today</div>
              </div>
            </div>
            
            {/* Community Growth Stats */}
            <div className="bg-gray-800 bg-opacity-30 rounded-lg p-3">
              <h4 className="text-gray-300 text-sm font-medium mb-2">Community Growth</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Total Community Members</span>
                  <span className="text-blue-400 font-medium">{userStats.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Active in Last 24h</span>
                  <span className="text-green-400 font-medium">{userStats.activeUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">New Members Today</span>
                  <span className="text-purple-400 font-medium">+{userStats.newUsers24h}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Data Source</span>
                  <span className="text-gray-400 text-sm">{userStats.period}</span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-400 text-xs mt-3">
              🚀 VaryAI community is growing with {userStats.totalUsers} members and {userStats.totalGenerations} total generations!
            </p>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4 mb-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-gray-800 bg-opacity-30 backdrop-blur-md rounded-lg p-4 border border-gray-700 border-opacity-20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {post.userAvatar ? (
                    <img 
                      src={post.userAvatar} 
                      alt={post.userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-white">{post.userName}</span>
                    <span className="text-gray-400 text-sm">•</span>
                    <span className="text-gray-400 text-sm">{formatTimeAgo(post.timestamp)}</span>
                  </div>
                  <p className="text-gray-200 mb-3 leading-relaxed">{post.content}</p>
                  
                  {/* Post Images */}
                  {post.images && post.images.length > 0 && (
                    <div className="mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {post.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={image} 
                              alt={`Post image ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg border border-gray-600 border-opacity-30"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Post Actions */}
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 text-sm transition-colors ${
                        post.isLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                      {post.likes}
                    </button>
                    
                    <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400 text-sm transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      {post.comments}
                    </button>
                    
                    <button
                      onClick={() => handleRepost(post.id)}
                      className={`flex items-center gap-2 text-sm transition-colors ${
                        post.isReposted ? 'text-green-400' : 'text-gray-400 hover:text-green-400'
                      }`}
                    >
                      <Share2 className={`w-4 h-4 ${post.isReposted ? 'fill-current' : ''}`} />
                      {post.reposts}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* New Post Form */}
        {user ? (
          <div 
            className={`bg-gray-800 bg-opacity-30 backdrop-blur-md rounded-lg p-4 border border-gray-700 border-opacity-20 transition-all duration-200 ${
              isDragOver ? 'border-purple-400 border-opacity-60 bg-purple-900 bg-opacity-20' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <form onSubmit={handlePostSubmit} className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt={user.user_metadata?.full_name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Share your thoughts with the community..."
                    className="w-full bg-gray-700 bg-opacity-30 border border-gray-600 border-opacity-30 rounded-lg px-3 py-2 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                    rows={3}
                    maxLength={500}
                  />
                  
                  {/* Uploaded Images Preview */}
                  {uploadedImages.length > 0 && (
                    <div className="mt-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {uploadedImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={image} 
                              alt={`Upload preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border border-gray-600 border-opacity-30"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs">{newPost.length}/500</span>
                      
                      {/* File Upload Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 text-gray-400 hover:text-purple-400 text-xs transition-colors"
                      >
                        <Image className="w-4 h-4" />
                        <span>Add Image</span>
                      </button>
                      
                      {/* Drag and Drop Hint */}
                      {uploadedImages.length === 0 && (
                        <span className="text-gray-500 text-xs">or drag & drop images</span>
                      )}
                    </div>
                    
                    <button
                      type="submit"
                      disabled={(!newPost.trim() && uploadedImages.length === 0) || isLoading}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Post
                    </button>
                  </div>
                  
                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-gray-800 bg-opacity-30 backdrop-blur-md rounded-lg p-6 border border-gray-700 border-opacity-20 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Join the Conversation</h3>
            <p className="text-gray-400 mb-4">Sign in to share your thoughts with the community</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={handleSignIn}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all"
              >
                Sign In
              </button>
              <button 
                onClick={handleSignUp}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
      />
    </div>
  );
}
