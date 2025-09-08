'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, Download, Loader2, RotateCcw, Camera, Sparkles, Images, X, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit } from 'lucide-react';
import type { UploadedFile, UploadedImage, ProcessingState, CharacterVariation, RunwayVideoRequest, RunwayVideoResponse, RunwayTaskResponse, EndFrameRequest, EndFrameResponse } from '@/types/gemini';

// Generation mode types
type GenerationMode = 
  | 'nano-banana' 
  | 'runway-t2i' 
  | 'runway-video' 
  | 'endframe' 
  | 'veo3-fast' 
  | 'minimax-2.0'
  | 'kling-2.1-master'
  | 'seedance-pro'
  | 'veo3-fast-t2v'
  | 'minimax-2-t2v'
  | 'kling-2.1-master-t2v';
import AnimatedError from '@/components/AnimatedError';
import { useAnimatedError } from '@/hooks/useAnimatedError';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useUserGallery } from '@/hooks/useUserGallery';
import { Header } from '@/components/Header';
import { AuthModal } from '@/components/AuthModal';
import { UsageLimitBanner, UsageCounter } from '@/components/UsageLimitBanner';
import { UserCounter } from '@/components/UserCounter';

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
  'Change background to a surreal field of oversized potatoes - Potato Cult Filter',
  'Change background to a dreamlike landscape with giant potatoes - Potato Cult preset',
  
  // Halloween Horror Movie Themes
  'Change background to Camp Crystal Lake from Friday the 13th - Horror Movie Filter',
  'Change background to Elm Street neighborhood from Nightmare on Elm Street - Horror Movie preset',
  'Change background to Haddonfield from Halloween movie - Horror Movie Filter',
  'Change background to Amityville Horror house exterior - Horror Movie preset',
  'Change background to Overlook Hotel from The Shining - Horror Movie Filter',
  'Change background to Bates Motel from Psycho - Horror Movie preset',
  'Change background to Derry from IT - Horror Movie Filter',
  'Change background to Silent Hill foggy streets - Horror Movie preset',
  'Change background to haunted graveyard with fog - Horror Movie Filter',
  'Change background to abandoned asylum with flickering lights - Horror Movie preset',
  'Change background to cursed cabin in the woods - Horror Movie Filter',
  'Change background to Victorian haunted mansion - Horror Movie preset',
  
  // Thanksgiving Themes
  'Change background to cozy Thanksgiving dining room - Thanksgiving Filter',
  'Change background to autumn harvest table setting - Thanksgiving preset',
  'Change background to warm kitchen with turkey cooking - Thanksgiving Filter',
  'Change background to fall foliage and pumpkins - Thanksgiving preset',
  'Change background to family gathering around fireplace - Thanksgiving Filter',
  'Change background to rustic farmhouse dining - Thanksgiving preset',
  
  // Christmas Themes
  'Change background to snowy Christmas village - Christmas Filter',
  'Change background to cozy living room with Christmas tree - Christmas preset',
  'Change background to winter wonderland with snow - Christmas Filter',
  'Change background to festive holiday market - Christmas preset',
  'Change background to warm fireplace with stockings - Christmas Filter',
  'Change background to magical Christmas forest - Christmas preset',
  
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
  'Change background to urban street scene',
  
  // Style Transfer Options
  'Apply Ghibli anime style - Studio Ghibli magical colorful animation aesthetic',
  'Apply Van Gogh painting style - impressionist brushstrokes and vibrant colors',
  'Apply cinematic style similar to The Matrix - green-tinted digital rain atmosphere',
  'Apply green-tinted, high-contrast cinematic style - dramatic lighting and color grading',
  'Apply watercolor painting style - soft blended colors and artistic texture',
  'Apply oil painting style - rich textures and classical art aesthetic',
  'Apply cyberpunk neon style - electric colors and futuristic lighting',
  'Apply film noir style - high contrast black and white with dramatic shadows',
  'Apply vintage photography style - sepia tones and nostalgic atmosphere',
  'Apply digital art style - clean lines and modern graphic design aesthetic',
  'Apply charcoal sketch style - monochrome artistic drawing technique',
  'Apply pop art style - bold colors and graphic design elements',
  'Apply surrealist style - dreamlike and imaginative artistic approach',
  'Apply minimalist style - clean simple design with focus on essential elements',
  'Apply abstract expressionist style - bold colors and emotional artistic expression',
  'Apply photorealistic style - ultra-detailed realistic rendering',
  'Apply comic book style - bold outlines and vibrant comic art aesthetic',
  'Apply pencil sketch style - detailed hand-drawn artistic technique',
  'Apply pastel art style - soft muted colors and gentle artistic approach',
  'Apply graffiti art style - street art aesthetic with bold urban design',
  'Apply stained glass style - colorful translucent artistic effect',
  'Apply mosaic art style - fragmented colorful tile artistic pattern',
  'Apply origami paper style - folded paper geometric artistic aesthetic',
  'Apply holographic style - iridescent colors and futuristic shine effect',
  'Apply marble sculpture style - classical stone carving artistic texture',
  'Apply wood carving style - natural wood grain artistic texture',
  'Apply metal sculpture style - metallic reflective artistic surface',
  'Apply glass art style - transparent and translucent artistic effect',
  'Apply textile art style - fabric and woven material artistic texture',
  'Apply ceramic art style - glazed pottery artistic surface texture'
];

// Video-specific prompts organized by movie genres
// Character Style Presets for Restyle tab
const CHARACTER_STYLE_PROMPTS = [
  {
    name: 'The Smurfs',
    description: 'Small, blue, communal beings from the animated series, each with a distinct trait (e.g., Brainy, Clumsy).',
    prompt: 'Apply the Smurfs style to the character'
  },
  {
    name: 'The Care Bears',
    description: 'Colorful, emotional-themed bears from the 1980s franchise who spread caring and positivity.',
    prompt: 'Apply the Care Bears style to the character'
  },
  {
    name: 'The Gummi Bears',
    description: 'Magical, medieval bear characters from Disney\'s Adventures of the Gummi Bears, who bounce and solve problems.',
    prompt: 'Apply the Gummi Bears style to the character'
  },
  {
    name: 'The Muppets',
    description: 'Beloved puppet characters from Jim Henson\'s iconic franchise, known for their humor, heart, and distinctive felt puppet aesthetic.',
    prompt: 'Apply the Muppets style to the character'
  },
  {
    name: 'Anime Style',
    description: 'Japanese animation style with large expressive eyes, vibrant colors, and dynamic character designs.',
    prompt: 'Apply anime style to the character'
  },
  {
    name: 'Japanese Manga Style',
    description: 'Traditional Japanese comic book art style with detailed line work, dramatic expressions, and distinctive visual storytelling.',
    prompt: 'Apply Japanese manga style to the character'
  }
];

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
  
  // Halloween Horror Movies
  halloween: [
    'Change the background to Camp Crystal Lake from Friday the 13th - Horror Movie Filter',
    'Change the background to Elm Street neighborhood from Nightmare on Elm Street - Horror Movie preset',
    'Change the background to Haddonfield from Halloween movie - Horror Movie Filter',
    'Change the background to Amityville Horror house exterior - Horror Movie preset',
    'Change the background to Overlook Hotel from The Shining - Horror Movie Filter',
    'Change the background to Bates Motel from Psycho - Horror Movie preset',
    'Change the background to Derry from IT - Horror Movie Filter',
    'Change the background to Silent Hill foggy streets - Horror Movie preset',
    'Change the background to haunted graveyard with fog - Horror Movie Filter',
    'Change the background to abandoned asylum with flickering lights - Horror Movie preset',
    'Change the background to cursed cabin in the woods - Horror Movie Filter',
    'Change the background to Victorian haunted mansion - Horror Movie preset',
    'Change the scene to a slasher movie chase sequence',
    'Change the scene to a supernatural horror confrontation',
    'Change the scene to a haunted house investigation',
    'Change the scene to a horror movie climax',
    'Change the scene to a monster attack sequence',
    'Change the props to include horror movie weapons and tools',
    'Change the props to include supernatural artifacts',
    'Change the props to include horror movie costumes and masks'
  ],
  
  // Thanksgiving
  thanksgiving: [
    'Change the background to cozy Thanksgiving dining room - Thanksgiving Filter',
    'Change the background to autumn harvest table setting - Thanksgiving preset',
    'Change the background to warm kitchen with turkey cooking - Thanksgiving Filter',
    'Change the background to fall foliage and pumpkins - Thanksgiving preset',
    'Change the background to family gathering around fireplace - Thanksgiving Filter',
    'Change the background to rustic farmhouse dining - Thanksgiving preset',
    'Change the scene to a Thanksgiving dinner preparation',
    'Change the scene to a family gathering around the table',
    'Change the scene to a cozy autumn evening',
    'Change the scene to a harvest celebration',
    'Change the scene to a Thanksgiving parade',
    'Change the props to include Thanksgiving decorations',
    'Change the props to include autumn harvest items',
    'Change the props to include traditional Thanksgiving foods',
    'Change the props to include cozy fall clothing',
    'Change the props to include seasonal decorations'
  ],
  
  // Christmas
  christmas: [
    'Change the background to snowy Christmas village - Christmas Filter',
    'Change the background to cozy living room with Christmas tree - Christmas preset',
    'Change the background to winter wonderland with snow - Christmas Filter',
    'Change the background to festive holiday market - Christmas preset',
    'Change the background to warm fireplace with stockings - Christmas Filter',
    'Change the background to magical Christmas forest - Christmas preset',
    'Change the scene to a Christmas morning celebration',
    'Change the scene to a winter wonderland adventure',
    'Change the scene to a holiday party gathering',
    'Change the scene to a Christmas carol performance',
    'Change the scene to a magical Christmas journey',
    'Change the props to include Christmas decorations',
    'Change the props to include winter clothing and accessories',
    'Change the props to include holiday gifts and presents',
    'Change the props to include Christmas tree ornaments',
    'Change the props to include festive holiday items'
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
    'Change the background to a surreal field of oversized potatoes - Potato Cult Filter',
    'Change the background to a dreamlike landscape with giant potatoes - Potato Cult preset',
    
    // Halloween Horror Movie Themes
    'Change the background to Camp Crystal Lake from Friday the 13th - Horror Movie Filter',
    'Change the background to Elm Street neighborhood from Nightmare on Elm Street - Horror Movie preset',
    'Change the background to Haddonfield from Halloween movie - Horror Movie Filter',
    'Change the background to Amityville Horror house exterior - Horror Movie preset',
    'Change the background to Overlook Hotel from The Shining - Horror Movie Filter',
    'Change the background to Bates Motel from Psycho - Horror Movie preset',
    'Change the background to Derry from IT - Horror Movie Filter',
    'Change the background to Silent Hill foggy streets - Horror Movie preset',
    'Change the background to haunted graveyard with fog - Horror Movie Filter',
    'Change the background to abandoned asylum with flickering lights - Horror Movie preset',
    'Change the background to cursed cabin in the woods - Horror Movie Filter',
    'Change the background to Victorian haunted mansion - Horror Movie preset',
    
    // Thanksgiving Themes
    'Change the background to cozy Thanksgiving dining room - Thanksgiving Filter',
    'Change the background to autumn harvest table setting - Thanksgiving preset',
    'Change the background to warm kitchen with turkey cooking - Thanksgiving Filter',
    'Change the background to fall foliage and pumpkins - Thanksgiving preset',
    'Change the background to family gathering around fireplace - Thanksgiving Filter',
    'Change the background to rustic farmhouse dining - Thanksgiving preset',
    
    // Christmas Themes
    'Change the background to snowy Christmas village - Christmas Filter',
    'Change the background to cozy living room with Christmas tree - Christmas preset',
    'Change the background to winter wonderland with snow - Christmas Filter',
    'Change the background to festive holiday market - Christmas preset',
    'Change the background to warm fireplace with stockings - Christmas Filter',
    'Change the background to magical Christmas forest - Christmas preset',
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
  databaseId?: string; // Database primary key for deletion
}

