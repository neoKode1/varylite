'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, Download, Loader2, RotateCcw, Camera, Sparkles, Images, X, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit } from 'lucide-react';
import type { UploadedFile, UploadedImage, ProcessingState, CharacterVariation, RunwayVideoRequest, RunwayVideoResponse, RunwayTaskResponse } from '@/types/gemini';

// Ko-fi widget types
declare global {
  interface Window {
    kofiWidgetOverlay: {
      draw: (username: string, options: {
        type: string;
        'floating-chat.donateButton.text': string;
        'floating-chat.donateButton.background-color': string;
        'floating-chat.donateButton.text-color': string;
      }) => void;
    };
  }
}

// Configuration: Set to false to disable video-to-video functionality
const ENABLE_VIDEO_FEATURES = true;

const BASIC_PROMPTS = [
  'Show this character from the side profile',
  'Display this character from behind',
  'Show this character at a 3/4 angle',
  'Generate this character in an action pose',
  'Show this character from a low angle view',
  'Display this character from above looking down'
];

const EXTENDED_PROMPTS = [
  // Close-up shots
  'Close-up shot of this character',
  'Extreme close-up of this character\'s face',
  'Macro shot focusing on character details',
  
  // Angle variations
  'Low angle shot looking up at this character',
  'High angle shot looking down at this character',
  'Dutch angle (tilted) shot of this character',
  'Bird\'s eye view of this character from above',
  'Worm\'s eye view of this character from below',
  
  // Distance variations
  'Extreme wide shot of this character',
  'Wide shot showing full body of this character',
  'Medium shot of this character (waist up)',
  'Medium close-up of this character (chest up)',
  'Over-the-shoulder view of this character',
  
  // Dynamic angles
  'Three-quarter back view of this character',
  'Profile silhouette of this character',
  'Dramatic side lighting on this character',
  'Character from a diagonal perspective',
  'Upward angle emphasizing character height',
  
  // Artistic perspectives
  'Cinematic wide angle of this character',
  'Portrait style shot of this character',
  'Environmental shot with character in scene',
  'Dynamic action angle of this character',
  'Heroic upward angle of this character',
  'Intimate close perspective of this character',
  
  // Professional lighting setups
  'Character with Rembrandt lighting',
  'Character with rim lighting effect',
  'Character with dramatic chiaroscuro lighting',
  'Character with golden hour lighting',
  'Character with neon accent lighting',
  'Character with three-point lighting setup',
  'Character with high-key lighting',
  'Character with low-key dramatic lighting',
  'Character with split lighting (half lit)',
  'Character with butterfly lighting',
  'Character with back lighting silhouette',
  'Character with mood lighting atmosphere',
  
  // Cinematic styling elements
  'Character with cinematic depth of field',
  'Character with motion blur effect',
  'Character with color grading treatment',
  'Character with atmospheric effects',
  'Character with film grain texture',
  'Character with vintage color palette',
  'Character with high contrast lighting',
  'Character with soft focus effect',
  'Character with bokeh background',
  'Character with lens flare effects',
  'Character with vignetting',
  'Character with warm color temperature',
  'Character with cool color temperature',
  'Character with dramatic shadows',
  
  // Dynamic poses and composition
  'Character in heroic stance pose',
  'Character in relaxed natural posture',
  'Character with intense focused expression',
  'Character in graceful movement pose',
  'Character with commanding presence',
  'Character in intimate moment pose',
  'Character in epic dramatic pose',
  'Character in natural candid moment',
  'Character as striking silhouette',
  'Character in confident stride pose',
  'Character with thoughtful expression',
  'Character in power pose stance'
];

// Background removal and switching prompts
const BACKGROUND_PROMPTS = [
  // Background removal
  'Remove the background completely, transparent background',
  'Remove background, clean transparent background',
  'Remove all background elements, transparent background',
  'Remove background, keep only the character',
  'Remove background, create transparent background',
  'Remove background, isolate character on transparent background',
  'Remove background, clean cutout with transparent background',
  'Remove background, professional transparent background',
  
  // Background replacement - Studio/Professional
  'Change background to professional studio backdrop',
  'Change background to clean white studio background',
  'Change background to neutral gray studio background',
  'Change background to professional photography backdrop',
  'Change background to seamless studio background',
  'Change background to clean gradient background',
  'Change background to solid color background',
  'Change background to minimalist background',
  
  // Background replacement - Natural/Outdoor
  'Change background to natural outdoor setting',
  'Change background to forest environment',
  'Change background to beach scene',
  'Change background to mountain landscape',
  'Change background to city skyline',
  'Change background to park setting',
  'Change background to garden environment',
  'Change background to sunset landscape',
  'Change background to ocean view',
  'Change background to countryside setting',
  
  // Background replacement - Indoor/Architectural
  'Change background to modern office interior',
  'Change background to luxury home interior',
  'Change background to contemporary living room',
  'Change background to elegant bedroom',
  'Change background to modern kitchen',
  'Change background to library setting',
  'Change background to art gallery',
  'Change background to hotel lobby',
  'Change background to restaurant interior',
  'Change background to modern architecture',
  
  // Background replacement - Creative/Artistic
  'Change background to abstract artistic background',
  'Change background to geometric pattern background',
  'Change background to colorful gradient background',
  'Change background to artistic texture background',
  'Change background to creative digital background',
  'Change background to fantasy environment',
  'Change background to sci-fi setting',
  'Change background to dreamy atmosphere',
  'Change background to artistic illustration background',
  'Change background to creative concept background',
  
  // Background replacement - Themed
  'Change background to winter scene',
  'Change background to autumn forest',
  'Change background to spring garden',
  'Change background to summer beach',
  'Change background to night cityscape',
  'Change background to rainy day scene',
  'Change background to snowy landscape',
  'Change background to desert scene',
  'Change background to tropical paradise',
  'Change background to urban street scene'
];

