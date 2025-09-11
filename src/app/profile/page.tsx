'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  Settings, 
  Heart, 
  Download, 
  Share2, 
  Edit3, 
  Camera, 
  Mail, 
  Globe, 
  Twitter, 
  Instagram,
  Save,
  X,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Clock,
  BarChart3
} from 'lucide-react';

interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  email: string;
  bio: string;
  avatar?: string;
  socialLinks: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
  preferences: {
    defaultModel: string;
    defaultStyle: string;
    notifications: boolean;
    publicProfile: boolean;
    toastyNotifications: boolean;
  };
  stats: {
    totalGenerations: number;
    favoriteGenerations: number;
    accountCreated: string;
    lastActive: string;
    collections: number;
  };
  collections: Collection[];
  favoritePresets: string[];
}

interface Collection {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
}

interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  title: string;
  description: string;
  isPublic: boolean;
  isFavorite: boolean;
  collectionId?: string;
  createdAt: string;
  generationModel: string;
  prompt: string;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'gallery' | 'settings' | 'stats'>('profile');
  const [profileLoading, setProfileLoading] = useState(true);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'favorites'>('all');

  // Redirect if not authenticated (but wait for auth to finish loading)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/generate');
    }
  }, [user, loading, router]);

  // Load profile data from database
  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      setProfileLoading(true);
      console.log('🔄 Loading profile data...');
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('No active session');
      }

      console.log('✅ Session found, fetching profile data...');

      // Fetch profile data from API
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Profile API error:', response.status, errorText);
        throw new Error(`Failed to fetch profile: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Profile data loaded successfully:', data);
      
      // Transform database data to component format
      setProfile({
        id: data.profile.id,
        displayName: data.profile.name || 'vARY Ai User',
        username: data.profile.name?.toLowerCase().replace(/\s+/g, '_') || 'vary_ai_user',
        email: data.profile.email || '',
        bio: 'Creative AI enthusiast exploring the possibilities of character generation!',
        avatar: data.profile.profile_picture,
        socialLinks: {
          twitter: '',
          instagram: '',
          website: ''
        },
        preferences: {
          defaultModel: data.profile.preferences?.defaultModel || 'runway-t2i',
          defaultStyle: data.profile.preferences?.defaultStyle || 'anime',
          notifications: data.profile.preferences?.notifications ?? true,
          publicProfile: data.profile.preferences?.publicProfile ?? true,
          toastyNotifications: data.profile.preferences?.toastyNotifications ?? true
        },
        stats: {
          totalGenerations: data.profile.usage_stats?.total_generations || 0,
          favoriteGenerations: 0,
          accountCreated: data.profile.created_at || new Date().toISOString(),
          lastActive: data.profile.usage_stats?.last_activity || new Date().toISOString(),
          collections: 0
        },
        collections: [],
        favoritePresets: []
      });

      // Set gallery items from API response
      if (data.gallery && Array.isArray(data.gallery)) {
        setGalleryItems(data.gallery.map((item: any) => ({
          id: item.id,
          type: item.file_type,
          url: item.image_url || item.video_url || '/api/placeholder/400/400',
          thumbnail: item.file_type === 'video' ? '/api/placeholder/200/200' : undefined,
          title: item.description,
          description: item.description,
          isPublic: false, // All gallery items are private
          isFavorite: false, // Default to not favorite
          collectionId: undefined,
          createdAt: item.created_at,
          generationModel: 'runway-t2i', // Default model
          prompt: item.original_prompt
        })));
      } else {
        console.log('📝 No gallery data found, setting empty array');
        setGalleryItems([]);
      }

      setProfileLoading(false);
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        user: user?.id,
        email: user?.email
      });
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !user) return;
    
    try {
      setProfileLoading(true);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Update profile via API
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: profile.displayName,
          profile_picture: profile.avatar,
          preferences: profile.preferences
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      const data = await response.json();
      console.log('Profile saved successfully:', data);
      setIsEditing(false);
      setProfileLoading(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setProfileLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    try {
      setProfileLoading(true);
      console.log('Uploading avatar:', file);

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image size must be less than 2MB');
      }

      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);
      
      // Update the profile state immediately with the preview
      setProfile(prev => prev ? {
        ...prev,
        avatar: previewUrl
      } : null);

      // Compress and convert image to base64
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          // Set canvas size (max 200x200 for profile pictures)
          const maxSize = 200;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
          resolve(compressedDataUrl);
        };
        
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      console.log('Compressed image size:', compressedBase64.length, 'characters');

      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Upload the avatar via the profile API
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: profile.displayName,
          profile_picture: compressedBase64, // Send compressed base64 data
          preferences: profile.preferences
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Avatar upload failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Failed to upload avatar: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('Avatar uploaded successfully:', data);

      // Update with the actual URL from the server if provided
      if (data.profile.profile_picture) {
        setProfile(prev => prev ? {
          ...prev,
          avatar: data.profile.profile_picture
        } : null);
      }

      setProfileLoading(false);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setProfileLoading(false);
      
      // Revert the preview on error
      setProfile(prev => prev ? {
        ...prev,
        avatar: profile.avatar // Revert to original
      } : null);
    }
  };

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      const newCollection: Collection = {
        id: Date.now().toString(),
        name: newCollectionName,
        description: newCollectionDescription,
        isPublic: false,
        itemCount: 0,
        createdAt: new Date().toISOString()
      };
      
      if (profile) {
        setProfile({
          ...profile,
          collections: [...profile.collections, newCollection]
        });
      }
      
      setNewCollectionName('');
      setNewCollectionDescription('');
      setShowCreateCollection(false);
    }
  };

  const handleToggleFavorite = (itemId: string) => {
    setGalleryItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, isFavorite: !item.isFavorite }
          : item
      )
    );
  };

  // Removed handleTogglePublic since all gallery items are private

  const handleExportData = () => {
    const exportData = {
      profile,
      galleryItems,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vari-ai-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredGalleryItems = galleryItems.filter(item => {
    switch (galleryFilter) {
      case 'favorites':
        return item.isFavorite;
      default:
        return true; // Show all items (all are private)
    }
  });

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Loading...</div>
          <div className="text-gray-300 text-sm">Please wait while we verify your authentication.</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Profile not found</div>
          <div className="text-gray-300 text-sm mb-4">
            {user ? 'Unable to load your profile data.' : 'Please sign in to view your profile.'}
          </div>
          {user && (
            <button
              onClick={() => loadProfileData()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retry Loading Profile
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 lg:py-6">
            {/* Left: Profile Icon and Title */}
            <div className="flex items-center space-x-3 lg:space-x-4">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
                {profile?.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                )}
              </div>
              <h1 className="text-xl lg:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Profile
              </h1>
            </div>
            
            {/* Right: Action Buttons */}
            <div className="flex space-x-2 lg:space-x-3">
              <button
                onClick={() => router.push('/generate')}
                className="px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg lg:rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 text-sm lg:text-base"
              >
                Generate
              </button>
              <button
                onClick={() => router.push('/community')}
                className="px-4 py-2 lg:px-6 lg:py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg lg:rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 text-sm lg:text-base"
              >
                Community
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 lg:p-8 mb-6 lg:mb-8 border border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-500">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative group mx-auto lg:mx-0">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold shadow-2xl ring-4 ring-white/20 hover:ring-white/30 transition-all duration-300 transform group-hover:scale-105">
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16" />
                )}
              </div>
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-3 rounded-full cursor-pointer transition-all duration-300 transform hover:scale-110 shadow-lg">
                  <Camera className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-2 lg:gap-4 mb-4">
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                    className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent bg-transparent border-b-2 border-white/30 focus:border-white/60 outline-none transition-all duration-300"
                  />
                ) : (
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{profile.displayName}</h2>
                )}
                <span className="text-white/60 bg-white/10 px-3 py-1 rounded-full text-sm font-medium">@{profile.username}</span>
              </div>

              {isEditing ? (
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  placeholder="Tell us about yourself..."
                  className="w-full text-white/80 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4 focus:border-white/40 focus:bg-white/10 outline-none resize-none transition-all duration-300"
                  rows={3}
                />
              ) : (
                <p className="text-white/80 text-lg mb-6 leading-relaxed">{profile.bio}</p>
              )}

              {/* Social Links */}
              <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2 lg:gap-4">
                {isEditing ? (
                  <div className="flex flex-wrap gap-2 lg:gap-4 w-full justify-center lg:justify-start">
                    <input
                      type="text"
                      placeholder="Twitter"
                      value={profile.socialLinks.twitter}
                      onChange={(e) => setProfile({
                        ...profile, 
                        socialLinks: {...profile.socialLinks, twitter: e.target.value}
                      })}
                      className="text-sm text-white/80 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 focus:border-white/40 focus:bg-white/10 outline-none transition-all duration-300 min-w-[120px] flex-1 max-w-[200px]"
                    />
                    <input
                      type="text"
                      placeholder="Instagram"
                      value={profile.socialLinks.instagram}
                      onChange={(e) => setProfile({
                        ...profile, 
                        socialLinks: {...profile.socialLinks, instagram: e.target.value}
                      })}
                      className="text-sm text-white/80 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 focus:border-white/40 focus:bg-white/10 outline-none transition-all duration-300 min-w-[120px] flex-1 max-w-[200px]"
                    />
                    <input
                      type="text"
                      placeholder="Website"
                      value={profile.socialLinks.website}
                      onChange={(e) => setProfile({
                        ...profile, 
                        socialLinks: {...profile.socialLinks, website: e.target.value}
                      })}
                      className="text-sm text-white/80 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 focus:border-white/40 focus:bg-white/10 outline-none transition-all duration-300 min-w-[120px] flex-1 max-w-[200px]"
                    />
                  </div>
                ) : (
                  <>
                    {profile.socialLinks.twitter && (
                      <a href={profile.socialLinks.twitter} className="text-blue-400 hover:text-blue-300">
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {profile.socialLinks.instagram && (
                      <a href={profile.socialLinks.instagram} className="text-pink-400 hover:text-pink-300">
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {profile.socialLinks.website && (
                      <a href={profile.socialLinks.website} className="text-green-400 hover:text-green-300">
                        <Globe className="w-5 h-5" />
                      </a>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons - Now inside the profile card */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-4">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 flex items-center gap-2 transform hover:scale-105 shadow-lg"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all duration-300 flex items-center gap-2 transform hover:scale-105"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300 flex items-center gap-2 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Generations */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-500 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{profile.stats.totalGenerations}</div>
                <div className="text-white/60 text-sm">Total</div>
              </div>
            </div>
            <div className="text-white/80 text-sm">Generations Created</div>
          </div>

          {/* Account Age */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-500 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {Math.floor((new Date().getTime() - new Date(profile.stats.accountCreated).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-white/60 text-sm">Days</div>
              </div>
            </div>
            <div className="text-white/80 text-sm">Account Age</div>
          </div>

          {/* Collections */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-500 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{profile.stats.collections}</div>
                <div className="text-white/60 text-sm">Collections</div>
              </div>
            </div>
            <div className="text-white/80 text-sm">Saved Collections</div>
          </div>

          {/* Last Active */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-500 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {Math.floor((new Date().getTime() - new Date(profile.stats.lastActive).getTime()) / (1000 * 60 * 60))}
                </div>
                <div className="text-white/60 text-sm">Hours</div>
              </div>
            </div>
            <div className="text-white/80 text-sm">Last Active</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-white/5 backdrop-blur-xl rounded-2xl p-2 border border-white/10 shadow-2xl">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium ${
              activeTab === 'profile' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium ${
              activeTab === 'gallery' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Camera className="w-4 h-4" />
            Gallery
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium ${
              activeTab === 'stats' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Stats
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium ${
              activeTab === 'settings' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
          {activeTab === 'profile' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Email</label>
                  <div className="text-white">{profile.email}</div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Member Since</label>
                  <div className="text-white">{new Date(profile.stats.accountCreated).toLocaleDateString()}</div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Last Active</label>
                  <div className="text-white">{new Date(profile.stats.lastActive).toLocaleDateString()}</div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Profile Visibility</label>
                  <div className="flex items-center gap-2">
                    {profile.preferences.publicProfile ? (
                      <Eye className="w-4 h-4 text-green-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-white">
                      {profile.preferences.publicProfile ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gallery' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">My Gallery</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={galleryFilter}
                    onChange={(e) => setGalleryFilter(e.target.value as any)}
                    className="bg-black bg-opacity-30 border border-white border-opacity-30 rounded-lg px-3 py-1 text-white text-sm"
                  >
                    <option value="all">All Items</option>
                    <option value="favorites">Favorites</option>
                  </select>
                  <button
                    onClick={() => setShowCreateCollection(true)}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                  >
                    New Collection
                  </button>
                </div>
              </div>

              {/* Collections */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-white mb-3">Collections</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {profile?.collections.map((collection) => (
                    <div key={collection.id} className="bg-black bg-opacity-30 rounded-lg p-4 border border-white border-opacity-20">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-white font-medium">{collection.name}</h5>
                        <div className="flex items-center gap-1">
                          {collection.isPublic ? (
                            <Eye className="w-4 h-4 text-green-400" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{collection.description}</p>
                      <div className="text-gray-400 text-xs">
                        {collection.itemCount} items • Created {new Date(collection.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gallery Items */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredGalleryItems.map((item) => (
                  <div key={item.id} className="relative group">
                    <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden">
                      {item.type === 'image' ? (
                        <img 
                          src={item.url} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video 
                          src={item.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      )}
                    </div>
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleFavorite(item.id)}
                          className={`p-2 rounded-full transition-colors ${
                            item.isFavorite 
                              ? 'bg-yellow-500 text-white' 
                              : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                          }`}
                        >
                          <Star className="w-4 h-4" />
                        </button>
                        {/* Removed public/private toggle - all items are private */}
                        <button className="p-2 rounded-full bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Item Info */}
                    <div className="mt-2">
                      <h5 className="text-white text-sm font-medium truncate">{item.title}</h5>
                      <p className="text-gray-400 text-xs truncate">{item.description}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-500 text-xs">{item.generationModel}</span>
                        <span className="text-gray-500 text-xs">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredGalleryItems.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">No items found</div>
                  <div className="text-gray-500 text-sm">Try adjusting your filter or generate some content!</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Usage Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black bg-opacity-30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-white mb-2">{profile.stats.totalGenerations}</div>
                  <div className="text-gray-300">Total Generations</div>
                </div>
                <div className="bg-black bg-opacity-30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-white mb-2">{profile.stats.favoriteGenerations}</div>
                  <div className="text-gray-300">Favorites</div>
                </div>
                <div className="bg-black bg-opacity-30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-white mb-2">12</div>
                  <div className="text-gray-300">Collections</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Settings</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-white mb-3">Generation Preferences</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Default Model</label>
                      <select className="w-full bg-black bg-opacity-30 border border-white border-opacity-30 rounded-lg px-3 py-2 text-white">
                        <option value="runway-t2i">Runway T2I</option>
                        <option value="nano-banana">Nano Banana</option>
                        <option value="endframe">EndFrame</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Default Style</label>
                      <select className="w-full bg-black bg-opacity-30 border border-white border-opacity-30 rounded-lg px-3 py-2 text-white">
                        <option value="anime">Anime</option>
                        <option value="manga">Manga</option>
                        <option value="smurfs">Smurfs</option>
                        <option value="care-bears">Care Bears</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-3">Notifications</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        className="rounded" 
                        checked={profile.preferences.notifications}
                        onChange={(e) => setProfile({
                          ...profile,
                          preferences: { ...profile.preferences, notifications: e.target.checked }
                        })}
                      />
                      <span className="text-gray-300">Email notifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        className="rounded" 
                        checked={profile.preferences.toastyNotifications}
                        onChange={(e) => setProfile({
                          ...profile,
                          preferences: { ...profile.preferences, toastyNotifications: e.target.checked }
                        })}
                      />
                      <span className="text-gray-300">🥖 Toasty sound for generation completions</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-3">Privacy</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        className="rounded" 
                        checked={profile.preferences.publicProfile}
                        onChange={(e) => setProfile({
                          ...profile,
                          preferences: { ...profile.preferences, publicProfile: e.target.checked }
                        })}
                      />
                      <span className="text-gray-300">Make profile public</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-3">Favorite Presets</h4>
                  <div className="space-y-2">
                    {profile.favoritePresets.map((preset, index) => (
                      <div key={index} className="flex items-center justify-between bg-black bg-opacity-30 rounded-lg p-2">
                        <span className="text-gray-300 capitalize">{preset.replace('-', ' ')}</span>
                        <button 
                          onClick={() => setProfile({
                            ...profile,
                            favoritePresets: profile.favoritePresets.filter((_, i) => i !== index)
                          })}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="text-gray-400 text-sm">Add presets from the main app to see them here</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-3">Data Management</h4>
                  <div className="space-y-2">
                    <button 
                      onClick={handleExportData}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export My Data
                    </button>
                    <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Collection Modal */}
      {showCreateCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-white border-opacity-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Create Collection</h3>
              <button
                onClick={() => setShowCreateCollection(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Collection Name</label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Enter collection name..."
                  className="w-full bg-black bg-opacity-30 border border-white border-opacity-30 rounded-lg px-3 py-2 text-white focus:border-opacity-60 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Description (Optional)</label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="Describe your collection..."
                  className="w-full bg-black bg-opacity-30 border border-white border-opacity-30 rounded-lg px-3 py-2 text-white focus:border-opacity-60 outline-none resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateCollection}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Create Collection
                </button>
                <button
                  onClick={() => setShowCreateCollection(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
