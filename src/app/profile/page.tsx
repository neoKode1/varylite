'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
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
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'gallery' | 'settings' | 'stats'>('profile');
  const [loading, setLoading] = useState(true);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'favorites' | 'public' | 'private'>('all');

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  // Mock profile data - replace with actual API call
  useEffect(() => {
    if (user) {
      // Simulate API call
      setTimeout(() => {
        setProfile({
          id: user.id,
          displayName: user.user_metadata?.full_name || 'VaryAI User',
          username: user.user_metadata?.username || 'varyai_user',
          email: user.email || '',
          bio: 'Creative AI enthusiast exploring the possibilities of character generation!',
          avatar: user.user_metadata?.avatar_url,
          socialLinks: {
            twitter: '',
            instagram: '',
            website: ''
          },
          preferences: {
            defaultModel: 'runway-t2i',
            defaultStyle: 'anime',
            notifications: true,
            publicProfile: true,
            toastyNotifications: true
          },
          stats: {
            totalGenerations: 47,
            favoriteGenerations: 12,
            accountCreated: '2024-01-15',
            lastActive: '2024-09-07',
            collections: 3
          },
          collections: [
            {
              id: '1',
              name: 'Anime Characters',
              description: 'My favorite anime-style character generations',
              isPublic: true,
              itemCount: 8,
              createdAt: '2024-08-15'
            },
            {
              id: '2',
              name: 'Smurfs Collection',
              description: 'Smurf-style character variations',
              isPublic: false,
              itemCount: 5,
              createdAt: '2024-08-20'
            },
            {
              id: '3',
              name: 'Video Experiments',
              description: 'EndFrame video generation tests',
              isPublic: true,
              itemCount: 3,
              createdAt: '2024-09-01'
            }
          ],
          favoritePresets: ['anime', 'smurfs', 'care-bears']
        });

        // Mock gallery items
        setGalleryItems([
          {
            id: '1',
            type: 'image',
            url: '/api/placeholder/400/400',
            title: 'Anime Warrior',
            description: 'Generated with anime style preset',
            isPublic: true,
            isFavorite: true,
            collectionId: '1',
            createdAt: '2024-09-06',
            generationModel: 'runway-t2i',
            prompt: 'Apply anime style to the character'
          },
          {
            id: '2',
            type: 'image',
            url: '/api/placeholder/400/400',
            title: 'Smurf Character',
            description: 'Blue smurf-style character',
            isPublic: false,
            isFavorite: false,
            collectionId: '2',
            createdAt: '2024-09-05',
            generationModel: 'nano-banana',
            prompt: 'Apply the Smurfs style to the character'
          },
          {
            id: '3',
            type: 'video',
            url: '/api/placeholder/400/400',
            title: 'Transformation Video',
            description: 'EndFrame video generation',
            isPublic: true,
            isFavorite: true,
            collectionId: '3',
            createdAt: '2024-09-04',
            generationModel: 'endframe',
            prompt: 'Character transformation'
          }
        ]);
        setLoading(false);
      }, 1000);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    // TODO: Implement API call to save profile
    console.log('Saving profile:', profile);
    setIsEditing(false);
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Implement avatar upload
      console.log('Uploading avatar:', file);
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

  const handleTogglePublic = (itemId: string) => {
    setGalleryItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, isPublic: !item.isPublic }
          : item
      )
    );
  };

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
    a.download = `varyai-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredGalleryItems = galleryItems.filter(item => {
    switch (galleryFilter) {
      case 'favorites':
        return item.isFavorite;
      case 'public':
        return item.isPublic;
      case 'private':
        return !item.isPublic;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black bg-opacity-30 backdrop-blur-sm border-b border-white border-opacity-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="text-white hover:text-gray-300 transition-colors"
            >
              ← Back to VaryAI
            </button>
            <h1 className="text-2xl font-bold text-white">Profile</h1>
            <div className="w-8"></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white border-opacity-20">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12" />
                )}
              </div>
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                  <Camera className="w-4 h-4" />
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
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                    className="text-2xl font-bold text-white bg-transparent border-b border-white border-opacity-30 focus:border-opacity-60 outline-none"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-white">{profile.displayName}</h2>
                )}
                <span className="text-gray-300">@{profile.username}</span>
              </div>

              {isEditing ? (
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  placeholder="Tell us about yourself..."
                  className="w-full text-gray-300 bg-transparent border border-white border-opacity-30 rounded-lg p-2 focus:border-opacity-60 outline-none resize-none"
                  rows={3}
                />
              ) : (
                <p className="text-gray-300 mb-4">{profile.bio}</p>
              )}

              {/* Social Links */}
              <div className="flex items-center gap-4">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      placeholder="Twitter"
                      value={profile.socialLinks.twitter}
                      onChange={(e) => setProfile({
                        ...profile, 
                        socialLinks: {...profile.socialLinks, twitter: e.target.value}
                      })}
                      className="text-sm text-gray-300 bg-transparent border border-white border-opacity-30 rounded px-2 py-1 focus:border-opacity-60 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Instagram"
                      value={profile.socialLinks.instagram}
                      onChange={(e) => setProfile({
                        ...profile, 
                        socialLinks: {...profile.socialLinks, instagram: e.target.value}
                      })}
                      className="text-sm text-gray-300 bg-transparent border border-white border-opacity-30 rounded px-2 py-1 focus:border-opacity-60 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Website"
                      value={profile.socialLinks.website}
                      onChange={(e) => setProfile({
                        ...profile, 
                        socialLinks: {...profile.socialLinks, website: e.target.value}
                      })}
                      className="text-sm text-gray-300 bg-transparent border border-white border-opacity-30 rounded px-2 py-1 focus:border-opacity-60 outline-none"
                    />
                  </>
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
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 mb-6 bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-1 border border-white border-opacity-20">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'profile' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'gallery' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            <Camera className="w-4 h-4" />
            Gallery
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'stats' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Stats
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'settings' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
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
                    <option value="public">Public</option>
                    <option value="private">Private</option>
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
                        <button
                          onClick={() => handleTogglePublic(item.id)}
                          className={`p-2 rounded-full transition-colors ${
                            item.isPublic 
                              ? 'bg-green-500 text-white' 
                              : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                          }`}
                        >
                          {item.isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
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