export default function Home() {
  const { user } = useAuth();
  const { canGenerate, trackUsage, isAnonymous } = useUsageTracking();
  const { gallery, addToGallery, removeFromGallery, clearGallery, removeDuplicates, migrateLocalStorageToDatabase, saveToAccount } = useUserGallery();
  
  // Note: Automatic duplicate removal removed to prevent infinite loop
  // Use the "Fix Duplicates" button in development mode if needed
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentStep: ''
  });
  const [variations, setVariations] = useState<CharacterVariation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'images' | 'videos'>('all');
  
  // Authentication UI state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [showExtendedPrompts, setShowExtendedPrompts] = useState(false);
  const [showVideoPrompts, setShowVideoPrompts] = useState(false);
  const [showBackgroundPrompts, setShowBackgroundPrompts] = useState(false);
  const [activePresetTab, setActivePresetTab] = useState<'shot' | 'background' | 'restyle'>('shot');
  const [activeBackgroundTab, setActiveBackgroundTab] = useState<'removal' | 'studio' | 'natural' | 'indoor' | 'creative' | 'themed' | 'style'>('removal');
  const [generationMode, setGenerationMode] = useState<GenerationMode | null>(null);
  
  // Funding meter state
  const [fundingData, setFundingData] = useState({
    current: 0,
    goal: 363,
    weeklyCost: 363, // Updated with scaling projection: ~9,300 generations × $0.039 = ~$363
    lastUpdated: new Date(),
    donations: [] as any[],
    usageStats: {
      totalRequests: 0,
      successfulRequests: 0,
      successRate: 0,
      period: '',
      weeklyProjection: 0,
      costPerGeneration: 0,
      currentUsers: 0,
      scalingFactor: 0,
      baseWeeklyProjection: 0
    }
  });
  const [selectedVideoGenre, setSelectedVideoGenre] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState<number>(0);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [runwayTaskId, setRunwayTaskId] = useState<string | null>(null);

  // Fetch fal.com balance data
  const fetchFalBalanceData = async () => {
    try {
      const response = await fetch('/api/fal-balance');
      const data = await response.json();
      
      setFundingData({
        current: data.current,
        goal: data.goal,
        weeklyCost: data.weeklyCost,
        lastUpdated: new Date(data.lastUpdated),
        donations: [], // No donations for fal.com balance
        usageStats: data.usageStats || {
          totalRequests: 0,
          successfulRequests: 0,
          successRate: 0,
          period: '',
          weeklyProjection: 0,
          costPerGeneration: 0,
          currentUsers: 0,
          scalingFactor: 0,
          baseWeeklyProjection: 0
        }
      });
    } catch (error) {
      console.error('Failed to fetch fal.com balance data:', error);
      // Keep existing data on error
    }
  };

  // Calculate energy level (0-100%)
  const getEnergyLevel = () => {
    const percentage = (fundingData.current / fundingData.weeklyCost) * 100;
    return Math.min(percentage, 100);
  };

  // Get energy status
  const getEnergyStatus = () => {
    const level = getEnergyLevel();
    if (level >= 80) return { status: 'high', color: 'green', text: 'High Energy' };
    if (level >= 50) return { status: 'medium', color: 'yellow', text: 'Medium Energy' };
    if (level >= 20) return { status: 'low', color: 'orange', text: 'Low Energy' };
    return { status: 'critical', color: 'red', text: 'Critical Energy' };
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchFalBalanceData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchFalBalanceData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  const [pollingTimeout, setPollingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [videoGenerationStartTime, setVideoGenerationStartTime] = useState<number | null>(null);
  const [estimatedVideoTime, setEstimatedVideoTime] = useState<number>(120); // Default 2 minutes for gen4_aleph
  const [processingAction, setProcessingAction] = useState<string | null>(null); // Track which specific action is processing

  // Content filtering function
  const isBadContent = (content: string): boolean => {
    const badContentIndicators = [
      'NF SW',
      'NSFW',
      'not safe for work',
      'inappropriate content',
      'content policy violation',
      'content blocked',
      'generation failed',
      'unsafe content',
      'content rejected'
    ];
    
    const lowerContent = content.toLowerCase();
    return badContentIndicators.some(indicator => 
      lowerContent.includes(indicator.toLowerCase())
    );
  };

  // Show whoopee animation for rejected content
  const showContentRejectedAnimation = () => {
    // Trigger the whoopee animation
    const whoopeeButton = document.querySelector('[data-whoopee="true"]') as HTMLButtonElement;
    if (whoopeeButton) {
      whoopeeButton.click();
    }
  };
  const [textToImageTaskId, setTextToImageTaskId] = useState<string | null>(null); // Track text-to-image task ID
  const [textToImagePollingTimeout, setTextToImagePollingTimeout] = useState<NodeJS.Timeout | null>(null); // Track polling timeout
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null); // Track which slot is being dragged over
  const [endFrameProcessing, setEndFrameProcessing] = useState<boolean>(false); // Track EndFrame generation
  const [processingMode, setProcessingMode] = useState<'variations' | 'endframe'>('variations'); // Track processing mode
  const [endFrameTaskId, setEndFrameTaskId] = useState<string | null>(null); // Track EndFrame task ID
  const [endFramePollingTimeout, setEndFramePollingTimeout] = useState<NodeJS.Timeout | null>(null); // Track polling timeout
  const [showPromptGuide, setShowPromptGuide] = useState<boolean>(false); // Track prompt guide modal
  const [failedVideos, setFailedVideos] = useState<Set<string>>(new Set()); // Track failed video URLs
  
  // Animated error system
  const { errors: animatedErrors, showError: showAnimatedError, removeError: removeAnimatedError } = useAnimatedError();

  // Show notification function
  const showNotification = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ message, type });
  }, []);

  // Show animated error function
  const showAnimatedErrorNotification = useCallback((message: string, errorType: 'farting-man' | 'mortal-kombat' | 'bouncing-error' | 'shake-error' | 'toasty' = 'toasty') => {
    // Mobile-specific error handling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && message.includes('User Error')) {
      // Make mobile errors more user-friendly
      message = message.replace('User Error: ', 'Mobile Tip: ');
    }
    
    showAnimatedError(message, errorType);
  }, [showAnimatedError]);

  // Determine generation mode based on uploaded files
  const determineGenerationMode = useCallback((): GenerationMode | null => {
    const hasImages = uploadedFiles.some(file => file.fileType === 'image');
    const hasVideos = uploadedFiles.some(file => file.fileType === 'video');
    
    if (hasVideos && !hasImages) {
      return 'runway-video';
    } else if (hasImages && uploadedFiles.length >= 2) {
      return 'endframe';
    } else if (hasImages && uploadedFiles.length === 1) {
      // Ambiguous case - could be nano-banana, runway-t2i, veo3-fast, or minimax-2.0
      return null; // Let user choose
    } else if (!hasImages && !hasVideos) {
      return 'runway-t2i';
    }
    
    return null;
  }, [uploadedFiles]);

  // Get available generation modes for current state
  const getAvailableModes = useCallback((): GenerationMode[] => {
    const hasImages = uploadedFiles.some(file => file.fileType === 'image');
    const hasVideos = uploadedFiles.some(file => file.fileType === 'video');
    
    const modes: GenerationMode[] = [];
    
    // Always allow text-to-image
    modes.push('runway-t2i');
    
    if (hasImages && uploadedFiles.length === 1) {
      modes.push('nano-banana');
      // modes.push('veo3-fast'); // DISABLED: Veo3 Fast temporarily disabled in production
      modes.push('minimax-2.0'); // Image-to-video with Minimax 2.0
      modes.push('kling-2.1-master'); // Image-to-video with Kling 2.1 Master
    }
    
    // Add text-to-video modes when no images are uploaded
    if (!hasImages && !hasVideos) {
      modes.push('veo3-fast-t2v'); // Text-to-video with Veo3 Fast
      modes.push('minimax-2-t2v'); // Text-to-video with Minimax 2.0
      modes.push('kling-2.1-master-t2v'); // Text-to-video with Kling 2.1 Master
    }
    
    if (hasVideos && !hasImages) {
      modes.push('runway-video');
    }
    
    if (hasImages && uploadedFiles.length >= 2) {
      modes.push('endframe');
    }
    
    return modes;
  }, [uploadedFiles]);

  // Auto-detect generation mode when files change
  useEffect(() => {
    const detectedMode = determineGenerationMode();
    if (detectedMode !== null) {
      setGenerationMode(detectedMode);
    } else {
      // For ambiguous cases, don't auto-set, let user choose
      setGenerationMode(null);
    }
  }, [uploadedFiles, determineGenerationMode]);

  // Check video duration and show Toasty error if too long
  const checkVideoDuration = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('video/')) {
        resolve(true);
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        console.log(`📹 Video duration: ${duration} seconds (exact: ${duration})`);
        
        // Allow videos up to 6 seconds (frame-to-frame generation creates ~6s videos)
        if (duration > 6.0) {
          showAnimatedErrorNotification(`User Error: Video too long! ${duration.toFixed(1)}s exceeds 6s limit! TOASTY!`, 'toasty');
          resolve(false);
        } else {
          console.log(`✅ Video duration ${duration.toFixed(1)}s is within 6s limit`);
          resolve(true);
        }
      };
      
      video.onerror = () => {
        console.warn('📹 Could not load video metadata, will let API handle validation');
        resolve(true); // Let the API handle it
      };
      
      video.src = URL.createObjectURL(file);
    });
  }, [showAnimatedErrorNotification]);

  // Retry failed video
  const retryVideo = useCallback((videoUrl: string) => {
    setFailedVideos(prev => {
      const newSet = new Set(prev);
      newSet.delete(videoUrl);
      return newSet;
    });
    showNotification('🔄 Retrying video load...', 'info');
  }, [showNotification]);

  // Validate video URL format and accessibility
  const isValidVideoUrl = useCallback((url: string): boolean => {
    if (!url) return false;
    
    // Check if it's a valid URL
    try {
      const urlObj = new URL(url);
      
      // Check for common video file extensions or video content types
      const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
      const hasVideoExtension = videoExtensions.some(ext => urlObj.pathname.toLowerCase().endsWith(ext));
      
      // Check if it's a data URL with video content
      const isDataUrl = url.startsWith('data:video/');
      
      // Check if it's a proxy URL (our API endpoints)
      const isProxyUrl = url.includes('/api/') || url.includes('/api/video-proxy');
      
      // Check if it's a legacy URL that might be invalid (pre-database era)
      const isLegacyUrl = url.includes('runway') || url.includes('fal.ai') || url.includes('minimax');
      
      // If it's a legacy URL, be more cautious and don't show errors
      if (isLegacyUrl) {
        return false; // Don't try to load legacy URLs to avoid error messages
      }
      
      return hasVideoExtension || isDataUrl || isProxyUrl;
    } catch {
      return false;
    }
  }, []);

  // Proxy video URL to avoid ORB blocking
  const getProxiedVideoUrl = useCallback((originalUrl: string): string => {
    // Check if URL needs proxying (external domains that might be blocked)
    try {
      const url = new URL(originalUrl);
      const needsProxy = !url.hostname.includes('vary-ai.vercel.app') && 
                        !url.hostname.includes('localhost') &&
                        !url.hostname.includes('127.0.0.1');
      
      if (needsProxy) {
        return `/api/video-proxy?url=${encodeURIComponent(originalUrl)}`;
      }
      return originalUrl;
    } catch {
      return originalUrl;
    }
  }, []);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);


  // Check if we have video files
  const hasVideoFiles = uploadedFiles.some(file => file.fileType === 'video');
  const hasImageFiles = uploadedFiles.some(file => file.fileType === 'image');

  // Auto-detect processing mode based on uploaded files
  useEffect(() => {
    if (hasVideoFiles) {
      // Video files automatically use ALEPH model - no mode selection needed
      setProcessingMode('variations'); // Reset to default
    } else if (uploadedFiles.length >= 2) {
      // Two or more images - EndFrame option becomes available, but still default to variations
      setProcessingMode('variations');
    } else {
      // Single image - only variations mode available
      setProcessingMode('variations');
    }
  }, [hasVideoFiles, uploadedFiles.length]);

  // Migrate localStorage to database when user signs up
  useEffect(() => {
    if (user) {
      migrateLocalStorageToDatabase();
    }
  }, [user, migrateLocalStorageToDatabase]);

  // Update video generation progress in real-time
  useEffect(() => {
    if (!runwayTaskId || !videoGenerationStartTime) return;

    const interval = setInterval(() => {
      // Force re-render to update the progress bar
      setVideoGenerationStartTime(prev => prev);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [runwayTaskId, videoGenerationStartTime]);

  // Authentication handlers
  const handleSignUpClick = () => {
    setAuthModalMode('signup');
    setShowAuthModal(true);
  };

  const handleSignInClick = () => {
    setAuthModalMode('signin');
    setShowAuthModal(true);
  };

  const handleSaveToAccountClick = async () => {
    if (!user) {
      handleSignUpClick();
      return;
    }

    try {
      // Save current variations to account
      if (variations.length > 0) {
        await saveToAccount(variations, prompt, uploadedFiles[0]?.preview);
        showAnimatedErrorNotification('User Error: Work saved to your account! TOASTY!', 'toasty');
      } else {
        showAnimatedErrorNotification('User Error: No work to save! TOASTY!', 'toasty');
      }
    } catch (error) {
      console.error('Error saving to account:', error);
      console.error('Network Error: Failed to save work!');
    }
  };

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
  
  // Filter gallery items based on selected filter
  const filteredGallery = useMemo(() => {
    switch (galleryFilter) {
      case 'images':
        return gallery.filter(item => item.imageUrl && !item.videoUrl);
      case 'videos':
        return gallery.filter(item => item.videoUrl);
      case 'all':
      default:
        return gallery;
    }
  }, [gallery, galleryFilter]);

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
      
      // Track usage
      await trackUsage('image_generation', 'nano_banana', {
        prompt: varyPrompt,
        variations_count: newVariations.length,
        service: 'nano_banana'
      });
      
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

  // Handle text-to-image generation
  const handleTextToImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a text prompt to generate an image');
      showAnimatedErrorNotification('User Error: Please enter a text prompt! TOASTY!', 'toasty');
      return;
    }

    if (!canGenerate) {
      setError('Generation limit reached. Please sign up for unlimited generations.');
      setShowAuthModal(true);
      return;
    }

    const actionId = `t2i-${Date.now()}`;
    setProcessingAction(actionId);
    setGenerationMode('runway-t2i');

    try {
      console.log('🎨 Starting text-to-image generation:', prompt);
      
      setProcessing({
        isProcessing: true,
        progress: 10,
        currentStep: 'Generating image from text...'
      });

      // Prepare style reference if first slot has an image
      let styleReference: string | undefined;
      if (uploadedFiles.length > 0 && uploadedFiles[0].fileType === 'image') {
        styleReference = uploadedFiles[0].base64;
        console.log('🎨 Using uploaded image as style reference');
      }

      // Start the text-to-image task
      const response = await fetch('/api/runway-t2i', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          styleReference,
          model: 'gen4_image',
          ratio: '1024:1024'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start image generation');
      }

      const data = await response.json();
      
      if (!data.success || !data.taskId) {
        throw new Error(data.error || 'No task ID received');
      }

      console.log('✅ Text-to-image task started:', data.taskId);
      setTextToImageTaskId(data.taskId);

      // Start polling for the task completion
      await pollTextToImageTask(data.taskId, prompt.trim(), styleReference);

    } catch (error) {
      console.error('❌ Text-to-image generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate image from text');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
      setGenerationMode(null);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleFileUpload = useCallback(async (files: File[]) => {
    console.log('📤 handleFileUpload called with files:', files.length, files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      // Check if video features are disabled
      if (isVideo && !ENABLE_VIDEO_FEATURES) {
        setError('Video-to-video editing is temporarily disabled. Please upload image files only.');
        showAnimatedErrorNotification('User Error: Video features are disabled! TOASTY!', 'toasty');
        return false;
      }
      
      if (!isImage && !isVideo) {
        setError('Please upload valid image files (JPG, PNG) or video files (MP4, MOV)');
        showAnimatedErrorNotification('User Error: Invalid file type! TOASTY!', 'toasty');
        return false;
      }
      
      // Different size limits for images vs videos
      const maxSize = isImage ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB for images, 100MB for videos
      if (file.size > maxSize) {
        setError(`${isImage ? 'Image' : 'Video'} size must be less than ${isImage ? '10MB' : '100MB'}`);
        showAnimatedErrorNotification('User Error: File too large! TOASTY!', 'toasty');
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    // Check video durations first
    const videoFiles = validFiles.filter(file => file.type.startsWith('video/'));
    if (videoFiles.length > 0) {
      console.log('📹 Checking video durations...');
      for (const videoFile of videoFiles) {
        const isValidDuration = await checkVideoDuration(videoFile);
        if (!isValidDuration) {
          console.log(`📹 Video ${videoFile.name} rejected due to duration`);
          return; // Stop processing if any video is too long
        }
      }
    }

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
  }, [showNotification, checkVideoDuration, showAnimatedErrorNotification]);

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
      showAnimatedErrorNotification(`User Error: File too large! Max size: ${maxSize / (1024 * 1024)}MB TOASTY!`, 'toasty');
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
  }, [showNotification, showAnimatedErrorNotification]);

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
  const handleFileUploadToSlot = useCallback(async (file: File, slotIndex: number) => {
    console.log(`📤 Uploading file to slot ${slotIndex}:`, file.name);
    
    // Validate file
    const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB for images, 100MB for videos
    if (file.size > maxSize) {
      showAnimatedErrorNotification(`User Error: File too large! Max size: ${maxSize / (1024 * 1024)}MB TOASTY!`, 'toasty');
      return;
    }

    // Check video duration if it's a video file
    if (file.type.startsWith('video/')) {
      const isValidDuration = await checkVideoDuration(file);
      if (!isValidDuration) {
        console.log(`📹 Video ${file.name} rejected due to duration`);
        return;
      }
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
  }, [showNotification, checkVideoDuration, showAnimatedErrorNotification]);

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
      
      // Check if user is trying to paste text into the prompt field
      const activeElement = document.activeElement;
      const isPromptField = activeElement?.tagName === 'TEXTAREA' || 
                           activeElement?.getAttribute('data-prompt-field') === 'true' ||
                           activeElement?.closest('[data-prompt-field]');
      
      if (isPromptField) {
        // Handle text paste into prompt field
        const textItems = Array.from(items).filter(item => item.type === 'text/plain');
        if (textItems.length > 0) {
          const textItem = textItems[0];
          const text = await new Promise<string>((resolve) => {
            textItem.getAsString(resolve);
          });
          
          if (text && text.trim()) {
            // Insert text at cursor position
            const textarea = activeElement as HTMLTextAreaElement;
            const start = textarea.selectionStart || 0;
            const end = textarea.selectionEnd || 0;
            const currentValue = textarea.value;
            const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
            
            // Update the prompt state
            setPrompt(newValue);
            
            // Update the textarea value and cursor position
            textarea.value = newValue;
            const newCursorPos = start + text.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            
            showNotification('📋 Text pasted successfully!', 'success');
            return;
          }
        }
      }
      
      // Look for both images and videos
      const mediaItems = Array.from(items).filter(item => 
        item.type.startsWith('image/') || item.type.startsWith('video/')
      );
      
      if (mediaItems.length === 0) {
        console.warn('📋 No image or video items in clipboard');
        showNotification('No image or video found in clipboard. Please copy an image or video first.', 'error');
        return;
      }
      
      // Take the first media item from clipboard
      const mediaItem = mediaItems[0];
      console.log('📋 Processing media item:', mediaItem.type, mediaItem.kind);
      
      const file = mediaItem.getAsFile();
      
      if (!file) {
        console.error('📋 Could not extract file from clipboard item');
        showNotification('Could not extract media from clipboard. Please try copying the image/video again.', 'error');
        return;
      }
      
      console.log('📋 Successfully extracted media from clipboard:', file.name, file.type, file.size);
      
      if (slotIndex !== undefined) {
        // Paste to specific slot
        handleFileUploadToSlot(file, slotIndex);
      } else {
        // Paste to main area - check if we should replace or add
        if (uploadedFiles.length === 0) {
          // No existing files, add to main area
          handleFileUpload([file]);
        } else if (uploadedFiles.length < 4) {
          // Add to next available slot
          handleFileUploadToSlot(file, uploadedFiles.length);
        } else {
          // All slots full, replace the first slot
          handleFileUploadToSlot(file, 0);
          showNotification('📋 All slots full, replaced first image', 'info');
        }
      }
      
      showNotification('📋 Media pasted successfully!', 'success');
      
    } catch (error) {
      console.error('📋 Error handling paste event:', error);
      showNotification('Failed to paste media. Please try drag & drop or file upload instead.', 'error');
    }
  }, [handleFileUpload, handleFileUploadToSlot, showNotification, uploadedFiles]);

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
      // Mobile-specific validation
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        // Check file size more strictly on mobile
        const oversizedFiles = Array.from(files).filter(file => file.size > 10 * 1024 * 1024); // 10MB limit
        if (oversizedFiles.length > 0) {
          showNotification('Mobile Error: File too large. Please use files under 10MB on mobile.', 'error');
          return;
        }
      }
      handleFileUpload(Array.from(files));
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  }, [handleFileUpload, showNotification]);

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
    // Check if user can generate
    if (!canGenerate) {
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

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
      
      // Filter out bad content variations
      const filteredVariations = newVariations.filter((variation: CharacterVariation) => {
        const isBad = isBadContent(variation.description || '') || 
                     isBadContent(variation.angle || '') || 
                     isBadContent(variation.pose || '') ||
                     isBadContent(prompt.trim());
        
        if (isBad) {
          console.log('🚫 Bad content variation detected, filtering out:', variation.description);
          showContentRejectedAnimation();
        }
        
        return !isBad;
      });
      
      setVariations(filteredVariations);
      
      // Track usage
      await trackUsage('character_variation', 'gemini', {
        prompt: prompt.trim(),
        variations_count: filteredVariations.length,
        file_type: uploadedFiles[0]?.fileType
      });
      
      // Add to gallery
      if (filteredVariations.length > 0) {
        addToGallery(filteredVariations, prompt.trim(), uploadedFiles[0]?.preview);
        showNotification('🎨 Character variations generated successfully!', 'success');
      } else if (newVariations.length > 0) {
        // All variations were filtered out
        showNotification('🚫 All generated content was filtered out due to content policy', 'error');
      }
      
      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }, 1000);

    } catch (err) {
      console.error('❌ Character variation error:', err);
      
      // Enhanced error handling with better user messages
      let userMessage = 'An unexpected error occurred';
      let retryable = true;
      
      if (err instanceof Error) {
        const message = err.message.toLowerCase();
        
        if (message.includes('service unavailable') || message.includes('503')) {
          userMessage = 'AI service is temporarily overloaded. This is common during peak hours. Please try again in a moment.';
          retryable = true;
          console.error('Network Error: AI service overloaded!');
        } else if (message.includes('timeout') || message.includes('504')) {
          userMessage = 'Request timed out. The service may be experiencing high demand. Please try again.';
          retryable = true;
          console.error('Network Error: Request timed out!');
        } else if (message.includes('rate limit') || message.includes('429')) {
          userMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
          retryable = true;
          showAnimatedErrorNotification('User Error: Rate limit exceeded! TOASTY!', 'toasty');
        } else if (message.includes('content') && message.includes('moderation')) {
          userMessage = 'Content was flagged by moderation. Please try with a different prompt or image.';
          retryable = false;
          showAnimatedErrorNotification('User Error: Content flagged by moderation! TOASTY!', 'toasty');
        } else if (message.includes('400') || message.includes('bad request')) {
          userMessage = 'Invalid request. Please check your images and prompt.';
          retryable = false;
          showAnimatedErrorNotification('User Error: Invalid request! TOASTY!', 'toasty');
        } else {
          userMessage = err.message;
          console.error('Network Error: Something went wrong!');
        }
      }
      
      setError(userMessage);
      
      // Show helpful notification with retry suggestion
      if (retryable) {
        showNotification(`⚠️ ${userMessage} Try again?`, 'error');
      } else {
        showNotification(`❌ ${userMessage}`, 'error');
      }
      
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
        duration: 6, // Frame-to-frame generation creates ~6s videos
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

      let data: RunwayVideoResponse;
      try {
        data = await response.json();
      } catch (jsonError) {
        const errorText = await response.text();
        console.error('❌ Failed to parse JSON response:', errorText);
        throw new Error(`Server returned invalid response: ${errorText.substring(0, 100)}...`);
      }

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
        
        // Start polling immediately
        setTimeout(() => {
          if (data.taskId) {
            pollRunwayTask(data.taskId);
          }
        }, 1000); // Wait 1 second before first poll
      } else {
        console.log('❌ No task ID received from Runway API');
        setError('No task ID received from Runway API');
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
    if (!taskId) {
      console.log('🛑 Polling stopped - no active task ID');
      return;
    }
    
    console.log(`🔄 Polling Runway task: ${taskId}`);
    try {
      const response = await fetch(`/api/runway-video?taskId=${taskId}`);
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const errorText = await response.text();
        console.error('❌ Failed to parse JSON response during polling:', errorText);
        throw new Error(`Server returned invalid response: ${errorText.substring(0, 100)}...`);
      }
      
      console.log(`📊 Polling response:`, data);

      if (!data.success) {
        console.error('❌ Polling failed:', data.error);
        setError(`Failed to check video status: ${data.error || 'Unknown error'}`);
        return;
      }

      if (data.success && data.task) {
        const task: RunwayTaskResponse = data.task;
        console.log(`📋 Task status: ${task.status}`);
        console.log(`📋 Task output:`, task.output);
        
        if (task.status === 'SUCCEEDED' && task.output) {
          // Video editing completed successfully
          let videoUrl: string;
          
          // Handle different output structures
          if (Array.isArray(task.output) && task.output.length > 0) {
            videoUrl = task.output[0]; // Get first video from array
          } else if (task.output && typeof task.output === 'object' && 'video' in task.output) {
            videoUrl = (task.output as any).video; // Get video from object
          } else if (typeof task.output === 'string') {
            videoUrl = task.output; // Direct string URL
          } else {
            console.error('❌ Unknown output format:', task.output);
            setError('Video generation completed but output format is unexpected');
            return;
          }
          
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
          
          // Add to gallery using the hook
          await addToGallery([{
            id: videoVariation.id,
            description: videoVariation.description,
            angle: videoVariation.angle,
            pose: videoVariation.pose,
            imageUrl: videoVariation.imageUrl,
            videoUrl: videoVariation.videoUrl,
            fileType: videoVariation.fileType
          }], prompt, uploadedFiles[0]?.preview);
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
          console.log('❌ Failure details:', {
            error: task.error,
            failure: task.failure,
            failureCode: task.failureCode
          });
          
          // Handle specific failure types
          let errorMessage = 'Video editing failed: ' + (task.error || 'Unknown error');
          
          // Check for content moderation failures
          if (task.failureCode && task.failureCode.includes('SAFETY')) {
            errorMessage = 'Video failed content moderation. Please try a different video with less intense content.';
          } else if (task.failure && task.failure.includes('content moderation')) {
            errorMessage = 'Video did not pass content moderation. Please try a different video.';
          } else if (task.failureCode && task.failureCode.includes('QUOTA')) {
            errorMessage = 'Runway API quota exceeded. Please try again later or check your account limits.';
          } else if (task.failureCode && task.failureCode.includes('INVALID_INPUT')) {
            errorMessage = 'Invalid input provided. Please check your video format and try again.';
          } else if (task.failure && task.failure.includes('timeout')) {
            errorMessage = 'Video processing timed out. Please try with a shorter video or try again later.';
          }
          
          setError(errorMessage);
          showNotification(errorMessage, 'error');
          
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
          
          // Check if task has been running for too long (more than 10 minutes)
          if (elapsed > 600) {
            console.warn(`⚠️ Task has been running for ${elapsed}s - this is unusually long`);
            setError(`Video processing is taking unusually long (${elapsed}s). This may indicate a server issue. Please try again later.`);
            setRunwayTaskId(null);
            setVideoGenerationStartTime(null);
            if (pollingTimeout) {
              clearTimeout(pollingTimeout);
              setPollingTimeout(null);
            }
            return;
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
      } else {
        console.error('❌ No task data in polling response:', data);
        setError('Failed to get task data from Runway API');
      }
    } catch (error) {
      console.error('Error polling Runway task:', error);
      setError('Failed to check video editing status');
    }
  };

  const handleDownloadVariation = async (variation: CharacterVariation) => {
    try {
      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (variation.imageUrl) {
        // Download the generated image
        if (isMobile) {
          // For mobile, use direct download
          const a = document.createElement('a');
          a.href = variation.imageUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          
          try {
            a.download = `character-${variation.angle.toLowerCase().replace(/\s+/g, '-')}-${variation.id}.jpg`;
          } catch (e) {
            console.log('📱 Download attribute not supported');
          }
          
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          showNotification('📱 Image download started!', 'success');
        } else {
          // For desktop, use blob download
          const response = await fetch(variation.imageUrl, {
            mode: 'cors',
            credentials: 'omit'
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `character-${variation.angle.toLowerCase().replace(/\s+/g, '-')}-${variation.id}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          showNotification('🖼️ Image downloaded successfully!', 'success');
        }
      } else {
        // Download variation description as text file
        downloadDescription();
      }
    } catch (error) {
      console.error('❌ Error downloading variation:', error);
      // Fallback to description download
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
      
      showNotification('📄 Description saved!', 'success');
    }
  };

  const handleDownloadVideo = async (videoUrl: string, originalPrompt: string) => {
    try {
      console.log('🎬 Starting video download:', videoUrl);
      
      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile, try direct download first (works better with CORS)
        console.log('📱 Mobile detected, using direct download');
        const a = document.createElement('a');
        a.href = videoUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        
        // Try to set download attribute (some mobile browsers support it)
        try {
          a.download = `video-edit-${originalPrompt.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}.mp4`;
        } catch (e) {
          console.log('📱 Download attribute not supported, using target="_blank"');
        }
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Show notification for mobile users
        showNotification('📱 Video download started! Check your downloads folder.', 'success');
        return;
      }
      
      // For desktop, use blob download
      console.log('🖥️ Desktop detected, using blob download');
      const response = await fetch(videoUrl, {
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-edit-${originalPrompt.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('🎬 Video downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('❌ Error downloading video:', error);
      
      // Fallback: open in new tab
      console.log('🔄 Fallback: opening video in new tab');
      const a = document.createElement('a');
      a.href = videoUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      showNotification('📱 Video opened in new tab. You can save it from there.', 'info');
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
    if (endFramePollingTimeout) {
      clearTimeout(endFramePollingTimeout);
      setEndFramePollingTimeout(null);
    }
    setRunwayTaskId(null);
    setEndFrameTaskId(null);
    setVideoGenerationStartTime(null);
    setProcessingAction(null);
  };

  // Poll EndFrame task status
  const pollEndFrameTask = useCallback(async (taskId: string) => {
    try {
      console.log(`🔍 Polling EndFrame task: ${taskId}`);
      const response = await fetch(`/api/endframe?taskId=${taskId}`);
      const data: EndFrameResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'EndFrame polling failed');
      }

      if (data.status === 'completed' && data.videoUrl) {
        console.log('✅ EndFrame video completed:', data.videoUrl);
        
        // Check for bad content in the response
        if (isBadContent(data.videoUrl) || isBadContent(prompt.trim())) {
          console.log('🚫 Bad content detected in EndFrame video, showing whoopee animation');
          showContentRejectedAnimation();
          setEndFrameProcessing(false);
          setProcessing({
            isProcessing: false,
            progress: 0,
            currentStep: ''
          });
          setEndFrameTaskId(null);
          return;
        }
        
        // Add the completed video to gallery
        const endFrameVariation: StoredVariation = {
          id: `endframe-${Date.now()}`,
          description: `EndFrame Video: ${prompt}`,
          angle: 'EndFrame',
          pose: 'Generated EndFrame Video',
          videoUrl: data.videoUrl,
          fileType: 'video',
          timestamp: Date.now(),
          originalPrompt: prompt
        };

        // Add to gallery using the hook
        await addToGallery([{
          id: endFrameVariation.id,
          description: endFrameVariation.description,
          angle: endFrameVariation.angle,
          pose: endFrameVariation.pose,
          imageUrl: endFrameVariation.imageUrl,
          videoUrl: endFrameVariation.videoUrl,
          fileType: endFrameVariation.fileType
        }], prompt, uploadedFiles[0]?.preview);
        setError(null);
        showNotification('🎬 EndFrame video generated successfully!', 'success');
        
        // Show final success state before cleanup
        setProcessing({
          isProcessing: false,
          progress: 100,
          currentStep: 'Generation Successful!'
        });
        
        // Clean up after a brief delay to show the success message
        setTimeout(() => {
          setEndFrameTaskId(null);
          setEndFrameProcessing(false);
          setProcessing({
            isProcessing: false,
            progress: 0,
            currentStep: ''
          });
        }, 2000); // Show "Generation Successful" for 2 seconds
        
        if (endFramePollingTimeout) {
          clearTimeout(endFramePollingTimeout);
          setEndFramePollingTimeout(null);
        }
        
      } else if (data.status === 'failed') {
        throw new Error(data.error || 'EndFrame generation failed');
      } else {
        // Still processing, continue polling
        console.log(`⏳ EndFrame task still processing: ${data.status}`);
        setProcessing(prev => ({
          ...prev,
          currentStep: `Generating video... (${data.status})`
        }));
        
        // Continue polling after 2 seconds
        const timeout = setTimeout(() => {
          pollEndFrameTask(taskId);
        }, 2000);
        setEndFramePollingTimeout(timeout);
      }
    } catch (error) {
      console.error('❌ EndFrame polling error:', error);
      const errorMessage = error instanceof Error ? error.message : 'EndFrame polling failed';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      
      // Clean up
      setEndFrameTaskId(null);
      setEndFrameProcessing(false);
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
      
      if (endFramePollingTimeout) {
        clearTimeout(endFramePollingTimeout);
        setEndFramePollingTimeout(null);
      }
    }
  }, [prompt, endFramePollingTimeout, showNotification, addToGallery, uploadedFiles]);

  // Poll text-to-image task status
  const pollTextToImageTask = useCallback(async (taskId: string, originalPrompt: string, styleReference?: string) => {
    try {
      console.log(`🔍 Polling text-to-image task: ${taskId}`);
      const response = await fetch(`/api/runway-t2i?taskId=${taskId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Text-to-image polling failed');
      }

      if (data.status === 'completed' && data.imageUrl) {
        console.log('✅ Text-to-image completed:', data.imageUrl);
        
        // Check for bad content in the response
        if (isBadContent(data.imageUrl) || isBadContent(originalPrompt)) {
          console.log('🚫 Bad content detected, showing whoopee animation');
          showContentRejectedAnimation();
          setProcessing({
            isProcessing: false,
            progress: 0,
            currentStep: ''
          });
          setGenerationMode(null);
          return;
        }
        
        // Create a variation object for the gallery
        const generatedVariation: CharacterVariation = {
          id: `t2i-${Date.now()}`,
          description: `Generated: ${originalPrompt}`,
          angle: 'Text-to-Image',
          pose: 'AI Generated',
          imageUrl: data.imageUrl,
          fileType: 'image'
        };

        // Track usage
        await trackUsage('image_generation', 'runway_aleph', {
          prompt: originalPrompt,
          has_style_reference: !!styleReference,
          service: 'runway_t2i'
        });

        // Add to gallery
        await addToGallery([generatedVariation], originalPrompt);
        
        setProcessing({
          isProcessing: false,
          progress: 100,
          currentStep: 'Generation Successful!'
        });

        showNotification('🎨 Image generated successfully from text!', 'success');

        // Clean up
        setTextToImageTaskId(null);
        setGenerationMode(null);
        
        // Clear processing state after delay
        setTimeout(() => {
          setProcessing({
            isProcessing: false,
            progress: 0,
            currentStep: ''
          });
        }, 2000);
        
        if (textToImagePollingTimeout) {
          clearTimeout(textToImagePollingTimeout);
          setTextToImagePollingTimeout(null);
        }
        
      } else if (data.status === 'failed') {
        throw new Error('Text-to-image generation failed');
      } else {
        // Still processing, continue polling
        console.log(`⏳ Text-to-image task still processing: ${data.status}`);
        setProcessing(prev => ({
          ...prev,
          currentStep: `Generating image... (${data.status})`
        }));
        
        // Continue polling after 2 seconds
        const timeout = setTimeout(() => {
          pollTextToImageTask(taskId, originalPrompt, styleReference);
        }, 2000);
        setTextToImagePollingTimeout(timeout);
      }
    } catch (error) {
      console.error('❌ Text-to-image polling error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Text-to-image polling failed';
      setError(errorMessage);
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
      setGenerationMode(null);
      
      // Clean up
      setTextToImageTaskId(null);
      if (textToImagePollingTimeout) {
        clearTimeout(textToImagePollingTimeout);
        setTextToImagePollingTimeout(null);
      }
    }
  }, [textToImagePollingTimeout, showNotification, addToGallery, trackUsage]);

  // EndFrame generation function - works with two images (start and end frame)
  // Handle Veo3 Fast image-to-video generation
  const handleVeo3FastGeneration = async () => {
    if (!canGenerate) {
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

    if (uploadedFiles.length === 0) {
      showAnimatedErrorNotification('User Error: Please upload an image first! TOASTY!', 'toasty');
      return;
    }

    const imageFile = uploadedFiles.find(file => file.fileType === 'image');
    if (!imageFile) {
      showAnimatedErrorNotification('User Error: Please upload a valid image! TOASTY!', 'toasty');
      return;
    }

    setProcessing({
      isProcessing: true,
      progress: 0,
      currentStep: 'Starting Veo3 Fast generation...'
    });

    try {
      setProcessing({
        isProcessing: true,
        progress: 30,
        currentStep: 'Uploading image to Veo3 Fast...'
      });

      const response = await fetch('/api/veo3-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image_url: imageFile.preview,
          duration: "8s",
          generate_audio: true,
          resolution: "720p"
        }),
      });

      setProcessing({
        isProcessing: true,
        progress: 70,
        currentStep: 'Generating video with Veo3 Fast...'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setProcessing({
        isProcessing: true,
        progress: 90,
        currentStep: 'Processing result...'
      });

      // Create a variation object for the gallery
      const generatedVariation: CharacterVariation = {
        id: `veo3-${Date.now()}`,
        description: `Veo3 Fast: ${prompt}`,
        angle: 'Image-to-Video',
        pose: 'Veo3 Fast Generated',
        videoUrl: data.videoUrl,
        fileType: 'video'
      };

      setVariations(prev => [generatedVariation, ...prev]);
      addToGallery([generatedVariation], prompt.trim());

      // Track usage
      trackUsage('video_generation', 'minimax_endframe');

      setProcessing({
        isProcessing: false,
        progress: 100,
        currentStep: 'Complete!'
      });

      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }, 2000);

    } catch (error) {
      console.error('Veo3 Fast generation error:', error);
      showAnimatedErrorNotification(`User Error: ${error instanceof Error ? error.message : 'Failed to generate video with Veo3 Fast'} TOASTY!`, 'toasty');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  // Handle Minimax 2.0 image-to-video generation
  const handleMinimax2Generation = async () => {
    if (!canGenerate) {
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

    if (uploadedFiles.length === 0) {
      showAnimatedErrorNotification('User Error: Please upload an image first! TOASTY!', 'toasty');
      return;
    }

    const imageFile = uploadedFiles.find(file => file.fileType === 'image');
    if (!imageFile) {
      showAnimatedErrorNotification('User Error: Please upload a valid image! TOASTY!', 'toasty');
      return;
    }

    setProcessing({
      isProcessing: true,
      progress: 0,
      currentStep: 'Starting Minimax 2.0 generation...'
    });

    try {
      setProcessing({
        isProcessing: true,
        progress: 30,
        currentStep: 'Uploading image to Minimax 2.0...'
      });

      const response = await fetch('/api/minimax-2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image_url: imageFile.preview,
          duration: "8s",
          generate_audio: true,
          resolution: "720p"
        }),
      });

      setProcessing({
        isProcessing: true,
        progress: 70,
        currentStep: 'Generating video with Minimax 2.0...'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setProcessing({
        isProcessing: true,
        progress: 90,
        currentStep: 'Processing result...'
      });

      // Create a variation object for the gallery
      const generatedVariation: CharacterVariation = {
        id: `minimax2-${Date.now()}`,
        description: `Minimax 2.0: ${prompt}`,
        angle: 'Image-to-Video',
        pose: 'Minimax 2.0 Generated',
        videoUrl: data.videoUrl,
        fileType: 'video'
      };

      setVariations(prev => [generatedVariation, ...prev]);
      addToGallery([generatedVariation], prompt.trim());

      // Track usage
      trackUsage('video_generation', 'minimax_endframe');

      setProcessing({
        isProcessing: false,
        progress: 100,
        currentStep: 'Complete!'
      });

      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }, 2000);

    } catch (error) {
      console.error('Minimax 2.0 generation error:', error);
      showAnimatedErrorNotification(`User Error: ${error instanceof Error ? error.message : 'Failed to generate video with Minimax 2.0'} TOASTY!`, 'toasty');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  // Handle Kling 2.1 Master image-to-video generation
  const handleKlingMasterGeneration = async () => {
    if (!canGenerate) {
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

    const imageFile = uploadedFiles.find(file => file.fileType === 'image');
    if (!imageFile) {
      showAnimatedErrorNotification('User Error: Please upload a valid image! TOASTY!', 'toasty');
      return;
    }

    setProcessing({
      isProcessing: true,
      progress: 0,
      currentStep: 'Starting Kling 2.1 Master generation...'
    });

    try {
      setProcessing({
        isProcessing: true,
        progress: 30,
        currentStep: 'Uploading image to Kling 2.1 Master...'
      });

      const response = await fetch('/api/kling-2.1-master', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image_url: imageFile.preview,
          duration: "5",
          negative_prompt: "blur, distort, and low quality",
          cfg_scale: 0.5
        }),
      });

      setProcessing({
        isProcessing: true,
        progress: 70,
        currentStep: 'Generating video with Kling 2.1 Master...'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setProcessing({
        isProcessing: true,
        progress: 90,
        currentStep: 'Processing video...'
      });

      // Create a variation object for the gallery
      const generatedVariation: CharacterVariation = {
        id: `cling-master-${Date.now()}`,
        description: `Kling 2.1 Master: ${prompt}`,
        angle: 'Image-to-Video',
        pose: 'Kling 2.1 Master Generated',
        videoUrl: data.videoUrl,
        fileType: 'video'
      };

      setVariations(prev => [generatedVariation, ...prev]);
      addToGallery([generatedVariation], prompt.trim());

      // Track usage
      trackUsage('video_generation', 'minimax_endframe');

      setProcessing({
        isProcessing: false,
        progress: 100,
        currentStep: 'Complete!'
      });

      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }, 2000);

    } catch (error) {
      console.error('Kling 2.1 Master generation error:', error);
      showAnimatedErrorNotification(`User Error: ${error instanceof Error ? error.message : 'Failed to generate video with Kling 2.1 Master'} TOASTY!`, 'toasty');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  // Handle Veo3 Fast text-to-video generation
  const handleVeo3FastT2VGeneration = async () => {
    if (!canGenerate) {
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt for text-to-video generation');
      return;
    }

    setProcessing({
      isProcessing: true,
      progress: 0,
      currentStep: 'Starting Veo3 Fast text-to-video generation...'
    });

    try {
      setProcessing({
        isProcessing: true,
        progress: 30,
        currentStep: 'Processing prompt with Veo3 Fast...'
      });

      const response = await fetch('/api/veo3-fast-t2v', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration: "8s",
          generate_audio: true,
          resolution: "720p"
        }),
      });

      setProcessing({
        isProcessing: true,
        progress: 70,
        currentStep: 'Generating video with Veo3 Fast...'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setProcessing({
        isProcessing: true,
        progress: 90,
        currentStep: 'Processing video...'
      });

      // Create a variation object for the gallery
      const generatedVariation: CharacterVariation = {
        id: `veo3-t2v-${Date.now()}`,
        description: `Veo3 Fast T2V: ${prompt}`,
        angle: 'Text-to-Video',
        pose: 'Veo3 Fast T2V Generated',
        videoUrl: data.videoUrl,
        fileType: 'video'
      };

      setVariations(prev => [generatedVariation, ...prev]);
      addToGallery([generatedVariation], prompt.trim());

      // Track usage
      trackUsage('video_generation', 'minimax_endframe');

      setProcessing({
        isProcessing: false,
        progress: 100,
        currentStep: 'Complete!'
      });

      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }, 2000);

    } catch (error) {
      console.error('Veo3 Fast T2V generation error:', error);
      showAnimatedErrorNotification(`User Error: ${error instanceof Error ? error.message : 'Failed to generate video with Veo3 Fast T2V'} TOASTY!`, 'toasty');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  // Handle Minimax 2.0 text-to-video generation
  const handleMinimax2T2VGeneration = async () => {
    if (!canGenerate) {
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt for text-to-video generation');
      return;
    }

    setProcessing({
      isProcessing: true,
      progress: 0,
      currentStep: 'Starting Minimax 2.0 text-to-video generation...'
    });

    try {
      setProcessing({
        isProcessing: true,
        progress: 30,
        currentStep: 'Processing prompt with Minimax 2.0...'
      });

      const response = await fetch('/api/minimax-2-t2v', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration: "5",
          aspect_ratio: "16:9",
          negative_prompt: "blur, distort, and low quality",
          cfg_scale: 0.5
        }),
      });

      setProcessing({
        isProcessing: true,
        progress: 70,
        currentStep: 'Generating video with Minimax 2.0...'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setProcessing({
        isProcessing: true,
        progress: 90,
        currentStep: 'Processing video...'
      });

      // Create a variation object for the gallery
      const generatedVariation: CharacterVariation = {
        id: `minimax-t2v-${Date.now()}`,
        description: `Minimax 2.0 T2V: ${prompt}`,
        angle: 'Text-to-Video',
        pose: 'Minimax 2.0 T2V Generated',
        videoUrl: data.videoUrl,
        fileType: 'video'
      };

      setVariations(prev => [generatedVariation, ...prev]);
      addToGallery([generatedVariation], prompt.trim());

      // Track usage
      trackUsage('video_generation', 'minimax_endframe');

      setProcessing({
        isProcessing: false,
        progress: 100,
        currentStep: 'Complete!'
      });

      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }, 2000);

    } catch (error) {
      console.error('Minimax 2.0 T2V generation error:', error);
      showAnimatedErrorNotification(`User Error: ${error instanceof Error ? error.message : 'Failed to generate video with Minimax 2.0 T2V'} TOASTY!`, 'toasty');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  // Handle Kling 2.1 Master text-to-video generation
  const handleKlingMasterT2VGeneration = async () => {
    if (!canGenerate) {
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt for text-to-video generation');
      return;
    }

    setProcessing({
      isProcessing: true,
      progress: 0,
      currentStep: 'Starting Kling 2.1 Master text-to-video generation...'
    });

    try {
      setProcessing({
        isProcessing: true,
        progress: 30,
        currentStep: 'Processing prompt with Kling 2.1 Master...'
      });

      const response = await fetch('/api/cling-2.1-master-t2v', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration: "5",
          aspect_ratio: "16:9",
          negative_prompt: "blur, distort, and low quality",
          cfg_scale: 0.5
        }),
      });

      setProcessing({
        isProcessing: true,
        progress: 70,
        currentStep: 'Generating video with Kling 2.1 Master...'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setProcessing({
        isProcessing: true,
        progress: 90,
        currentStep: 'Processing video...'
      });

      // Create a variation object for the gallery
      const generatedVariation: CharacterVariation = {
        id: `cling-t2v-${Date.now()}`,
        description: `Kling 2.1 Master T2V: ${prompt}`,
        angle: 'Text-to-Video',
        pose: 'Kling 2.1 Master T2V Generated',
        videoUrl: data.videoUrl,
        fileType: 'video'
      };

      setVariations(prev => [generatedVariation, ...prev]);
      addToGallery([generatedVariation], prompt.trim());

      // Track usage
      trackUsage('video_generation', 'minimax_endframe');

      setProcessing({
        isProcessing: false,
        progress: 100,
        currentStep: 'Complete!'
      });

      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }, 2000);

    } catch (error) {
      console.error('Kling 2.1 Master T2V generation error:', error);
      showAnimatedErrorNotification(`User Error: ${error instanceof Error ? error.message : 'Failed to generate video with Kling 2.1 Master T2V'} TOASTY!`, 'toasty');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  const handleEndFrameGeneration = async () => {
    if (uploadedFiles.length < 2) {
      setError('Please upload two images: one for the start frame and one for the end frame');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt describing the transition between frames');
      return;
    }

    setEndFrameProcessing(true);
    setProcessing({
      isProcessing: true,
      progress: 20,
      currentStep: 'Generating video from start and end frames...'
    });

    try {
      console.log('🎬 Starting EndFrame processing...');
      console.log(`📋 Prompt: "${prompt}"`);
      console.log(`🖼️ Start frame: ${uploadedFiles[0].file.name}`);
      console.log(`🖼️ End frame: ${uploadedFiles[1].file.name}`);

      const requestBody: EndFrameRequest = {
        firstImage: uploadedFiles[0].base64, // Use the first image (start frame)
        secondImage: uploadedFiles[1].base64, // Use the second image (end frame)
        prompt: prompt,
        model: 'MiniMax-Hailuo-02'
      };

      console.log('📤 Sending request to EndFrame API...');
      const response = await fetch('/api/endframe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data: EndFrameResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'EndFrame task submission failed');
      }

      if (!data.taskId) {
        throw new Error('No task ID returned from EndFrame API');
      }

      console.log('✅ EndFrame task submitted successfully:', data.taskId);
      
      // Store task ID and start polling
      setEndFrameTaskId(data.taskId);
      setProcessing(prev => ({
        ...prev,
        currentStep: 'Task submitted, waiting for video generation...'
      }));
      
      // Start polling after 1 second
      setTimeout(() => {
        pollEndFrameTask(data.taskId!);
      }, 1000);

    } catch (error) {
      console.error('❌ EndFrame processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'EndFrame processing failed';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      
      // Only clean up on error - successful completion cleanup happens in pollEndFrameTask
      setEndFrameProcessing(false);
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <Header 
        onSignUpClick={handleSignUpClick}
        onSignInClick={handleSignInClick}
      />
      
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

      {/* Animated Error Messages */}
      {animatedErrors.map((error, index) => (
        <div key={error.id} style={{ bottom: `${20 + (index * 80)}px` }} className="fixed right-4 z-50">
          <AnimatedError
            message={error.message}
            type={error.type}
            onClose={() => removeAnimatedError(error.id)}
            duration={4000}
          />
        </div>
      ))}
      
      <div className="relative z-10 flex flex-col lg:flex-row">
        {/* Main Content */}
        <div className={`transition-all duration-300 ${showGallery ? 'w-full lg:w-2/3' : 'w-full'} ${showGallery ? 'lg:pr-0' : ''} flex flex-col items-center`}>
          <div className="w-full max-w-4xl mx-auto px-4 py-8 lg:px-8">
            {/* Usage Limit Banner */}
            <UsageLimitBanner 
              onSignUpClick={handleSignUpClick}
              onSaveToAccountClick={handleSaveToAccountClick}
            />

            {/* Community Funding Meter */}
            <div className="w-full max-w-4xl mx-auto px-4 mb-6">
              <div className="bg-gradient-to-r from-purple-900 to-blue-900 bg-opacity-90 backdrop-blur-sm rounded-lg p-4 border border-purple-500 border-opacity-30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse"></div>
                    <h3 className="text-white font-semibold text-lg">Community Energy</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-300 text-sm">Weekly Goal: ${fundingData.weeklyCost}</p>
                    <p className="text-white font-medium">${fundingData.current} / ${fundingData.goal}</p>
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
                      >
                          ⚡ Ko-fi
                        </a>
                        <a 
                          href="https://cash.app/$VaryAi" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-full transition-colors"
                        >
                          💚 Cash App
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-400 text-xs mt-2">
                  {getEnergyLevel() >= 80 
                    ? "🎉 High energy! Generate freely while the balance stays healthy!" 
                    : getEnergyLevel() >= 50 
                    ? "⚡ Good energy levels. Keep creating!" 
                    : getEnergyLevel() >= 20 
                    ? "💡 Energy running low. Community support helps keep VaryAI running!" 
                    : "💜 Low energy. Your support helps keep the community thriving!"
                  }
                </p>
                
                {/* Recent Donations */}
                {fundingData.donations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <h4 className="text-gray-300 text-sm font-medium mb-2">Recent Supporters</h4>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {fundingData.donations.slice(-3).map((donation, index) => (
                        <div key={donation.id || index} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">
                            {donation.from_name} 
                            {donation.is_subscription && (
                              <span className="text-purple-400 ml-1">⭐</span>
                            )}
                          </span>
                          <span className="text-green-400 font-medium">
                            ${donation.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Usage Counter */}
            <UsageCounter onSignUpClick={handleSignUpClick} />
            
        {/* Funding Message - Above Header */}
        <div className="mb-4 bg-gray-900 bg-opacity-95 backdrop-blur-sm rounded-lg p-3 border border-gray-700 border-opacity-50">
          <div className="text-center">
            <p className="text-gray-300 text-sm font-medium">
              💜 I&apos;m a developer passionate about building quick and convenient AI tools for the community I love. I can&apos;t scale this alone - if you value what VaryAI brings, please help fund its growth!
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center items-center mb-8 lg:mb-16 bg-black bg-opacity-40 backdrop-blur-sm rounded-lg p-4 lg:p-6 border border-white border-opacity-20 gap-4 lg:gap-0">
          <h1 className="text-2xl lg:text-4xl font-bold text-white text-center lg:text-left">
            vARY<span className="text-gray-400">ai</span>
          </h1>
          <div className="flex gap-2 flex-wrap justify-center lg:justify-end">
            {/* Test Animated Errors Button - Remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <>
                <button
                  onClick={() => {
                    const errorTypes = ['farting-man', 'mortal-kombat', 'bouncing-error', 'shake-error', 'toasty'] as const;
                    const randomType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
                    showAnimatedErrorNotification(`Test ${randomType} animation!`, randomType);
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-lg text-sm"
                  title="Test random animated errors (dev only)"
                >
                  🎭 Test
                </button>
                <button
                  onClick={() => showAnimatedErrorNotification('User Error: Test Toasty animation! TOASTY!', 'toasty')}
                  className="flex items-center gap-1 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium shadow-lg text-sm"
                  title="Test Toasty animation (dev only)"
                  data-whoopee="true"
                >
                  🥖 TOASTY
                </button>
              </>
            )}
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
        </div>

        <div className="flex items-center justify-center min-h-[70vh] w-full">
          <div className="w-full max-w-2xl">

            {/* Usage Statistics - Left Corner */}
            {fundingData.usageStats.totalRequests > 0 && (
              <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 backdrop-blur-sm rounded-lg border border-blue-500 border-opacity-30">
                <div className="text-xs text-blue-200">
                  <div className="font-semibold text-blue-100 mb-1">📊 Usage Analytics & Scaling Projection ({fundingData.usageStats.period})</div>
                  <div className="space-y-1">
                    <div>• {fundingData.usageStats.totalRequests.toLocaleString()} total requests ({fundingData.usageStats.successRate}% success)</div>
                    <div>• {fundingData.usageStats.successfulRequests.toLocaleString()} images generated</div>
                    <div>• Current: {fundingData.usageStats.currentUsers} users → Base: ~{fundingData.usageStats.baseWeeklyProjection.toLocaleString()}/week</div>
                    <div>• Scaling: {fundingData.usageStats.scalingFactor}x growth → ~{fundingData.usageStats.weeklyProjection.toLocaleString()}/week</div>
                    <div>• Weekly goal: ${fundingData.weeklyCost}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Input Area */}
            <div data-input-area>
              {uploadedFiles.length === 0 ? (
              <div
                className="border-2 border-white rounded-lg p-8 sm:p-16 text-center hover:border-gray-300 transition-colors cursor-pointer bg-black bg-opacity-40 backdrop-blur-sm min-h-[200px] flex flex-col items-center justify-center"
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
                  💡 Tip: You can paste text into the prompt field or paste images/videos into slots (Ctrl+V) or drag & drop files
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-white border-opacity-20">
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
                          className="w-full h-32 object-contain rounded-lg shadow-lg bg-black"
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
              </div>
            )}
            </div>

            {/* Generate Button - Right below image upload */}
            <div className="flex flex-col items-center gap-4 mt-6">
              {/* Model Selector - Dropdown System */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap justify-center gap-3 mb-4">
                  {/* Image-to-Video Models Dropdown */}
                  {uploadedFiles.some(file => file.fileType === 'image') && uploadedFiles.length === 1 && (
                    <div className="relative w-full max-w-sm">
                      <select
                        value={generationMode || ''}
                        onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
                        className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg text-base font-medium hover:bg-purple-700 transition-all appearance-none pr-10 cursor-pointer min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50"
                        style={{ fontSize: '16px' }} // Prevents zoom on iOS
                      >
                        <option value="">Select Image-to-Video Model</option>
                        <option value="nano-banana">Nano Banana (Character Variations)</option>
                        <option value="minimax-2.0">Minimax 2.0 (Image-to-Video)</option>
                        <option value="kling-2.1-master">Kling 2.1 Master (Image-to-Video)</option>
                        <option value="seedance-pro">Seedance 1.0 Pro (Image-to-Video)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
                    </div>
                  )}

                  {/* Text-to-Video Models Dropdown */}
                  {!uploadedFiles.some(file => file.fileType === 'image') && !uploadedFiles.some(file => file.fileType === 'video') && (
                    <div className="relative w-full max-w-sm">
                      <select
                        value={generationMode || ''}
                        onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg text-base font-medium hover:bg-blue-700 transition-all appearance-none pr-10 cursor-pointer min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                        style={{ fontSize: '16px' }} // Prevents zoom on iOS
                      >
                        <option value="">Select Text-to-Video Model</option>
                        <option value="runway-t2i">Runway T2I (Text-to-Image)</option>
                        <option value="veo3-fast-t2v">Veo3 Fast (Text-to-Video)</option>
                        <option value="minimax-2-t2v">Minimax 2.0 (Text-to-Video)</option>
                        <option value="kling-2.1-master-t2v">Kling 2.1 Master (Text-to-Video)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
                    </div>
                  )}

                  {/* Video Processing Dropdown */}
                  {uploadedFiles.some(file => file.fileType === 'video') && !uploadedFiles.some(file => file.fileType === 'image') && (
                    <div className="relative w-full max-w-sm">
                      <select
                        value={generationMode || ''}
                        onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
                        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg text-base font-medium hover:bg-green-700 transition-all appearance-none pr-10 cursor-pointer min-h-[44px] focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                        style={{ fontSize: '16px' }} // Prevents zoom on iOS
                      >
                        <option value="">Select Video Processing Model</option>
                        <option value="runway-video">Runway Aleph (Video Processing)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
                    </div>
                  )}

                  {/* EndFrame Processing Dropdown */}
                  {uploadedFiles.some(file => file.fileType === 'image') && uploadedFiles.length >= 2 && (
                    <div className="relative w-full max-w-sm">
                      <select
                        value={generationMode || ''}
                        onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
                        className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg text-base font-medium hover:bg-orange-700 transition-all appearance-none pr-10 cursor-pointer min-h-[44px] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50"
                        style={{ fontSize: '16px' }} // Prevents zoom on iOS
                      >
                        <option value="">Select EndFrame Model</option>
                        <option value="endframe">EndFrame (Start → End Video)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
                    </div>
                  )}
                </div>
              )}

              {/* Main Action Button */}
              <div className="flex justify-center">
                {hasVideoFiles ? (
                  // Video files - automatically use ALEPH model
                  <button
                    onClick={handleRunwayVideoEditing}
                    disabled={processing.isProcessing || !prompt.trim()}
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    {processing.isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {processing.currentStep}
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        Process Video (Aleph)
                      </>
                    )}
                  </button>
                ) : (generationMode === 'runway-t2i' || (uploadedFiles.length === 0 && !generationMode)) ? (
                  // Text-to-image generation
                  <button
                    onClick={handleTextToImage}
                    disabled={processing.isProcessing || !prompt.trim()}
                    className="w-full max-w-sm px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold text-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg min-h-[48px] touch-manipulation"
                  >
                    {processing.isProcessing && generationMode === 'runway-t2i' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {processing.currentStep}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Image
                      </>
                    )}
                  </button>
                ) : processingMode === 'variations' || generationMode === 'nano-banana' ? (
                  // Character variations - Nano Banana
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
                      <>
                        <Images className="w-5 h-5" />
                        Generate Character Variations (Nano Banana)
                      </>
                    )}
                  </button>
                ) : generationMode === 'veo3-fast' ? (
                  // Veo3 Fast image-to-video - DISABLED IN PRODUCTION
                  <button
                    disabled={true}
                    className="px-8 py-4 bg-gray-500 text-gray-300 rounded-lg font-semibold text-lg cursor-not-allowed flex items-center justify-center gap-2 shadow-lg opacity-50"
                  >
                    <Camera className="w-5 h-5" />
                    Animate Image (Veo3 Fast) - Temporarily Disabled
                  </button>
                ) : generationMode === 'minimax-2.0' ? (
                  // Minimax 2.0 image-to-video
                  <button
                    onClick={handleMinimax2Generation}
                    disabled={processing.isProcessing || !prompt.trim()}
                    className="w-full max-w-sm px-8 py-4 bg-red-600 text-white rounded-lg font-semibold text-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg min-h-[48px] touch-manipulation"
                  >
                    {processing.isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {processing.currentStep}
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        Animate Image (Minimax 2.0)
                      </>
                    )}
                  </button>
                ) : generationMode === 'kling-2.1-master' ? (
                  // Kling 2.1 Master image-to-video
                  <button
                    onClick={handleKlingMasterGeneration}
                    disabled={processing.isProcessing || !prompt.trim()}
                    className="w-full max-w-sm px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold text-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg min-h-[48px] touch-manipulation"
                  >
                    {processing.isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {processing.currentStep}
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        Animate Image (Kling 2.1 Master)
                      </>
                    )}
                  </button>
                ) : generationMode === 'veo3-fast-t2v' ? (
                  // Veo3 Fast text-to-video
                  <button
                    onClick={handleVeo3FastT2VGeneration}
                    disabled={processing.isProcessing || !prompt.trim()}
                    className="w-full max-w-sm px-8 py-4 bg-orange-600 text-white rounded-lg font-semibold text-lg hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg min-h-[48px] touch-manipulation"
                  >
                    {processing.isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {processing.currentStep}
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        Generate Video (Veo3 Fast T2V)
                      </>
                    )}
                  </button>
                ) : generationMode === 'minimax-2-t2v' ? (
                  // Minimax 2.0 text-to-video
                  <button
                    onClick={handleMinimax2T2VGeneration}
                    disabled={processing.isProcessing || !prompt.trim()}
                    className="w-full max-w-sm px-8 py-4 bg-red-600 text-white rounded-lg font-semibold text-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg min-h-[48px] touch-manipulation"
                  >
                    {processing.isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {processing.currentStep}
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        Generate Video (Minimax 2.0 T2V)
                      </>
                    )}
                  </button>
                ) : generationMode === 'kling-2.1-master-t2v' ? (
                  // Kling 2.1 Master text-to-video
                  <button
                    onClick={handleKlingMasterT2VGeneration}
                    disabled={processing.isProcessing || !prompt.trim()}
                    className="w-full max-w-sm px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold text-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg min-h-[48px] touch-manipulation"
                  >
                    {processing.isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {processing.currentStep}
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        Generate Video (Kling 2.1 Master T2V)
                      </>
                    )}
                  </button>
                ) : (
                  // EndFrame processing
                  <button
                    onClick={handleEndFrameGeneration}
                    disabled={processing.isProcessing || !prompt.trim()}
                    className="w-full max-w-sm px-8 py-4 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg min-h-[48px] touch-manipulation"
                  >
                    {processing.isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {processing.currentStep}
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        Generate Start → End Video
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Prompt Input - Always visible */}
            <div className="space-y-4 bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20 mt-6">
              {uploadedFiles.length === 0 && (
                <div className="text-center mb-4 p-3 bg-purple-600 bg-opacity-20 border border-purple-500 border-opacity-30 rounded-lg">
                  <p className="text-purple-300 text-sm">
                    💡 <strong>Text-to-Image Mode:</strong> Enter a description below to generate an image from text using Gen 4
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="prompt" className="text-white font-medium text-lg">
                  Prompt
                </label>
                <button
                  onClick={() => setShowPromptGuide(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  title="Open Prompt Guide"
                >
                  <span>📸</span>
                  <span>Help</span>
                </button>
              </div>
              <textarea
                id="prompt"
                data-prompt-field="true"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  hasVideoFiles 
                    ? "Describe the scene changes, background modifications, or prop changes you want..." 
                    : processingMode === 'endframe'
                    ? "Describe the transition or transformation between your start and end frames..."
                    : uploadedFiles.length === 0
                    ? "Describe the image you want to generate... (e.g., 'A majestic dragon flying over a mountain at sunset')"
                    : "Describe the angle or pose variations you want..."
                }
                className="w-full p-4 sm:p-6 border-2 border-white rounded-lg bg-transparent text-white placeholder-gray-400 focus:outline-none focus:border-gray-300 resize-none text-base sm:text-lg"
                rows={4}
                style={{ fontSize: '16px' }} // Prevents zoom on iOS
              />
            </div>

            {/* Prompt Examples - Always visible */}
            <div className="space-y-4 mt-6">
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
                        <div className="flex flex-wrap gap-2 mb-4">
                          <button
                            onClick={() => setActivePresetTab('shot')}
                            className={`px-4 py-2 text-sm rounded-lg transition-colors border ${
                              activePresetTab === 'shot' 
                                ? 'bg-blue-600 text-white border-blue-500' 
                                : 'bg-gray-800 text-white border-gray-600 hover:bg-gray-700'
                            }`}
                          >
                            📸 Shot Type
                          </button>
                          <button
                            onClick={() => setActivePresetTab('background')}
                            className={`px-4 py-2 text-sm rounded-lg transition-colors border ${
                              activePresetTab === 'background' 
                                ? 'bg-green-600 text-white border-green-500' 
                                : 'bg-gray-800 text-white border-gray-600 hover:bg-gray-700'
                            }`}
                          >
                            🎨 Background Change
                          </button>
                          <button
                            onClick={() => setActivePresetTab('restyle')}
                            className={`px-4 py-2 text-sm rounded-lg transition-colors border ${
                              activePresetTab === 'restyle' 
                                ? 'bg-purple-600 text-white border-purple-500' 
                                : 'bg-gray-800 text-white border-gray-600 hover:bg-gray-700'
                            }`}
                          >
                            🎭 Restyle
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Preset Content */}
                    {activePresetTab === 'shot' && (
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

                    {/* Background Change Tab */}
                    {activePresetTab === 'background' && (
                      <div className="mt-4 p-4 bg-green-900 bg-opacity-90 backdrop-blur-sm rounded-lg border border-green-600">
                        <h4 className="text-white text-sm font-medium mb-3 text-center">🎨 Background Removal & Replacement Options</h4>
                        
                        {/* Tab Navigation */}
                        <div className="flex flex-wrap gap-1 mb-4 p-1 bg-gray-800 rounded-lg">
                          <button
                            onClick={() => setActiveBackgroundTab('removal')}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              activeBackgroundTab === 'removal' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            🗑️ Removal
                          </button>
                          <button
                            onClick={() => setActiveBackgroundTab('studio')}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              activeBackgroundTab === 'studio' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            🏢 Studio
                          </button>
                          <button
                            onClick={() => setActiveBackgroundTab('natural')}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              activeBackgroundTab === 'natural' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            🌿 Natural
                          </button>
                          <button
                            onClick={() => setActiveBackgroundTab('indoor')}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              activeBackgroundTab === 'indoor' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            🏠 Indoor
                          </button>
                          <button
                            onClick={() => setActiveBackgroundTab('creative')}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              activeBackgroundTab === 'creative' 
                                ? 'bg-pink-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            🎨 Creative
                          </button>
                          <button
                            onClick={() => setActiveBackgroundTab('themed')}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              activeBackgroundTab === 'themed' 
                                ? 'bg-yellow-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            🎭 Themed
                          </button>
                          <button
                            onClick={() => setActiveBackgroundTab('style')}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              activeBackgroundTab === 'style' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            🎨 Style
                          </button>
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[200px]">
                          {activeBackgroundTab === 'removal' && (
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
                          )}

                          {activeBackgroundTab === 'studio' && (
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
                          )}

                          {activeBackgroundTab === 'natural' && (
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
                          )}

                          {activeBackgroundTab === 'indoor' && (
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
                          )}

                          {activeBackgroundTab === 'creative' && (
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
                          )}

                          {activeBackgroundTab === 'themed' && (
                          <div className="flex flex-wrap gap-2">
                              {BACKGROUND_PROMPTS.slice(46, 56).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                          )}

                          {activeBackgroundTab === 'style' && (
                            <div className="flex flex-wrap gap-2">
                              {BACKGROUND_PROMPTS.slice(56).map((example) => (
                                <button
                                  key={example}
                                  onClick={() => setPrompt(example)}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors"
                                >
                                  {example}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Restyle Tab */}
                    {activePresetTab === 'restyle' && (
                      <div className="mt-4 p-4 bg-purple-900 bg-opacity-90 backdrop-blur-sm rounded-lg border border-purple-600">
                        <h4 className="text-white text-sm font-medium mb-3 text-center">🎭 Character Style Presets</h4>
                        <p className="text-gray-300 text-xs text-center mb-4">Apply iconic character styles to transform your character</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {CHARACTER_STYLE_PROMPTS.map((style) => (
                            <button
                              key={style.name}
                              onClick={() => setPrompt(style.prompt)}
                              className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors text-left"
                            >
                              <h5 className="text-purple-400 font-medium text-sm mb-1">{style.name}</h5>
                              <p className="text-gray-300 text-xs leading-relaxed">{style.description}</p>
                            </button>
                          ))}
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
          </div>

            {/* Processing Mode Selection - Only show when not video and multiple images available */}
            {!hasVideoFiles && uploadedFiles.length >= 2 && (
              <div className="flex justify-center mb-4">
                <div className="bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg p-4 border border-gray-600">
                  <div className="text-center mb-3">
                    <h3 className="text-white text-sm font-medium mb-1">Choose Processing Mode:</h3>
                    <p className="text-gray-300 text-xs">
                      {processingMode === 'variations' 
                        ? "Generate multiple character variations from your images (Nano Banana)" 
                        : "Generate video from start frame (left) → end frame (right) transition (End Frame by Minimax)"
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setProcessingMode('variations')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        processingMode === 'variations'
                          ? 'bg-white text-black'
                          : 'bg-transparent text-white hover:bg-gray-700'
                      }`}
                    >
                      <Images className="w-4 h-4 inline mr-2" />
                      Character Variations
                    </button>
                    <button
                      onClick={() => setProcessingMode('endframe')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        processingMode === 'endframe'
                          ? 'bg-green-600 text-white'
                          : 'bg-transparent text-white hover:bg-green-600 hover:text-white'
                      }`}
                    >
                      <Camera className="w-4 h-4 inline mr-2" />
                      Start → End Video
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
          {error && (
            <div className="w-full max-w-4xl mx-auto px-4 mt-8">
              <div className="bg-red-900 bg-opacity-90 backdrop-blur-sm border border-red-700 rounded-lg p-4 mb-8">
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Results Section */}
          {variations.length > 0 && (
            <div className="w-full max-w-4xl mx-auto px-4 mt-8">
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
                        className="flex items-center gap-1 px-3 py-1 bg-white text-black rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm font-medium touch-manipulation min-h-[44px]"
                        style={{ touchAction: 'manipulation' }}
                        title="Download variation description"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Save</span>
                        <span className="sm:hidden">Save</span>
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

        {/* Mobile Gallery Backdrop */}
        {showGallery && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setShowGallery(false)} />
        )}
        
        {/* Gallery Panel */}
        {showGallery && (
          <div className="w-full lg:w-1/3 bg-gray-800 bg-opacity-90 backdrop-blur-sm border-t lg:border-t-0 lg:border-l border-gray-700 h-screen lg:h-screen overflow-y-auto fixed lg:relative top-0 right-0 z-50 lg:z-auto transform lg:transform-none transition-transform duration-300 ease-in-out">
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-2xl font-semibold flex items-center gap-2 text-white">
                  <Images className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  <span className="hidden sm:inline">Gallery</span>
                  <span className="sm:hidden">Gallery</span>
                  <span className="text-sm lg:text-base">({filteredGallery.length})</span>
                </h2>
                <div className="flex gap-1 lg:gap-2">
                  {/* Development-only duplicate fix button */}
                  {process.env.NODE_ENV === 'development' && (
                    <button
                      onClick={removeDuplicates}
                      className="flex items-center gap-1 px-2 lg:px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-xs lg:text-sm"
                      title="Remove duplicates (dev only)"
                    >
                      <Trash2 className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span className="hidden sm:inline">Fix Duplicates</span>
                    </button>
                  )}
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

              {/* Gallery Filter Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setGalleryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    galleryFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All ({gallery.length})
                </button>
                <button
                  onClick={() => setGalleryFilter('images')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    galleryFilter === 'images'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Images ({gallery.filter(item => item.imageUrl && !item.videoUrl).length})
                </button>
                <button
                  onClick={() => setGalleryFilter('videos')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    galleryFilter === 'videos'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Videos ({gallery.filter(item => item.videoUrl).length})
                </button>
              </div>

              {filteredGallery.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Images className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">
                    {galleryFilter === 'images' ? 'No images yet' : 
                     galleryFilter === 'videos' ? 'No videos yet' : 
                     'No variations yet'}
                  </p>
                  <p className="text-sm">
                    {galleryFilter === 'images' ? 'Generated images will appear here' : 
                     galleryFilter === 'videos' ? 'Generated videos will appear here' : 
                     'Generated character variations will appear here'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGallery.map((item: any, index: number) => {
                    // Create a more robust unique key that handles duplicates
                    const itemKey = `${item.id}-${item.timestamp}-${index}`;
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
                                  <div className="relative">
                                    {isValidVideoUrl(item.videoUrl) ? (
                                    <video
                                      key={`${item.videoUrl || 'no-url'}-${item.videoUrl && failedVideos.has(item.videoUrl) ? 'failed' : 'loading'}`}
                                      src={getProxiedVideoUrl(item.videoUrl)}
                                      className="w-full h-32 object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity bg-black"
                                      controls
                                      muted
                                      onClick={(e) => e.stopPropagation()}
                                      onError={(e) => {
                                        const videoElement = e.target as HTMLVideoElement;
                                        const error = videoElement.error;
                                        
                                        // Only log detailed errors in development
                                        if (process.env.NODE_ENV === 'development') {
                                        console.error('🎬 Video load error:', {
                                          error: error,
                                          errorCode: error?.code,
                                          errorMessage: error?.message,
                                          networkState: videoElement.networkState,
                                          readyState: videoElement.readyState,
                                          videoUrl: item.videoUrl,
                                          proxiedUrl: getProxiedVideoUrl(item.videoUrl),
                                          videoSrc: videoElement.src
                                        });
                                        }
                                        
                                        // Handle different error types with user-friendly messages
                                        if (error) {
                                          switch (error.code) {
                                            case MediaError.MEDIA_ERR_ABORTED:
                                              console.warn('🎬 Video loading was aborted');
                                               console.error('Network Error: Video loading was interrupted!');
                                              break;
                                            case MediaError.MEDIA_ERR_NETWORK:
                                              console.warn('🎬 Network error while loading video');
                                              console.error('Network Error: Network connection lost!');
                                              break;
                                            case MediaError.MEDIA_ERR_DECODE:
                                              console.warn('🎬 Video format not supported or corrupted');
                                              console.error('Legacy video format error - silent handling');
                                              break;
                                            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                                              console.warn('🎬 Video format not supported');
                                              console.error('Legacy video format error - silent handling');
                                              break;
                                            default:
                                              console.warn('🎬 Unknown video error');
                                               console.error('Network Error: Something went wrong!');
                                          }
                                        } else {
                                          console.warn('🎬 Video failed to load (no error details)');
                                          console.error('Network Error: Video failed to load!');
                                        }
                                        
                                        // Track this video as failed
                                        if (item.videoUrl) {
                                          setFailedVideos(prev => new Set(prev).add(item.videoUrl!));
                                        }
                                      }}
                                      onLoadStart={() => console.log('🎬 Video loading started:', item.videoUrl)}
                                      onCanPlay={() => console.log('🎬 Video can play:', item.videoUrl)}
                                    />
                                    ) : (
                                      <div className="w-full h-32 bg-gray-800 rounded-lg flex items-center justify-center">
                                        <div className="text-center text-gray-400">
                                          <div className="text-sm font-medium mb-1">Invalid Video URL</div>
                                          <div className="text-xs">URL format not supported</div>
                                        </div>
                                      </div>
                                    )}
                                    {/* Video status info */}
                                    <div className="text-xs text-gray-400 mt-1">
                                      {item.videoUrl ? (
                                        isValidVideoUrl(item.videoUrl) ? (
                                          <span className="text-green-400">✓ Valid video URL</span>
                                        ) : (
                                          <span className="text-yellow-400">⚠ Invalid video URL format</span>
                                        )
                                      ) : (
                                        <span className="text-red-400">✗ No video URL</span>
                                      )}
                                    </div>
                                    {/* Fallback for failed video loads */}
                                    {failedVideos.has(item.videoUrl) && (
                                      <div className="absolute inset-0 bg-gray-800 bg-opacity-75 rounded-lg flex items-center justify-center">
                                        <div className="text-center text-white">
                                          <div className="text-sm font-medium mb-2">Video failed to load</div>
                                          <div className="text-xs text-gray-300 mb-3">
                                            This may be due to network issues or video format compatibility
                                          </div>
                                          <div className="flex gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (item.videoUrl) {
                                                retryVideo(item.videoUrl);
                                              }
                                            }}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                                          >
                                            Retry
                                          </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (item.videoUrl) {
                                                  window.open(item.videoUrl, '_blank');
                                                }
                                              }}
                                              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                                            >
                                              Open in New Tab
                                          </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
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
                                  className="flex-1 flex items-center justify-center gap-1 px-3 py-3 bg-white text-black rounded hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm font-medium touch-manipulation min-h-[44px]"
                                  style={{ touchAction: 'manipulation' }}
                                >
                                  <Download className="w-4 h-4" />
                                  <span className="hidden sm:inline">Download Video</span>
                                  <span className="sm:hidden">Download</span>
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
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-3 bg-white text-black rounded hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm font-medium touch-manipulation min-h-[44px]"
                                    style={{ touchAction: 'manipulation' }}
                                  >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Download</span>
                                    <span className="sm:hidden">Save</span>
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

      {/* Prompt Guide Modal */}
      {showPromptGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">📸 Prompt Guide: Camera Angles & Background Changes</h2>
                <button
                  onClick={() => setShowPromptGuide(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6 text-gray-300">
                {/* Understanding Camera Angles */}
                <section>
                  <h3 className="text-xl font-semibold text-white mb-3">🎯 Understanding Camera Angles</h3>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium text-green-400 mb-2">✅ What Works Best:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Images with environmental context (characters in rooms, landscapes, scenes)</li>
                      <li>Images with clear ground planes (floors, surfaces, horizons)</li>
                      <li>Images with spatial relationships (objects in environments)</li>
                    </ul>
                    
                    <h4 className="font-medium text-red-400 mb-2 mt-4">❌ What Doesn&apos;t Work Well:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Single isolated objects (skulls, floating heads, objects without context)</li>
                      <li>Flat images (logos, text, 2D graphics)</li>
                      <li>Images without spatial reference (close-ups without environment)</li>
                    </ul>
                  </div>
                </section>

                {/* Camera Angle Presets */}
                <section>
                  <h3 className="text-xl font-semibold text-white mb-3">📐 Camera Angle Presets Explained</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-400 mb-2">🐛 Worm&apos;s Eye View</h4>
                      <p className="mb-2"><strong>Best for:</strong> Characters or objects in environments with clear ground planes</p>
                      <div className="space-y-1">
                        <p className="text-green-400">✅ &quot;Worm&apos;s eye view of a character standing in a modern living room&quot;</p>
                        <p className="text-green-400">✅ &quot;Low angle looking up at a person in a forest clearing&quot;</p>
                        <p className="text-red-400">❌ &quot;Worm&apos;s eye view of a skull&quot; (no spatial context)</p>
                      </div>
                      <p className="text-sm text-gray-400 mt-2"><strong>Why it works:</strong> Needs a ground plane and spatial context to create the dramatic low-angle perspective.</p>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-400 mb-2">👤 Side Profile</h4>
                      <p className="mb-2"><strong>Best for:</strong> Any character or object with clear side features</p>
                      <div className="space-y-1">
                        <p className="text-green-400">✅ &quot;Side profile of a character looking left&quot;</p>
                        <p className="text-green-400">✅ &quot;Profile view of a person in a park&quot;</p>
                      </div>
                      <p className="text-sm text-gray-400 mt-2"><strong>Why it works:</strong> Works with most images as it focuses on the side features.</p>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-400 mb-2">📐 3/4 Angle View</h4>
                      <p className="mb-2"><strong>Best for:</strong> Characters or objects where you want to show depth</p>
                      <div className="space-y-1">
                        <p className="text-green-400">✅ &quot;3/4 angle of a character in a studio&quot;</p>
                        <p className="text-green-400">✅ &quot;Three-quarter view of a person in an office&quot;</p>
                      </div>
                      <p className="text-sm text-gray-400 mt-2"><strong>Why it works:</strong> Creates depth and dimension by showing multiple sides.</p>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-400 mb-2">🔙 Back View</h4>
                      <p className="mb-2"><strong>Best for:</strong> Characters or objects with interesting back features</p>
                      <div className="space-y-1">
                        <p className="text-green-400">✅ &quot;Back view of a character walking away&quot;</p>
                        <p className="text-green-400">✅ &quot;Rear perspective of a person in a hallway&quot;</p>
                      </div>
                      <p className="text-sm text-gray-400 mt-2"><strong>Why it works:</strong> Focuses on the back features and creates mystery.</p>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-400 mb-2">📉 Low Angle View</h4>
                      <p className="mb-2"><strong>Best for:</strong> Any character or object (more flexible than worm&apos;s eye)</p>
                      <div className="space-y-1">
                        <p className="text-green-400">✅ &quot;Low angle view of a character&quot;</p>
                        <p className="text-green-400">✅ &quot;Looking up at a person&quot;</p>
                      </div>
                      <p className="text-sm text-gray-400 mt-2"><strong>Why it works:</strong> More flexible than worm&apos;s eye view, works with most images.</p>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-400 mb-2">📈 High Angle View</h4>
                      <p className="mb-2"><strong>Best for:</strong> Characters or objects where you want to show the top</p>
                      <div className="space-y-1">
                        <p className="text-green-400">✅ &quot;High angle view of a character&quot;</p>
                        <p className="text-green-400">✅ &quot;Looking down at a person&quot;</p>
                      </div>
                      <p className="text-sm text-gray-400 mt-2"><strong>Why it works:</strong> Shows the top features and creates a different perspective.</p>
                    </div>
                  </div>
                </section>

                {/* Background Changes */}
                <section>
                  <h3 className="text-xl font-semibold text-white mb-3">🎨 Background Change Presets</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-400 mb-2">🗑️ Background Removal</h4>
                      <p className="mb-2"><strong>Best for:</strong> Any image where you want to isolate the subject</p>
                      <div className="space-y-1">
                        <p className="text-green-400">✅ &quot;Remove the background, keep only the character&quot;</p>
                        <p className="text-green-400">✅ &quot;Transparent background, focus on the subject&quot;</p>
                      </div>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-400 mb-2">🔄 Background Replacement</h4>
                      <p className="mb-2"><strong>Best for:</strong> Images with clear subjects that can be separated from background</p>
                      <div className="space-y-1">
                        <p className="text-green-400">✅ &quot;Change background to a modern office&quot;</p>
                        <p className="text-green-400">✅ &quot;Replace background with a forest scene&quot;</p>
                      </div>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-400 mb-2">🌍 Environmental Context</h4>
                      <p className="mb-2"><strong>Best for:</strong> Adding spatial context to isolated objects</p>
                      <div className="space-y-1">
                        <p className="text-green-400">✅ &quot;Place the character in a luxurious hotel lobby&quot;</p>
                        <p className="text-green-400">✅ &quot;Add the object to a modern kitchen counter&quot;</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Pro Tips */}
                <section>
                  <h3 className="text-xl font-semibold text-white mb-3">💡 Pro Tips</h3>
                  
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-400 mb-2">For Camera Angles:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Think about the environment - What would the camera be standing on?</li>
                      <li>Consider the subject&apos;s position - Are they standing, sitting, or in a specific pose?</li>
                      <li>Add spatial context - Include environmental details in your prompt</li>
                      <li>Use descriptive language - &quot;character standing in a room&quot; vs just &quot;character&quot;</li>
                    </ul>
                  </div>

                  <div className="bg-gray-800 p-4 rounded-lg mt-4">
                    <h4 className="font-medium text-yellow-400 mb-2">Combining Both:</h4>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Start with the environment - &quot;Character in a modern living room&quot;</li>
                      <li>Add the camera angle - &quot;from a low angle looking up&quot;</li>
                      <li>Include the pose - &quot;character standing confidently&quot;</li>
                      <li>Add details - &quot;with dramatic lighting and shadows&quot;</li>
                    </ol>
                  </div>
                </section>

                {/* Quick Reference */}
                <section>
                  <h3 className="text-xl font-semibold text-white mb-3">🎯 Quick Reference</h3>
                  
                  <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-2 text-white">Camera Angle</th>
                          <th className="text-left py-2 text-white">Best For</th>
                          <th className="text-left py-2 text-white">Needs Environment?</th>
                          <th className="text-left py-2 text-white">Example</th>
                        </tr>
                      </thead>
                      <tbody className="space-y-2">
                        <tr className="border-b border-gray-700">
                          <td className="py-2 text-blue-400">Worm&apos;s Eye View</td>
                          <td className="py-2">Characters in scenes</td>
                          <td className="py-2 text-green-400">✅ Yes</td>
                          <td className="py-2">&quot;Character in a room, looking up&quot;</td>
                        </tr>
                        <tr className="border-b border-gray-700">
                          <td className="py-2 text-blue-400">Side Profile</td>
                          <td className="py-2">Any character</td>
                          <td className="py-2 text-red-400">❌ No</td>
                          <td className="py-2">&quot;Side view of a person&quot;</td>
                        </tr>
                        <tr className="border-b border-gray-700">
                          <td className="py-2 text-blue-400">3/4 Angle</td>
                          <td className="py-2">Showing depth</td>
                          <td className="py-2 text-yellow-400">⚠️ Helpful</td>
                          <td className="py-2">&quot;Angled view of a character&quot;</td>
                        </tr>
                        <tr className="border-b border-gray-700">
                          <td className="py-2 text-blue-400">Back View</td>
                          <td className="py-2">Interesting backs</td>
                          <td className="py-2 text-red-400">❌ No</td>
                          <td className="py-2">&quot;Rear view of a person&quot;</td>
                        </tr>
                        <tr className="border-b border-gray-700">
                          <td className="py-2 text-blue-400">Low Angle</td>
                          <td className="py-2">Most subjects</td>
                          <td className="py-2 text-yellow-400">⚠️ Helpful</td>
                          <td className="py-2">&quot;Looking up at a character&quot;</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-blue-400">High Angle</td>
                          <td className="py-2">Top features</td>
                          <td className="py-2 text-yellow-400">⚠️ Helpful</td>
                          <td className="py-2">&quot;Looking down at a person&quot;</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Troubleshooting */}
                <section>
                  <h3 className="text-xl font-semibold text-white mb-3">🔧 Troubleshooting</h3>
                  
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium text-orange-400 mb-2">If your results aren&apos;t what you expected:</h4>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Check your image - Does it have the right context for your requested angle?</li>
                      <li>Simplify your prompt - Remove complex instructions and focus on the basics</li>
                      <li>Add environmental context - Include details about the setting</li>
                      <li>Try a different angle - Some angles work better with certain images</li>
                      <li>Be more specific - &quot;Character standing in a modern office&quot; vs &quot;Character&quot;</li>
                    </ol>
                  </div>
                </section>
              </div>
            </div>
          </div>
          
          {/* User Counter - Moved to bottom */}
          <div className="w-full max-w-4xl mx-auto px-4 mb-6">
            <UserCounter />
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