'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  BarChart3,
  UserPlus,
  FolderPlus,
  Crown,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useUserGallery } from '@/hooks/useUserGallery';
import { AdminPromoModal } from '@/components/AdminPromoModal';

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
  collections: Array<{
    id: string;
    name: string;
    description: string;
    itemCount: number;
    isPublic: boolean;
  }>;
  favoritePresets: string[];
}

interface GalleryItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  fileType: 'image' | 'video';
  originalPrompt: string;
  createdAt: string;
  isFavorite: boolean;
  isPublic: boolean;
  collectionId?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { gallery, removeDuplicates } = useUserGallery(); // Use real gallery data
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'gallery' | 'settings' | 'stats' | 'admin'>('profile');
  const [loading, setLoading] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'favorites' | 'public'>('all');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Real user profile data
  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || '1',
    displayName: user?.user_metadata?.name || 'User',
    username: user?.email?.split('@')[0] || 'user',
    email: user?.email || 'user@example.com',
    bio: 'AI enthusiast and creative explorer',
    avatar: undefined,
    socialLinks: {
      twitter: '',
      instagram: '',
      website: ''
    },
    preferences: {
      defaultModel: 'runway-t2i',
      defaultStyle: 'realistic',
      notifications: true,
      publicProfile: false,
      toastyNotifications: true
    },
    stats: {
      totalGenerations: gallery.length,
      favoriteGenerations: 0,
      accountCreated: user?.created_at || '2024-01-15',
      lastActive: new Date().toISOString(),
      collections: 0
    },
    collections: [],
    favoritePresets: ['The Smurfs', 'Anime Style', 'Japanese Manga Style']
  });

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(prev => ({
          ...prev,
          displayName: data.profile.display_name || data.profile.name || prev.displayName,
          username: data.profile.username || prev.username,
          avatar: data.profile.profile_picture || prev.avatar,
          bio: data.profile.bio || prev.bio,
          socialLinks: {
            ...prev.socialLinks,
            ...data.profile.social_links
          },
          preferences: {
            ...prev.preferences,
            ...data.profile.preferences
          },
          stats: {
            ...prev.stats,
            totalGenerations: gallery.length,
            lastActive: new Date().toISOString()
          }
        }));
        
        // Set background image if available
        if (data.profile.background_image) {
          setBackgroundImage(data.profile.background_image);
        }
        
        // Check if user is admin
        setIsAdmin(user?.email === '1deeptechnology@gmail.com');
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  }, [gallery.length]);

  // Load real profile data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadProfileData();
      // Remove any duplicates from the gallery to prevent React key errors
      removeDuplicates();
    }
  }, [isOpen, user, loadProfileData, removeDuplicates]);

  // Convert real gallery data to ProfileModal format and ensure unique keys
  const galleryItems: GalleryItem[] = gallery.map((item, index) => ({
    id: `${item.id}-${item.timestamp}-${index}`, // Ensure unique keys by combining ID, timestamp, and index
    title: item.description || 'Generated Content',
    description: `${item.angle || 'Unknown'} - ${item.pose || 'Unknown'}`,
    imageUrl: item.imageUrl,
    videoUrl: item.videoUrl,
    fileType: item.fileType || (item.videoUrl ? 'video' : 'image'),
    originalPrompt: item.originalPrompt || 'No prompt available',
    createdAt: new Date(item.timestamp).toISOString(),
    isFavorite: false, // TODO: Add favorite functionality
    isPublic: false,   // TODO: Add public/private functionality
    collectionId: undefined
  }));

  const handleSaveProfile = async () => {
    if (!profile || !user) return;
    
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: profile.displayName,
          display_name: profile.displayName,
          username: profile.username,
          profile_picture: profile.avatar,
          bio: profile.bio,
          social_links: profile.socialLinks,
          preferences: profile.preferences
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      const data = await response.json();
      console.log('Profile saved successfully:', data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!profile || !user) return;
    
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferences: profile.preferences
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      console.log('Settings saved successfully:', data);
      
      // Update local profile state with the response
      if (data.profile) {
        setProfile(data.profile);
      }
      
      setSettingsChanged(false);
      setNotification({
        type: 'success',
        message: 'Settings saved successfully!'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setNotification({
        type: 'error',
        message: 'Failed to save settings. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-save settings with debounce
  useEffect(() => {
    if (settingsChanged) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save (2 seconds delay)
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSaveSettings();
      }, 2000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [settingsChanged, profile.preferences]);

  const handleBackgroundImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      console.log('Uploading background image:', file);

      // Validate file size (max 5MB for background images)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Background image size must be less than 5MB');
      }

      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);
      setBackgroundImage(previewUrl);

      // Compress and convert image to base64
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          // Set canvas size (max 1200x800 for background images)
          const maxWidth = 1200;
          const maxHeight = 800;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
          resolve(compressedDataUrl);
        };
        
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      console.log('Compressed background image size:', compressedBase64.length, 'characters');

      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Upload the background image via the profile API
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: profile.displayName,
          display_name: profile.displayName,
          username: profile.username,
          profile_picture: profile.avatar,
          background_image: compressedBase64, // Send compressed base64 data
          bio: profile.bio,
          social_links: profile.socialLinks,
          preferences: profile.preferences
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Background image upload failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        // Provide more specific error messages based on status code
        let errorMessage = 'Failed to upload background image';
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 413) {
          errorMessage = 'Background image is too large. Please use a smaller image.';
        } else if (response.status === 415) {
          errorMessage = 'Invalid file type. Please use a valid image file.';
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.details) {
          errorMessage = errorData.details;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Background image uploaded successfully:', data);

      // Show success notification
      setNotification({
        type: 'success',
        message: 'Background image uploaded successfully!'
      });

      setLoading(false);
    } catch (error) {
      console.error('Error uploading background image:', error);
      setLoading(false);
      
      // Show error notification
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload background image'
      });
      
      // Revert the preview on error
      setBackgroundImage(null);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    try {
      setLoading(true);
      console.log('Uploading avatar:', file);

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image size must be less than 2MB');
      }

      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);
      
      // Update the profile state immediately with the preview
      setProfile(prev => ({
        ...prev,
        avatar: previewUrl
      }));

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
          display_name: profile.displayName,
          username: profile.username,
          profile_picture: compressedBase64, // Send compressed base64 data
          bio: profile.bio,
          social_links: profile.socialLinks,
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
        
        // Provide more specific error messages based on status code
        let errorMessage = 'Failed to upload avatar';
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 413) {
          errorMessage = 'Image file is too large. Please use a smaller image.';
        } else if (response.status === 415) {
          errorMessage = 'Invalid file type. Please use a valid image file.';
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.details) {
          errorMessage = errorData.details;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Avatar uploaded successfully:', data);

      // Update with the actual URL from the server if provided
      if (data.profile.profile_picture) {
        setProfile(prev => ({
          ...prev,
          avatar: data.profile.profile_picture
        }));
      }

      // Show success notification
      setNotification({
        type: 'success',
        message: 'Avatar uploaded successfully!'
      });

      setLoading(false);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setLoading(false);
      
      // Show error notification
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload avatar'
      });
      
      // Revert the preview on error
      setProfile(prev => ({
        ...prev,
        avatar: profile.avatar // Revert to original
      }));
    }
  };

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      const newCollection = {
        id: Date.now().toString(),
        name: newCollectionName,
        description: newCollectionDescription,
        itemCount: 0,
        isPublic: false
      };
      setProfile(prev => ({
        ...prev,
        collections: [...prev.collections, newCollection]
      }));
      setNewCollectionName('');
      setNewCollectionDescription('');
      setShowCreateCollection(false);
    }
  };

  // Note: Favorite and public toggle functionality would need to be implemented
  // with database updates for the gallery items
  const handleToggleFavorite = (itemId: string) => {
    console.log('Toggle favorite for item:', itemId);
    // TODO: Implement favorite functionality with database updates
  };

  const handleTogglePublic = (itemId: string) => {
    console.log('Toggle public for item:', itemId);
    // TODO: Implement public/private functionality with database updates
  };

  const handleDownloadItem = async (item: any) => {
    try {
      const url = item.videoUrl || item.imageUrl;
      if (!url) {
        console.error('No URL found for item:', item);
        return;
      }

      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile, use direct download with better guidance
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        
        try {
          a.download = `vary-ai-${item.id}.${item.videoUrl ? 'mp4' : 'jpg'}`;
        } catch (e) {
          console.log('📱 Download attribute not supported');
        }
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        console.log('📱 Download started for mobile');
        
        // Show mobile-specific guidance
        setNotification({
          type: 'success',
          message: '📱 Download started! If it doesn\'t work, try long-pressing the image and selecting "Save to Photos".'
        });
      } else {
        // For desktop, use blob download
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `vary-ai-${item.id}.${item.videoUrl ? 'mp4' : 'jpg'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        
        console.log('🖥️ Download completed for desktop');
      }
      
    } catch (error) {
      console.error('❌ Error downloading item:', error);
      
      // Fallback: open in new tab
      const a = document.createElement('a');
      a.href = item.videoUrl || item.imageUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Extract the original variation ID from the composite key
      // The key format is: ${item.id}-${item.timestamp}-${index}
      const originalVariationId = itemId.split('-').slice(0, -2).join('-'); // Remove timestamp and index parts
      
      // Find the corresponding gallery item to get the database ID
      const galleryItem = gallery.find(item => item.id === originalVariationId);
      if (!galleryItem) {
        throw new Error('Item not found');
      }

      // Delete from database using the database ID
      const { error } = await supabase
        .from('galleries')
        .delete()
        .eq('id', galleryItem.databaseId)
        .eq('user_id', user.id);

      if (error) {
        throw new Error('Failed to delete item');
      }

      setNotification({
        type: 'success',
        message: 'Item deleted successfully!'
      });

      // Refresh gallery data
      // The useUserGallery hook should automatically refresh
    } catch (error) {
      console.error('Error deleting item:', error);
      setNotification({
        type: 'error',
        message: 'Failed to delete item. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedItems.length === 0) return;
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete ${selectedItems.length} item(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Extract database IDs from the composite keys
      const databaseIds: string[] = [];
      for (const itemId of selectedItems) {
        // Extract the original variation ID from the composite key
        const originalVariationId = itemId.split('-').slice(0, -2).join('-');
        
        // Find the corresponding gallery item to get the database ID
        const galleryItem = gallery.find(item => item.id === originalVariationId);
        if (galleryItem && galleryItem.databaseId) {
          databaseIds.push(galleryItem.databaseId);
        }
      }

      if (databaseIds.length === 0) {
        throw new Error('No valid items found to delete');
      }

      // Delete multiple items from database
      const { error } = await supabase
        .from('galleries')
        .delete()
        .in('id', databaseIds)
        .eq('user_id', user.id);

      if (error) {
        throw new Error('Failed to delete items');
      }

      setNotification({
        type: 'success',
        message: `${selectedItems.length} item(s) deleted successfully!`
      });

      // Clear selection and exit selection mode
      setSelectedItems([]);
      setIsSelectionMode(false);

      // Refresh gallery data
      // The useUserGallery hook should automatically refresh
    } catch (error) {
      console.error('Error deleting items:', error);
      setNotification({
        type: 'error',
        message: 'Failed to delete items. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleRedeemPromoCode = async () => {
    if (!promoCode.trim() || !user) return;

    try {
      setPromoLoading(true);
      setPromoMessage(null);

      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/promo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: promoCode.trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPromoMessage({
          type: 'success',
          text: `Success! You now have ${data.access_type} access. ${data.description || ''}`
        });
        setPromoCode('');
        setNotification({
          type: 'success',
          message: `Promo code redeemed successfully! You now have ${data.access_type} access.`
        });
      } else {
        setPromoMessage({
          type: 'error',
          text: data.error || 'Failed to redeem promo code'
        });
      }
    } catch (error) {
      console.error('Error redeeming promo code:', error);
      setPromoMessage({
        type: 'error',
        text: 'Failed to redeem promo code. Please try again.'
      });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleExportData = () => {
    const data = {
      profile,
      gallery: galleryItems,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vari-ai-profile-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredGalleryItems = galleryItems.filter(item => {
    switch (galleryFilter) {
      case 'favorites':
        return item.isFavorite;
      case 'public':
        return item.isPublic;
      default:
        return true;
    }
  });

  if (!isOpen) return null;

  return (
    <div className="mobile-modal-container bg-black bg-opacity-50">
      <div 
        className="mobile-modal-content bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl overflow-hidden relative"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'url(/Screenshot (2488).png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gray-900 bg-opacity-80 rounded-lg"></div>
        <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Profile</h2>
          <div className="flex items-center space-x-3">
            {/* Background Image Upload Button */}
            <label className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg cursor-pointer transition-colors">
              <Camera className="w-4 h-4" />
              <span className="text-sm">Background</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleBackgroundImageUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'gallery', label: 'Gallery', icon: Heart },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'stats', label: 'Stats', icon: BarChart3 },
            ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Crown }] : [])
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-2 cursor-pointer hover:bg-purple-700 transition-colors">
                    <Camera className="w-4 h-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{profile.displayName}</h3>
                  <p className="text-gray-400">@{profile.username}</p>
                  <p className="text-gray-400 text-sm">{profile.email}</p>
                </div>
              </div>

              {/* Profile Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                  ) : (
                    <p className="text-white">{profile.displayName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                  {isEditing ? (
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                  ) : (
                    <p className="text-white">{profile.bio}</p>
                  )}
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Social Links</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Twitter</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.socialLinks.twitter}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                        }))}
                        placeholder="@username"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                    ) : (
                      <p className="text-white">{profile.socialLinks.twitter || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Instagram</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.socialLinks.instagram}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                        }))}
                        placeholder="@username"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                    ) : (
                      <p className="text-white">{profile.socialLinks.instagram || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                    {isEditing ? (
                      <input
                        type="url"
                        value={profile.socialLinks.website}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          socialLinks: { ...prev.socialLinks, website: e.target.value }
                        }))}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                    ) : (
                      <p className="text-white">{profile.socialLinks.website || 'Not set'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'gallery' && (
            <div className="space-y-6">
              {/* Gallery Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold text-white">My Gallery</h3>
                  <div className="flex space-x-2">
                    {['all', 'favorites', 'public'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setGalleryFilter(filter as any)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          galleryFilter === filter
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isSelectionMode ? (
                    <>
                      {selectedItems.length > 0 && (
                        <button
                          onClick={handleBulkDelete}
                          disabled={loading}
                          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete ({selectedItems.length})</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setIsSelectionMode(false);
                          setSelectedItems([]);
                        }}
                        className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsSelectionMode(true)}
                        className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Select</span>
                      </button>
                      <button
                        onClick={() => setShowCreateCollection(true)}
                        className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <FolderPlus className="w-4 h-4" />
                        <span>New Collection</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Collections */}
              <div>
                <h4 className="text-md font-semibold text-white mb-3">Collections</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {profile.collections.map((collection) => (
                    <div key={collection.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-white">{collection.name}</h5>
                        <span className="text-xs text-gray-400">{collection.itemCount} items</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{collection.description}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          collection.isPublic ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                        }`}>
                          {collection.isPublic ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gallery Items */}
              <div>
                <h4 className="text-md font-semibold text-white mb-3">Recent Items</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredGalleryItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`gallery-item group relative ${isSelectionMode ? 'cursor-pointer' : ''}`}
                      style={{
                        width: '180px',
                        height: '180px',
                        filter: 'brightness(0.7)',
                        transition: 'all 0.4s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelectionMode) {
                          e.currentTarget.style.filter = 'brightness(1) drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))';
                          e.currentTarget.style.transform = 'translateY(-8px) scale(1.05)';
                          e.currentTarget.style.zIndex = '10';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelectionMode) {
                          e.currentTarget.style.filter = 'brightness(0.7)';
                          e.currentTarget.style.transform = 'translateY(0) scale(1)';
                          e.currentTarget.style.zIndex = '1';
                        }
                      }}
                    >
                      {isSelectionMode && (
                        <div className="absolute top-2 left-2 z-20">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                            className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                          />
                        </div>
                      )}
                      
                      {/* Content Preview */}
                      <div className="relative w-full h-full">
                        {item.fileType === 'video' ? (
                          <video 
                            src={item.videoUrl} 
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                          />
                        ) : (
                          <img 
                            src={item.imageUrl || '/api/placeholder/400/400'} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Profile gallery image failed to load:', item.imageUrl);
                              e.currentTarget.src = '/api/placeholder/400/400';
                            }}
                            onLoad={() => {
                              console.log('Profile gallery image loaded successfully:', item.imageUrl);
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Overlay Actions */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-[30px] flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleToggleFavorite(item.id)}
                            className={`p-2 rounded-full ${
                              item.isFavorite ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white hover:bg-yellow-400 hover:text-black'
                            } transition-colors`}
                            title="Toggle favorite"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleTogglePublic(item.id)}
                            className={`p-2 rounded-full ${
                              item.isPublic ? 'bg-green-400 text-black' : 'bg-white/20 text-white hover:bg-green-400 hover:text-black'
                            } transition-colors`}
                            title="Toggle public/private"
                          >
                            {item.isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDownloadItem(item)}
                            className="p-2 rounded-full bg-white/20 text-white hover:bg-blue-400 hover:text-black transition-colors"
                            title="Download item"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {!isSelectionMode && (
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 rounded-full bg-white/20 text-white hover:bg-red-400 hover:text-black transition-colors"
                              title="Delete item"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Description Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 rounded-b-[30px]">
                        <p className="text-white text-xs font-medium truncate">{item.title}</p>
                        <p className="text-white/70 text-xs truncate">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Generation Preferences */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Generation Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Default Model</label>
                    <select
                      value={profile.preferences.defaultModel}
                      onChange={(e) => {
                        setProfile(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, defaultModel: e.target.value }
                        }));
                        setSettingsChanged(true);
                      }}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="runway-t2i">Runway T2I</option>
                      <option value="nano-banana">Nano Banana</option>
                      <option value="minimax-endframe">Minimax Endframe</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Default Style</label>
                    <select
                      value={profile.preferences.defaultStyle}
                      onChange={(e) => {
                        setProfile(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, defaultStyle: e.target.value }
                        }));
                        setSettingsChanged(true);
                      }}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="realistic">Realistic</option>
                      <option value="anime">Anime</option>
                      <option value="cartoon">Cartoon</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white">Email Notifications</h4>
                      <p className="text-sm text-gray-400">Receive updates about new features</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.preferences.notifications}
                        onChange={(e) => {
                          setProfile(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, notifications: e.target.checked }
                          }));
                          setSettingsChanged(true);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white">Toasty Sound</h4>
                      <p className="text-sm text-gray-400">Play sound when generation completes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.preferences.toastyNotifications}
                        onChange={(e) => {
                          setProfile(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, toastyNotifications: e.target.checked }
                          }));
                          setSettingsChanged(true);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white">Public Profile</h4>
                      <p className="text-sm text-gray-400">Make your profile visible to others</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.preferences.publicProfile}
                        onChange={(e) => {
                          setProfile(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, publicProfile: e.target.checked }
                          }));
                          setSettingsChanged(true);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Save Settings Button - Bottom Right */}
              {settingsChanged && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              )}

              {/* Favorite Presets */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Favorite Presets</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.favoritePresets.map((preset) => (
                    <span key={preset} className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
                      {preset}
                    </span>
                  ))}
                </div>
              </div>

              {/* Promo Codes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Promo Codes</h3>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAdminModal(true)}
                      className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-3 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <Crown className="w-4 h-4" />
                      <span className="text-sm font-medium">Generate</span>
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Enter Promo Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter promo code..."
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRedeemPromoCode();
                          }
                        }}
                      />
                      <button
                        onClick={handleRedeemPromoCode}
                        disabled={!promoCode.trim() || promoLoading}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {promoLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Redeeming...
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4" />
                            Redeem
                          </>
                        )}
                      </button>
                    </div>
                    {promoMessage && (
                      <div className={`mt-2 text-sm ${
                        promoMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {promoMessage.text}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 font-medium text-sm">Admin Access</span>
                      </div>
                      <p className="text-white/80 text-xs">
                        You have admin privileges. Click &quot;Generate&quot; to create promo codes.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Management */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
                <div className="space-y-4">
                  <button
                    onClick={handleExportData}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Data</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>

              {/* Bottom Save Button - Right Corner */}
              {settingsChanged && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Saving...' : 'Save Settings'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Usage Statistics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-600 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{profile.stats.totalGenerations}</p>
                      <p className="text-sm text-gray-400">Total Generations</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-600 rounded-lg">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{profile.stats.favoriteGenerations}</p>
                      <p className="text-sm text-gray-400">Favorites</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-600 rounded-lg">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{new Date(profile.stats.accountCreated).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-400">Account Created</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{new Date(profile.stats.lastActive).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-400">Last Active</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Collections</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {profile.collections.map((collection) => (
                    <div key={collection.id} className="bg-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-white mb-2">{collection.name}</h5>
                      <p className="text-sm text-gray-400 mb-2">{collection.description}</p>
                      <p className="text-lg font-bold text-purple-400">{collection.itemCount} items</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-6">
              {/* Admin Dashboard Header */}
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/20 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <Crown className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold text-white">Admin Dashboard</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Process Weekly Payment */}
                  <button
                    onClick={() => window.open('/admin/weekly-payments', '_blank')}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white p-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/25 flex flex-col items-center gap-2"
                  >
                    <BarChart3 className="w-6 h-6" />
                    <span className="font-medium">Weekly Payments</span>
                    <span className="text-sm opacity-80">Process user payments</span>
                  </button>

                  {/* Credit Distribution */}
                  <button
                    onClick={() => window.open('/admin/credits', '_blank')}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white p-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 flex flex-col items-center gap-2"
                  >
                    <Sparkles className="w-6 h-6" />
                    <span className="font-medium">Credit Distribution</span>
                    <span className="text-sm opacity-80">Manage credit grants</span>
                  </button>

                  {/* Promo Code Generator */}
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 flex flex-col items-center gap-2"
                  >
                    <Star className="w-6 h-6" />
                    <span className="font-medium">Promo Codes</span>
                    <span className="text-sm opacity-80">Generate access codes</span>
                  </button>
                </div>
              </div>

              {/* Admin Promo Users Panel */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Promo Code Management</h4>
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-medium">Admin Access</span>
                  </div>
                  <p className="text-white/80 text-sm mb-4">
                    You have admin privileges. Use the buttons above to manage payments, credits, and promo codes.
                  </p>
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-medium">Generate Promo Code</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Collection Modal */}
        {showCreateCollection && (
          <div className="mobile-modal-container bg-black bg-opacity-50 mobile-z-dropdown">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">Create New Collection</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Collection Name</label>
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="Enter collection name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={newCollectionDescription}
                    onChange={(e) => setNewCollectionDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="Enter collection description"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={handleCreateCollection}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateCollection(false)}
                    className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
            <div className={`px-6 py-4 rounded-lg shadow-lg backdrop-blur-sm border max-w-sm ${
              notification.type === 'error' 
                ? 'bg-red-600 bg-opacity-90 border-red-500 text-white' 
                : notification.type === 'success'
                ? 'bg-green-600 bg-opacity-90 border-green-500 text-white'
                : 'bg-blue-600 bg-opacity-90 border-blue-500 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{notification.message}</p>
                <button
                  onClick={() => setNotification(null)}
                  className="ml-3 text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Admin Promo Code Generator Modal */}
      <AdminPromoModal 
        isOpen={showAdminModal} 
        onClose={() => setShowAdminModal(false)} 
      />
    </div>
  );
};
