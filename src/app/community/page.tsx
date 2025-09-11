'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, ThumbsUp, User, Send, Loader2, Image, X, Upload, ArrowLeft, Sparkles, Trash2, MoreVertical, Plus, ArrowUp, FolderOpen, Grid3X3, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { Header } from '@/components/Header';
import { AnalyticsUpdater } from '@/components/AnalyticsUpdater';
import { useRouter, usePathname } from 'next/navigation';


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
  const pathname = usePathname();
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
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [isCommunityEnergyExpanded, setIsCommunityEnergyExpanded] = useState(false);
  const [isUsageStatsExpanded, setIsUsageStatsExpanded] = useState(false);
  
  // Collaborators data
  const collaborators = [
    {
      id: 'kazi',
      name: 'Kazi',
      handle: '@Kazi5isAlive',
      role: 'Background Artist',
      contribution: 'Created the stunning background artwork for the community page',
      avatar: 'https://pbs.twimg.com/profile_images/your-avatar-url.jpg',
      social: 'https://x.com/Kazi5isAlive',
      type: 'artist'
    },
    {
      id: 'grimfel',
      name: 'Grimfel',
      handle: '@GrimfelOfficial',
      role: 'Preset Designer / Digital Artist',
      contribution: 'Collaborated on features and restyled presets, especially for background changes',
      avatar: null,
      social: 'https://x.com/GrimfelOfficial',
      type: 'contributor'
    },
    {
      id: 'blvcklight',
      name: 'BLVCKLIGHT',
      handle: '@BLVCKLIGHTai',
      role: 'AI Model Consultant',
      contribution: 'Fed ideas on model selection and priority in workflow enhancements',
      avatar: null,
      social: 'https://x.com/BLVCKLIGHTai',
      type: 'advisor'
    },
    {
      id: 'pastor',
      name: 'Pastor',
      handle: '@FussyPastor',
      role: 'Product Director',
      contribution: 'Helps with product design, workflow, and development ideas',
      avatar: null,
      social: 'https://x.com/FussyPastor',
      type: 'advisor'
    },
    {
      id: 'afro-futcha',
      name: 'Afro Futcha',
      handle: '@misslaidlaw',
      role: 'AI Filmmaker & Creative Designer',
      contribution: 'Helped with landing page design',
      avatar: null,
      social: 'https://x.com/misslaidlaw',
      type: 'artist'
    },
    {
      id: 'deep-tech-ai',
      name: 'Deep tech Ai',
      handle: '@io2Medusa',
      role: 'AI Development Consultant',
      contribution: 'Helped with prompt and feature enhancement',
      avatar: null,
      social: 'https://x.com/io2Medusa',
      type: 'advisor'
    },
    {
      id: 'nayri',
      name: 'Nayri',
      handle: '@NayriTheWitch',
      role: 'Digital Artist & AI Consultant',
      contribution: 'Helped with product selection, model selection, and workflow enhancements',
      avatar: null,
      social: 'https://x.com/NayriTheWitch',
      type: 'advisor'
    },
    {
      id: 'community-moderator',
      name: 'Community Helper',
      handle: '@helper',
      role: 'Community Moderator',
      contribution: 'Helps moderate discussions and provides user support',
      avatar: null,
      social: null,
      type: 'moderator'
    }
  ];


  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsers24h: 0,
    totalGenerations: 0,
    recentActivity: 0,
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


  // Fetch user statistics from Supabase
  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user-stats');
      const data = await response.json();
      
      if (data.success && data.data) {
        setUserStats({
          totalUsers: data.data.totalUsers || 0,
          activeUsers: data.data.activeUsers || 0,
          newUsers24h: data.data.newUsers24h || 0,
          totalGenerations: data.data.totalGenerations || 0,
          recentActivity: data.data.recentActivity || 150,
          lastUpdated: new Date(data.data.lastUpdated || new Date()),
          period: data.data.period || 'Real-time data'
        });
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };


  // Load posts and fetch data
  useEffect(() => {
    // Fetch initial data
    fetchPosts();
    fetchUserStats();
    
    // Set up real-time polling every 30 seconds
    const interval = setInterval(() => {
      fetchPosts();
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
          try {
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
            } else {
              console.error('Upload failed:', uploadData.error);
              // Continue with other images, but log the error
            }
          } catch (error) {
            console.error('Error uploading image:', error);
            // Continue with other images
          }
        }
      }
      
      // Validate that we have either content or successfully uploaded images
      if (!newPost.trim() && uploadedImageUrls.length === 0) {
        console.error('Cannot create post: no content and no successfully uploaded images');
        alert('Please add some text or ensure your images uploaded successfully');
        setIsLoading(false);
        return;
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

  // Header handlers (reusing existing functions)

  return (
    <div 
      className="min-h-screen bg-black relative overflow-hidden"
    >
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ 
          filter: 'brightness(0.3) contrast(1.2)',
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto'
        }}
      >
        <source src="/adarkorchestra_28188_Inside_a_lived-in_spaceship_cockpit_a_no_2f629715-cb74-4eff-b2ee-62bc41318cd7_1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40 z-10"></div>
      
      {/* Header with Profile Access */}
      <div className="relative z-20">
        <Header 
          onSignUpClick={handleSignUp}
          onSignInClick={handleSignIn}
          showContributors={showCollaborators}
          onToggleContributors={() => setShowCollaborators(!showCollaborators)}
          hideCommunityButton={true}
        />
      </div>

      {/* Mobile Header with Navigation - Mobile Only */}
      <header className="lg:hidden sticky top-0 z-50 relative overflow-hidden">
        {/* Background Image Banner */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/adarkorchestra_28188_The_interior_of_a_retro-futuristic_space_638ede4d-ca7f-45f3-9dc8-2fd97f905591_0.png)',
            filter: 'brightness(0.4) contrast(1.2)'
          }}
        />
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        
      </header>
      


      <div className="max-w-6xl mx-auto px-3 lg:px-4 py-6 relative z-10 pb-32 lg:pb-6">

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
                    <div className="w-full h-full bg-gradient-charcoal rounded-full flex items-center justify-center border border-border-gray">
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
                      className="flex items-center gap-2 text-gray-400 hover:text-accent-gray text-sm transition-colors"
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
                                  <div className="w-full h-full bg-gradient-charcoal rounded-full flex items-center justify-center border border-border-gray">
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
                              <div className="w-full h-full bg-gradient-charcoal rounded-full flex items-center justify-center border border-border-gray">
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

        {/* Add bottom padding to account for floating input */}
        <div className="pb-32"></div>

        {/* Community Funding Meter */}
        <div className="mb-4 lg:mb-6">
          <div className="bg-transparent lg:bg-gradient-charcoal lg:bg-opacity-40 backdrop-blur-md rounded-lg p-3 lg:p-4 border border-border-gray border-opacity-30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse"></div>
                <h3 className="text-white font-semibold text-sm lg:text-lg">Community Energy</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-left sm:text-right">
                  <p className="text-gray-300 text-xs lg:text-sm">Community Energy</p>
                  <p className="text-white font-medium text-sm lg:text-base">Community Status</p>
                </div>
                <button
                  onClick={() => setIsCommunityEnergyExpanded(!isCommunityEnergyExpanded)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {isCommunityEnergyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {/* Collapsed State - Show only meter */}
            {!isCommunityEnergyExpanded && (
              <div className="relative">
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 w-3/4"></div>
                </div>
                <p className="text-gray-400 text-xs leading-tight">
                  Community support helps keep vARY Ai running! Thank you for being part of our creative community.
                </p>
              </div>
            )}
            
            {/* Expanded State - Show full content */}
            {isCommunityEnergyExpanded && (
              <div className="relative">
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 w-3/4"></div>
                </div>
                
                {/* Support Links */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href="https://ko-fi.com/vari-ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white text-xs rounded-full transition-colors text-center"
                  >
                    ⚡ Support
                  </a>
                  <a
                    href="https://cash.app/$VaryAi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-full transition-colors text-center"
                  >
                    💚 Daily
                  </a>
                </div>

                <p className="text-gray-400 text-xs mt-2 leading-tight">
                  Community support helps keep vARY Ai running! Thank you for being part of our creative community.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="mb-4 lg:mb-6">
          <div className="bg-transparent lg:bg-gradient-charcoal lg:bg-opacity-40 backdrop-blur-md rounded-lg p-3 lg:p-4 border border-border-gray border-opacity-30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-accent-gray to-light-gray animate-pulse"></div>
                <h3 className="text-white font-semibold text-sm lg:text-lg">Usage Statistics</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-left sm:text-right">
                  <p className="text-gray-300 text-xs lg:text-sm">Last Updated: {userStats.period}</p>
                  <p className="text-white font-medium text-sm lg:text-base">{userStats.totalUsers} Total Users</p>
                  <p className="text-green-400 text-xs">{userStats.activeUsers} Active • +{userStats.newUsers24h} New</p>
                </div>
                <button
                  onClick={() => setIsUsageStatsExpanded(!isUsageStatsExpanded)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {isUsageStatsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {/* Collapsed State - Show only description */}
            {!isUsageStatsExpanded && (
              <p className="text-gray-400 text-xs">
                🚀 vARY Ai community is growing with {userStats.totalUsers} members and {userStats.totalGenerations} total generations!
              </p>
            )}
            
            {/* Expanded State - Show full content */}
            {isUsageStatsExpanded && (
              <>
                {/* Usage Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-4">
                  <div className="bg-gray-800 bg-opacity-50 rounded-lg p-2 lg:p-3 text-center">
                    <div className="text-lg lg:text-2xl font-bold text-accent-gray">{userStats.totalGenerations.toLocaleString()}</div>
                    <div className="text-xs text-gray-300">Total Generations</div>
                  </div>
                  <div className="bg-gray-800 bg-opacity-50 rounded-lg p-2 lg:p-3 text-center">
                    <div className="text-lg lg:text-2xl font-bold text-green-400">{userStats.activeUsers}</div>
                    <div className="text-xs text-gray-300">Active Users</div>
                  </div>
                  <div className="bg-gray-800 bg-opacity-50 rounded-lg p-2 lg:p-3 text-center">
                    <div className="text-lg lg:text-2xl font-bold text-purple-400">{userStats.recentActivity}</div>
                    <div className="text-xs text-gray-300">Recent Activity</div>
                  </div>
                  <div className="bg-gray-800 bg-opacity-50 rounded-lg p-2 lg:p-3 text-center">
                    <div className="text-lg lg:text-2xl font-bold text-orange-400">{userStats.newUsers24h}</div>
                    <div className="text-xs text-gray-300">New Today</div>
                  </div>
                </div>
                
                {/* Community Growth Stats */}
                <div className="bg-gray-800 bg-opacity-30 rounded-lg p-2 lg:p-3">
                  <h4 className="text-gray-300 text-xs lg:text-sm font-medium mb-2">Community Growth</h4>
                  <div className="space-y-1 lg:space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-xs lg:text-sm">Total Community Members</span>
                      <span className="text-accent-gray font-medium text-xs lg:text-sm">{userStats.totalUsers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-xs lg:text-sm">Active in Last 24h</span>
                      <span className="text-green-400 font-medium text-xs lg:text-sm">{userStats.activeUsers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-xs lg:text-sm">New Members Today</span>
                      <span className="text-purple-400 font-medium text-xs lg:text-sm">+{userStats.newUsers24h}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Data Source</span>
                      <span className="text-gray-400 text-sm">{userStats.period}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-400 text-xs mt-3">
                  🚀 vARY Ai community is growing with {userStats.totalUsers} members and {userStats.totalGenerations} total generations!
                </p>
              </>
            )}
          </div>
        </div>
        
        {/* Artist Credit */}
        <div className="mt-8 text-center">
          <div className="bg-gray-800 bg-opacity-20 backdrop-blur-sm rounded-lg p-4 border border-gray-700 border-opacity-20 inline-block">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <span>Background artwork by</span>
              <a 
                href="https://x.com/Kazi5isAlive" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 transition-colors font-medium flex items-center gap-1"
              >
                <span>Kazi</span>
                <span className="text-accent-gray">@Kazi5isAlive</span>
              </a>
            </div>
          </div>
        </div>
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

      {/* Desktop Floating Post Input - Match Generate Page Styling */}
      {user ? (
        <div 
          className={`generate-floating-input ${
            isDragOver ? 'border-purple-400 border-opacity-60 bg-purple-900 bg-opacity-30' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Simple Image Preview for Community Posts */}
          {uploadedImages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto">
              {uploadedImages.map((image, index) => (
                <div 
                  key={index} 
                  className="relative flex-shrink-0 transition-all duration-200"
                >
                  <img
                    src={image}
                    alt={`Image ${index + 1}`}
                    className="w-12 h-12 object-cover rounded-lg border border-white border-opacity-20"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your thoughts..."
            className="generate-floating-textarea"
            rows={1}
            maxLength={500}
            style={{ fontSize: '16px' }} // Prevents zoom on iOS
          />
          
          <div className="generate-floating-buttons">
            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="generate-floating-upload-button"
              title="Upload files"
            >
              <Upload className="generate-floating-upload-icon" />
            </button>
            
            {/* Send Button */}
            <button
              onClick={handlePostSubmit}
              disabled={(!newPost.trim() && uploadedImages.length === 0) || isLoading}
              className="generate-floating-send-button"
              title="Post"
            >
              {isLoading ? (
                <Loader2 className="generate-floating-icon animate-spin" />
              ) : (
                <Send className="generate-floating-icon" />
              )}
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
      ) : (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-1/3 z-40 bg-gray-800 bg-opacity-90 backdrop-blur-md rounded-lg p-3 border border-gray-700 border-opacity-30 text-center">
          <div className="flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Sign in to join the conversation</span>
            <div className="flex gap-2">
              <button 
                onClick={handleSignIn}
                className="px-3 py-1 bg-gradient-charcoal text-white rounded text-sm font-medium hover:bg-gradient-jet transition-all border border-border-gray"
              >
                Sign In
              </button>
              <button 
                onClick={handleSignUp}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Post Input - Match Generate Page Styling */}
      {user ? (
        <div className="mobile-chat-interface">
          <div className="mobile-input-container">
            {/* Simple Image Preview for Community Posts */}
            {uploadedImages.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto">
                {uploadedImages.map((image, index) => (
                  <div 
                    key={index} 
                    className="relative flex-shrink-0 transition-all duration-200"
                  >
                    <img
                      src={image}
                      alt={`Image ${index + 1}`}
                      className="w-10 h-10 object-cover rounded-lg border border-white border-opacity-20"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share your thoughts..."
              className="mobile-chat-input"
              rows={1}
              maxLength={500}
            />
            
            <div className="flex items-center gap-2">
              {/* File Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center transition-colors"
                title="Upload files"
              >
                <Upload className="w-4 h-4 text-white" />
              </button>
              
              {/* Send Button */}
              <button
                onClick={handlePostSubmit}
                disabled={(!newPost.trim() && uploadedImages.length === 0) || isLoading}
                className="mobile-send-button"
                title="Post"
              >
                {isLoading ? (
                  <Loader2 className="mobile-send-icon animate-spin" />
                ) : (
                  <Send className="mobile-send-icon" />
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile File Upload Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black bg-opacity-98 backdrop-blur-20px border-t border-white border-opacity-15 p-3 pb-safe">
          <div className="community-mobile-input-container">
            <div className="flex-1 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Sign in to join the conversation</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleSignIn}
                className="px-3 py-1 bg-gradient-charcoal text-white rounded text-sm font-medium hover:bg-gradient-jet transition-all border border-border-gray"
              >
                Sign In
              </button>
              <button 
                onClick={handleSignUp}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collaborators Modal */}
      {showCollaborators && (
        <div 
          className="fixed left-4 top-1/2 transform -translate-y-1/2 w-80 z-40 bg-gray-800 bg-opacity-90 backdrop-blur-md rounded-lg border border-gray-700 border-opacity-30 transition-all duration-200"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Collaborators</h3>
              <button
                onClick={() => setShowCollaborators(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="bg-gray-700 bg-opacity-30 rounded-lg p-3 border border-gray-600 border-opacity-20">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {collaborator.avatar ? (
                        <img 
                          src={collaborator.avatar} 
                          alt={collaborator.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full rounded-full flex items-center justify-center ${
                          collaborator.type === 'artist' ? 'bg-gradient-charcoal border border-border-gray' :
                          collaborator.type === 'contributor' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' :
                          collaborator.type === 'advisor' ? 'bg-gradient-to-r from-green-500 to-teal-500' :
                          'bg-gradient-to-r from-orange-500 to-red-500'
                        }`}>
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium text-sm truncate">{collaborator.name}</h4>
                        {collaborator.social && (
                          <a 
                            href={collaborator.social}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-gray hover:text-light-gray transition-colors"
                          >
                            <span className="text-xs">{collaborator.handle}</span>
                          </a>
                        )}
                      </div>
                      
                      <div className="text-purple-300 text-xs font-medium mb-1">{collaborator.role}</div>
                      <p className="text-gray-300 text-xs leading-relaxed">{collaborator.contribution}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-600 border-opacity-20">
              <p className="text-gray-400 text-xs text-center">
                Want to contribute? <span className="text-purple-400">Join our community!</span>
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
      />

      {/* Mobile Floating Bottom Input - Match Reference Design */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-transparent backdrop-blur-md">
        <div className="flex items-center gap-3 mb-3">
          {/* Add Media Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors"
            title="Add Media"
          >
            <Plus className="w-5 h-5 text-yellow-500" />
          </button>
          
          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Share your thoughts."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="w-full bg-gray-700/80 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500/50"
            />
          </div>
          
          {/* Post Button */}
          <button 
            onClick={handlePostSubmit}
            disabled={(!newPost.trim() && uploadedImages.length === 0) || isLoading}
            className="flex-shrink-0 w-12 h-12 bg-gray-600/80 rounded-xl flex items-center justify-center text-white disabled:opacity-50 disabled:bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
        
        {/* Bottom Navigation */}
        <div className="flex bg-gray-800 rounded-xl overflow-hidden">
          <button 
            onClick={() => router.push('/generate')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${pathname === '/generate' ? 'bg-gray-600/80 text-gray-200' : 'text-gray-400 hover:text-white'}`}
          >
            <Grid3X3 className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </button>
          
          <button 
            onClick={() => router.push('/community')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${pathname === '/community' ? 'bg-gray-600/80 text-gray-200' : 'text-gray-400 hover:text-white'}`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-medium">Chat</span>
          </button>
          
          <button 
            onClick={() => setShowGallery(!showGallery)}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${showGallery ? 'bg-gray-600/80 text-gray-200' : 'text-gray-400 hover:text-white'}`}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-xs font-medium">Library</span>
          </button>
          
          <button 
            onClick={() => router.push('/profile')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${pathname === '/profile' ? 'bg-gray-600/80 text-gray-200' : 'text-gray-400 hover:text-white'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>

      {/* Gallery Panel */}
      {showGallery && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 bg-opacity-95 backdrop-blur-sm border-t border-transparent z-30 max-h-[60vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-white">
                <FolderOpen className="w-6 h-6 text-white" />
                Library
              </h2>
              <button
                onClick={() => setShowGallery(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Library feature coming soon</p>
              <p className="text-gray-500 text-sm mt-2">This will show your saved posts and generated content</p>
            </div>
          </div>
        </div>
      )}

      {/* Tha Communita Section - Moved to Bottom */}
      <div className="max-w-6xl mx-auto px-3 lg:px-4 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 lg:gap-4">
            <button
              onClick={() => {
                console.log('Generate button clicked');
                router.push('/generate');
              }}
              className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-gradient-charcoal hover:bg-gradient-jet text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-lg text-sm lg:text-base border border-border-gray"
              title="Back to Generate"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Generate</span>
              <Sparkles className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-charcoal rounded-full flex items-center justify-center border border-border-gray">
                <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </div>
              <h1 className="text-lg lg:text-2xl font-bold text-white">Tha Communita</h1>
            </div>
          </div>
          <div className="text-left lg:text-right">
            <div className="text-gray-300 text-xs lg:text-sm">Community Members</div>
            <div className="text-white font-medium text-sm lg:text-base">
              {userStats.totalUsers} Total • {userStats.activeUsers} Active
            </div>
            <div className="text-green-400 text-xs">
              +{userStats.newUsers24h} new today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