// Video-specific prompts organized by movie genres
const VIDEO_PROMPTS = {
  // Action & Adventure
  action: [
    'Change the background to a mountain scenic area with dramatic peaks',
    'Change the background to a desert wasteland with sand dunes',
    'Change the background to a dense jungle with ancient ruins',
    'Change the background to a futuristic city skyline at night',
    'Change the background to a volcanic landscape with lava flows',
    'Change the background to a snow-covered mountain range',
    'Change the background to a post-apocalyptic wasteland',
    'Change the background to a high-tech military base',
    'Change the background to a tropical island paradise',
    'Change the background to a space station orbiting Earth',
    'Change the scene to a high-speed car chase',
    'Change the scene to a rooftop chase sequence',
    'Change the scene to a underwater exploration mission',
    'Change the scene to a helicopter rescue operation',
    'Change the scene to a secret agent infiltration',
    'Change the props to include weapons and tactical gear',
    'Change the props to include survival equipment',
    'Change the props to include high-tech gadgets',
    'Change the props to include military vehicles',
    'Change the props to include adventure gear'
  ],
  
  // Fantasy & Magic
  fantasy: [
    'Change the background to a mystical forest with glowing trees',
    'Change the background to a magical castle in the clouds',
    'Change the background to an enchanted garden with floating islands',
    'Change the background to a crystal cave with magical formations',
    'Change the background to a dragon\'s lair with treasure hoards',
    'Change the background to a wizard\'s tower reaching the stars',
    'Change the background to a fairy realm with sparkling waterfalls',
    'Change the background to an ancient temple with mystical energy',
    'Change the background to a magical academy with floating books',
    'Change the background to a realm of eternal twilight',
    'Change the scene to a magical duel between wizards',
    'Change the scene to a quest through enchanted lands',
    'Change the scene to a summoning ritual in a sacred circle',
    'Change the scene to a flight on a magical creature',
    'Change the scene to a battle against dark forces',
    'Change the props to include magical staffs and wands',
    'Change the props to include enchanted armor and weapons',
    'Change the props to include mystical artifacts and crystals',
    'Change the props to include spell books and potions',
    'Change the props to include magical creatures and familiars'
  ],
  
  // Sci-Fi & Futuristic
  scifi: [
    'Change the background to a space station with Earth in view',
    'Change the background to an alien planet with two moons',
    'Change the background to a cyberpunk city with neon lights',
    'Change the background to a laboratory with advanced technology',
    'Change the background to a spaceship interior with holographic displays',
    'Change the background to a Mars colony with red dust storms',
    'Change the background to a virtual reality simulation',
    'Change the background to a time travel laboratory',
    'Change the background to an underwater research facility',
    'Change the background to a space elevator reaching the stars',
    'Change the scene to a space battle with laser weapons',
    'Change the scene to a time travel experiment',
    'Change the scene to an alien first contact meeting',
    'Change the scene to a cybernetic enhancement procedure',
    'Change the scene to a virtual reality adventure',
    'Change the props to include futuristic weapons and gadgets',
    'Change the props to include space suits and helmets',
    'Change the props to include holographic interfaces',
    'Change the props to include robotic companions',
    'Change the props to include advanced medical equipment'
  ],
  
  // Horror & Thriller
  horror: [
    'Change the background to a haunted mansion with creaking floors',
    'Change the background to a dark forest with twisted trees',
    'Change the background to an abandoned asylum with flickering lights',
    'Change the background to a graveyard with fog and moonlight',
    'Change the background to a cave system with mysterious sounds',
    'Change the background to a Victorian house with secret passages',
    'Change the background to a laboratory with strange experiments',
    'Change the background to a shipwreck on a stormy coast',
    'Change the background to a carnival at night with eerie music',
    'Change the background to a hospital with flickering fluorescent lights',
    'Change the scene to a supernatural investigation',
    'Change the scene to a escape from a haunted location',
    'Change the scene to a confrontation with dark forces',
    'Change the scene to a ritual in a candlelit room',
    'Change the scene to a chase through dark corridors',
    'Change the props to include occult symbols and artifacts',
    'Change the props to include vintage cameras and recording equipment',
    'Change the props to include ancient books and scrolls',
    'Change the props to include mysterious potions and herbs',
    'Change the props to include protective amulets and talismans'
  ],
  
  // Romance & Drama
  romance: [
    'Change the background to a Parisian café with warm lighting',
    'Change the background to a beach at sunset with gentle waves',
    'Change the background to a garden with blooming roses',
    'Change the background to a cozy library with fireplace',
    'Change the background to a vineyard with rolling hills',
    'Change the background to a mountain cabin with snow outside',
    'Change the background to a art gallery with soft lighting',
    'Change the background to a rooftop terrace with city lights',
    'Change the background to a lakeside dock with morning mist',
    'Change the background to a ballroom with chandeliers',
    'Change the scene to a romantic dinner for two',
    'Change the scene to a dance under the stars',
    'Change the scene to a proposal in a beautiful location',
    'Change the scene to a wedding ceremony in a garden',
    'Change the scene to a reunion after years apart',
    'Change the props to include flowers and candles',
    'Change the props to include vintage jewelry and accessories',
    'Change the props to include elegant clothing and formal wear',
    'Change the props to include musical instruments',
    'Change the props to include love letters and photographs'
  ],
  
  // Comedy & Fun
  comedy: [
    'Change the background to a circus tent with colorful decorations',
    'Change the background to a amusement park with rides',
    'Change the background to a candy store with sweet treats',
    'Change the background to a toy factory with playful machines',
    'Change the background to a beach party with music and dancing',
    'Change the background to a karaoke bar with neon signs',
    'Change the background to a bowling alley with retro vibes',
    'Change the background to a arcade with classic games',
    'Change the background to a pet shop with adorable animals',
    'Change the background to a ice cream parlor with vintage decor',
    'Change the scene to a hilarious misunderstanding',
    'Change the scene to a comedy show performance',
    'Change the scene to a prank gone wrong',
    'Change the scene to a dance-off competition',
    'Change the scene to a cooking disaster in the kitchen',
    'Change the props to include silly costumes and wigs',
    'Change the props to include funny hats and accessories',
    'Change the props to include oversized objects',
    'Change the props to include colorful balloons and confetti',
    'Change the props to include musical instruments for comedy'
  ],
  
  // Nature & Adventure
  nature: [
    'Change the background to underwater with coral reefs',
    'Change the background to a tropical rainforest with exotic birds',
    'Change the background to a savanna with wildlife',
    'Change the background to a arctic tundra with northern lights',
    'Change the background to a desert oasis with palm trees',
    'Change the background to a mountain lake with crystal clear water',
    'Change the background to a bamboo forest with gentle breeze',
    'Change the background to a flower field with butterflies',
    'Change the background to a waterfall with rainbow mist',
    'Change the background to a starry night sky with constellations',
    'Change the scene to a wildlife photography expedition',
    'Change the scene to a camping adventure in the wilderness',
    'Change the scene to a hiking trail through mountains',
    'Change the scene to a kayaking trip down a river',
    'Change the scene to a bird watching expedition',
    'Change the props to include camping gear and equipment',
    'Change the props to include photography equipment',
    'Change the props to include hiking boots and backpacks',
    'Change the props to include binoculars and field guides',
    'Change the props to include nature journals and sketchbooks'
  ]
};

