'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, ThumbsUp, User, Send, Loader2, Image, X, Upload, ArrowLeft, Sparkles, Trash2, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { useRouter } from 'next/navigation';

interface Post {
  id: string;
  user_id: string;
  userName: string;
  userAvatar?: string;
  content: string;
  images?: string[];
  created_at: string;
  likes_count: number;
  reposts_count: number;
  comments_count: number;
  isLiked: boolean;
  isReposted: boolean;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  userName?: string;
  userAvatar?: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

export default function CommunityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [newComment, setNewComment] = useState<{ [postId: string]: string }>({});
  const [isCommenting, setIsCommenting] = useState<{ [postId: string]: boolean }>({});
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

  // Fetch posts from API
  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/community/posts');
      const data = await response.json();
      
      if (data.success) {
        console.log('📊 [COMMUNITY PAGE] Posts data:', data.data);
        const postsWithUserInfo = data.data.map((post: any) => {
          console.log('👤 [COMMUNITY PAGE] Post user data:', {
            postId: post.id,
            userId: post.user_id,
            profile: post.profiles,
            displayName: post.profiles?.display_name,
            username: post.profiles?.username
          });
          return {
            ...post,
            userName: post.profiles?.display_name || post.profiles?.username || 'Anonymous',
            userAvatar: post.profiles?.avatar_url || undefined,
            isLiked: false, // Will be updated based on user interactions
            isReposted: false
          };
        });
        setPosts(postsWithUserInfo);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  // Fetch comments for a specific post
  const fetchComments = async (postId: string) => {
    try {
      const response = await fetch(`/api/community/comments?post_id=${postId}`);
      const data = await response.json();
      
      if (data.success) {
        const commentsWithUserInfo = data.data.map((comment: any) => ({
          ...comment,
          userName: comment.profiles?.display_name || comment.profiles?.username || 'Anonymous',
          userAvatar: comment.profiles?.avatar_url || undefined
        }));
        setComments(prev => ({ ...prev, [postId]: commentsWithUserInfo }));
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

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

  // Load posts and fetch data
  useEffect(() => {
    // Fetch initial data
    fetchPosts();
    fetchFundingData();
    fetchUserStats();
    
    // Set up real-time polling every 30 seconds
    const interval = setInterval(() => {
      fetchPosts();
      fetchFundingData();
      fetchUserStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPost.trim() && uploadedImages.length === 0) || !user) return;

    setIsLoading(true);
    
    try {
      // Upload images first if any
      let uploadedImageUrls: string[] = [];
      if (uploadedImages.length > 0) {
        for (const imageDataUrl of uploadedImages) {
          // Convert data URL to blob
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();
          
          // Create form data for upload
          const formData = new FormData();
          formData.append('file', blob, `image-${Date.now()}.jpg`);
          formData.append('user_id', user.id);
          
          const uploadResponse = await fetch('/api/community/upload', {
            method: 'POST',
            body: formData
          });
          
          const uploadData = await uploadResponse.json();
          if (uploadData.success) {
            uploadedImageUrls.push(uploadData.data.url);
          }
        }
      }
      
      // Create the post
      const postResponse = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newPost.trim(),
          images: uploadedImageUrls,
          user_id: user.id
        })
      });
      
      const postData = await postResponse.json();
      
      if (postData.success) {
        // Refresh posts to get the latest data
        await fetchPosts();
        setNewPost('');
        setUploadedImages([]);
      } else {
        console.error('Failed to create post:', postData.error);
        console.error('Error details:', postData.details);
        console.error('Error code:', postData.code);
        // You could show a user-friendly error message here
        alert(`Failed to create post: ${postData.details || postData.error}`);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/community/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_id: postId,
          user_id: user.id,
          interaction_type: 'like'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the post in the local state
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                isLiked: data.data.isNewInteraction,
                likes_count: data.data.post.likes_count
              }
            : post
        ));
      }
    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  const handleRepost = async (postId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/community/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_id: postId,
          user_id: user.id,
          interaction_type: 'repost'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the post in the local state
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                isReposted: data.data.isNewInteraction,
                reposts_count: data.data.post.reposts_count
              }
            : post
        ));
      }
    } catch (error) {
      console.error('Error handling repost:', error);
    }
  };

  const handleShare = async (postId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/community/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_id: postId,
          user_id: user.id,
          interaction_type: 'share'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // You could show a success message or update UI here
        console.log('Post shared successfully');
      }
    } catch (error) {
      console.error('Error handling share:', error);
    }
  };

  const handleComment = async (postId: string) => {
    if (!user || !newComment[postId]?.trim()) return;
    
    setIsCommenting(prev => ({ ...prev, [postId]: true }));
    
    try {
      const response = await fetch('/api/community/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_id: postId,
          content: newComment[postId].trim(),
          user_id: user.id
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Clear the comment input
        setNewComment(prev => ({ ...prev, [postId]: '' }));
        
        // Refresh comments for this post
        await fetchComments(postId);
        
        // Update post comment count
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, comments_count: post.comments_count + 1 }
            : post
        ));
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setIsCommenting(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = (postId: string) => {
    if (selectedPost === postId) {
      setSelectedPost(null);
    } else {
      setSelectedPost(postId);
      if (!comments[postId]) {
        fetchComments(postId);
      }
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
    
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
    console.log('Sign In button clicked');
    setAuthModalMode('signin');
    setShowAuthModal(true);
  };

  const handleSignUp = () => {
    console.log('Sign Up button clicked');
    setAuthModalMode('signup');
    setShowAuthModal(true);
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/community/posts?post_id=${postId}&user_id=${user.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove the post from the local state
        setPosts(prev => prev.filter(post => post.id !== postId));
        console.log('Post deleted successfully');
      } else {
        console.error('Failed to delete post:', data.error);
        alert(`Failed to delete post: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error deleting post. Please try again.');
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleCloseImageModal = () => {
    setSelectedImage(null);
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
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  console.log('Generate button clicked');
                  router.push('/generate');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
                title="Back to Generate"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium">Generate</span>
                <Sparkles className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Tha Communita</h1>
              </div>
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{post.userName}</span>
                      <span className="text-gray-400 text-sm">•</span>
                      <span className="text-gray-400 text-sm">{formatTimeAgo(post.created_at)}</span>
                    </div>
                    
                    {/* Post Actions Menu - Only show for user's own posts */}
                    {user && post.user_id === user.id && (
                      <div className="relative">
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-200 mb-3 leading-relaxed">{post.content}</p>
                  
                  {/* Post Images */}
                  {post.images && post.images.length > 0 && (
                    <div className="mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {post.images.map((image, index) => (
                          <div key={index} className="relative group cursor-pointer" onClick={() => handleImageClick(image)}>
                            <img 
                              src={image} 
                              alt={`Post image ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg border border-gray-600 border-opacity-30 transition-transform duration-200 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Image className="w-8 h-8 text-white" />
                              </div>
                            </div>
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
                      {post.likes_count}
                    </button>
                    
                    <button 
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-2 text-gray-400 hover:text-blue-400 text-sm transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {post.comments_count}
                    </button>
                    
                    <button
                      onClick={() => handleRepost(post.id)}
                      className={`flex items-center gap-2 text-sm transition-colors ${
                        post.isReposted ? 'text-green-400' : 'text-gray-400 hover:text-green-400'
                      }`}
                    >
                      <Share2 className={`w-4 h-4 ${post.isReposted ? 'fill-current' : ''}`} />
                      {post.reposts_count}
                    </button>
                  </div>

                  {/* Comments Section */}
                  {selectedPost === post.id && (
                    <div className="mt-4 pt-4 border-t border-gray-700 border-opacity-30">
                      {/* Comments List */}
                      {comments[post.id] && comments[post.id].length > 0 && (
                        <div className="space-y-3 mb-4">
                          {comments[post.id].map((comment) => (
                            <div key={comment.id} className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {comment.userAvatar ? (
                                  <img 
                                    src={comment.userAvatar} 
                                    alt={comment.userName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-white text-sm">{comment.userName}</span>
                                  <span className="text-gray-400 text-xs">•</span>
                                  <span className="text-gray-400 text-xs">{formatTimeAgo(comment.created_at)}</span>
                                </div>
                                <p className="text-gray-200 text-sm">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment Input */}
                      {user && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {user.user_metadata?.avatar_url ? (
                              <img 
                                src={user.user_metadata.avatar_url} 
                                alt={user.user_metadata?.full_name || 'User'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={newComment[post.id] || ''}
                              onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder="Write a comment..."
                              className="flex-1 bg-gray-700 bg-opacity-30 border border-gray-600 border-opacity-30 rounded-lg px-3 py-2 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleComment(post.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleComment(post.id)}
                              disabled={!newComment[post.id]?.trim() || isCommenting[post.id]}
                              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                            >
                              {isCommenting[post.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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

      {/* Full-Screen Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
          onClick={handleCloseImageModal}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center">
            <img 
              src={selectedImage} 
              alt="Full screen view"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={handleCloseImageModal}
              className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
      />
    </div>
  );
}
