'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, Download, Loader2, RotateCcw, Camera, Sparkles, Images, X, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit, MessageCircle, HelpCircle, ArrowRight, ArrowUp, FolderOpen, Grid3X3, User } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import type { UploadedFile, UploadedImage, ProcessingState, CharacterVariation, RunwayVideoRequest, RunwayVideoResponse, RunwayTaskResponse, EndFrameRequest, EndFrameResponse } from '@/types/gemini';

// Generation mode types
type GenerationMode = 
  | 'nano-banana' 
  | 'runway-t2i' 
  | 'runway-video'
  | 'veo3-fast' 
  | 'minimax-2.0'
  | 'minimax-video'
  | 'kling-2.1-master'
  | 'veo3-fast-t2v'
  | 'minimax-2-t2v'
  | 'kling-2.1-master-t2v'
  | 'seedance-pro'
  | 'seedance-pro-t2v';
import AnimatedError from '@/components/AnimatedError';
import { useAnimatedError } from '@/hooks/useAnimatedError';
import { useAuth } from '@/contexts/AuthContext';
import { HelpModal } from '@/components/HelpModal';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useUserGallery } from '@/hooks/useUserGallery';
import { getProxiedImageUrl } from '@/lib/imageUtils';
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
  'Change background to spooky lake setting - Horror Movie Filter',
  'Change background to dark neighborhood street - Horror Movie preset',
  'Change background to suburban Halloween setting - Horror Movie Filter',
  'Change background to eerie house exterior - Horror Movie preset',
  'Change background to mysterious hotel exterior - Horror Movie Filter',
  'Change background to vintage motel setting - Horror Movie preset',
  'Change background to small town setting - Horror Movie Filter',
  'Change background to foggy street scene - Horror Movie preset',
  'Change background to misty graveyard - Horror Movie Filter',
  'Change background to abandoned building with lights - Horror Movie preset',
  'Change background to forest cabin setting - Horror Movie Filter',
  'Change background to Victorian mansion exterior - Horror Movie preset',
  
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
    description: 'Small, blue, communal beings from the Smurfs franchise, each with a distinct trait - can be cartoon or realistic style.',
    prompt: 'Transform character into Smurfs style while preserving user\'s original vision and prompt details'
  },
  {
    name: 'The Vary Bears',
    description: 'Colorful, emotional-themed bears from the 1980s franchise who spread caring and positivity - can be cartoon or realistic style.',
    prompt: 'Transform character into Care Bears style while maintaining user\'s specific prompt requirements and character details'
  },
  {
    name: 'The Vary Gummies',
    description: 'Magical, medieval bear characters from Disney\'s Adventures of the Gummi Bears - can be cartoon or realistic style.',
    prompt: 'Transform character into Gummi Bears style while preserving user\'s original prompt and character specifications'
  },
  {
    name: 'The Muppets',
    description: 'Beloved puppet characters from Jim Henson\'s iconic franchise, with distinctive felt puppet aesthetic - can be cartoon or realistic style.',
    prompt: 'Transform character into Muppets style while adhering to user\'s prompt details and maintaining character essence'
  },
  {
    name: 'Anime Style',
    description: 'Authentic Japanese anime drawing style inspired by famous anime artists like Hayao Miyazaki, Akira Toriyama, and Osamu Tezuka.',
    prompt: 'Transform character into authentic Japanese anime drawing style in the artistic tradition of Hayao Miyazaki, Akira Toriyama, and Osamu Tezuka - create as a hand-drawn anime illustration, not realistic photo while preserving user\'s original prompt and character vision'
  },
  {
    name: 'Japanese Manga Style',
    description: 'Traditional Japanese manga drawing style inspired by legendary manga artists like Eiichiro Oda, Masashi Kishimoto, and Kentaro Miura.',
    prompt: 'Transform character into authentic Japanese manga drawing style in the artistic tradition of Eiichiro Oda, Masashi Kishimoto, and Kentaro Miura - create as a hand-drawn manga illustration, not realistic photo while maintaining user\'s specific prompt requirements and character details'
  },
  {
    name: 'Hellraiser',
    description: 'Realistic live-action gothic horror aesthetic featuring dark, leather-clad, and atmospheric styling.',
    prompt: 'Make into Pinhead from Hellraiser style while preserving user\'s original prompt and character vision'
  },
  {
    name: 'Nightmare on Elm Street',
    description: 'Photo-realistic dark fantasy styling featuring twisted, dreamlike, and atmospheric aesthetics.',
    prompt: 'Make into Freddy Krueger style while adhering to user\'s prompt details and maintaining character essence'
  },
  {
    name: 'Friday the 13th',
    description: 'Realistic live-action classic horror aesthetic featuring campy, dark, and suspenseful styling.',
    prompt: 'Make into Jason Voorhees style while preserving user\'s original prompt and character specifications'
  },
  {
    name: 'Garbage Pail Kids',
    description: 'Photo-realistic parody trading card aesthetic featuring exaggerated, humorous, and quirky character designs like actual Garbage Pail Kids cards.',
    prompt: 'Transform character into realistic Garbage Pail Kids trading card style with gross-out parody elements while maintaining user\'s prompt details'
  },
  {
    name: 'Gremlins',
    description: 'Realistic live-action version of mischievous creatures from the Gremlins franchise, featuring small, furry, and playful character designs.',
    prompt: 'Transform character into realistic Gremlins style while preserving user\'s original vision and prompt details'
  },
  {
    name: 'The Varyfiers',
    description: 'Photo-realistic dark horror aesthetic featuring intense, atmospheric, and dramatic visual styling.',
    prompt: 'Transform character into Terrifier style while maintaining user\'s specific prompt requirements and character details'
  },
  {
    name: 'The Animaniacs',
    description: 'Realistic live-action version of classic Warner Bros. animation style featuring zany, colorful, and comedic character designs.',
    prompt: 'Transform character into realistic Animaniacs style while adhering to user\'s prompt details and maintaining character essence'
  },
  {
    name: 'The Simpsons',
    description: 'Photo-realistic version of iconic yellow-skinned characters from Matt Groening\'s The Simpsons, with realistic character designs.',
    prompt: 'Transform character into realistic Simpsons style while preserving user\'s original prompt and character vision'
  },
  {
    name: 'Family Guy',
    description: 'Realistic live-action version of adult animation style from Seth MacFarlane\'s Family Guy, with realistic character designs.',
    prompt: 'Transform character into realistic Family Guy style while maintaining user\'s specific prompt requirements and character details'
  },
  {
    name: 'Adventure Time',
    description: 'Photo-realistic version of whimsical animation style from Pendleton Ward\'s Adventure Time, with realistic fantastical character designs.',
    prompt: 'Transform character into realistic Adventure Time style while preserving user\'s original prompt and character specifications'
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
    'Change the props to include tactical gear and equipment',
    'Change the props to include survival equipment',
    'Change the props to include high-tech gadgets',
    'Change the props to include adventure vehicles',
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
    'Change the props to include enchanted armor and shields',
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
    'Change the scene to a space adventure with laser effects',
    'Change the scene to a time travel experiment',
    'Change the scene to an alien first contact meeting',
    'Change the scene to a cybernetic enhancement procedure',
    'Change the scene to a virtual reality adventure',
    'Change the props to include futuristic gadgets and tools',
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
  const router = useRouter();
  const pathname = usePathname();
  
  // Note: Automatic duplicate removal removed to prevent infinite loop
  // Use the "Fix Duplicates" button in development mode if needed
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentStep: ''
  });

  // Generation time estimation state
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  const [variations, setVariations] = useState<CharacterVariation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'images' | 'videos'>('all');
  
  // Mobile image display state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [displayedImages, setDisplayedImages] = useState<string[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  
  // Authentication UI state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [showExtendedPrompts, setShowExtendedPrompts] = useState(false);
  const [showVideoPrompts, setShowVideoPrompts] = useState(false);
  const [showBackgroundPrompts, setShowBackgroundPrompts] = useState(false);
  const [activePresetTab, setActivePresetTab] = useState<'shot' | 'background' | 'restyle' | null>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [activeBackgroundTab, setActiveBackgroundTab] = useState<'removal' | 'studio' | 'natural' | 'indoor' | 'creative' | 'themed' | 'style'>('removal');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode | null>(null);
  

  // User stats state for App Performance Analytics
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsers24h: 0,
    totalGenerations: 0,
    recentActivity: 0,
    usageBreakdown: {
      image_generations: 6910,
      video_generations: 40,
      character_variations: 0,
      background_changes: 0,
      nano_banana: 6910,
      runway_aleph: 0,
      minimax_endframe: 0,
      gemini: 0
    },
    growthRates: {
      daily: '10.64',
      weekly: '25.00'
    },
    engagement: {
      avgGenerationsPerUser: '147.0',
      activeUserPercentage: '25.5'
    },
    lastUpdated: new Date().toISOString(),
    period: 'Loading...'
  });

  const [selectedVideoGenre, setSelectedVideoGenre] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState<number>(0);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [runwayTaskId, setRunwayTaskId] = useState<string | null>(null);


  // Fetch user stats data for App Performance Analytics
  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user-stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setUserStats(data.data);
      } else {
        console.warn('User stats API returned unsuccessful response:', data);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Don't throw the error, just log it to prevent breaking the app
      // The userStats state will keep its default values
    }
  };


  // Fetch data on component mount
  useEffect(() => {
    fetchUserStats();
    // Refresh every 2 minutes to keep stats updated
    const interval = setInterval(() => {
      fetchUserStats();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Scroll detection for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const galleryContainer = document.querySelector('.gallery-container');
      if (galleryContainer) {
        const scrollTop = galleryContainer.scrollTop;
        setShowScrollToTop(scrollTop > 300);
      }
    };

    const galleryContainer = document.querySelector('.gallery-container');
    if (galleryContainer) {
      galleryContainer.addEventListener('scroll', handleScroll);
      return () => galleryContainer.removeEventListener('scroll', handleScroll);
    }
  }, [showGallery]);

  // Add error boundary for fetchUserStats to prevent app crashes
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && event.reason.message.includes('fetch')) {
        console.warn('Caught unhandled fetch rejection:', event.reason);
        event.preventDefault(); // Prevent the error from crashing the app
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
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

  // Generation time estimation functions
  const getEstimatedTimeForMode = (mode: GenerationMode): number => {
    const timeEstimates = {
      'nano-banana': 15, // 15 seconds for character variations
      'runway-t2i': 30, // 30 seconds for text-to-image
      'runway-video': 60, // 1 minute for runway video
      'veo3-fast': 45, // 45 seconds for image-to-video
      'minimax-2.0': 120, // 2 minutes for minimax video
      'minimax-video': 120, // 2 minutes for minimax video
      'kling-2.1-master': 90, // 1.5 minutes for kling video
      'veo3-fast-t2v': 60, // 1 minute for text-to-video
      'minimax-2-t2v': 150, // 2.5 minutes for minimax t2v
      'kling-2.1-master-t2v': 120, // 2 minutes for kling t2v
      'seedance-pro': 45, // 45 seconds for seedance pro
      'seedance-pro-t2v': 60 // 1 minute for seedance pro t2v
    };
    return timeEstimates[mode] || 30;
  };

  const startGenerationTimer = (mode: GenerationMode) => {
    const estimated = getEstimatedTimeForMode(mode);
    setEstimatedTime(estimated);
    setTimeRemaining(estimated);
    setGenerationStartTime(Date.now());
  };

  const updateGenerationTimer = () => {
    if (generationStartTime && estimatedTime) {
      const elapsed = Math.floor((Date.now() - generationStartTime) / 1000);
      const remaining = Math.max(0, estimatedTime - elapsed);
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        // Generation is taking longer than estimated
        setTimeRemaining(null);
      }
    }
  };

  const stopGenerationTimer = () => {
    setEstimatedTime(null);
    setTimeRemaining(null);
    setGenerationStartTime(null);
  };

  // Timer effect for countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (processing.isProcessing && timeRemaining !== null) {
      interval = setInterval(updateGenerationTimer, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [processing.isProcessing, timeRemaining, generationStartTime, estimatedTime]);

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
  const showAnimatedErrorNotification = useCallback((message: string, errorType: 'farting-man' | 'mortal-kombat' | 'bouncing-error' | 'shake-error' | 'toasty' | 'success' = 'toasty') => {
    // Mobile-specific error handling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && message.includes('User Error')) {
      // Make mobile errors more user-friendly
      message = message.replace('User Error: ', 'Mobile Tip: ');
    }
    
    if (errorType === 'success') {
      showNotification(message, 'success');
    } else {
    showAnimatedError(message, errorType);
    }
  }, [showAnimatedError, showNotification]);

  // Determine generation mode based on uploaded files
  const determineGenerationMode = useCallback((): GenerationMode | null => {
    const hasImages = uploadedFiles.some(file => file.fileType === 'image');
    const hasVideos = uploadedFiles.some(file => file.fileType === 'video');
    
    if (hasImages && uploadedFiles.length === 1) {
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
    
    if (hasImages) {
      if (uploadedFiles.length === 1) {
        // Single image - character variation models
      modes.push('nano-banana');
      // modes.push('veo3-fast'); // DISABLED: Veo3 Fast temporarily disabled in production
      modes.push('minimax-2.0'); // Image-to-video with Minimax 2.0
        modes.push('minimax-video'); // Image-to-video with Minimax Video
      modes.push('kling-2.1-master'); // Image-to-video with Kling 2.1 Master
        modes.push('seedance-pro'); // Image-to-video with Seedance Pro
      } else if (uploadedFiles.length >= 2) {
        // Multiple images - end frame models
        modes.push('nano-banana'); // Can still do character variations
        modes.push('minimax-2.0'); // End frame generation with Mini Mac's End Frame
        modes.push('minimax-video'); // End frame generation with Minimax Video
        modes.push('kling-2.1-master'); // End frame generation with Kling 2.1 Master
        modes.push('seedance-pro'); // End frame generation with Seedance Pro
      }
    }
    
    // Add text-to-video modes when no images are uploaded
    if (!hasImages && !hasVideos) {
      modes.push('runway-video'); // Text-to-video with Runway
      modes.push('veo3-fast-t2v'); // Text-to-video with Veo3 Fast
      modes.push('minimax-2-t2v'); // Text-to-video with Minimax 2.0
      modes.push('kling-2.1-master-t2v'); // Text-to-video with Kling 2.1 Master
      modes.push('seedance-pro-t2v'); // Text-to-video with Seedance Pro
    }
    
    return modes;
  }, [uploadedFiles]);

  // Get display name for generation mode
  const getModelDisplayName = useCallback((mode: GenerationMode): string => {
    const displayNames: Record<GenerationMode, string> = {
      'nano-banana': 'Nana Banana',
      'runway-t2i': 'Runway T2I',
      'runway-video': 'Runway Video',
      'veo3-fast': 'Veo3 Fast',
      'minimax-2.0': 'MiniMax End Frame',
      'minimax-video': 'Minimax Video',
      'kling-2.1-master': 'Kling 2.1 Master',
      'veo3-fast-t2v': 'Veo3 Fast T2V',
      'minimax-2-t2v': 'Minimax 2.0 T2V',
      'kling-2.1-master-t2v': 'Kling 2.1 Master T2V',
      'seedance-pro': 'Seedance Pro',
      'seedance-pro-t2v': 'Seedance Pro T2V'
    };
    return displayNames[mode] || mode;
  }, []);

  // Mobile image display handlers
  const handleSwipeLeft = useCallback(() => {
    if (currentImageIndex < displayedImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  }, [currentImageIndex, displayedImages.length]);

  const handleSwipeRight = useCallback(() => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  }, [currentImageIndex]);

  // Simulate slow image appearance during generation
  useEffect(() => {
    if (isGeneratingImages && variations.length > 0) {
      setDisplayedImages([]);
      setCurrentImageIndex(0);
      
      variations.forEach((variation, index) => {
        setTimeout(() => {
          setDisplayedImages(prev => [...prev, variation.imageUrl || variation.videoUrl || '']);
        }, (index + 1) * 2000); // 2 second delay between each image
      });
    }
  }, [isGeneratingImages, variations]);

  // Stop generation animation when processing is complete
  useEffect(() => {
    if (!processing.isProcessing && isGeneratingImages) {
      // Add a delay to ensure all images have appeared
      setTimeout(() => {
        setIsGeneratingImages(false);
      }, 1000);
    }
  }, [processing.isProcessing, isGeneratingImages]);

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

  // Gallery navigation functions
  const navigateImage = useCallback((direction: number) => {
    if (galleryImagesWithUrls.length === 0) return;
    
    setFullScreenImageIndex(prev => {
      const newIndex = prev + direction;
      if (newIndex < 0) return galleryImagesWithUrls.length - 1;
      if (newIndex >= galleryImagesWithUrls.length) return 0;
      return newIndex;
    });
  }, [galleryImagesWithUrls.length]);

  // Delete from gallery function
  const handleDeleteFromGallery = useCallback(async (id: string) => {
    try {
      // Find the item in gallery and remove it
      const itemToRemove = gallery.find(item => item.id === id);
      if (itemToRemove) {
        removeFromGallery(itemToRemove.id, itemToRemove.timestamp);
        showAnimatedErrorNotification('Image deleted from gallery', 'success');
      }
    } catch (error) {
      console.error('Error deleting from gallery:', error);
      showAnimatedErrorNotification('Error deleting image from gallery', 'toasty');
    }
  }, [removeFromGallery, gallery]);

  const scrollToTop = () => {
    const galleryContainer = document.querySelector('.gallery-container');
    if (galleryContainer) {
      galleryContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  
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
    const nextItem = galleryImagesWithUrls[newIndex];
    setFullScreenImage(nextItem.videoUrl || nextItem.imageUrl!);
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

  // Mobile-specific file upload handler for the new upload slots system
  const handleMobileFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check if we can add more files
      if (uploadedFiles.length >= 4) {
        showNotification('Maximum 4 images allowed', 'error');
        return;
      }
      
      // Check file size
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showNotification('File too large. Please use files under 10MB.', 'error');
        return;
      }
      
      // Create new uploaded file object
      const newFile: UploadedFile = {
        file,
        preview: URL.createObjectURL(file),
        base64: '', // Will be populated later if needed
        type: 'reference', // Default type
        fileType: file.type.startsWith('video/') ? 'video' : 'image'
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
    }
    
    // Reset the input value
    e.target.value = '';
  }, [uploadedFiles.length, showNotification]);

  const handleProcessCharacter = async () => {
    if (uploadedFiles.length === 0 || !prompt.trim()) {
      setError('Please upload at least one file and enter a variation prompt');
      return;
    }

    setError(null);
    setVariations([]);
    
    // Start generation timer
    startGenerationTimer('nano-banana');
    
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

  // Route to correct handler based on selected model
  const handleModelGeneration = async () => {
    if (!generationMode) {
      showAnimatedErrorNotification('User Error: Please select a model first! TOASTY!', 'toasty');
      return;
    }

    switch (generationMode) {
      case 'nano-banana':
        await handleCharacterVariation();
        break;
      case 'minimax-2.0':
        // MiniMax End Frame - requires 2 images, uses older /api/endframe infrastructure
        await handleEndFrameGeneration();
        break;
      case 'minimax-video':
        // MiniMax Image-to-Video - single image, uses newer /api/minimax-2 infrastructure
        await handleMinimax2Generation();
        break;
      case 'kling-2.1-master':
        await handleKlingMasterGeneration();
        break;
      case 'seedance-pro':
        await handleEndFrameGeneration();
        break;
      default:
        await handleCharacterVariation();
        break;
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
          
          // Clear input after successful generation
          setPrompt('');
          setUploadedFiles([]);
          console.log('🧹 Cleared input after successful character variation generation');
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
          stopGenerationTimer();
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
      stopGenerationTimer();
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
          
          // Clear input after successful generation
          setPrompt('');
          setUploadedFiles([]);
          console.log('🧹 Cleared input after successful video generation');
          
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
        
        // Clear input after successful generation
        setPrompt('');
        setUploadedFiles([]);
        console.log('🧹 Cleared input after successful EndFrame video generation');
        
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
      showAnimatedErrorNotification(`User Error: ${errorMessage} TOASTY!`, 'toasty');
      
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
        
        // Create 4 variation objects for the 2x2 grid
        const generatedVariations: CharacterVariation[] = Array.from({ length: 4 }, (_, index) => ({
          id: `t2i-${Date.now()}-${index}`,
          description: `Generated: ${originalPrompt}`,
          angle: 'Text-to-Image',
          pose: 'AI Generated',
          imageUrl: data.imageUrl, // Use the same image for all 4 slots for now
          fileType: 'image'
        }));

        // Set variations for 2x2 grid display
        setVariations(generatedVariations);
        setIsGeneratingImages(true);

        // Track usage
        await trackUsage('image_generation', 'runway_aleph', {
          prompt: originalPrompt,
          has_style_reference: !!styleReference,
          service: 'runway_t2i'
        });

        // Add to gallery
        await addToGallery(generatedVariations, originalPrompt);
        
        // Clear input after successful generation
        setPrompt('');
        setUploadedFiles([]);
        console.log('🧹 Cleared input after successful text-to-image generation');
        
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
        progress: 20,
        currentStep: 'Uploading image to Supabase...'
      });

      // Upload image to Supabase Storage first
      const uploadResponse = await fetch('/api/supabase-upload', {
        method: 'POST',
        body: imageFile.file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to storage');
      }

      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.url;

      setProcessing({
        isProcessing: true,
        progress: 40,
        currentStep: 'Transferring image to FAL AI...'
      });

      // Transfer image from Supabase to FAL AI
      const transferResponse = await fetch('/api/supabase-to-fal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ supabaseUrl: imageUrl }),
      });

      if (!transferResponse.ok) {
        const errorText = await transferResponse.text();
        console.error('❌ Supabase to FAL transfer failed:', transferResponse.status, errorText);
        throw new Error(`Failed to transfer image to FAL AI: ${transferResponse.status} - ${errorText}`);
      }

      const transferData = await transferResponse.json();
      const falImageUrl = transferData.url;

      setProcessing({
        isProcessing: true,
        progress: 60,
        currentStep: 'Generating video with Veo3 Fast...'
      });

      const response = await fetch('/api/veo3-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image_url: falImageUrl,
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
        // Check if it's a balance-related error
        if (data.balanceStatus === 'low') {
          showAnimatedErrorNotification(`FAL AI Balance Low: ${data.balanceError || 'Insufficient credits for generation'} TOASTY!`, 'toasty');
        } else {
          showAnimatedErrorNotification(`Veo3 Fast Error: ${data.error || 'Failed to generate video'} TOASTY!`, 'toasty');
        }
        throw new Error(data.error || 'Failed to generate video');
      }

      // Log balance information
      if (data.balanceStatus) {
        console.log(`💰 FAL AI Balance Status: ${data.balanceStatus}`);
        if (data.balanceError) {
          console.log(`⚠️ Balance Error: ${data.balanceError}`);
        }
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

      // Clear input after successful generation
      setPrompt('');
      setUploadedFiles([]);
      console.log('🧹 Cleared input after successful Veo3 Fast generation');

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
    
    // Start generation timer
    startGenerationTimer('minimax-2.0');

    try {
      setProcessing({
        isProcessing: true,
        progress: 20,
        currentStep: 'Converting image to base64...'
      });

      // Upload image to Supabase Storage first (production-optimized pipeline)
      console.log('🔄 Uploading image to Supabase Storage...');
      console.log('📸 Original image preview URL:', imageFile.preview);
      
      const imageBlob = await fetch(imageFile.preview).then(r => r.blob());
      console.log('📦 Image blob size:', imageBlob.size, 'bytes, type:', imageBlob.type);
      
      const imageFileObj = new File([imageBlob], 'image.jpg', { type: 'image/jpeg' });
      console.log('📁 File object created:', imageFileObj.name, imageFileObj.size, 'bytes');
      
      // Upload to Supabase Storage
      const supabaseUploadResponse = await fetch('/api/supabase-upload', {
        method: 'POST',
        body: imageFileObj,
      });
      
      if (!supabaseUploadResponse.ok) {
        const errorText = await supabaseUploadResponse.text();
        console.error('❌ Supabase upload failed:', supabaseUploadResponse.status, errorText);
        throw new Error('Failed to upload image to Supabase Storage');
      }
      
      const { url: supabaseUrl } = await supabaseUploadResponse.json();
      console.log('✅ Image uploaded to Supabase Storage:', supabaseUrl);
      
      // Transfer from Supabase to FAL for video generation
      console.log('🔄 Transferring image from Supabase to FAL...');
      const falTransferResponse = await fetch('/api/supabase-to-fal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseUrl: supabaseUrl,
          sessionId: 'minimax-2-generation'
        }),
      });
      
      if (!falTransferResponse.ok) {
        const errorText = await falTransferResponse.text();
        console.error('❌ FAL transfer failed:', falTransferResponse.status, errorText);
        throw new Error('Failed to transfer image to FAL storage');
      }
      
      const { url: falImageUrl } = await falTransferResponse.json();
      console.log('✅ Image transferred to FAL storage:', falImageUrl);
      console.log('🔗 FAL image URL will be sent to Minimax 2.0 API');

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
          image_url: falImageUrl,
          prompt_optimizer: true
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

      console.log('✅ Minimax 2.0 generation successful!');
      console.log('📹 Video URL received:', data.videoUrl);
      console.log('📊 Full response data:', data);

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

      console.log('🎬 Created variation object:', generatedVariation);

      console.log('🔄 Adding variation to gallery...');
      setVariations(prev => {
        const newVariations = [generatedVariation, ...prev];
        console.log('📋 Updated variations:', newVariations);
        return newVariations;
      });
      addToGallery([generatedVariation], prompt.trim());
      console.log('✅ Variation added to gallery successfully!');

      // Track usage
      trackUsage('video_generation', 'minimax_endframe');

      // Clear input after successful generation
      setPrompt('');
      setUploadedFiles([]);
      console.log('🧹 Cleared input after successful Minimax 2.0 generation');

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
      stopGenerationTimer();
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
        progress: 20,
        currentStep: 'Converting image to base64...'
      });

      // Upload image to FAL storage for better performance
      console.log('🔄 Uploading image to FAL storage...');
      const imageBlob = await fetch(imageFile.preview).then(r => r.blob());
      const imageFileObj = new File([imageBlob], 'image.jpg', { type: 'image/jpeg' });
      
      const uploadResponse = await fetch('/api/upload-to-fal', {
        method: 'POST',
        body: imageFileObj,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to FAL storage');
      }
      
      const { url: falImageUrl } = await uploadResponse.json();
      console.log('✅ Image uploaded to FAL storage:', falImageUrl);

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
          image_url: falImageUrl,
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

      // Clear input after successful generation
      setPrompt('');
      setUploadedFiles([]);
      console.log('🧹 Cleared input after successful Kling 2.1 Master generation');

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
      showAnimatedErrorNotification(`User Error: ${errorMessage} TOASTY!`, 'toasty');
      
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
    <div className="h-screen bg-black relative overflow-hidden">

      {/* Header */}
      <Header 
        onSignUpClick={handleSignUpClick}
        onSignInClick={handleSignInClick}
        onToggleGallery={() => setShowGallery(!showGallery)}
        showGallery={showGallery}
      />
      
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
        style={{
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto'
        }}
        onError={(e) => {
          console.error('Background video failed to load:', e);
        }}
        onLoadStart={() => {
          console.log('Background video started loading');
        }}
        onCanPlay={() => {
          console.log('Background video can play');
        }}
      >
        <source src="/Hailuo_Video_A dark, cosmic horror-like the_422674688974839808.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Semi-transparent overlay for content readability */}
      <div className="absolute inset-0 bg-black bg-opacity-60 z-10"></div>
      
      {/* Floating Gallery - Desktop Only */}
      <div className="hidden lg:block fixed right-4 top-1/2 transform -translate-y-1/2 z-20 w-64 h-96 overflow-hidden">
        <div 
          className="floating-gallery-container h-full overflow-y-auto scrollbar-hide"
          onWheel={(e) => {
            e.preventDefault();
            const container = e.currentTarget;
            const scrollAmount = e.deltaY * 0.5; // Smooth scrolling multiplier
            container.scrollTop += scrollAmount;
          }}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollBehavior: 'smooth'
          }}
        >
          <div className="space-y-3 p-2">
            {gallery.length === 0 ? (
              <div className="text-center py-8">
                <Images className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-xs">No content yet</p>
              </div>
            ) : (
              gallery.map((item: any, index: number) => (
                <div
                  key={`floating-${item.id}-${index}`}
                  className="floating-gallery-card group relative bg-black bg-opacity-50 rounded-[30px] border border-gray-700 overflow-hidden cursor-pointer transition-all duration-400"
                  style={{
                    width: '240px',
                    height: '160px',
                    filter: 'brightness(0.7)',
                    transition: 'all 0.4s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(1) drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))';
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.05)';
                    e.currentTarget.style.zIndex = '10';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'brightness(0.7)';
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.zIndex = '30';
                  }}
                  onClick={() => setFullScreenImage(item.videoUrl || item.imageUrl)}
                >
                  {/* Content Preview */}
                  <div className="relative w-full h-full">
                    {item.fileType === 'video' ? (
                      <video
                        src={item.videoUrl}
                        className="w-full h-full object-cover rounded-[30px]"
                        muted
                        loop
                      />
                    ) : (
                      <img
                        src={getProxiedImageUrl(item.imageUrl)}
                        alt="Gallery item"
                        className="w-full h-full object-cover rounded-[30px]"
                        onError={(e) => {
                          e.currentTarget.src = '/api/placeholder/240/160';
                        }}
                        loading="lazy"
                      />
                    )}
                    
                    {/* Hover Overlay with Actions - Same as 2x2 grid */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                      {/* Top section with variant info */}
                      <div className="text-white text-sm">
                        <p className="font-medium truncate">{item.description || 'Generated Content'}</p>
                        <p className="text-xs opacity-80">{item.fileType?.toUpperCase()}</p>
                      </div>
                      
                      {/* Bottom section with action buttons */}
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditImage(item.imageUrl, item.originalPrompt);
                          }}
                          disabled={processing.isProcessing}
                          className="text-xs text-blue-300 hover:text-blue-200 transition-colors px-2 py-1 rounded bg-blue-900/30 hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Inject into input slot for editing"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVaryImage(item.imageUrl, item.originalPrompt);
                          }}
                          disabled={processing.isProcessing}
                          className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Generate variations with nano_banana"
                        >
                          Vary
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Gallery Header */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-3 z-10">
          <h3 className="text-white text-sm font-medium text-center">Gallery</h3>
          <p className="text-gray-400 text-xs text-center">{gallery.length} items</p>
        </div>
        
        {/* Scroll Indicator */}
        {gallery.length > 4 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 z-10">
            <div className="text-center">
              <div className="w-6 h-1 bg-white/30 rounded-full mx-auto mb-1"></div>
              <p className="text-gray-400 text-xs">Scroll to browse</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Custom Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-2 sm:right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg backdrop-blur-sm border max-w-[calc(100vw-1rem)] sm:max-w-sm ${
            notification.type === 'error' 
              ? 'bg-red-600 bg-opacity-90 border-red-500 text-white' 
              : notification.type === 'success'
              ? 'bg-green-600 bg-opacity-90 border-green-500 text-white'
              : 'bg-charcoal bg-opacity-90 border-border-gray text-white'
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
        <div className={`transition-all duration-300 ${showGallery ? 'w-full lg:w-2/3' : 'w-full'} ${showGallery ? 'lg:pr-0' : 'lg:ml-16'} flex flex-col items-center`}>
          <div className="w-full max-w-6xl mx-auto px-4 py-8 lg:px-8">
            {/* Usage Limit Banner */}
            <UsageLimitBanner 
              onSignUpClick={handleSignUpClick}
              onSaveToAccountClick={handleSaveToAccountClick}
            />

            
            {/* Usage Counter */}
            <UsageCounter onSignUpClick={handleSignUpClick} />
            
        {/* Main Content Container - Centered and Unified */}
        <div className="w-full max-w-6xl mx-auto px-3 lg:px-4 py-6 lg:py-8 lg:pt-16 flex flex-col items-center">
            



        </div>

        <div className="flex flex-col items-center w-full px-4 sm:px-6 lg:px-8 mobile-content-with-chat lg:pb-6">
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center">

            {/* Usage Statistics - Left Corner */}
            {userStats.totalGenerations > 0 && (
              <div className="mb-4 p-4 bg-transparent lg:bg-charcoal lg:bg-opacity-30 backdrop-blur-sm rounded-lg border border-border-gray border-opacity-30">
                <div className="text-xs text-accent-gray">
        <div className="font-semibold text-light-gray mb-2">📊 App Performance Analytics ({userStats.period})</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <div>• <span className="text-light-gray font-medium">{userStats.totalGenerations.toLocaleString()}</span> total generations</div>
            <div>• <span className="text-light-gray font-medium">{userStats.engagement.activeUserPercentage}%</span> active users</div>
            <div>• <span className="text-light-gray font-medium">{userStats.totalUsers}</span> total users</div>
          </div>
          <div className="space-y-1">
            <div>• <span className="text-light-gray font-medium">{userStats.activeUsers}</span> active customers</div>
            <div>• <span className="text-light-gray font-medium">{userStats.recentActivity}</span> recent activity</div>
            <div>• <span className="text-light-gray font-medium">+{userStats.newUsers24h}</span> new today</div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border-gray border-opacity-20">
          <div className="text-light-gray font-medium">🚀 Model Performance:</div>
          <div>• <span className="text-green-300 font-medium">{userStats.usageBreakdown.nano_banana.toLocaleString()}</span> Nano Banana ({((userStats.usageBreakdown.nano_banana / userStats.totalGenerations) * 100).toFixed(1)}%)</div>
          <div>• <span className="text-orange-300 font-medium">{userStats.usageBreakdown.minimax_endframe}</span> Video generations (Minimax 2.0)</div>
          <div>• <span className="text-purple-300 font-medium">{userStats.usageBreakdown.gemini}</span> Gemini generations</div>
        </div>
                </div>
              </div>
            )}

            {/* Mobile Generated Content Display */}
            <div className="lg:hidden w-full max-w-4xl mx-auto mb-8">
              <h2 className="text-lg font-bold text-white mb-4 text-center">New generations</h2>
              
              {/* Main Content Display Area */}
              <div className="w-full aspect-square max-w-md mx-auto bg-black bg-opacity-50 rounded-[30px] border border-gray-700 overflow-hidden">
                {variations.length > 0 ? (
                  <div className="relative w-full h-full">
                    {variations[0].fileType === 'video' ? (
                      <video
                        src={variations[0].videoUrl}
                        className="w-full h-full object-cover"
                        controls
                        muted
                        loop
                        onClick={() => setFullScreenImage(variations[0].videoUrl || null)}
                      />
                    ) : (
                      <img
                        src={variations[0].imageUrl}
                        alt={variations[0].description}
                        className="w-full h-full object-cover"
                        onClick={() => setFullScreenImage(variations[0].imageUrl || null)}
                        onError={(e) => {
                          console.error('Mobile image failed to load:', variations[0].imageUrl);
                          e.currentTarget.src = '/api/placeholder/400/400';
                        }}
                        loading="lazy"
                      />
                    )}
                    
                    {/* Content Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                      <div className="text-white text-sm font-medium">
                        {variations[0].angle} - {variations[0].pose}
                      </div>
                      <div className="text-gray-300 text-xs">
                        {variations[0].description}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎨</div>
                      <div className="text-sm">Your generated content will appear here</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Additional Variations (if any) */}
              {variations.length > 1 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {variations.slice(1, 5).map((variation, index) => (
                    <div 
                      key={index}
                      className="aspect-square bg-black bg-opacity-50 rounded-[30px] border border-gray-700 overflow-hidden"
                      onClick={() => setFullScreenImage(variation.videoUrl || variation.imageUrl || null)}
                    >
                      {variation.fileType === 'video' ? (
                        <video
                          src={variation.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                        />
                      ) : (
                        <img
                          src={variation.imageUrl}
                          alt={variation.description}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Mobile variation image failed to load:', variation.imageUrl);
                            e.currentTarget.src = '/api/placeholder/200/200';
                          }}
                          loading="lazy"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

                  {hasVideoFiles && (
                    <button
                      onClick={() => setShowVideoPrompts(!showVideoPrompts)}
                      className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors border border-purple-500"
                    >
                      <span>
                        {showVideoPrompts ? 'Hide Video Options' : 'Video Scene Options'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Floating Input - Match Community Page Style */}
            <div className="mobile-chat-interface md:hidden hidden">
              <div className="mobile-input-container">
                {/* Top Div: 4 Image Upload Slots + Model Selection */}
                <div className="mb-3">
                  <div className="flex gap-2 items-center overflow-x-auto pt-3">
                    {/* 4 Image Upload Slots - Mobile */}
                    <div className="flex gap-2 flex-shrink-0 pb-3">
                      {/* Filled slots */}
                    {uploadedFiles.map((file, index) => (
                      <div 
                        key={index} 
                        className="relative flex-shrink-0 transition-all duration-200"
                        style={{ paddingBottom: '0.5px' }}
                      >
                          {file.fileType === 'image' ? (
                        <img
                          src={file.preview}
                          alt={`Image ${index + 1}`}
                              className="w-12 h-12 object-cover rounded-lg border border-white border-opacity-20"
                            />
                          ) : (
                            <video
                              src={file.preview}
                              className="w-12 h-12 object-cover rounded-lg border border-white border-opacity-20"
                              muted
                            />
                          )}
                        <button
                          onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                          className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          <X className="w-1.5 h-1.5" />
                        </button>
                          <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded-tr">
                            {file.fileType.toUpperCase()}
                          </div>
                      </div>
                    ))}
                      
                      {/* Empty slots for upload */}
                      {Array.from({ length: 4 - uploadedFiles.length }, (_, index) => {
                        const slotIndex = uploadedFiles.length + index;
                        return (
                          <div
                            key={`empty-${slotIndex}`}
                            className="border-2 border-dashed border-white border-opacity-30 rounded-lg w-14 h-14 flex items-center justify-center cursor-pointer hover:border-opacity-50 transition-all duration-200 flex-shrink-0 touch-manipulation"
                            style={{ paddingBottom: '0.5px', minWidth: '56px', minHeight: '56px' }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('📱 Mobile image slot clicked, slot:', slotIndex);
                              const fileInput = document.getElementById('file-input');
                              if (fileInput) {
                                fileInput.click();
                              } else {
                                console.error('❌ File input not found');
                              }
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('📱 Mobile image slot key pressed, slot:', slotIndex);
                                const fileInput = document.getElementById('file-input');
                                if (fileInput) {
                                  fileInput.click();
                                }
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`Upload image to slot ${slotIndex + 1}`}
                          >
                            <Plus className="w-5 h-5 text-gray-400" />
                  </div>
                        );
                      })}
                    </div>
                    
                    {/* Model Selection - Inline with image slots */}
                    {uploadedFiles.length > 0 && (
                      <select
                        value={generationMode || ''}
                        onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
                        className="px-3 py-2 bg-transparent border border-white border-opacity-20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200 flex-shrink-0 min-w-[120px]"
                      >
                        <option value="">Select Model</option>
                        {getAvailableModes().map((mode) => (
                          <option key={mode} value={mode}>
                            {getModelDisplayName(mode)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {/* Text Input - Directly below the top container */}
                <textarea
                  id="prompt-mobile"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    hasVideoFiles 
                      ? "Describe the scene changes..." 
                      : processingMode === 'endframe'
                      ? "Describe the transition..."
                      : uploadedFiles.length === 0
                      ? "Describe the image you want to generate..."
                      : "Describe the variations you want..."
                  }
                    className="mobile-chat-input mt-3"
                  rows={1}
                  style={{ fontSize: '16px' }}
                />
                </div>
                
                {/* Bottom Container: Action Buttons */}
                <div className="flex items-center justify-center gap-2">
                  {/* Upload Button */}
                  <button
                    onClick={() => document.getElementById('file-input')?.click()}
                    className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center transition-colors"
                    title="Upload images"
                  >
                    <Upload className="w-4 h-4 text-white" />
                  </button>
                  
                  {/* Generate Button */}
                  {uploadedFiles.length === 0 ? (
                    // Text-to-Image generation
                    <button
                      onClick={handleTextToImage}
                      disabled={processing.isProcessing || !prompt.trim()}
                      className="mobile-send-button"
                      title="Generate Image"
                    >
                      {processing.isProcessing ? (
                        <Loader2 className="mobile-send-icon animate-spin" />
                      ) : (
                        <ArrowRight className="mobile-send-icon" />
                      )}
                    </button>
                  ) : hasVideoFiles ? (
                    // Video generation
                    <button
                      onClick={handleRunwayVideoEditing}
                      disabled={processing.isProcessing || !prompt.trim()}
                      className="mobile-send-button"
                      title="Generate Video"
                    >
                      {processing.isProcessing ? (
                        <Loader2 className="mobile-send-icon animate-spin" />
                      ) : (
                        <ArrowRight className="mobile-send-icon" />
                      )}
                    </button>
                  ) : (
                    // Character variations
                    <button
                      onClick={handleModelGeneration}
                      disabled={processing.isProcessing || !prompt.trim()}
                      className="mobile-send-button"
                      title="Generate Variation"
                    >
                      {processing.isProcessing ? (
                        <Loader2 className="mobile-send-icon animate-spin" />
                      ) : (
                        <ArrowRight className="mobile-send-icon" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Generation Panel */}
            <div className="hidden lg:block generation-panel mb-6 lg:mb-8" style={{ top: '-200px' }}>
              <h2 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4 text-center">New generations</h2>
              <div className="generation-grid max-w-4xl mx-auto">
                {/* Slot 1 */}
                <div 
                  className="generation-slot group"
                  onClick={() => variations[0] && setFullScreenImage(variations[0].videoUrl || variations[0].imageUrl || null)}
                >
                  {variations[0] && (
                    <div className="relative w-full h-full">
                      {variations[0].fileType === 'video' ? (
                        <video
                          src={variations[0].videoUrl}
                          className="w-full h-full object-cover rounded-[30px]"
                          muted
                          loop
                        />
                      ) : (
                        <img
                          src={variations[0].imageUrl}
                          alt={variations[0].description}
                          className="w-full h-full object-cover rounded-[30px]"
                        />
                      )}
                      
                      {/* Hover overlay with action buttons */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                        {/* Top section with variant info */}
                        <div className="text-white text-sm">
                          <p className="font-medium">Variant 1</p>
                          <p className="text-xs opacity-80">Close-up Shot</p>
                        </div>
                        
                        {/* Bottom section with action buttons */}
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditImage(variations[0].imageUrl, variations[0].originalPrompt);
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-blue-300 hover:text-blue-200 transition-colors px-2 py-1 rounded bg-blue-900/30 hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Inject into input slot for editing"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVaryImage(variations[0].imageUrl, variations[0].originalPrompt);
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate variations with nano_banana"
                          >
                            Vary
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Slot 2 */}
                <div 
                  className="generation-slot group"
                  onClick={() => variations[1] && setFullScreenImage(variations[1].videoUrl || variations[1].imageUrl || null)}
                >
                  {variations[1] && (
                    <div className="relative w-full h-full">
                      {variations[1].fileType === 'video' ? (
                        <video
                          src={variations[1].videoUrl}
                          className="w-full h-full object-cover rounded-[30px]"
                          muted
                          loop
                        />
                      ) : (
                        <img
                          src={variations[1].imageUrl}
                          alt={variations[1].description}
                          className="w-full h-full object-cover rounded-[30px]"
                        />
                      )}
                      
                      {/* Hover overlay with action buttons */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                        {/* Top section with variant info */}
                        <div className="text-white text-sm">
                          <p className="font-medium">Variant 2</p>
                          <p className="text-xs opacity-80">Static Shot</p>
                        </div>
                        
                        {/* Bottom section with action buttons */}
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditImage(variations[1].imageUrl, variations[1].originalPrompt);
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-blue-300 hover:text-blue-200 transition-colors px-2 py-1 rounded bg-blue-900/30 hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Inject into input slot for editing"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVaryImage(variations[1].imageUrl, variations[1].originalPrompt);
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate variations with nano_banana"
                          >
                            Vary
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Slot 3 */}
                <div 
                  className="generation-slot group"
                  onClick={() => variations[2] && setFullScreenImage(variations[2].videoUrl || variations[2].imageUrl || null)}
                >
                  {variations[2] && (
                    <div className="relative w-full h-full">
                      {variations[2].fileType === 'video' ? (
                        <video
                          src={variations[2].videoUrl}
                          className="w-full h-full object-cover rounded-[30px]"
                          muted
                          loop
                        />
                      ) : (
                        <img
                          src={variations[2].imageUrl}
                          alt={variations[2].description}
                          className="w-full h-full object-cover rounded-[30px]"
                        />
                      )}
                      
                      {/* Hover overlay with action buttons */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                        {/* Top section with variant info */}
                        <div className="text-white text-sm">
                          <p className="font-medium">Variant 3</p>
                          <p className="text-xs opacity-80">Tracking Shot</p>
                        </div>
                        
                        {/* Bottom section with action buttons */}
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditImage(variations[2].imageUrl, variations[2].originalPrompt);
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-blue-300 hover:text-blue-200 transition-colors px-2 py-1 rounded bg-blue-900/30 hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Inject into input slot for editing"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVaryImage(variations[2].imageUrl, variations[2].originalPrompt);
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate variations with nano_banana"
                          >
                            Vary
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Slot 4 */}
                <div 
                  className="generation-slot group"
                  onClick={() => variations[3] && setFullScreenImage(variations[3].videoUrl || variations[3].imageUrl || null)}
                >
                  {variations[3] && (
                    <div className="relative w-full h-full">
                      {variations[3].fileType === 'video' ? (
                        <video
                          src={variations[3].videoUrl}
                          className="w-full h-full object-cover rounded-[30px]"
                          muted
                          loop
                        />
                      ) : (
                        <img
                          src={variations[3].imageUrl}
                          alt={variations[3].description}
                          className="w-full h-full object-cover rounded-[30px]"
                        />
                      )}
                      
                      {/* Hover overlay with action buttons */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                        {/* Top section with variant info */}
                        <div className="text-white text-sm">
                          <p className="font-medium">Variant 4</p>
                          <p className="text-xs opacity-80">Wide Shot</p>
                        </div>
                        
                        {/* Bottom section with action buttons */}
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditImage(variations[3].imageUrl, variations[3].originalPrompt);
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-blue-300 hover:text-blue-200 transition-colors px-2 py-1 rounded bg-blue-900/30 hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Inject into input slot for editing"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVaryImage(variations[3].imageUrl, variations[3].originalPrompt);
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate variations with nano_banana"
                          >
                            Vary
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="generate-floating-input hidden md:block">
              {/* Dynamic Content - Only show when images are uploaded */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 mb-4 justify-center w-full">
                {/* Image Upload Slots - Compact */}
                <div className="flex gap-1">
                  {uploadedFiles.map((file, index) => (
                    <div 
                      key={index} 
                      className={`relative flex-shrink-0 transition-all duration-200 ${
                        dragOverSlot === index 
                          ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-500 bg-opacity-20' 
                          : ''
                      }`}
                      onDrop={(e) => handleSlotDrop(e, index)}
                      onDragOver={(e) => handleSlotDragOver(e, index)}
                      onDragLeave={handleSlotDragLeave}
                      onPaste={(e) => handleSlotPaste(e as any, index)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          document.getElementById('file-input')?.click();
                        }
                      }}
                      data-slot-area
                      tabIndex={0}
                      role="button"
                      aria-label={`Replace image in slot ${index + 1}`}
                    >
                      {file.fileType === 'image' ? (
                        <img
                          src={file.preview}
                          alt={`Character ${index + 1}`}
                          className="w-14 h-14 object-cover rounded-lg border border-white border-opacity-20"
                        />
                      ) : (
                        <video
                          src={file.preview}
                          className="w-14 h-14 object-cover rounded-lg border border-white border-opacity-20"
                          muted
                        />
                      )}
                      <button
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 w-1 h-1 bg-red-500 bg-opacity-80 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-10 border border-white border-opacity-50"
                        title="Remove file"
                      >
                        <X className="w-0.5 h-0.5" />
                      </button>
                      <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded-tr">
                        {file.fileType.toUpperCase()}
                      </div>
                      {dragOverSlot === index && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-30 rounded-lg flex items-center justify-center">
                          <div className="text-white text-xs font-medium bg-blue-600 px-2 py-1 rounded">
                            Drop
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
                        className={`border-2 border-dashed border-white border-opacity-30 rounded-lg w-14 h-14 flex items-center justify-center cursor-pointer hover:border-opacity-50 transition-all duration-200 flex-shrink-0 ${
                          dragOverSlot === slotIndex 
                            ? 'ring-2 ring-blue-500 ring-opacity-75 bg-blue-500 bg-opacity-20 border-blue-500' 
                            : ''
                        }`}
                        onClick={() => document.getElementById('file-input')?.click()}
                        onDrop={(e) => handleSlotDrop(e, slotIndex)}
                        onDragOver={(e) => handleSlotDragOver(e, slotIndex)}
                        onDragLeave={handleSlotDragLeave}
                        onPaste={(e) => handleSlotPaste(e as any, slotIndex)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            document.getElementById('file-input')?.click();
                          }
                        }}
                        data-slot-area
                        tabIndex={0}
                        role="button"
                        aria-label={`Upload image to slot ${slotIndex + 1}`}
                      >
                        <Plus className="w-4 h-4 text-gray-400" />
                        {dragOverSlot === slotIndex && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-30 rounded-lg flex items-center justify-center">
                            <div className="text-white text-xs font-medium bg-blue-600 px-2 py-1 rounded">
                              Drop
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Model Selection - Compact */}
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium whitespace-nowrap">Model:</span>
                      <select
                        value={generationMode || ''}
                        onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
                      className="px-2 py-1 bg-transparent border border-white border-opacity-20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200"
                      style={{ 
                        fontSize: '12px',
                        minHeight: '28px',
                        minWidth: '100px',
                        maxWidth: '150px'
                      }}
                      >
                        <option value="">Select Model</option>
                        {getAvailableModes().map((mode) => (
                          <option key={mode} value={mode}>
                            {getModelDisplayName(mode)}
                          </option>
                        ))}
                      </select>
                    </div>

                {/* Quick Shot Presets Dropdown - Compact */}
                <div className="relative">
                      <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setPrompt(e.target.value);
                        e.target.value = ''; // Reset selection
                      }
                    }}
                    className="px-3 py-1 text-xs bg-white text-black rounded-full hover:bg-gray-100 transition-colors appearance-none cursor-pointer border-0 focus:outline-none focus:ring-1 focus:ring-purple-500 pr-6"
                    style={{ 
                      borderRadius: '20px',
                      minWidth: '140px'
                    }}
                  >
                    <option value="">Quick Shot Presets</option>
                    {BASIC_PROMPTS.map((example) => (
                      <option key={example} value={example}>
                        {example}
                      </option>
                    ))}
                      </select>
                  {/* Custom dropdown arrow */}
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    </div>
                </div>

                {/* Preset Buttons - Compact */}
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setActivePresetTab('shot');
                      setShowPresetModal(true);
                    }}
                    className="px-2 py-1 text-xs rounded transition-colors border bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                  >
                    📸 Shot
                  </button>
                  <button
                    onClick={() => {
                      setActivePresetTab('background');
                      setShowPresetModal(true);
                    }}
                    className="px-2 py-1 text-xs rounded transition-colors border bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                  >
                    🎨 Background
                  </button>
                  <button
                    onClick={() => {
                      setActivePresetTab('restyle');
                      setShowPresetModal(true);
                    }}
                    className="px-2 py-1 text-xs rounded transition-colors border bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                  >
                    🎭 Restyle
                  </button>
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="px-2 py-1 text-xs rounded transition-colors border bg-blue-800 text-white border-blue-600 hover:bg-blue-700"
                  >
                    Prompt Help
                  </button>
              </div>
            </div>
              )}

              {/* Text input and buttons container */}
              <div className="flex items-center gap-4 w-full justify-center">
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
                    ? "Imagine..."
                    : "Describe the angle or pose variations you want..."
                }
                className="generate-floating-textarea"
                rows={1}
                style={{ fontSize: '16px' }} // Prevents zoom on iOS
              />
              
              <div className="generate-floating-buttons">
                {/* Upload Button */}
                <button
                  onClick={() => document.getElementById('file-input')?.click()}
                  className="generate-floating-upload-button"
                  title="Upload Image"
                >
                  <Upload className="generate-floating-upload-icon" />
                </button>

                {/* Generate Button */}
                {uploadedFiles.length === 0 ? (
                  // Text-to-Image generation
                        <button
                    onClick={handleTextToImage}
                    disabled={processing.isProcessing || !prompt.trim()}
                    className="generate-floating-send-button"
                    title="Generate Image"
                  >
                    {processing.isProcessing ? (
                      <Loader2 className="generate-floating-icon animate-spin" />
                    ) : (
                      <ArrowRight className="generate-floating-icon" />
                    )}
                              </button>
                ) : hasVideoFiles ? (
                  // Video generation
                              <button
                    onClick={handleRunwayVideoEditing}
                    disabled={processing.isProcessing || !prompt.trim()}
                    className="generate-floating-send-button"
                    title="Generate Video"
                  >
                    {processing.isProcessing ? (
                      <Loader2 className="generate-floating-icon animate-spin" />
                    ) : (
                      <ArrowRight className="generate-floating-icon" />
                    )}
                          </button>
                ) : (
                  // Character variations
                          <button
                    onClick={handleModelGeneration}
                    disabled={processing.isProcessing || !prompt.trim()}
                    className="generate-floating-send-button"
                    title="Generate Variation"
                  >
                    {processing.isProcessing ? (
                      <Loader2 className="generate-floating-icon animate-spin" />
                    ) : (
                      <ArrowRight className="generate-floating-icon" />
                    )}
                              </button>
                )}
                </div>
              </div>
            </div>

        {/* Mobile Gallery Panel */}
        {showGallery && (
          <div className="block lg:hidden fixed bottom-16 left-0 right-0 bg-black bg-opacity-95 backdrop-blur-md border-t border-gray-800/50 z-30 max-h-[60vh] overflow-y-auto gallery-container">
            <div className="p-2 lg:p-6">
              <div className="flex items-center justify-between mb-2 lg:mb-6">
                <h2 className="text-lg lg:text-2xl font-semibold flex items-center gap-2 text-white">
                  <Images className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  <span className="lg:hidden">Library</span>
                  <span className="hidden lg:inline">Gallery</span> ({filteredGallery.length})
                </h2>
                  <button
                    onClick={() => setShowGallery(false)}
                  className="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-1 lg:py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors text-sm lg:text-base"
                    title="Hide gallery"
                  >
                  <X className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">Hide Gallery</span>
                  </button>
              </div>

              {/* Gallery Filter Toggle */}
              <div className="flex gap-2 lg:gap-3 mb-2 lg:mb-6 overflow-x-auto">
                <button
                  onClick={() => setGalleryFilter('all')}
                  className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                    galleryFilter === 'all'
                      ? 'bg-charcoal text-white border border-border-gray'
                      : 'bg-transparent lg:bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
                  }`}
                >
                  All ({gallery.length})
                </button>
                <button
                  onClick={() => setGalleryFilter('images')}
                  className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                    galleryFilter === 'images'
                      ? 'bg-charcoal text-white border border-border-gray'
                      : 'bg-transparent lg:bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
                  }`}
                >
                  Images ({gallery.filter(item => item.imageUrl && !item.videoUrl).length})
                </button>
                <button
                  onClick={() => setGalleryFilter('videos')}
                  className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                    galleryFilter === 'videos'
                      ? 'bg-charcoal text-white border border-border-gray'
                      : 'bg-transparent lg:bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
                  }`}
                >
                  Videos ({gallery.filter(item => item.videoUrl).length})
                </button>
              </div>

              {/* Gallery Content - Mobile Optimized Layout */}
              {filteredGallery.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <Images className="w-12 h-12 lg:w-16 lg:h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-base lg:text-lg">No images in gallery yet</p>
                  <p className="text-gray-500 text-sm mt-2">Generate some images to see them here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6">
                  {filteredGallery.map((item: any, index: number) => {
                    // Create a more robust unique key that handles duplicates
                    const itemKey = `${item.id}-${item.timestamp}-${index}`;
                    const isExpanded = expandedPrompts.has(itemKey);
                    
                    return (
                      <div 
                        key={itemKey} 
                        className="gallery-item bg-transparent lg:bg-gray-700 lg:bg-opacity-50 border border-transparent lg:border-gray-600 hover:bg-gray-700 transition-all duration-400 relative z-30 overflow-hidden" 
                        style={{ 
                          borderRadius: '30px', 
                          width: '150px', 
                          height: '150px', 
                          margin: '3px', 
                          filter: 'brightness(0.7)',
                          transition: 'all 0.4s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.filter = 'brightness(1) drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))';
                          e.currentTarget.style.transform = 'translateY(-8px) scale(1.05)';
                          e.currentTarget.style.zIndex = '10';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.filter = 'brightness(0.7)';
                          e.currentTarget.style.transform = 'translateY(0) scale(1)';
                          e.currentTarget.style.zIndex = '30';
                        }}
                      >
                        {/* Image/Video Preview - Full Card */}
                        <div className="relative w-full h-full">
                          {item.fileType === 'video' ? (
                            <video
                              src={item.videoUrl}
                              className="w-full h-full object-cover cursor-pointer touch-manipulation"
                              onClick={() => {
                                console.log('Mobile gallery video tapped:', item.videoUrl);
                                setFullScreenImage(item.videoUrl);
                              }}
                              onTouchStart={(e) => {
                                e.currentTarget.style.transform = 'scale(0.95)';
                                e.currentTarget.style.transition = 'transform 0.1s ease';
                              }}
                              onTouchEnd={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              muted
                            />
                          ) : item.imageUrl ? (
                            <img
                              src={getProxiedImageUrl(item.imageUrl)}
                              alt="Gallery item"
                              className="w-full h-full object-cover cursor-pointer touch-manipulation"
                              onClick={() => {
                                console.log('Mobile gallery image tapped:', item.imageUrl);
                                setFullScreenImage(item.imageUrl);
                              }}
                              onTouchStart={(e) => {
                                e.currentTarget.style.transform = 'scale(0.95)';
                                e.currentTarget.style.transition = 'transform 0.1s ease';
                              }}
                              onTouchEnd={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              onError={(e) => {
                                console.error('Mobile gallery image failed to load:', item.imageUrl);
                                // Try fallback to original image preview
                                if (item.originalImagePreview && e.currentTarget.src !== item.originalImagePreview) {
                                  e.currentTarget.src = item.originalImagePreview;
                                } else {
                                  e.currentTarget.src = '/api/placeholder/150/150';
                                }
                              }}
                              onLoad={() => {
                                console.log('Mobile gallery image loaded successfully:', item.imageUrl);
                              }}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                              <span className="text-gray-400 text-sm">No Image</span>
                            </div>
                          )}
                          
                          {/* Type Badge */}
                          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg border border-white/20">
                            {item.fileType?.toUpperCase() || 'IMAGE'}
                          </div>

                          {/* Mobile Overlay Text */}
                          <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                            <div className="text-xs text-white font-medium mb-1">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </div>
                            
                            {item.angle && (
                              <div className="text-xs text-gray-200 mb-1">
                                Angle: {item.angle}
                              </div>
                            )}
                            
                            {item.pose && (
                              <div className="text-xs text-gray-200 mb-2">
                                Pose: {item.pose}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-1 flex-wrap">
                              <button
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedPrompts(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(itemKey);
                                      return newSet;
                                    });
                                  } else {
                                    setExpandedPrompts(prev => new Set([...prev, itemKey]));
                                  }
                                }}
                                className="text-xs text-white hover:text-gray-200 transition-colors px-2 py-1 rounded bg-black/30 hover:bg-black/50"
                              >
                                {isExpanded ? 'Hide' : 'Show'}
                              </button>
                              <button
                                onClick={() => handleVaryImage(item.imageUrl, item.originalPrompt)}
                                disabled={processing.isProcessing}
                                className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Generate variations with nano_banana"
                              >
                                Vary
                              </button>
                              <button
                                onClick={() => handleEditImage(item.imageUrl, item.originalPrompt)}
                                disabled={processing.isProcessing}
                                className="text-xs text-blue-300 hover:text-blue-200 transition-colors px-2 py-1 rounded bg-blue-900/30 hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Inject into input slot"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteFromGallery(item.id)}
                                className="text-xs text-red-300 hover:text-red-200 transition-colors px-2 py-1 rounded bg-red-900/30 hover:bg-red-900/50"
                              >
                                Delete
                              </button>
                            </div>

                            {/* Expanded Prompt */}
                            {isExpanded && (
                              <div className="mt-2 bg-black/60 backdrop-blur-sm p-2 rounded">
                                <p className="text-xs text-white leading-relaxed">
                                  {item.prompt}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                          {/* Desktop Content */}
                          <div className="hidden lg:block space-y-2 lg:space-y-3 p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs lg:text-sm text-gray-400">
                                {new Date(item.timestamp).toLocaleDateString()}
                              </span>
                              <div className="flex gap-1 lg:gap-2">
                                <button
                                  onClick={() => {
                                    if (isExpanded) {
                                      setExpandedPrompts(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(itemKey);
                                        return newSet;
                                      });
                                    } else {
                                      setExpandedPrompts(prev => new Set([...prev, itemKey]));
                                    }
                                  }}
                                  className="text-xs lg:text-sm text-accent-gray hover:text-white transition-colors"
                                >
                                  {isExpanded ? 'Hide' : 'Show'} Prompt
                                </button>
                                <button
                                  onClick={() => handleDeleteFromGallery(item.id)}
                                  className="text-xs lg:text-sm text-red-400 hover:text-red-300 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="bg-transparent lg:bg-gray-800 p-2 lg:p-3 rounded-lg">
                                <p className="text-xs lg:text-sm text-gray-300">
                                  {item.prompt}
                                </p>
                              </div>
                            )}
                            
                            <div className="text-xs lg:text-sm text-gray-400 space-y-1">
                              {item.angle && <div>Angle: {item.angle}</div>}
                              {item.pose && <div>Pose: {item.pose}</div>}
                            </div>
                          </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mobile Gallery Scroll to Top Button */}
              {showScrollToTop && (
                <button
                  onClick={scrollToTop}
                  className="fixed bottom-20 right-4 z-50 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
                  aria-label="Scroll to top"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Desktop Gallery Panel */}
        {showGallery && (
          <div className="hidden lg:block gallery-container fixed top-20 left-0 right-0 lg:left-[10%] lg:right-[10%] lg:bottom-0 lg:top-auto bg-black bg-opacity-90 backdrop-blur-xl border-t border-gray-800/50 z-30 max-h-[75vh] overflow-y-auto shadow-2xl">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-3 text-white">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Images className="w-5 h-5 text-white" />
                  </div>
                  Gallery ({filteredGallery.length})
                </h2>
                <button
                  onClick={() => setShowGallery(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-xl border border-gray-600/50 transition-all duration-200 backdrop-blur-sm"
                  title="Hide gallery"
                >
                  <X className="w-4 h-4" />
                  Hide Gallery
                </button>
              </div>

              {/* Gallery Filter Toggle */}
              <div className="flex gap-2 mb-6 p-1 bg-gray-900/50 rounded-xl backdrop-blur-sm border border-gray-700/50">
                <button
                  onClick={() => setGalleryFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    galleryFilter === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  All ({gallery.length})
                </button>
                <button
                  onClick={() => setGalleryFilter('images')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    galleryFilter === 'images'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  Images ({gallery.filter(item => item.imageUrl && !item.videoUrl).length})
                </button>
                <button
                  onClick={() => setGalleryFilter('videos')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    galleryFilter === 'videos'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  Videos ({gallery.filter(item => item.videoUrl).length})
                </button>
              </div>

              {/* Gallery Content - Desktop Layout */}
              {filteredGallery.length === 0 ? (
                <div className="text-center py-12">
                  <Images className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No images in gallery yet</p>
                  <p className="text-gray-500 text-sm mt-2">Generate some images to see them here</p>
                </div>
              ) : (
                <div className="gallery-container flex flex-wrap justify-start gap-2 sm:gap-3 md:gap-4 max-h-[75vh] overflow-y-auto">
                  {filteredGallery.map((item: any, index: number) => {
                    const itemKey = `${item.id}-${item.timestamp}-${index}`;
                    const isExpanded = expandedPrompts.has(itemKey);
                    
                    return (
                      <div key={itemKey} className="gallery-item border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 relative z-30 shadow-lg hover:shadow-xl group">
                        {/* Image/Video Preview */}
                        <div className="relative">
                          {item.fileType === 'video' ? (
                            <video
                              src={item.videoUrl}
                              className="w-full h-auto object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                              onClick={() => setFullScreenImage(item.videoUrl)}
                              muted
                            />
                          ) : item.imageUrl ? (
                            <img
                              src={getProxiedImageUrl(item.imageUrl)}
                              alt="Gallery item"
                              className="w-full h-auto object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                              onClick={() => setFullScreenImage(item.imageUrl)}
                              onError={(e) => {
                                console.error('Desktop gallery image failed to load:', item.imageUrl);
                                // Try fallback to original image preview
                                if (item.originalImagePreview && e.currentTarget.src !== item.originalImagePreview) {
                                  e.currentTarget.src = item.originalImagePreview;
                                } else {
                                  e.currentTarget.src = '/api/placeholder/400/400';
                                }
                              }}
                              onLoad={() => {
                                console.log('Desktop gallery image loaded successfully:', item.imageUrl);
                              }}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-auto bg-gray-700 flex items-center justify-center min-h-[200px]">
                              <span className="text-gray-400 text-sm">No Image</span>
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg border border-white/20">
                            {item.fileType?.toUpperCase() || 'IMAGE'}
                          </div>
                        </div>

                        {/* Description Overlay */}
                        <div className="desc">
                          <div className="text-sm text-white font-medium mb-1">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </div>
                          
                          {item.angle && (
                            <div className="text-xs text-gray-200 mb-1">
                              {item.angle}
                            </div>
                          )}
                          
                          {item.pose && (
                            <div className="text-xs text-gray-200 mb-2">
                              {item.pose}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-1 justify-center flex-wrap">
                            <button
                              onClick={() => {
                                if (isExpanded) {
                                  setExpandedPrompts(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(itemKey);
                                    return newSet;
                                  });
                                } else {
                                  setExpandedPrompts(prev => new Set([...prev, itemKey]));
                                }
                              }}
                              className="text-xs text-white hover:text-gray-200 transition-colors px-2 py-1 rounded bg-black/30 hover:bg-black/50"
                            >
                              {isExpanded ? 'Hide' : 'Show'}
                            </button>
                            <button
                              onClick={() => handleVaryImage(item.imageUrl, item.originalPrompt)}
                              disabled={processing.isProcessing}
                              className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Generate variations with nano_banana"
                            >
                              Vary
                            </button>
                            <button
                              onClick={() => handleEditImage(item.imageUrl, item.originalPrompt)}
                              disabled={processing.isProcessing}
                              className="text-xs text-blue-300 hover:text-blue-200 transition-colors px-2 py-1 rounded bg-blue-900/30 hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Inject into input slot"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteFromGallery(item.id)}
                              className="text-xs text-red-300 hover:text-red-200 transition-colors px-2 py-1 rounded bg-red-900/30 hover:bg-red-900/50"
                            >
                              Delete
                            </button>
                          </div>

                          {/* Expanded Prompt */}
                          {isExpanded && (
                            <div className="mt-2 bg-black/60 backdrop-blur-sm p-2 rounded">
                              <p className="text-xs text-white leading-relaxed">
                                {item.prompt}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Scroll to Top Button */}
              {showScrollToTop && (
                <button
                  onClick={scrollToTop}
                  className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
                  aria-label="Scroll to top"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Help Modal */}
      <HelpModal 
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Full-Screen Image Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
          onClick={closeFullScreen}
        >
          <div className="relative w-[95%] h-[95%] sm:w-[90%] sm:h-[90%] flex items-center justify-center">
            {(() => {
              const currentItem = galleryImagesWithUrls[fullScreenImageIndex];
              const isVideo = currentItem?.fileType === 'video' || fullScreenImage?.includes('.mp4') || fullScreenImage?.includes('video');
              
              if (isVideo) {
                return (
                  <video
                    src={fullScreenImage}
                    className="max-w-full max-h-full object-contain"
                    controls
                    autoPlay
                    muted
                    loop
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on video
                  />
                );
              } else {
                return (
                  <img
                    src={fullScreenImage}
                    alt="Full screen view"
                    className="max-w-full max-h-full object-contain"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
                  />
                );
              }
            })()}
            
            {/* Close button */}
                          <button
              onClick={closeFullScreen}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
            >
              <X className="w-6 h-6" />
                          </button>

            {/* Navigation arrows */}
            {galleryImagesWithUrls.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage(-1);
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
                  disabled={fullScreenImageIndex === 0}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage(1);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
                  disabled={fullScreenImageIndex === galleryImagesWithUrls.length - 1}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Image counter */}
                {galleryImagesWithUrls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {fullScreenImageIndex + 1} / {galleryImagesWithUrls.length}
                  </div>
                )}

            {/* Close Button - Mobile Friendly */}
            <button
              onClick={closeFullScreen}
              className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 z-10"
              title="Close full screen"
            >
              <X className="w-6 h-6" />
            </button>

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
              
              {/* Prompt Guide Content */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Camera Angles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-md font-medium text-gray-300 mb-2">Basic Angles</h4>
                          <div className="flex flex-wrap gap-2">
                        {BASIC_PROMPTS.slice(0, 5).map((example) => (
                              <button
                                key={example}
                            onClick={() => {
                              setPrompt(example);
                              setShowPromptGuide(false);
                            }}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                  </div>
                      </div>
                    <div>
                      <h4 className="text-md font-medium text-gray-300 mb-2">Advanced Angles</h4>
                          <div className="flex flex-wrap gap-2">
                        {EXTENDED_PROMPTS.slice(0, 5).map((example) => (
                              <button
                                key={example}
                            onClick={() => {
                              setPrompt(example);
                              setShowPromptGuide(false);
                            }}
                            className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                    </div>
                      </div>
                    </div>
                    </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Background Changes</h3>
                          <div className="flex flex-wrap gap-2">
                    {BACKGROUND_PROMPTS.slice(0, 8).map((example) => (
                              <button
                                key={example}
                        onClick={() => {
                          setPrompt(example);
                          setShowPromptGuide(false);
                        }}
                        className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                      </div>
                    </div>
                      </div>
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

      {/* Preset Modal */}
      {showPresetModal && activePresetTab && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {activePresetTab === 'shot' && '📸 Professional Camera Angles & Shot Types'}
                  {activePresetTab === 'background' && '🎨 Background Removal & Replacement Options'}
                  {activePresetTab === 'restyle' && '🎭 Character Style Presets'}
                </h2>
                              <button
                  onClick={() => {
                    setShowPresetModal(false);
                    setActivePresetTab(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                              </button>
                      </div>

              {/* Modal Content */}
              <div className="space-y-6">
                {activePresetTab === 'shot' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">📸 Professional Camera Angles & Shot Types</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-md font-medium text-gray-300 mb-3">Basic Angles</h4>
                        <div className="flex flex-wrap gap-2">
                          {BASIC_PROMPTS.map((example) => (
                            <button
                              key={example}
                              onClick={() => {
                                setPrompt(example);
                                setShowPresetModal(false);
                                setActivePresetTab(null);
                              }}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                            >
                              {example}
                            </button>
                          ))}
                    </div>
                  </div>
                      <div>
                        <h4 className="text-md font-medium text-gray-300 mb-3">Extended Shot Types</h4>
                        <div className="flex flex-wrap gap-2">
                          {EXTENDED_PROMPTS.slice(0, 10).map((example) => (
                            <button
                              key={example}
                              onClick={() => {
                                setPrompt(example);
                                setShowPresetModal(false);
                                setActivePresetTab(null);
                              }}
                              className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
                            >
                              {example}
                            </button>
                          ))}
                      </div>
                        {EXTENDED_PROMPTS.length > 10 && (
                          <div className="mt-3">
                            <p className="text-gray-400 text-sm">+ {EXTENDED_PROMPTS.length - 10} more options available</p>
                    </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activePresetTab === 'background' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">🎨 Background Removal & Replacement Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-md font-medium text-gray-300 mb-3">Background Changes</h4>
                        <div className="space-y-2">
                          {[
                            'Change background to a modern office',
                            'Place character in a forest setting',
                            'Background: beach sunset scene',
                            'Set in a futuristic cityscape',
                            'Background: cozy living room',
                            'Place in a magical garden',
                            'Background: mountain landscape',
                            'Set in a space station interior'
                          ].map((example) => (
                            <button
                              key={example}
                              onClick={() => {
                                setPrompt(example);
                                setShowPresetModal(false);
                                setActivePresetTab(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                            >
                              {example}
                            </button>
                          ))}
                      </div>
                    </div>
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-md font-medium text-gray-300 mb-3">Style Transfers</h4>
                        <div className="space-y-2">
                          {[
                            'Convert to anime style',
                            'Make it look like a painting',
                            'Style: watercolor art',
                            'Convert to cartoon style',
                            'Style: oil painting',
                            'Make it look like a sketch',
                            'Style: digital art',
                            'Convert to realistic photo'
                          ].map((example) => (
                            <button
                              key={example}
                              onClick={() => {
                                setPrompt(example);
                                setShowPresetModal(false);
                                setActivePresetTab(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors"
                            >
                              {example}
                            </button>
                          ))}
                  </div>
                  </div>
                  </div>
                  </div>
                )}

                {activePresetTab === 'restyle' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">🎭 Character Style Presets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-md font-medium text-gray-300 mb-3">Classic Character Styles</h4>
                        <div className="space-y-2">
                          {CHARACTER_STYLE_PROMPTS.map((style) => (
                            <button
                              key={style.name}
                              onClick={() => {
                                setPrompt(style.prompt);
                                setShowPresetModal(false);
                                setActivePresetTab(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm bg-pink-100 text-pink-800 rounded hover:bg-pink-200 transition-colors"
                              title={style.description}
                            >
                              <div className="font-medium">{style.name}</div>
                              <div className="text-xs text-pink-600 mt-1">{style.description}</div>
                            </button>
                          ))}
                  </div>
              </div>
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-md font-medium text-gray-300 mb-3">Artistic Styles</h4>
                        <div className="space-y-2">
                          {[
                            'Apply Ghibli anime style - Studio Ghibli magical colorful animation aesthetic',
                            'Apply Van Gogh painting style - impressionist brushstrokes and vibrant colors',
                            'Apply watercolor painting style - soft blended colors and artistic texture',
                            'Apply oil painting style - rich textures and classical art aesthetic',
                            'Apply cyberpunk neon style - electric colors and futuristic lighting',
                            'Apply film noir style - high contrast black and white with dramatic shadows',
                            'Apply vintage photography style - sepia tones and nostalgic atmosphere',
                            'Apply digital art style - clean lines and modern graphic design aesthetic'
                          ].map((example) => (
                            <button
                              key={example}
                              onClick={() => {
                                setPrompt(example);
                                setShowPresetModal(false);
                                setActivePresetTab(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200 transition-colors"
                            >
                              {example}
                            </button>
                          ))}
            </div>
          </div>
                    </div>
                  </div>
                )}
              </div>
                    </div>
          </div>
        </div>
      )}
      
      {/* Hidden File Input - Desktop */}
      <input
        id="file-input"
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Hidden File Input - Mobile */}
      <input
        id="mobile-file-input"
        type="file"
        accept="image/*,video/*"
        onChange={handleMobileFileUpload}
        className="hidden"
      />

      {/* Mobile Dynamic Image Upload System */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-transparent">
        {/* Dynamic numbered image slots - ONLY show if images uploaded */}
        {uploadedFiles.length > 0 && (
          <div className="p-4 border-b border-transparent">
            {/* Upload progress indicator - Moved above image slots */}
            <div className="text-center mb-4">
              <span className="text-xs text-gray-400">
                {uploadedFiles.length}/4 images uploaded
              </span>
    </div>
            
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3, 4].map((slotNumber) => {
                const imageIndex = slotNumber - 1;
                const hasImage = uploadedFiles[imageIndex];
                
                return (
                  <div key={slotNumber} className="relative">
                    <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-sm font-medium ${
                      hasImage 
                        ? 'border-green-500 bg-green-500/20' 
                        : 'border-gray-600 border-dashed bg-gray-800/50'
                    }`}>
                      {hasImage ? (
                        <img 
                          src={hasImage.preview} 
                          alt={`Upload ${slotNumber}`}
                          className="w-full h-full object-cover rounded-[30px]"
                        />
                      ) : (
                        <span className="text-gray-500">{slotNumber}</span>
                      )}
      </div>
                    
                    {/* Remove button for uploaded images */}
                    {hasImage && (
                      <button
                        onClick={() => {
                          const newFiles = uploadedFiles.filter((_, index) => index !== imageIndex);
                          setUploadedFiles(newFiles);
                        }}
                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X className="w-1.5 h-1.5 text-white" />
                      </button>
                    )}
    </div>
  );
              })}
            </div>
            
            {/* Model Selection - Moved to where upload counter was */}
            <div className="text-center">
              <select 
                value={generationMode || ''}
                onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
                className="bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
              >
                <option value="">Select Model</option>
                {getAvailableModes().map((mode) => (
                  <option key={mode} value={mode}>
                    {getModelDisplayName(mode)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Responsive Image Diffusion Display */}
        <div className="w-full mb-6 px-4 pt-6" style={{ top: '200px' }}>
          {/* Image Display Area - Only shows when there are images or generation is in progress */}
          {(displayedImages.length > 0 || isGeneratingImages) && (
            <div className="bg-gray-800/30 border-2 border-dashed border-cyan-500/50 rounded-xl min-h-[345px] md:min-h-[460px] relative overflow-hidden p-4 max-w-5xl mx-auto">
              {displayedImages.length > 0 ? (
                <div className="h-full">
                  {/* Mobile: Swipeable container */}
                  <div className="md:hidden">
                    <div 
                      className="flex transition-transform duration-300 ease-out h-full"
                      style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                      onTouchStart={(e: React.TouchEvent) => {
                        const startX = e.touches[0].clientX;
                        
                        const handleTouchEnd = (e: TouchEvent) => {
                          const endX = e.changedTouches[0].clientX;
                          const diff = startX - endX;
                          
                          if (Math.abs(diff) > 50) { // Minimum swipe distance
                            if (diff > 0) handleSwipeLeft();
                            else handleSwipeRight();
                          }
                          
                          document.removeEventListener('touchend', handleTouchEnd);
                        };
                        
                        document.addEventListener('touchend', handleTouchEnd);
                      }}
                    >
                      {displayedImages.map((image, index) => (
                        <div key={index} className="w-full h-[345px] flex-shrink-0 flex items-center justify-center p-4">
                          <img 
                            src={image} 
                            alt={`Generated variation ${index + 1}`}
                            className="max-w-full max-h-full object-contain rounded-[30px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Desktop: Grid layout */}
                  <div className="hidden md:block">
                    <div className="grid grid-cols-2 gap-4 min-h-[460px]">
                      {Array.from({ length: 4 }, (_, index) => (
                        <div key={index} className="bg-gray-700/50 rounded-lg border border-gray-600 flex items-center justify-center min-h-[207px]">
                          {displayedImages[index] ? (
                            <img 
                              src={displayedImages[index]} 
                              alt={`Generated variation ${index + 1}`}
                              className="max-w-full max-h-full object-contain rounded-lg"
                            />
                          ) : (
                            <div className="text-gray-500 text-sm">Slot {index + 1}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Image indicator dots - Mobile only */}
                  <div className="md:hidden absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {displayedImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-cyan-500' : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Swipe hint - Mobile only */}
                  {displayedImages.length > 1 && (
                    <div className="md:hidden absolute top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                        <span className="text-xs text-white">Swipe to view more</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Desktop progress indicator */}
                  {isGeneratingImages && (
                    <div className="hidden md:block mt-4 text-center">
                      <div className="text-cyan-400 text-sm font-medium">Generating variations...</div>
                      <div className="mt-2 flex justify-center gap-2">
                        {[1, 2, 3, 4].map((num, index) => (
                          <div key={num} className={`w-3 h-3 rounded-full transition-colors ${
                            index < displayedImages.length ? 'bg-cyan-500' : 'bg-gray-600'
                          }`} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : isGeneratingImages ? (
                // Generation loading state
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mb-4"></div>
                  <p className="text-gray-400 text-sm">Generating variations...</p>
                  <div className="mt-4 flex gap-2">
                    {[1, 2, 3, 4].map((num, index) => (
                      <div 
                        key={num}
                        className={`w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center text-xs text-gray-500 ${
                          index < displayedImages.length ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-600'
                        }`}
                      >
                        {index < displayedImages.length ? '✓' : num}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-5">
          <div className="flex items-center gap-4">
            {/* Yellow Plus Button - Media Upload */}
            <button 
              onClick={() => document.getElementById('mobile-file-input')?.click()}
              disabled={uploadedFiles.length >= 4}
              className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-200 ${
                uploadedFiles.length >= 4 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 text-white hover:bg-green-400 hover:shadow-lg active:scale-95'
              }`}
            >
              +
            </button>
            

            {/* Text Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Describe your idea..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-gray-700/80 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 transition-all duration-200 shadow-sm"
              />
            </div>
            
            
            {/* Generate Button */}
            <button 
              onClick={async () => {
                if (!prompt.trim() && uploadedFiles.length === 0) return;
                
                setIsGeneratingImages(true);
                setDisplayedImages([]);
                setCurrentImageIndex(0);
                
                try {
                  // Use the appropriate generation function based on uploaded files
                  if (uploadedFiles.length === 1 && uploadedFiles[0].fileType === 'image') {
                    await handleModelGeneration();
                  } else {
                    await handleTextToImage();
                  }
                } catch (error) {
                  console.error('Generation error:', error);
                  setIsGeneratingImages(false);
                }
              }}
              disabled={(!prompt.trim() && uploadedFiles.length === 0) || processing.isProcessing}
              className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                (!prompt.trim() && uploadedFiles.length === 0) || processing.isProcessing
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600/80 text-white hover:bg-gray-600 hover:shadow-lg active:scale-95'
              }`}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="bg-gray-800 border-t border-gray-700">
          <div className="flex">
            <button 
              onClick={() => router.push('/generate')}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${pathname === '/generate' ? 'text-gray-200' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid3X3 className="w-5 h-5" />
              <span className="text-xs">Home</span>
            </button>
            <button 
              onClick={() => router.push('/community')}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${pathname === '/community' ? 'text-gray-200' : 'text-gray-400 hover:text-white'}`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs">Chat</span>
            </button>
            <button 
              onClick={() => setShowGallery(!showGallery)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${showGallery ? 'text-gray-200' : 'text-gray-400 hover:text-white'}`}
            >
              <FolderOpen className="w-5 h-5" />
              <span className="text-xs">Library</span>
            </button>
            <button 
              onClick={() => router.push('/profile')}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${pathname === '/profile' ? 'text-gray-200' : 'text-gray-400 hover:text-white'}`}
            >
              <User className="w-5 h-5" />
              <span className="text-xs">Profile</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