interface StoredVariation extends CharacterVariation {
  timestamp: number;
  originalPrompt: string;
  originalImagePreview?: string;
  videoUrl?: string; // For Runway video editing results
  fileType?: 'image' | 'video'; // Track if this is an image or video result
}

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentStep: ''
  });
  const [variations, setVariations] = useState<CharacterVariation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<StoredVariation[]>([]);
  const [showGallery, setShowGallery] = useState(true);
  const [showExtendedPrompts, setShowExtendedPrompts] = useState(false);
  const [showVideoPrompts, setShowVideoPrompts] = useState(false);
  const [showBackgroundPrompts, setShowBackgroundPrompts] = useState(false);
  const [selectedVideoGenre, setSelectedVideoGenre] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState<number>(0);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [runwayTaskId, setRunwayTaskId] = useState<string | null>(null);
  const [pollingTimeout, setPollingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [videoGenerationStartTime, setVideoGenerationStartTime] = useState<number | null>(null);
  const [estimatedVideoTime, setEstimatedVideoTime] = useState<number>(120); // Default 2 minutes for gen4_aleph
  const [processingAction, setProcessingAction] = useState<string | null>(null); // Track which specific action is processing
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null); // Track which slot is being dragged over

  // Show notification function
  const showNotification = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);


  // Check if we have video files
  const hasVideoFiles = uploadedFiles.some(file => file.fileType === 'video');
  const hasImageFiles = uploadedFiles.some(file => file.fileType === 'image');

  // Load gallery from localStorage on component mount
  useEffect(() => {
    const savedGallery = localStorage.getItem('varyai-gallery');
    if (savedGallery) {
      try {
        setGallery(JSON.parse(savedGallery));
      } catch (error) {
        console.error('Error loading gallery from localStorage:', error);
      }
    }
  }, []);

  // Update video generation progress in real-time
  useEffect(() => {
    if (!runwayTaskId || !videoGenerationStartTime) return;

    const interval = setInterval(() => {
      // Force re-render to update the progress bar
      setVideoGenerationStartTime(prev => prev);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [runwayTaskId, videoGenerationStartTime]);

  // Save gallery to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('varyai-gallery', JSON.stringify(gallery));
  }, [gallery]);

  // Add variations to gallery
  const addToGallery = useCallback((newVariations: CharacterVariation[], originalPrompt: string, originalImagePreview?: string) => {
    const timestamp = Date.now();
    const storedVariations: StoredVariation[] = newVariations.map(variation => ({
      ...variation,
      timestamp,
      originalPrompt,
      originalImagePreview
    }));
    
    setGallery(prev => [...storedVariations, ...prev]); // Add new items to the beginning
  }, []);

  // Clear gallery
  const clearGallery = useCallback(() => {
    setGallery([]);
    localStorage.removeItem('varyai-gallery');
  }, []);

  // Remove single item from gallery
  const removeFromGallery = useCallback((variationId: string, timestamp: number) => {
    setGallery(prev => prev.filter(item => !(item.id === variationId && item.timestamp === timestamp)));
  }, []);

  // Toggle prompt expansion
  const togglePromptExpansion = useCallback((itemKey: string) => {
    setExpandedPrompts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  }, []);

  // Get all gallery images with URLs for navigation
  const galleryImagesWithUrls = gallery.filter(item => item.imageUrl);

  // Handle full-screen image viewing
  const handleImageClick = useCallback((imageUrl: string) => {
    const index = galleryImagesWithUrls.findIndex(item => item.imageUrl === imageUrl);
    setFullScreenImage(imageUrl);
    setFullScreenImageIndex(index >= 0 ? index : 0);
  }, [galleryImagesWithUrls]);

  const closeFullScreen = useCallback(() => {
    setFullScreenImage(null);
  }, []);

  // Navigation functions for full-screen gallery
  const navigateFullScreen = useCallback((direction: 'prev' | 'next') => {
    if (galleryImagesWithUrls.length === 0) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = fullScreenImageIndex > 0 ? fullScreenImageIndex - 1 : galleryImagesWithUrls.length - 1;
    } else {
      newIndex = fullScreenImageIndex < galleryImagesWithUrls.length - 1 ? fullScreenImageIndex + 1 : 0;
    }
    
    setFullScreenImageIndex(newIndex);
    setFullScreenImage(galleryImagesWithUrls[newIndex].imageUrl!);
  }, [galleryImagesWithUrls, fullScreenImageIndex]);

  const goToPrevious = useCallback(() => navigateFullScreen('prev'), [navigateFullScreen]);
  const goToNext = useCallback(() => navigateFullScreen('next'), [navigateFullScreen]);

  // Handle keyboard navigation for full-screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullScreenImage) return;
      
      switch (e.key) {
        case 'Escape':
          closeFullScreen();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
      }
    };

    if (fullScreenImage) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [fullScreenImage, closeFullScreen, goToPrevious, goToNext]);

  // Initialize Ko-fi widget
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      // Initialize the Ko-fi widget
      if (window.kofiWidgetOverlay) {
        window.kofiWidgetOverlay.draw('varyai', {
          'type': 'floating-chat',
          'floating-chat.donateButton.text': 'Support me',
          'floating-chat.donateButton.background-color': '#8b5cf6', // Purple to match your theme
          'floating-chat.donateButton.text-color': '#fff'
        });
      }
    };

    return () => {
      // Cleanup script on unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Convert image URL to base64
  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix
          resolve(base64.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error('Failed to convert image URL to base64');
    }
  };

  // Handle editing an existing image (inject into next available input slot)
  const handleEditImage = async (imageUrl: string, originalPrompt?: string) => {
    const actionId = `edit-${Date.now()}`;
    setProcessingAction(actionId);
    
    try {
      console.log('🎨 Editing image:', imageUrl);
      
      // Check if we already have 4 images (max slots)
      if (uploadedFiles.length >= 4) {
        showNotification('Maximum of 4 images allowed. Please remove an image first.', 'error');
        return;
      }
      
      // Convert the image URL to base64
      const base64Image = await urlToBase64(imageUrl);
      
      // Create a new uploaded file object
      const newFile: UploadedFile = {
        file: new File([], `edit-image-${Date.now()}.jpg`, { type: 'image/jpeg' }),
        preview: imageUrl,
        base64: base64Image,
        type: 'reference',
        fileType: 'image'
      };
      
      // Add to existing files (don't replace)
      setUploadedFiles(prev => [...prev, newFile]);
      
      // Set the prompt if available and no existing prompt
      if (originalPrompt && !prompt) {
        setPrompt(originalPrompt);
      }
      
      // Show notification
      showNotification(`🎨 Image added to slot ${uploadedFiles.length + 1}! You can add up to 4 images total.`, 'success');
      
      // Scroll to the input area
      setTimeout(() => {
        const inputArea = document.querySelector('[data-input-area]');
        if (inputArea) {
          inputArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
    } catch (error) {
      console.error('Error loading image for editing:', error);
      setError('Failed to load image for editing');
    } finally {
      setProcessingAction(null);
    }
  };


  // Handle varying an existing generated image
  const handleVaryImage = async (imageUrl: string, originalPrompt?: string) => {
    const actionId = `vary-${Date.now()}`;
    setProcessingAction(actionId);
    
    console.log('🎨 handleVaryImage called with:', { imageUrl, originalPrompt });
    
    if (processing.isProcessing) {
      console.log('⚠️ Already processing, skipping...');
      setError('Already processing. Please wait...');
      setProcessingAction(null);
      return;
    }

    try {
      console.log('🔄 Starting image variation process...');
      setError(null);
      setVariations([]);
      setProcessing({
        isProcessing: true,
        progress: 10,
        currentStep: 'Converting image...'
      });

      // Convert the image URL to base64
      console.log('🔄 Converting image URL to base64...');
      const base64Image = await urlToBase64(imageUrl);
      console.log('✅ Base64 conversion complete, length:', base64Image.length);
      
      setProcessing({
        isProcessing: true,
        progress: 30,
        currentStep: 'Processing with Gemini AI...'
      });

      // Use the original prompt or a default variation prompt
      const varyPrompt = originalPrompt || prompt.trim() || 'Generate 4 new variations of this character from different angles';
      console.log('📝 Using prompt:', varyPrompt);

      console.log('🔄 Making API call to /api/vary-character...');
      const response = await fetch('/api/vary-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [base64Image],
          prompt: varyPrompt
        }),
      });

      console.log('📡 API response status:', response.status);
      setProcessing(prev => ({ ...prev, progress: 70, currentStep: 'Generating variations...' }));

      const data = await response.json();
      console.log('📊 API response data:', data);

      if (!response.ok) {
        console.error('❌ API error:', data);
        throw new Error(data.error || 'Failed to generate variations');
      }

      const newVariations = data.variations || [];
      console.log('🎨 Received variations:', newVariations.length, newVariations);
      setVariations(newVariations);
      
      // Add to gallery
      if (newVariations.length > 0) {
        console.log('📸 Adding to gallery with addToGallery function...');
        addToGallery(newVariations, varyPrompt, imageUrl);
      } else {
        console.warn('⚠️ No variations received from API');
      }
      
      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 100,
          currentStep: 'Complete!'
        });
      }, 500);

    } catch (error) {
      console.error('❌ Error varying image:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      setError(error instanceof Error ? error.message : 'Failed to vary image');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleFileUpload = useCallback((files: File[]) => {
    console.log('📤 handleFileUpload called with files:', files.length, files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      // Check if video features are disabled
      if (isVideo && !ENABLE_VIDEO_FEATURES) {
        setError('Video-to-video editing is temporarily disabled. Please upload image files only.');
        return false;
      }
      
      if (!isImage && !isVideo) {
        setError('Please upload valid image files (JPG, PNG) or video files (MP4, MOV)');
        return false;
      }
      
      // Different size limits for images vs videos
      const maxSize = isImage ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB for images, 100MB for videos
      if (file.size > maxSize) {
        setError(`${isImage ? 'Image' : 'Video'} size must be less than ${isImage ? '10MB' : '100MB'}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setError(null);
    const newFiles: UploadedFile[] = [];
    let processedCount = 0;
    
    validFiles.forEach((file) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const preview = URL.createObjectURL(file);
        const fileType = file.type.startsWith('image/') ? 'image' : 'video';
        
        newFiles.push({
          file,
          preview,
          base64: base64.split(',')[1], // Remove data:...;base64, prefix
          type: 'reference', // Default type
          fileType
        });
        
        processedCount++;
        // Update state when all files are processed
        if (processedCount === validFiles.length) {
          setUploadedFiles(prev => [...prev, ...newFiles]);
          
          // Show model selection notification
          const hasImages = newFiles.some(file => file.fileType === 'image');
          const hasVideos = newFiles.some(file => file.fileType === 'video');
          
          if (hasImages && !hasVideos) {
            showNotification('🎨 Nano Banana model selected for character variations', 'info');
          } else if (hasVideos && !hasImages) {
            showNotification('🎬 Aleph model selected for video-to-video editing', 'info');
          } else if (hasImages && hasVideos) {
            showNotification('⚠️ Please upload either images OR videos, not both', 'error');
          }
        }
      };
      
      reader.readAsDataURL(file);
    });
  }, [showNotification]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 Drop event triggered');
    const files = Array.from(e.dataTransfer.files);
    console.log('📁 Files dropped:', files.length, files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔄 Drag over event triggered');
  }, []);

  // Handle dropping files into a specific slot
  const handleSlotDrop = useCallback((e: React.DragEvent<HTMLDivElement>, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);
    
    console.log(`🎯 Drop event triggered for slot ${slotIndex}`);
    const files = Array.from(e.dataTransfer.files);
    console.log('📁 Files dropped:', files.length, files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    if (files.length > 0) {
      // Take only the first file for the specific slot
      const file = files[0];
      // We'll call handleFileUploadToSlot directly here to avoid circular dependency
      console.log(`📤 Uploading file to slot ${slotIndex}:`, file.name);
      
      // Validate file
      const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
      if (file.size > maxSize) {
        showNotification(`File too large. Max size: ${maxSize / (1024 * 1024)}MB`, 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const preview = URL.createObjectURL(file);
        const fileType = file.type.startsWith('image/') ? 'image' : 'video';
        
        const newFile: UploadedFile = {
          file,
          preview,
          base64: base64.split(',')[1],
          type: 'reference',
          fileType
        };
        
        setUploadedFiles(prev => {
          const newFiles = [...prev];
          if (slotIndex >= newFiles.length) {
            newFiles.push(newFile);
          } else {
            newFiles[slotIndex] = newFile;
          }
          return newFiles;
        });
        
        showNotification(`📁 File added to slot ${slotIndex + 1}`, 'success');
      };
      
      reader.readAsDataURL(file);
    }
  }, [showNotification]);

  // Handle dragging over a specific slot
  const handleSlotDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(slotIndex);
  }, []);

  // Handle leaving a specific slot
  const handleSlotDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);
  }, []);

  // Handle uploading a file to a specific slot
  const handleFileUploadToSlot = useCallback((file: File, slotIndex: number) => {
    console.log(`📤 Uploading file to slot ${slotIndex}:`, file.name);
    
    // Validate file
    const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB for images, 100MB for videos
    if (file.size > maxSize) {
      showNotification(`File too large. Max size: ${maxSize / (1024 * 1024)}MB`, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const preview = URL.createObjectURL(file);
      const fileType = file.type.startsWith('image/') ? 'image' : 'video';
      
      const newFile: UploadedFile = {
        file,
        preview,
        base64: base64.split(',')[1], // Remove data:...;base64, prefix
        type: 'reference',
        fileType
      };
      
      // Update the specific slot
      setUploadedFiles(prev => {
        const newFiles = [...prev];
        // If slot doesn't exist, add to the end
        if (slotIndex >= newFiles.length) {
          newFiles.push(newFile);
        } else {
          // Replace the existing file at that slot
          newFiles[slotIndex] = newFile;
        }
        return newFiles;
      });
      
      showNotification(`📁 File added to slot ${slotIndex + 1}`, 'success');
    };
    
    reader.readAsDataURL(file);
  }, [showNotification]);

  // Handle clipboard paste events
  const handlePaste = useCallback(async (e: ClipboardEvent, slotIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('📋 Paste event triggered', slotIndex ? `for slot ${slotIndex}` : 'for main area');
    
    try {
      // Check if clipboard API is available
      if (!e.clipboardData) {
        console.warn('📋 Clipboard data not available');
        showNotification('Clipboard access not available. Please use drag & drop or file upload.', 'error');
        return;
      }
      
      const items = e.clipboardData.items;
      if (!items || items.length === 0) {
        console.warn('📋 No items in clipboard');
        showNotification('No items found in clipboard', 'error');
        return;
      }
      
      console.log('📋 Clipboard items:', Array.from(items).map(item => ({ type: item.type, kind: item.kind })));
      
      const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
      
      if (imageItems.length === 0) {
        console.warn('📋 No image items in clipboard');
        showNotification('No image found in clipboard. Please copy an image first.', 'error');
        return;
      }
      
      // Take the first image from clipboard
      const imageItem = imageItems[0];
      console.log('📋 Processing image item:', imageItem.type, imageItem.kind);
      
      const file = imageItem.getAsFile();
      
      if (!file) {
        console.error('📋 Could not extract file from clipboard item');
        showNotification('Could not extract image from clipboard. Please try copying the image again.', 'error');
        return;
      }
      
      console.log('📋 Successfully extracted image from clipboard:', file.name, file.type, file.size);
      
      if (slotIndex !== undefined) {
        // Paste to specific slot
        handleFileUploadToSlot(file, slotIndex);
      } else {
        // Paste to main area (add to existing files)
        handleFileUpload([file]);
      }
      
      showNotification('📋 Image pasted successfully!', 'success');
      
    } catch (error) {
      console.error('📋 Error handling paste event:', error);
      showNotification('Failed to paste image. Please try drag & drop or file upload instead.', 'error');
    }
  }, [handleFileUpload, handleFileUploadToSlot, showNotification]);

  // Handle slot-specific paste
  const handleSlotPaste = useCallback((e: ClipboardEvent, slotIndex: number) => {
    handlePaste(e, slotIndex);
  }, [handlePaste]);

  // Global paste event listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      try {
        // Only handle paste if we're focused on the input area or no specific element is focused
        const activeElement = document.activeElement;
        const isInputArea = activeElement?.closest('[data-input-area]') || 
                           activeElement?.closest('[data-slot-area]') ||
                           !activeElement || 
                           activeElement === document.body;
        
        if (isInputArea) {
          console.log('📋 Global paste event detected in input area');
          handlePaste(e);
        } else {
          console.log('📋 Global paste event detected outside input area, ignoring');
        }
      } catch (error) {
        console.error('📋 Error in global paste handler:', error);
      }
    };

    // Check if paste events are supported
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('paste', handleGlobalPaste);
      console.log('📋 Global paste event listener registered');
    } else {
      console.warn('📋 Paste events not supported in this environment');
    }

    return () => {
      if (typeof document.removeEventListener === 'function') {
        document.removeEventListener('paste', handleGlobalPaste);
        console.log('📋 Global paste event listener removed');
      }
    };
  }, [handlePaste]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 File input change triggered');
    const files = e.target.files;
    console.log('📁 Files selected:', files ? files.length : 0, files ? Array.from(files).map(f => ({ name: f.name, type: f.type, size: f.size })) : []);
    
    if (files && files.length > 0) {
      handleFileUpload(Array.from(files));
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  }, [handleFileUpload]);

  const handleProcessCharacter = async () => {
    if (uploadedFiles.length === 0 || !prompt.trim()) {
      setError('Please upload at least one file and enter a variation prompt');
      return;
    }

    setError(null);
    setVariations([]);
    
    // Detect file types to determine which API to use
    const hasImages = uploadedFiles.some(file => file.fileType === 'image');
    const hasVideos = uploadedFiles.some(file => file.fileType === 'video');
    
    if (hasImages && hasVideos) {
      const errorMsg = 'Please upload either images OR videos, not both. Images go to character variation, videos go to video editing.';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
      return;
    }
    
    if (hasVideos && ENABLE_VIDEO_FEATURES) {
      // Route to Runway video editing API
      await handleRunwayVideoEditing();
    } else if (hasVideos && !ENABLE_VIDEO_FEATURES) {
      setError('Video-to-video editing is temporarily disabled. Please upload image files only.');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
      return;
    } else {
      // Route to existing character variation API
      await handleCharacterVariation();
    }
  };

  const handleCharacterVariation = async () => {
    setProcessing({
      isProcessing: true,
      progress: 20,
      currentStep: 'Analyzing character...'
    });

    try {
      setProcessing(prev => ({ ...prev, progress: 40, currentStep: 'Processing with Gemini AI...' }));
      
      const response = await fetch('/api/vary-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: uploadedFiles.map(img => img.base64),
          prompt: prompt.trim()
        }),
      });

      setProcessing(prev => ({ ...prev, progress: 70, currentStep: 'Generating variations...' }));

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to process character variations');
      }

      setProcessing(prev => ({ ...prev, progress: 100, currentStep: 'Complete!' }));
      const newVariations = data.variations || [];
      setVariations(newVariations);
      
      // Add to gallery
      if (newVariations.length > 0) {
        addToGallery(newVariations, prompt.trim(), uploadedFiles[0]?.preview);
        showNotification('🎨 Character variations generated successfully!', 'success');
      }
      
      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  const handleRunwayVideoEditing = async () => {
    setProcessing({
      isProcessing: true,
      progress: 20,
      currentStep: 'Preparing video for editing...'
    });

    try {
      setProcessing(prev => ({ ...prev, progress: 40, currentStep: 'Sending to Runway for video editing...' }));
      
      // Determine the appropriate model based on file types
      const hasImages = uploadedFiles.some(file => file.fileType === 'image');
      const hasVideos = uploadedFiles.some(file => file.fileType === 'video');
      
      let model: 'gen4_turbo' | 'gen3a_turbo' | 'gen4_aleph' | 'gen4_image' | 'gen4_image_turbo' | 'upscale_v1' | 'act_two';
      
      if (hasImages) {
        model = 'gen4_turbo'; // Image to video editing
      } else if (hasVideos) {
        model = 'gen4_aleph'; // Video to video editing with gen4_aleph
      } else {
        throw new Error('No valid files for video editing');
      }

      const requestBody: RunwayVideoRequest = {
        files: uploadedFiles.map(file => file.base64),
        prompt: prompt.trim(),
        model,
        ratio: '1280:720', // Default ratio for gen4_aleph
        duration: 10, // Default duration for image-to-video
        promptText: prompt.trim()
      };

      const response = await fetch('/api/runway-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      setProcessing(prev => ({ ...prev, progress: 70, currentStep: 'Video editing task created...' }));

      const data: RunwayVideoResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create video editing task');
      }

      setRunwayTaskId(data.taskId || null);
      setProcessing(prev => ({ ...prev, progress: 100, currentStep: 'Video editing task started!' }));

      // Start polling for task completion
      if (data.taskId) {
        console.log(`🚀 Starting polling for task: ${data.taskId}`);
        
        // Set start time and estimated duration based on model
        const startTime = Date.now();
        setVideoGenerationStartTime(startTime);
        
        // Set estimated time based on model (in seconds) - updated based on web research
        const estimatedTime = model === 'gen4_aleph' ? 300 : 120; // 5 minutes for aleph (complex), 2 minutes for turbo
        setEstimatedVideoTime(estimatedTime);
        
        console.log(`⏱️ Video generation started at ${new Date(startTime).toLocaleTimeString()}, estimated time: ${estimatedTime}s`);
        
        pollRunwayTask(data.taskId);
      } else {
        console.log('❌ No task ID received from Runway API');
      }
      
      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }, 2000);

    } catch (error) {
      console.error('Error with Runway video editing:', error);
      setError(error instanceof Error ? error.message : 'Failed to process video editing');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  const pollRunwayTask = async (taskId: string) => {
    // Check if we should stop polling
    if (!taskId || !runwayTaskId) {
      console.log('🛑 Polling stopped - no active task ID');
      return;
    }
    
    console.log(`🔄 Polling Runway task: ${taskId}`);
    try {
      const response = await fetch(`/api/runway-video?taskId=${taskId}`);
      const data = await response.json();
      
      console.log(`📊 Polling response:`, data);

      if (data.success && data.task) {
        const task: RunwayTaskResponse = data.task;
        console.log(`📋 Task status: ${task.status}`);
        
        if (task.status === 'SUCCEEDED' && task.output && Array.isArray(task.output) && task.output.length > 0) {
          // Video editing completed successfully
          const videoUrl = task.output[0]; // Get first video from array
          console.log('✅ Video editing completed:', videoUrl);
          console.log('🛑 Stopping polling - task completed successfully');
          
          // Calculate actual generation time
          if (videoGenerationStartTime) {
            const actualTime = Math.round((Date.now() - videoGenerationStartTime) / 1000);
            console.log(`⏱️ Video generation completed in ${actualTime}s (estimated: ${estimatedVideoTime}s)`);
          }
          
          // Add the video to gallery
          const videoVariation: StoredVariation = {
            id: `runway-video-${task.id}`,
            description: `Video editing result: ${prompt}`,
            angle: 'Video Edit',
            pose: 'Generated Video',
            videoUrl: videoUrl,
            fileType: 'video',
            timestamp: Date.now(),
            originalPrompt: prompt
          };
          
          console.log('🎬 Adding video to gallery:', videoVariation);
          console.log('🎬 Video URL:', videoUrl);
          setGallery(prev => {
            const newGallery = [videoVariation, ...prev];
            console.log('🎬 Updated gallery:', newGallery);
            return newGallery;
          });
          setError(null);
          showNotification('🎬 Video editing completed successfully!', 'success');
          
          // Clear the task ID and stop polling
          setRunwayTaskId(null);
          setVideoGenerationStartTime(null);
          if (pollingTimeout) {
            clearTimeout(pollingTimeout);
            setPollingTimeout(null);
          }
        } else if (task.status === 'FAILED') {
          console.log('❌ Video editing failed:', task.error);
          setError('Video editing failed: ' + (task.error || 'Unknown error'));
          
          // Clear timing on failure
          setVideoGenerationStartTime(null);
        } else if (task.status === 'PENDING' || task.status === 'RUNNING' || task.status === 'THROTTLED') {
          // Continue polling for these statuses
          const elapsed = Math.round((Date.now() - (videoGenerationStartTime || Date.now())) / 1000);
          console.log(`⏳ Task still processing (${task.status}) - ${elapsed}s elapsed, polling again in 5 seconds...`);
          
          // Check if task has been stuck in PENDING for too long (more than 2 minutes)
          if (task.status === 'PENDING' && elapsed > 120) {
            console.warn(`⚠️ Task has been PENDING for ${elapsed}s - this may indicate server load issues`);
            setError(`Task is taking longer than expected to start (${elapsed}s). This could be due to high server load. Please be patient or try again later.`);
          }
          
          // Update progress based on elapsed time
          if (videoGenerationStartTime) {
            const progressPercent = Math.min(90, (elapsed / estimatedVideoTime) * 100);
            setProcessing(prev => ({
              ...prev,
              progress: progressPercent,
              currentStep: `Video processing... (${task.status.toLowerCase()}) - ${elapsed}s elapsed`
            }));
          }
          
          const timeout = setTimeout(() => pollRunwayTask(taskId), 5000); // Poll every 5 seconds
          setPollingTimeout(timeout);
        } else {
          console.log(`⚠️ Unknown task status: ${task.status}`);
          // For unknown statuses, continue polling
          const timeout = setTimeout(() => pollRunwayTask(taskId), 5000);
          setPollingTimeout(timeout);
        }
      }
    } catch (error) {
      console.error('Error polling Runway task:', error);
      setError('Failed to check video editing status');
    }
  };

  const handleDownloadVariation = async (variation: CharacterVariation) => {
    if (variation.imageUrl) {
      // Download the generated image
      try {
        const response = await fetch(variation.imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `character-${variation.angle.toLowerCase().replace(/\s+/g, '-')}-${variation.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download image:', error);
        // Fallback to description download
        downloadDescription();
      }
    } else {
      downloadDescription();
    }

    function downloadDescription() {
      // Create a downloadable text file with the variation description
      const blob = new Blob([variation.description], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `character-variation-${variation.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadVideo = async (videoUrl: string, originalPrompt: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-edit-${originalPrompt.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading video:', error);
      setError('Failed to download video');
    }
  };

  const handleReset = () => {
    setUploadedFiles([]);
    setPrompt('');
    setVariations([]);
    setError(null);
    setProcessing({
      isProcessing: false,
      progress: 0,
      currentStep: ''
    });
    
    // Stop any ongoing polling
    if (pollingTimeout) {
      clearTimeout(pollingTimeout);
      setPollingTimeout(null);
    }
    setRunwayTaskId(null);
    setVideoGenerationStartTime(null);
    setProcessingAction(null);
  };

  return (
    <div className="min-h-screen relative">
      {/* Semi-transparent overlay for content readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      
      {/* Custom Notification Toast */}
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
      
      <div className="relative z-10 flex flex-col lg:flex-row">
        {/* Main Content */}
        <div className={`transition-all duration-300 ${showGallery ? 'w-full lg:w-2/3' : 'w-full'}`}>
          <div className="container mx-auto px-4 py-8">
        {/* Funding Message - Above Header */}
        <div className="mb-4 bg-gray-900 bg-opacity-95 backdrop-blur-sm rounded-lg p-3 border border-gray-700 border-opacity-50">
          <div className="text-center">
            <p className="text-gray-300 text-sm font-medium">
              💜 Love this tool? Support development and help create more amazing AI tools!
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8 lg:mb-16 bg-black bg-opacity-40 backdrop-blur-sm rounded-lg p-4 lg:p-6 border border-white border-opacity-20">
          <h1 className="text-2xl lg:text-4xl font-bold text-white">
            vARY<span className="text-gray-400">ai</span>
          </h1>
          <button
            onClick={() => setShowGallery(!showGallery)}
            className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-lg text-sm lg:text-base"
            title={showGallery ? 'Hide Gallery' : 'Show Gallery'}
          >
            <span className="hidden sm:inline">
              {showGallery ? 'Hide' : 'Show'} gallery
            </span>
            <span className="sm:hidden">
              {showGallery ? 'Hide' : 'Show'}
            </span>
          </button>
        </div>

        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="max-w-2xl w-full">
            {/* Description */}
            <div className="text-center mb-8 bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
              <p className="text-gray-300 text-lg">
                {ENABLE_VIDEO_FEATURES ? 'Upload images for character variations or videos for AI video-to-video editing.' : 'Upload images for character variations.'}
              </p>
            </div>

            {/* Main Input Area */}
            <div data-input-area>
            {uploadedFiles.length === 0 ? (
              <div
                className="border-2 border-white rounded-lg p-16 text-center hover:border-gray-300 transition-colors cursor-pointer bg-black bg-opacity-40 backdrop-blur-sm"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-input')?.click()}
                onPaste={(e) => handlePaste(e as any)}
                tabIndex={0}
              >
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-white mb-2">
                  Drag & drop your files here
                </p>
                <p className="text-gray-400">
                  or click to browse files {ENABLE_VIDEO_FEATURES ? '(Images: JPG, PNG - max 10MB | Videos: MP4, MOV - max 100MB for video-to-video editing)' : '(Images: JPG, PNG - max 10MB)'}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  💡 Tip: You can also paste images from your clipboard (Ctrl+V) or drag & drop files
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept={ENABLE_VIDEO_FEATURES ? "image/*,video/*" : "image/*"}
                  multiple
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Multiple Files Preview */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
                  {uploadedFiles.map((file, index) => (
                    <div 
                      key={index} 
                      className={`relative transition-all duration-200 ${
                        dragOverSlot === index 
                          ? 'ring-4 ring-blue-500 ring-opacity-75 bg-blue-500 bg-opacity-20' 
                          : ''
                      }`}
                      onDrop={(e) => handleSlotDrop(e, index)}
                      onDragOver={(e) => handleSlotDragOver(e, index)}
                      onDragLeave={handleSlotDragLeave}
                      onPaste={(e) => handleSlotPaste(e as any, index)}
                      data-slot-area
                      tabIndex={0}
                    >
                      {file.fileType === 'image' ? (
                        <img
                          src={file.preview}
                          alt={`Character ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg shadow-lg"
                        />
                      ) : (
                        <video
                          src={file.preview}
                          className="w-full h-32 object-cover rounded-lg shadow-lg"
                          controls
                          muted
                        />
                      )}
                      <button
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {file.fileType.toUpperCase()} {index + 1}
                      </div>
                      {dragOverSlot === index && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-30 rounded-lg flex items-center justify-center">
                          <div className="text-white text-sm font-medium bg-blue-600 px-3 py-1 rounded">
                            Drop here
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Empty slots for drag and drop */}
                  {Array.from({ length: 4 - uploadedFiles.length }, (_, index) => {
                    const slotIndex = uploadedFiles.length + index;
                    return (
                      <div
                        key={`empty-${slotIndex}`}
                        className={`border-2 border-dashed border-white rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-gray-300 transition-all duration-200 ${
                          dragOverSlot === slotIndex 
                            ? 'ring-4 ring-blue-500 ring-opacity-75 bg-blue-500 bg-opacity-20 border-blue-500' 
                            : ''
                        }`}
                        onClick={() => document.getElementById('add-more-files-input')?.click()}
                        onDrop={(e) => handleSlotDrop(e, slotIndex)}
                        onDragOver={(e) => handleSlotDragOver(e, slotIndex)}
                        onDragLeave={handleSlotDragLeave}
                        onPaste={(e) => handleSlotPaste(e as any, slotIndex)}
                        data-slot-area
                        tabIndex={0}
                      >
                        <div className="text-center">
                          <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">Slot {slotIndex + 1}</p>
                          <p className="text-gray-500 text-xs">Drop, click, or paste</p>
                        </div>
                        {dragOverSlot === slotIndex && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-30 rounded-lg flex items-center justify-center">
                            <div className="text-white text-sm font-medium bg-blue-600 px-3 py-1 rounded">
                              Drop here
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Hidden file input for adding more files */}
                  <input
                    id="add-more-files-input"
                    type="file"
                    accept={ENABLE_VIDEO_FEATURES ? "image/*,video/*" : "image/*"}
                    multiple
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
                
                {/* Clear All Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setUploadedFiles([])}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Clear All Files
                  </button>
                </div>

                {/* Prompt Input */}
                <div className="space-y-4 bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={hasVideoFiles ? "Describe the scene changes, background modifications, or prop changes you want..." : "Describe the angle or pose variations you want..."}
                    className="w-full p-6 border-2 border-white rounded-lg bg-transparent text-white placeholder-gray-400 focus:outline-none focus:border-gray-300 resize-none text-lg"
                    rows={4}
                  />

                  <div className="space-y-4">
                    {/* Basic Prompts */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {BASIC_PROMPTS.map((example) => (
                        <button
                          key={example}
                          onClick={() => setPrompt(example)}
                          className="px-3 py-1 text-sm bg-white text-black rounded-full hover:bg-gray-100 transition-colors"
                        >
                          {example}
                        </button>
                      ))}
                    </div>

                    {/* More Button - Show different options based on file type */}
                    <div className="flex justify-center gap-2">
                      {hasVideoFiles ? (
                        <button
                          onClick={() => setShowVideoPrompts(!showVideoPrompts)}
                          className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors border border-purple-500"
                        >
                          {showVideoPrompts ? 'Hide Video Options' : 'Video Scene Options'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowExtendedPrompts(!showExtendedPrompts)}
                            className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors border border-gray-600"
                          >
                            {showExtendedPrompts ? 'Hide Shot Types' : 'More Shot Types'}
                          </button>
                          <button
                            onClick={() => setShowBackgroundPrompts(!showBackgroundPrompts)}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors border border-green-500"
                          >
                            {showBackgroundPrompts ? 'Hide Backgrounds' : 'Background Options'}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Extended Prompts */}
                    {showExtendedPrompts && (
                      <div className="mt-4 p-4 bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg border border-gray-600">
                        <h4 className="text-white text-sm font-medium mb-3 text-center">Professional Camera Angles & Shot Types</h4>
                        
                        {/* Close-up shots */}
                        <div className="mb-4">
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Close-up Shots</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(0, 3).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Angle variations */}
                        <div className="mb-4">
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Angle Variations</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(3, 8).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Distance variations */}
                        <div className="mb-4">
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Distance & Framing</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(8, 13).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dynamic angles */}
                        <div className="mb-4">
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Dynamic Perspectives</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(13, 18).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Artistic perspectives */}
                        <div className="mb-4">
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Artistic & Cinematic</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(18, 24).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Professional lighting setups */}
                        <div className="mb-4">
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Professional Lighting</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(24, 36).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full hover:bg-orange-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Cinematic styling elements */}
                        <div className="mb-4">
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Cinematic Styling</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(36, 50).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-pink-100 text-pink-800 rounded-full hover:bg-pink-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dynamic poses and composition */}
                        <div>
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Dynamic Poses & Composition</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(50).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full hover:bg-indigo-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Background Prompts */}
                    {showBackgroundPrompts && (
                      <div className="mt-4 p-4 bg-green-900 bg-opacity-90 backdrop-blur-sm rounded-lg border border-green-600">
                        <h4 className="text-white text-sm font-medium mb-3 text-center">🎨 Background Removal & Replacement Options</h4>
                        
                        {/* Background removal */}
                        <div className="mb-4">
                          <h5 className="text-green-300 text-xs font-medium mb-2">Background Removal</h5>
                          <div className="flex flex-wrap gap-2">
                            {BACKGROUND_PROMPTS.slice(0, 8).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Studio/Professional backgrounds */}
                        <div className="mb-4">
                          <h5 className="text-green-300 text-xs font-medium mb-2">Studio & Professional</h5>
                          <div className="flex flex-wrap gap-2">
                            {BACKGROUND_PROMPTS.slice(8, 16).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Natural/Outdoor backgrounds */}
                        <div className="mb-4">
                          <h5 className="text-green-300 text-xs font-medium mb-2">Natural & Outdoor</h5>
                          <div className="flex flex-wrap gap-2">
                            {BACKGROUND_PROMPTS.slice(16, 26).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Indoor/Architectural backgrounds */}
                        <div className="mb-4">
                          <h5 className="text-green-300 text-xs font-medium mb-2">Indoor & Architectural</h5>
                          <div className="flex flex-wrap gap-2">
                            {BACKGROUND_PROMPTS.slice(26, 36).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Creative/Artistic backgrounds */}
                        <div className="mb-4">
                          <h5 className="text-green-300 text-xs font-medium mb-2">Creative & Artistic</h5>
                          <div className="flex flex-wrap gap-2">
                            {BACKGROUND_PROMPTS.slice(36, 46).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-pink-100 text-pink-800 rounded-full hover:bg-pink-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Themed backgrounds */}
                        <div>
                          <h5 className="text-green-300 text-xs font-medium mb-2">Themed Backgrounds</h5>
                          <div className="flex flex-wrap gap-2">
                            {BACKGROUND_PROMPTS.slice(46).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Video Prompts - Only show when video files are detected */}
                    {hasVideoFiles && showVideoPrompts && (
                      <div className="mt-4 p-4 bg-purple-900 bg-opacity-90 backdrop-blur-sm rounded-lg border border-purple-600">
                        <h4 className="text-white text-sm font-medium mb-3 text-center">🎬 Video Scene & Background Options</h4>
                        
                        {/* Genre Selection */}
                        <div className="mb-4">
                          <h5 className="text-purple-300 text-xs font-medium mb-2">Choose Movie Genre:</h5>
                          <div className="flex flex-wrap gap-2">
                            {Object.keys(VIDEO_PROMPTS).map((genre) => (
                              <button
                                key={genre}
                                onClick={() => setSelectedVideoGenre(selectedVideoGenre === genre ? null : genre)}
                                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                  selectedVideoGenre === genre
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-purple-200 text-purple-800 hover:bg-purple-300'
                                }`}
                              >
                                {genre.charAt(0).toUpperCase() + genre.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Genre-specific prompts */}
                        {selectedVideoGenre && VIDEO_PROMPTS[selectedVideoGenre as keyof typeof VIDEO_PROMPTS] && (
                          <div className="space-y-3">
                            <h5 className="text-purple-300 text-xs font-medium">
                              {selectedVideoGenre.charAt(0).toUpperCase() + selectedVideoGenre.slice(1)} Scene Options:
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {VIDEO_PROMPTS[selectedVideoGenre as keyof typeof VIDEO_PROMPTS].map((prompt) => (
                                <button
                                  key={prompt}
                                  onClick={() => setPrompt(prompt)}
                                  className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quick background changes */}
                        {!selectedVideoGenre && (
                          <div className="space-y-3">
                            <h5 className="text-purple-300 text-xs font-medium">Quick Background Changes:</h5>
                            <div className="flex flex-wrap gap-2">
                              {[
                                'Change the background to a mountain scenic area',
                                'Change the background to underwater',
                                'Change the background to a circus',
                                'Change the background to a cave',
                                'Change the background to the islands',
                                'Change the background to a futuristic city',
                                'Change the background to a magical forest',
                                'Change the background to a space station'
                              ].map((prompt) => (
                                <button
                                  key={prompt}
                                  onClick={() => setPrompt(prompt)}
                                  className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleProcessCharacter}
                      disabled={processing.isProcessing || !prompt.trim()}
                      className="px-8 py-4 bg-white text-black rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                      {processing.isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {processing.currentStep}
                        </>
                      ) : (
                        "Process Files"
                      )}
                    </button>
                  </div>

                  {processing.isProcessing && (
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full transition-all duration-500"
                        style={{ width: `${processing.progress}%` }}
                      ></div>
                    </div>
                  )}

                  {/* Video Generation Progress */}
                  {runwayTaskId && videoGenerationStartTime && (
                    <div className="mt-4 p-4 bg-black bg-opacity-40 backdrop-blur-sm rounded-lg border border-white border-opacity-20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                          <span className="text-white font-medium">Video Generation in Progress</span>
                        </div>
                        <span className="text-gray-300 text-sm">
                          {(() => {
                            const elapsed = Math.round((Date.now() - videoGenerationStartTime) / 1000);
                            const remaining = Math.max(0, estimatedVideoTime - elapsed);
                            return `${elapsed}s elapsed, ~${remaining}s remaining`;
                          })()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000"
                          style={{ 
                            width: `${Math.min(100, ((Date.now() - videoGenerationStartTime) / 1000 / estimatedVideoTime) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400 text-center">
                        Estimated time: {estimatedVideoTime}s • Model: {runwayTaskId ? 'Gen4 Aleph' : 'Unknown'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-red-900 bg-opacity-90 backdrop-blur-sm border border-red-700 rounded-lg p-4 mb-8">
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {variations.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 mt-12">
            <h2 className="text-2xl font-semibold mb-8 text-white text-center bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-4 border border-white border-opacity-20">Character Variations</h2>
            
            {/* Info message if no images are generated */}
            {variations.length > 0 && !variations.some(v => v.imageUrl) && (
              <div className="bg-blue-900 bg-opacity-90 backdrop-blur-sm border border-blue-700 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-300" />
                  <p className="text-blue-200 font-medium">Character descriptions generated!</p>
                </div>
                <p className="text-blue-300 text-sm mt-1">
                  Add your FAL_KEY to your .env.local file to generate actual character images.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {variations.map((variation) => (
                <div
                  key={variation.id}
                  className="border border-white rounded-lg p-6 hover:border-gray-300 transition-colors bg-black bg-opacity-40 backdrop-blur-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        {variation.angle}
                      </h3>
                      <p className="text-sm text-gray-400">{variation.pose}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => variation.imageUrl && handleVaryImage(variation.imageUrl, prompt)}
                        className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        disabled={!variation.imageUrl || processing.isProcessing}
                        title="Create new variations from this image"
                      >
                        <Sparkles className="w-4 h-4" />
                        Vary
                      </button>
                      <button
                        onClick={() => handleDownloadVariation(variation)}
                        className="flex items-center gap-1 px-3 py-1 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                        title="Download variation description"
                      >
                        <Download className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                  </div>
                  
                  {variation.imageUrl ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <img
                          src={variation.imageUrl}
                          alt={`${variation.angle} - ${variation.pose}`}
                          className="w-full h-48 object-cover rounded-lg shadow-md cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleImageClick(variation.imageUrl!)}
                        />
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-300 text-xs leading-relaxed">
                          {variation.description}
                        </p>
                        {variation.description.includes('blocked by content policy') && (
                          <div className="mt-2 p-2 bg-yellow-900 bg-opacity-50 rounded border border-yellow-600">
                            <p className="text-yellow-300 text-xs">
                              ⚠️ Image generation was restricted. Only text description available.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {variation.description}
                      </p>
                      {variation.description.includes('blocked by content policy') && (
                        <div className="mt-2 p-2 bg-yellow-900 bg-opacity-50 rounded border border-yellow-600">
                          <p className="text-yellow-300 text-xs">
                            ⚠️ Image generation was restricted. Only text description available.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
        </div>

        {/* Gallery Panel */}
        {showGallery && (
          <div className="w-full lg:w-1/3 bg-gray-800 bg-opacity-90 backdrop-blur-sm border-t lg:border-t-0 lg:border-l border-gray-700 h-screen lg:h-screen overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-2xl font-semibold flex items-center gap-2 text-white">
                  <Images className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  <span className="hidden sm:inline">Gallery</span>
                  <span className="sm:hidden">Gallery</span>
                  <span className="text-sm lg:text-base">({gallery.length})</span>
                </h2>
                <div className="flex gap-1 lg:gap-2">
                  <button
                    onClick={clearGallery}
                    className="flex items-center gap-1 px-2 lg:px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs lg:text-sm"
                    title="Clear all"
                  >
                    <Trash2 className="w-3 h-3 lg:w-4 lg:h-4" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                  <button
                    onClick={() => setShowGallery(false)}
                    className="flex items-center gap-1 px-2 lg:px-3 py-1 bg-white text-black rounded hover:bg-gray-100 transition-colors text-xs lg:text-sm"
                    title="Hide gallery"
                  >
                    <X className="w-3 h-3 lg:w-4 lg:h-4" />
                    <span className="hidden sm:inline">Hide</span>
                  </button>
                </div>
              </div>

              {gallery.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Images className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No variations yet</p>
                  <p className="text-sm">Generated character variations will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gallery.map((item) => {
                    const itemKey = `${item.id}-${item.timestamp}`;
                    const isExpanded = expandedPrompts.has(itemKey);
                    
                    // Debug logging for video items
                    if (item.fileType === 'video') {
                      console.log('🎬 Rendering video item:', item);
                      console.log('🎬 Video URL:', item.videoUrl);
                    }
                    
                    return (
                      <div
                        key={itemKey}
                        className="border border-gray-600 rounded-lg p-3 hover:shadow-md transition-shadow bg-gray-700 bg-opacity-80 backdrop-blur-sm"
                      >
                        {/* Header with title, timestamp, and remove button */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white text-sm truncate">
                              {item.angle}
                            </h3>
                            <p className="text-xs text-gray-400">
                              {new Date(item.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromGallery(item.id, item.timestamp)}
                            className="text-gray-400 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                            title="Remove from gallery"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                                                    {/* Image or Video */}
                            {item.imageUrl || item.videoUrl ? (
                              <div className="space-y-3">
                                {item.fileType === 'video' && item.videoUrl ? (
                                  <div>
                                    <video
                                      src={item.videoUrl}
                                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                      controls
                                      muted
                                      onClick={(e) => e.stopPropagation()}
                                      onError={(e) => {
                                        console.error('🎬 Video load error:', e);
                                        console.error('🎬 Video URL:', item.videoUrl);
                                      }}
                                      onLoadStart={() => console.log('🎬 Video loading started:', item.videoUrl)}
                                      onCanPlay={() => console.log('🎬 Video can play:', item.videoUrl)}
                                    />
                                    {/* Debug info for video */}
                                    <div className="text-xs text-gray-400 mt-1">
                                      Video URL: {item.videoUrl ? 'Present' : 'Missing'}
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={item.imageUrl}
                                    alt={`${item.angle} - ${item.pose}`}
                                    className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleImageClick(item.imageUrl!)}
                                  />
                                )}
                            
                            {/* Collapsible prompt section */}
                            <div className="space-y-2">
                              {/* Original prompt - always visible but compact */}
                              <div className="bg-gray-600 bg-opacity-50 rounded p-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-300 font-medium">
                                    Original Prompt:
                                  </p>
                                  <button
                                    onClick={() => togglePromptExpansion(itemKey)}
                                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 p-1 rounded touch-manipulation"
                                    title={isExpanded ? "Hide details" : "Show details"}
                                  >
                                    <span className="text-xs">
                                      {isExpanded ? "Hide" : "Show"}
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                                  &ldquo;{item.originalPrompt}&rdquo;
                                </p>
                              </div>

                              {/* Expanded details */}
                              {isExpanded && (
                                <div className="bg-gray-700 bg-opacity-80 backdrop-blur-sm rounded p-3 space-y-2">
                                  <div>
                                    <p className="text-xs text-gray-400 font-medium mb-1">AI Description:</p>
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                      {item.description}
                                    </p>
                                  </div>
                                  {item.description.includes('blocked by content policy') && (
                                    <div className="p-2 bg-yellow-900 bg-opacity-50 rounded border border-yellow-600">
                                      <p className="text-yellow-300 text-xs">
                                        ⚠️ Image generation was restricted
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2">
                              {item.fileType === 'video' ? (
                                <button
                                  onClick={() => handleDownloadVideo(item.videoUrl!, item.originalPrompt)}
                                  className="flex-1 flex items-center justify-center gap-1 px-3 py-3 bg-white text-black rounded hover:bg-gray-100 transition-colors text-sm font-medium touch-manipulation"
                                >
                                  <Download className="w-4 h-4" />
                                  Download Video
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditImage(item.imageUrl!, item.originalPrompt)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium touch-manipulation disabled:opacity-50"
                                    disabled={processingAction?.startsWith('edit') || processing.isProcessing}
                                  >
                                    {processingAction?.startsWith('edit') ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Edit className="w-4 h-4" />
                                    )}
                                    {processingAction?.startsWith('edit') ? 'Loading...' : 'Edit'}
                                  </button>
                                  <button
                                    onClick={() => handleVaryImage(item.imageUrl!, item.originalPrompt)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm font-medium touch-manipulation disabled:opacity-50"
                                    disabled={processingAction?.startsWith('vary') || processing.isProcessing}
                                  >
                                    {processingAction?.startsWith('vary') ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-4 h-4" />
                                    )}
                                    {processingAction?.startsWith('vary') ? 'Processing...' : 'Vary'}
                                  </button>
                                  <button
                                    onClick={() => handleDownloadVariation(item)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-3 bg-white text-black rounded hover:bg-gray-100 transition-colors text-sm font-medium touch-manipulation"
                                  >
                                    <Download className="w-4 h-4" />
                                    Download
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Text-only variation (no image) */
                          <div className="bg-gray-700 rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-400 font-medium">
                                Text Description:
                              </p>
                              <button
                                onClick={() => togglePromptExpansion(itemKey)}
                                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 p-1 rounded touch-manipulation"
                                title={isExpanded ? "Hide details" : "Show details"}
                              >
                                <span className="text-xs">
                                  {isExpanded ? "Hide" : "Show"}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                              {item.description}
                            </p>
                            {isExpanded && (
                              <div className="mt-2 pt-2 border-t border-gray-600">
                                <p className="text-xs text-gray-400 font-medium mb-1">Original Prompt:</p>
                                <p className="text-xs text-gray-300">
                                  &ldquo;{item.originalPrompt}&rdquo;
                                </p>
                              </div>
                            )}
                            {item.description.includes('blocked by content policy') && (
                              <div className="mt-2 p-2 bg-yellow-900 bg-opacity-50 rounded border border-yellow-600">
                                <p className="text-yellow-300 text-xs">
                                  ⚠️ Image generation was restricted
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Image Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={closeFullScreen}
        >
          <div className="relative w-[90%] h-[90%] flex items-center justify-center">
            <img
              src={fullScreenImage}
              alt="Full screen view"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
            />
            
            {/* Navigation Arrows */}
            {galleryImagesWithUrls.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-70 transition-colors"
                  title="Previous image (Left arrow)"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-70 transition-colors"
                  title="Next image (Right arrow)"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            {/* Close Button */}
            <button
              onClick={closeFullScreen}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-70 transition-colors"
              title="Close (Press Esc)"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image Info */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm">
              <div className="text-center">
                {galleryImagesWithUrls.length > 1 && (
                  <div className="mb-1">
                    {fullScreenImageIndex + 1} of {galleryImagesWithUrls.length}
                  </div>
                )}
                <div>
                  Click outside, press ESC to close{galleryImagesWithUrls.length > 1 ? ', or use arrow keys to navigate' : ''}
                </div>
              </div>
            </div>

            {/* Current Image Details */}
            {galleryImagesWithUrls[fullScreenImageIndex] && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm max-w-md">
                <div className="font-semibold">
                  {galleryImagesWithUrls[fullScreenImageIndex].angle}
                </div>
                <div className="text-gray-300 text-xs">
                  {galleryImagesWithUrls[fullScreenImageIndex].pose}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}