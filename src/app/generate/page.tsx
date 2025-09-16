'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Upload, Download, Loader2, RotateCcw, Camera, Sparkles, Images, X, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit, MessageCircle, HelpCircle, ArrowRight, ArrowUp, FolderOpen, Grid3X3, User, Settings } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import { refreshCreditsAfterGeneration } from '@/utils/creditRefresh';
import CreditPurchaseModal from '@/components/CreditPurchaseModal';
import type { UploadedFile, UploadedImage, ProcessingState, CharacterVariation, RunwayVideoRequest, RunwayVideoResponse, RunwayTaskResponse, EndFrameRequest, EndFrameResponse } from '@/types/gemini';
// StoredVariation type (extends CharacterVariation with additional properties)
interface StoredVariation extends CharacterVariation {
  timestamp: number;
  originalPrompt: string;
  originalImagePreview?: string;
  videoUrl?: string;
  fileType?: 'image' | 'video';
  databaseId?: string;
}

// Generation mode types
type GenerationMode = 
  | 'nano-banana' 
  | 'runway-t2i' 
  | 'runway-video'
  | 'veo3-fast' 
  | 'minimax-2.0'
  | 'minimax-video'
  | 'kling-2.1-master'
  | 'seedance-pro'
  | 'decart-lucy-14b'
  | 'minimax-i2v-director'
  | 'hailuo-02-pro'
  | 'kling-video-pro'
  | 'flux-dev'
  | 'seedream-3'
  | 'seedance-1-pro'
  | 'bytedance-seedream-4'
  | 'seedream-4-edit'
  // Mid-Tier Image-to-Video Models ($0.08 - $0.12)
  | 'minimax-video-01'
  | 'stable-video-diffusion-i2v'
  | 'modelscope-i2v'
  | 'text2video-zero-i2v'
  // Lower-Tier Image-to-Video Models ($0.10)
  | 'wan-v2-2-a14b-i2v-lora'
  | 'cogvideo-i2v'
  | 'zeroscope-t2v'
  | 'kling-ai-avatar'
  | 'gemini-25-flash-image-edit'
  // Image Resizing Models
  | 'luma-photon-reframe';
import AnimatedError from '@/components/AnimatedError';
import { useAnimatedError } from '@/hooks/useAnimatedError';
import { useAuth } from '@/contexts/AuthContext';
import { HelpModal } from '@/components/HelpModal';
import AspectRatioModal, { GenerationSettings } from '@/components/AspectRatioModal';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useSecretAccess } from '@/hooks/useSecretAccess';
import { useUnlockedModels } from '@/hooks/useUnlockedModels';
import { useUserGallery } from '@/hooks/useUserGallery';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { getProxiedImageUrl } from '@/lib/imageUtils';
import { Header } from '@/components/Header';
import { AuthModal } from '@/components/AuthModal';
import { UsageLimitBanner, UsageCounter } from '@/components/UsageLimitBanner';
import { UserCounter } from '@/components/UserCounter';
import { ProcessingModal } from '@/components/ProcessingModal';

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

// Background prompts organized by categories with tabs and dropdowns
const BACKGROUND_PROMPTS_BY_CATEGORY = {
  removal: {
    name: 'Background Removal',
    icon: '🗑️',
    prompts: [
      'Remove the background completely, transparent background',
      'Remove background, clean transparent background',
      'Remove all background elements, transparent background',
      'Remove background, keep only the character',
      'Remove background, create transparent background',
      'Remove background, isolate character on transparent background',
      'Remove background, clean cutout with transparent background',
      'Remove background, professional transparent background'
    ]
  },
  studio: {
    name: 'Studio & Professional',
    icon: '📸',
    prompts: [
      'Change background to professional studio backdrop',
      'Change background to clean white studio background',
      'Change background to neutral gray studio background',
      'Change background to professional photography backdrop',
      'Change background to seamless studio background',
      'Change background to clean gradient background',
      'Change background to solid color background',
      'Change background to minimalist background'
    ]
  },
  natural: {
    name: 'Natural & Outdoor',
    icon: '🌲',
    prompts: [
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
      'Change background to a dreamlike landscape with giant potatoes - Potato Cult preset'
    ]
  },
  indoor: {
    name: 'Indoor & Architectural',
    icon: '🏠',
    prompts: [
      'Change background to modern office interior',
      'Change background to luxury home interior',
      'Change background to contemporary living room',
      'Change background to elegant bedroom',
      'Change background to modern kitchen',
      'Change background to library setting',
      'Change background to art gallery',
      'Change background to hotel lobby',
      'Change background to restaurant interior',
      'Change background to modern architecture'
    ]
  },
  creative: {
    name: 'Creative & Artistic',
    icon: '🎨',
    prompts: [
      'Change background to abstract artistic background',
      'Change background to geometric pattern background',
      'Change background to colorful gradient background',
      'Change background to artistic texture background',
      'Change background to creative digital background',
      'Change background to fantasy environment',
      'Change background to sci-fi setting',
      'Change background to dreamy atmosphere',
      'Change background to artistic illustration background',
      'Change background to creative concept background'
    ]
  },
  themed: {
    name: 'Seasonal & Themed',
    icon: '🎭',
    prompts: [
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
    ]
  },
  horror: {
    name: 'Horror Movies',
    icon: '👻',
    prompts: [
      'Place character in Halloween movie setting - suburban street with jack-o-lanterns and autumn leaves, cinematic low-angle lighting with deep shadows and warm orange glow',
      'Place character in Nightmare on Elm Street setting - dark suburban neighborhood with eerie streetlights, fog machine atmosphere and dramatic chiaroscuro lighting',
      'Place character in Friday the 13th setting - Camp Crystal Lake with foggy forest and rustic cabins, moonlight filtering through trees with cold blue undertones',
      'Place character in The Exorcist setting - Georgetown townhouse with vintage architecture and dim lighting, candlelit interiors with flickering shadows and gothic atmosphere',
      'Place character in Poltergeist setting - suburban home with supernatural atmosphere and warm interior lighting, Spielbergian golden hour with supernatural elements',
      'Place character in The Shining setting - Overlook Hotel corridor with red carpet and eerie lighting, Kubrickian symmetrical composition with unsettling color grading',
      'Place character in Psycho setting - Bates Motel with vintage neon sign and gothic architecture, Hitchcockian suspense lighting with dramatic shadows',
      'Place character in Carrie setting - high school prom with dramatic red lighting and vintage 1970s atmosphere, De Palma split-screen cinematography with blood-red color palette',
      'Place character in A Nightmare Before Christmas setting - Halloween Town with gothic architecture and orange lighting, Burtonesque stop-motion aesthetic with warm Halloween glow',
      'Place character in Beetlejuice setting - haunted house with quirky gothic interior and green lighting, Tim Burton\'s signature dark whimsy with neon accents',
      'Place character in The Addams Family setting - Victorian mansion with dark gothic architecture and warm candlelight, macabre elegance with Victorian-era lighting',
      'Place character in Hocus Pocus setting - Salem with colonial architecture and autumn atmosphere, Disney magic with historical New England charm',
      'Place character in Saw movie franchise setting - dark industrial bathroom with rusty pipes and cold blue lighting, torture porn aesthetic with clinical horror atmosphere',
      'Place character in The Ring setting - dark well with eerie water and supernatural atmosphere, J-horror cinematography with muted colors and water imagery',
      'Place character in The Grudge setting - Japanese house with dark shadows and supernatural presence, atmospheric horror with traditional Japanese architecture',
      'Place character in Insidious setting - haunted house with red door and supernatural atmosphere, James Wan\'s signature jump-scare lighting with red door symbolism',
      'Place character in The Conjuring setting - haunted farmhouse with vintage furniture and supernatural lighting, period-accurate 1970s atmosphere with paranormal elements',
      'Place character in Annabelle setting - vintage doll room with creepy atmosphere and warm lighting, doll horror aesthetic with vintage toy collection',
      'Place character in It setting - Derry sewers with red balloons and clown imagery, Stephen King\'s small-town horror with Pennywise\'s circus aesthetic',
      'Place character in The Babadook setting - dark house with children\'s book illustrations and eerie atmosphere, psychological horror with illustrated book elements',
      'Place character in Hereditary setting - family home with miniature models and supernatural elements, Ari Aster\'s slow-burn horror with family trauma themes',
      'Place character in Midsommar setting - Swedish countryside with bright daylight and pagan rituals, daylight horror with Swedish midsummer festival atmosphere',
      'Place character in Get Out setting - suburban home with hypnotic atmosphere and psychological horror, Jordan Peele\'s social horror with suburban nightmare',
      'Place character in Us setting - Santa Cruz beach house with doppelganger imagery and red lighting, psychological thriller with mirror imagery and red symbolism',
      'Place character in A Quiet Place setting - abandoned farm with sound-sensitive creatures and tense atmosphere, silence-based horror with rural isolation',
      'Place character in The Witch setting - Puritan New England with dark forest and supernatural elements, period horror with 1630s Puritan atmosphere',
      'Place character in The Lighthouse setting - isolated lighthouse with black and white cinematography and madness, psychological horror with maritime isolation',
      'Place character in Suspiria setting - German dance academy with vibrant colors and supernatural horror, Argento\'s giallo aesthetic with dance academy atmosphere',
      'Place character in The Texas Chain Saw Massacre setting - rural Texas farmhouse with industrial horror atmosphere, grindhouse aesthetic with rural Texas setting',
      'Place character in Hellraiser setting - puzzle box dimension with leather-clad cenobites and gothic horror, Clive Barker\'s body horror with puzzle box imagery'
    ]
  },
  scifi: {
    name: 'Sci-Fi Movies',
    icon: '🚀',
    prompts: [
      'Place character in Blade Runner setting - cyberpunk cityscape with neon rain and futuristic architecture, Ridley Scott\'s noir cinematography with rain-soaked streets and neon reflections',
      'Place character in The Matrix setting - green-tinted digital world with code rain effects, Wachowski\'s bullet-time cinematography with digital rain and green color grading',
      'Place character in Star Wars setting - Tatooine desert with twin suns and sandy dunes, Lucas\'s space opera aesthetic with binary sunset and desert cinematography',
      'Place character in Avatar setting - Pandora jungle with bioluminescent plants and blue lighting, Cameron\'s 3D cinematography with Na\'vi bioluminescence and alien flora',
      'Place character in Terminator 2 scene - futuristic Los Angeles with orange fire glow and metallic surfaces, Cameron\'s action cinematography with molten metal and fire effects',
      'Place character in Mad Max setting - post-apocalyptic desert wasteland with orange dust storms, Miller\'s wasteland cinematography with desert storms and vehicular mayhem',
      'Place character in Inception setting - dreamlike city with impossible architecture and muted colors, Nolan\'s dream logic cinematography with gravity-defying architecture',
      'Place character in Interstellar setting - space station with Earth view and cosmic atmosphere, Nolan\'s space cinematography with cosmic vistas and time dilation effects',
      'Place character in Gravity setting - space with Earth\'s atmosphere and cosmic isolation, Cuarón\'s long-take cinematography with zero-gravity camera work',
      'Place character in Arrival setting - alien spacecraft with mysterious atmosphere and linguistic themes, Villeneuve\'s atmospheric cinematography with alien linguistics',
      'Place character in Ex Machina setting - modern house with AI laboratory and sleek technology, Garland\'s minimalist cinematography with AI consciousness themes',
      'Place character in Her setting - futuristic Los Angeles with warm technology and emotional AI, Jonze\'s intimate cinematography with AI romance and warm color palette',
      'Place character in Minority Report setting - futuristic Washington DC with precrime technology, Spielberg\'s future noir with precognitive technology and urban surveillance',
      'Place character in Total Recall setting - Mars colony with red atmosphere and futuristic technology, Verhoeven\'s action sci-fi with Mars terraforming and memory themes',
      'Place character in RoboCop setting - Detroit with corporate dystopia and cybernetic law enforcement, Verhoeven\'s satirical sci-fi with corporate corruption and cyborg justice',
      'Place character in Aliens setting - LV-426 colony with industrial horror and xenomorph atmosphere, Cameron\'s action horror with industrial spaceship and alien infestation',
      'Place character in Predator setting - Central American jungle with alien technology and military action, McTiernan\'s action cinematography with alien camouflage and jungle warfare',
      'Place character in The Thing setting - Antarctic research station with paranoia and body horror, Carpenter\'s isolation horror with Antarctic blizzard and alien transformation',
      'Place character in Event Horizon setting - spaceship with hell dimension and cosmic horror, Anderson\'s space horror with dimensional travel and hell imagery',
      'Place character in Sunshine setting - spaceship with solar mission and cosmic isolation, Boyle\'s space cinematography with solar mission and cosmic isolation',
      'Place character in Moon setting - lunar base with cloning technology and psychological isolation, Jones\'s minimalist sci-fi with lunar mining and identity themes',
      'Place character in District 9 setting - Johannesburg with alien refugee camp and apartheid themes, Blomkamp\'s social sci-fi with alien apartheid and documentary style',
      'Place character in Elysium setting - space station with luxury and Earth\'s poverty contrast, Blomkamp\'s social commentary with orbital luxury and Earth\'s slums',
      'Place character in Oblivion setting - post-apocalyptic Earth with drone technology and mystery, Kosinski\'s post-apocalyptic cinematography with drone surveillance and memory themes',
      'Place character in Edge of Tomorrow setting - alien invasion with time loop and military action, Liman\'s time-loop action with alien invasion and military sci-fi',
      'Place character in Ready Player One setting - virtual reality world with 1980s nostalgia and gaming, Spielberg\'s VR cinematography with retro gaming and virtual worlds',
      'Place character in Tron setting - digital world with neon grids and computer aesthetics, Lisberger\'s digital cinematography with computer-generated environments and neon grids',
      'Place character in The Fifth Element setting - futuristic New York with colorful aliens and action, Besson\'s colorful sci-fi with alien diversity and futuristic New York',
      'Place character in Dune setting - Arrakis desert with spice mining and feudal politics, Villeneuve\'s epic sci-fi with desert cinematography and spice mining operations',
      'Place character in Ghost in the Shell setting - cyberpunk Tokyo with cyborg technology and philosophy, Oshii\'s cyberpunk cinematography with cyborg consciousness and urban futurism'
    ]
  },
  christmas: {
    name: 'Christmas Movies',
    icon: '🎄',
    prompts: [
      'Place character in A Christmas Carol setting - Victorian London with foggy streets and warm candlelit interiors',
      'Place character in It\'s a Wonderful Life setting - Bedford Falls with snowy streets and warm small-town atmosphere',
      'Place character in Home Alone setting - suburban Chicago home with Christmas decorations and warm interior lighting',
      'Place character in Elf setting - New York City with Christmas decorations and festive atmosphere',
      'Place character in The Grinch setting - Whoville with whimsical architecture and colorful Christmas decorations',
      'Place character in Miracle on 34th Street setting - New York City with vintage department store and Christmas atmosphere',
      'Place character in White Christmas setting - Vermont inn with snowy landscape and warm lodge atmosphere',
      'Place character in A Christmas Story setting - suburban Cleveland with vintage 1940s Christmas decorations',
      'Place character in National Lampoon\'s Christmas Vacation setting - suburban home with chaotic Christmas decorations',
      'Place character in The Polar Express setting - magical train with warm golden lighting and winter atmosphere',
      'Place character in How the Grinch Stole Christmas setting - Whoville with Dr. Seuss-inspired architecture and Christmas lights',
      'Place character in The Santa Clause setting - suburban home with Christmas decorations and magical atmosphere'
    ]
  },
  thanksgiving: {
    name: 'Thanksgiving Movies',
    icon: '🦃',
    prompts: [
      'Place character in National Lampoon\'s Thanksgiving setting - suburban home with chaotic family gathering atmosphere',
      'Place character in Planes, Trains and Automobiles setting - Chicago airport with vintage 1980s atmosphere',
      'Place character in Home for the Holidays setting - family home with warm autumn lighting and cozy interior',
      'Place character in The Ice Storm setting - suburban Connecticut with cold autumn atmosphere and vintage 1970s styling',
      'Place character in Pieces of April setting - New York apartment with urban autumn atmosphere',
      'Place character in Hannah and Her Sisters setting - Manhattan brownstone with warm family gathering atmosphere'
    ]
  },
  action: {
    name: 'Action Movies',
    icon: '💥',
    prompts: [
      'Place character in Batman movie setting - dark Gotham City with neon lights and gothic architecture, Nolan\'s dark knight cinematography with urban decay and dramatic shadows',
      'Place character in Spider-Man movie setting - New York City skyline with web-slinging action, Marvel\'s superhero cinematography with web-slinging dynamics and urban acrobatics',
      'Place character in 1980s slasher movie setting - dark forest cabin with warm firelight and shadows, Carpenter\'s slasher cinematography with practical effects and atmospheric lighting',
      'Place character in Steven Spielberg movie setting - suburban street with warm golden hour lighting, Spielberg\'s signature cinematography with suburban wonder and golden hour magic',
      'Place character in Quentin Tarantino movie setting - retro diner with neon signs and bold color grading, Tarantino\'s stylized cinematography with bold colors and retro aesthetics',
      'Place character in Sin City movie setting - black and white noir with selective red color accents, Rodriguez\'s neo-noir cinematography with high contrast and selective color',
      'Place character in Pulp Fiction setting - retro diner with checkerboard floors and neon signs, Tarantino\'s postmodern cinematography with retro diner aesthetics and neon lighting',
      'Place character in Kill Bill setting - Japanese garden with cherry blossoms and traditional architecture, Tarantino\'s martial arts cinematography with Japanese aesthetics and cherry blossom symbolism',
      'Place character in Reservoir Dogs setting - warehouse with industrial lighting and urban decay, Tarantino\'s debut cinematography with warehouse atmosphere and criminal aesthetics',
      'Place character in Django Unchained setting - southern plantation with golden hour lighting, Tarantino\'s western cinematography with plantation aesthetics and golden hour cinematography',
      'Place character in Inglourious Basterds setting - French countryside with warm European lighting, Tarantino\'s war cinematography with European countryside and warm lighting',
      'Place character in Once Upon a Time in Hollywood setting - 1960s Los Angeles with vintage neon, Tarantino\'s period cinematography with 1960s Los Angeles and vintage neon aesthetics',
      'Place character in The Hateful Eight setting - snowy mountain cabin with warm firelight, Tarantino\'s western cinematography with cabin atmosphere and warm firelight',
      'Place character in Jackie Brown setting - California beach with sunset lighting and palm trees, Tarantino\'s blaxploitation cinematography with California beach aesthetics',
      'Place character in Death Proof setting - Texas roadhouse with neon signs and desert lighting, Tarantino\'s grindhouse cinematography with Texas roadhouse and desert atmosphere'
    ]
  },
  fantasy: {
    name: 'Fantasy Movies',
    icon: '🧙‍♂️',
    prompts: [
      'Place character in Lord of the Rings setting - Middle-earth Shire with rolling green hills, Jackson\'s epic fantasy cinematography with New Zealand landscapes and hobbit architecture',
      'Place character in Harry Potter setting - Hogwarts castle with magical atmosphere and warm lighting, Columbus\'s magical cinematography with castle architecture and warm candlelight',
      'Place character in The Hobbit setting - Middle-earth with dwarven halls and magical landscapes, Jackson\'s fantasy cinematography with dwarven architecture and magical landscapes',
      'Place character in Game of Thrones setting - Westeros with medieval castles and political intrigue, HBO\'s fantasy cinematography with medieval architecture and political drama',
      'Place character in The Chronicles of Narnia setting - magical wardrobe world with talking animals, Adamson\'s fantasy cinematography with magical creatures and wardrobe portal',
      'Place character in Pan\'s Labyrinth setting - Spanish Civil War with dark fantasy and magical creatures, del Toro\'s dark fantasy cinematography with faun creatures and Spanish Civil War',
      'Place character in The Princess Bride setting - medieval kingdom with swashbuckling adventure, Reiner\'s fairy tale cinematography with medieval aesthetics and swashbuckling romance',
      'Place character in Labyrinth setting - Goblin King\'s castle with puppets and musical fantasy, Henson\'s puppet fantasy cinematography with goblin puppets and musical sequences',
      'Place character in The Dark Crystal setting - Thra with puppets and dark fantasy atmosphere, Henson\'s puppet fantasy cinematography with crystal technology and dark fantasy creatures',
      'Place character in Willow setting - fantasy kingdom with magic and adventure, Howard\'s fantasy cinematography with magical creatures and adventure quest aesthetics',
      'Place character in The NeverEnding Story setting - Fantasia with flying dragon and magical creatures, Petersen\'s fantasy cinematography with flying dragon and magical book world',
      'Place character in Legend setting - fantasy forest with unicorns and dark magic, Scott\'s fantasy cinematography with unicorn mythology and dark forest atmosphere'
    ]
  }
};

// Legacy array for backward compatibility
const BACKGROUND_PROMPTS = Object.values(BACKGROUND_PROMPTS_BY_CATEGORY).flatMap(category => category.prompts);

// Camera Motion Presets - User-Friendly Display Text
const CAMERA_MOTION_PROMPTS = [
  // Basic Camera Movements
  'Slow zoom in',
  'Slow zoom out',
  'Pan left to right',
  'Pan right to left',
  'Tilt up',
  'Tilt down',
  'Dolly forward',
  'Dolly backward',
  
  // Dynamic Camera Movements
  'Orbital movement',
  'Spiral inward',
  'Spiral outward',
  'Tracking shot',
  'Leading camera',
  'Whip pan',
  'Quick zoom in',
  'Quick zoom out',
  
  // Cinematic Camera Techniques
  'Crane up',
  'Crane down',
  'Handheld movement',
  'Steadicam',
  'Aerial shot',
  'Low angle shot',
  
  // Advanced Camera Movements
  '360-degree rotation',
  'Bullet time effect',
  'Parallax movement',
  'Rack focus',
  'Push-in',
  'Pull-out',
  'Tilt shift',
  
  // Action Camera Movements
  'Camera shake',
  'Smooth glide',
  'Snap zoom',
  'Slow motion',
  'Time-lapse',
  'Hyperlapse',
  'Drone movement',
  'Underwater movement',
  
  // Creative Camera Movements
  'Through character',
  'Mirror reflection',
  'Split screen',
  'Picture-in-picture',
  'Kaleidoscope effect',
  'Tunnel vision',
  'Fish-eye lens',
  'Wide-angle lens'
];

// Camera Motion Enhanced Prompts - Backend Logic (Hidden from User)
const CAMERA_MOTION_ENHANCED_PROMPTS = {
  'Slow zoom in': 'Slow zoom in on character, creating intimate connection with cinematic camera work',
  'Slow zoom out': 'Slow zoom out from character, revealing wider environment with cinematic scope',
  'Pan left to right': 'Smooth pan left to right across scene, cinematic sweep movement',
  'Pan right to left': 'Smooth pan right to left across scene, elegant movement',
  'Tilt up': 'Tilt up to reveal character, dramatic upward movement',
  'Tilt down': 'Tilt down to reveal character, descending perspective',
  'Dolly forward': 'Dolly forward toward character, approaching with cinematic purpose',
  'Dolly backward': 'Dolly backward away from character, creating dramatic distance',
  'Orbital movement': 'Orbital movement around character, circular cinematic motion',
  'Spiral inward': 'Spiral inward toward character, tightening focus with cinematic motion',
  'Spiral outward': 'Spiral outward from character, expanding perspective with cinematic motion',
  'Tracking shot': 'Tracking shot following character movement, smooth pursuit cinematic motion',
  'Leading camera': 'Leading camera movement, anticipating character action',
  'Whip pan': 'Whip pan between characters, rapid directional change with cinematic energy',
  'Quick zoom in': 'Quick zoom in for dramatic emphasis, sudden focus',
  'Quick zoom out': 'Quick zoom out for reveal, expanding scope',
  'Crane up': 'Crane shot moving up and over character, ascending cinematic perspective',
  'Crane down': 'Crane shot moving down and under character, descending viewpoint',
  'Handheld movement': 'Handheld camera movement for realistic feel, natural cinematic motion',
  'Steadicam': 'Steadicam following character movement, smooth pursuit cinematic motion',
  'Aerial shot': 'Aerial shot from above character, bird\'s eye cinematic perspective',
  'Low angle shot': 'Low angle shot from below character, dramatic upward cinematic view',
  '360-degree rotation': '360-degree rotation around character, complete circular motion',
  'Bullet time effect': 'Matrix-style bullet time effect, frozen moment in motion',
  'Parallax movement': 'Parallax movement with depth, layered perspective',
  'Rack focus': 'Rack focus from background to character, depth transition',
  'Push-in': 'Push-in with shallow depth of field, intimate approach',
  'Pull-out': 'Pull-out with expanding depth of field, widening scope',
  'Tilt shift': 'Tilt shift effect for miniature look, selective focus',
  'Camera shake': 'Camera shake for action sequence, intense movement',
  'Smooth glide': 'Smooth glide for elegant movement, fluid motion',
  'Snap zoom': 'Snap zoom for emphasis, sudden dramatic focus',
  'Slow motion': 'Slow motion camera movement, time-stretched motion',
  'Time-lapse': 'Time-lapse camera movement, accelerated perspective',
  'Hyperlapse': 'Hyperlapse camera movement, rapid spatial progression',
  'Drone movement': 'Drone-like aerial movement, floating perspective',
  'Underwater movement': 'Underwater camera movement, fluid aquatic motion',
  'Through character': 'Through character movement, immersive perspective',
  'Mirror reflection': 'Mirror reflection camera work, symmetrical composition',
  'Split screen': 'Split screen camera movement, divided perspective',
  'Picture-in-picture': 'Picture-in-picture camera work, layered composition',
  'Kaleidoscope effect': 'Kaleidoscope camera effect, fragmented perspective',
  'Tunnel vision': 'Tunnel vision camera movement, focused perspective',
  'Fish-eye lens': 'Fish-eye camera distortion, wide-angle curvature',
  'Wide-angle lens': 'Wide-angle camera distortion, expanded field of view'
};

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

interface ProcessingItem {
  id: string;
  type: 'image' | 'video';
  model: string;
  prompt: string;
  progress: number;
  currentStep: string;
  startTime: number;
  estimatedTime?: number;
  cancellable: boolean;
  abortController?: AbortController;
}

export default function Home() {
  const { user } = useAuth();
  const { canGenerate, trackUsage, isAnonymous } = useUsageTracking();
  const { hasSecretAccess, isAdmin, loading: secretAccessLoading } = useSecretAccess();
  const { unlockedGenerateModels, isGenerateModelUnlocked, isVideoVariantModel } = useUnlockedModels();
  const { gallery, addToGallery, removeFromGallery, clearGallery, removeDuplicates, migrateLocalStorageToDatabase, saveToAccount } = useUserGallery();
  const { checkUserCredits, useCredits, checking: creditChecking, using: creditUsing } = useCreditCheck();
  const { isMobile, isClient } = useMobileDetection();
  const router = useRouter();
  const pathname = usePathname();
  
  // Note: Automatic duplicate removal removed to prevent infinite loop
  // Use the "Fix Duplicates" button in development mode if needed
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentStep: ''
  });
  
  // AbortController for cancelling operations
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isCancellable, setIsCancellable] = useState(false);

  // Generation time estimation state
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  const [variations, setVariations] = useState<StoredVariation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'images' | 'videos'>('all');
  
  // Processing items that appear in gallery
  const [processingItems, setProcessingItems] = useState<ProcessingItem[]>([]);
  
  // Processing modal state
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingModalType, setProcessingModalType] = useState<'image' | 'video'>('image');
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  
  // Credit purchase modal state
  const [showCreditPurchaseModal, setShowCreditPurchaseModal] = useState(false);
  
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
  const [activeBackgroundTab, setActiveBackgroundTab] = useState<'removal' | 'studio' | 'natural' | 'indoor' | 'creative' | 'themed' | 'horror' | 'scifi' | 'christmas' | 'thanksgiving' | 'action' | 'fantasy'>('removal');
  const [presetCount, setPresetCount] = useState(0);
  const [showTokenWarning, setShowTokenWarning] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Aspect ratio and generation settings
  const [showAspectRatioModal, setShowAspectRatioModal] = useState(false);
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
    aspectRatio: '1:1',
    guidanceScale: 7.5,
    strength: 0.8,
    seed: Math.floor(Math.random() * 1000000),
    duration: 5,
    resolution: '1280x720',
    outputFormat: 'jpeg',
    styleConsistency: true,
    characterSeparation: 0.7,
    spatialAwareness: true
  });

  // Handle generation settings save
  const handleSaveGenerationSettings = useCallback((settings: GenerationSettings) => {
    console.log('🎯 [GENERATE PAGE] Generation settings applied:', {
      aspectRatio: settings.aspectRatio,
      guidanceScale: settings.guidanceScale,
      strength: settings.strength,
      seed: settings.seed,
      duration: settings.duration,
      resolution: settings.resolution,
      outputFormat: settings.outputFormat,
      styleConsistency: settings.styleConsistency,
      characterSeparation: settings.characterSeparation,
      spatialAwareness: settings.spatialAwareness,
      timestamp: new Date().toISOString()
    });
    setGenerationSettings(settings);
    console.log('✅ [GENERATE PAGE] Generation settings state updated');
  }, []);

  // Handle preset combination logic
  const handlePresetClick = useCallback((presetText: string) => {
    const currentPrompt = prompt.trim();
    
    if (currentPrompt === '') {
      // First preset - just set it
      setPrompt(presetText);
      setPresetCount(1);
    } else {
      // Add comma and new preset
      const newPrompt = `${currentPrompt}, ${presetText}`;
      setPrompt(newPrompt);
      setPresetCount(prev => prev + 1);
      
      // Show warning after 3 presets
      if (presetCount >= 2) {
        setShowTokenWarning(true);
        // Auto-hide warning after 3 seconds
        setTimeout(() => setShowTokenWarning(false), 3000);
      }
    }
    
    // Close modal after selection
    setShowPresetModal(false);
    setActivePresetTab(null);
  }, [prompt, presetCount]);

  // Reset preset count when prompt is manually cleared
  useEffect(() => {
    if (prompt.trim() === '') {
      setPresetCount(0);
      setShowTokenWarning(false);
    }
  }, [prompt]);

  const [generationMode, setGenerationMode] = useState<GenerationMode | null>(null);
  const [userDefaultModel, setUserDefaultModel] = useState<GenerationMode | null>(null);
  

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
      'seedance-pro': 45, // 45 seconds for seedance pro
      'decart-lucy-14b': 90, // 1.5 minutes for Lucy 14B video variations
      'minimax-i2v-director': 120, // 2 minutes for MiniMax I2V Director
      'hailuo-02-pro': 100, // 1.67 minutes for Hailuo 02 Pro video variations
      'kling-video-pro': 110, // 1.83 minutes for Kling Video Pro video variations
      'flux-dev': 20, // 20 seconds for Flux Dev image generation
      'seedream-3': 25, // 25 seconds for Seedream 3 text-to-image
      'seedance-1-pro': 90, // 90 seconds for Seedance 1 Pro video generation
      'bytedance-seedream-4': 35, // 35 seconds for Seedream 4 with custom sizing
      'seedream-4-edit': 30, // 30 seconds for Seedream 4.0 Edit image editing
      // Mid-Tier Image-to-Video Models
      'minimax-video-01': 60, // 1 minute for Minimax Video 01
      'stable-video-diffusion-i2v': 45, // 45 seconds for Stable Video Diffusion
      'modelscope-i2v': 40, // 40 seconds for Modelscope I2V
      'text2video-zero-i2v': 40, // 40 seconds for Text2Video Zero
      // Lower-Tier Image-to-Video Models
      'wan-v2-2-a14b-i2v-lora': 50, // 50 seconds for Wan V2.2 LoRA
      'cogvideo-i2v': 50, // 50 seconds for CogVideo I2V
      'zeroscope-t2v': 50, // 50 seconds for Zeroscope T2V
      'kling-ai-avatar': 600, // 10 minutes for Kling AI Avatar (can take 2-20 minutes)
      'gemini-25-flash-image-edit': 20, // 20 seconds for Gemini 2.5 Flash Image Edit
      'luma-photon-reframe': 45 // 45 seconds for Luma Photon Reframe
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

  // Start processing with modal
  const startProcessing = (type: 'image' | 'video', step: string, progress: number = 0) => {
    setProcessingModalType(type);
    setShowProcessingModal(true);
    setProcessingStartTime(Date.now());
    setProcessing({
      isProcessing: true,
      progress,
      currentStep: step
    });
  };

  // Stop processing and hide modal
  const stopProcessing = () => {
    setShowProcessingModal(false);
    setProcessingStartTime(null);
    setProcessing({
      isProcessing: false,
      progress: 0,
      currentStep: ''
    });
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

  // Auto-hide modal for video generations after 30 seconds
  useEffect(() => {
    if (showProcessingModal && processingModalType === 'video' && processingStartTime) {
      const timer = setTimeout(() => {
        setShowProcessingModal(false);
        console.log('🎬 Video generation modal auto-hidden after 30 seconds');
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [showProcessingModal, processingModalType, processingStartTime]);

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
  const [isDragOverMain, setIsDragOverMain] = useState<boolean>(false); // Track if dragging over main area
  const [endFrameProcessing, setEndFrameProcessing] = useState<boolean>(false); // Track EndFrame generation
  const [processingMode, setProcessingMode] = useState<'variations' | 'endframe'>('variations'); // Track processing mode
  const [contentMode, setContentMode] = useState<'image' | 'video'>('image'); // Track content mode (image/video)
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
    
    // Add mobile-specific guidance for common issues
    if (isMobile) {
      if (message.includes('video') && message.includes('not available')) {
        message = '📱 Mobile users can only generate images. Video generation is available on desktop.';
      } else if (message.includes('file too large')) {
        message = '📱 Mobile upload limit: 10MB. Please use smaller files or try desktop.';
      } else if (message.includes('download failed')) {
        message = '📱 Mobile download issue. Try long-pressing the image and selecting "Save to Photos".';
      }
    }
    
    if (errorType === 'success') {
      showNotification(message, 'success');
    } else {
    showAnimatedError(message, errorType);
    }
  }, [showAnimatedError, showNotification]);

  // Cancel current operation
  const cancelOperation = useCallback(() => {
    if (abortController) {
      console.log('🛑 Cancelling current operation...');
      abortController.abort();
      setAbortController(null);
      setIsCancellable(false);
      
      // Reset processing state
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
      
      // Clear timers
      setEstimatedTime(null);
      setTimeRemaining(null);
      setGenerationStartTime(null);
      
      // Show cancellation notification
      showAnimatedErrorNotification('Operation cancelled by user', 'success');
    }
  }, [abortController, showAnimatedErrorNotification]);

  // Determine generation mode based on uploaded files and user preferences
  const determineGenerationMode = useCallback((): GenerationMode | null => {
    const hasImages = uploadedFiles.some(file => file.fileType === 'image');
    const hasVideos = uploadedFiles.some(file => file.fileType === 'video');
    
    console.log('🔄 [DETERMINE MODE] hasImages:', hasImages, 'hasVideos:', hasVideos, 'fileCount:', uploadedFiles.length, 'contentMode:', contentMode);
    
    if (hasImages && uploadedFiles.length === 1) {
      // Respect content mode when auto-selecting model for single image
      if (contentMode === 'video') {
        console.log('🔄 [DETERMINE MODE] Single image + video mode, returning veo3-fast');
        return 'veo3-fast'; // Default video model for image-to-video
      } else {
        console.log('🔄 [DETERMINE MODE] Single image + image mode, returning nano-banana');
        return 'nano-banana';
      }
    } else if (!hasImages && !hasVideos) {
      console.log('🔄 [DETERMINE MODE] No files, returning null for user preferences');
      return null; // Will be set from user preferences
    }
    
    console.log('🔄 [DETERMINE MODE] No specific case matched, returning null');
    return null;
  }, [uploadedFiles, contentMode]);

  // Get available generation modes for current state - FILTERED BY CONTENT MODE
  const getAvailableModes = useCallback((): GenerationMode[] => {
    const hasImages = uploadedFiles.some(file => file.fileType === 'image');
    const hasVideos = uploadedFiles.some(file => file.fileType === 'video');
    
    const modes: GenerationMode[] = [];
    
    // Always allow text-to-image
    modes.push('runway-t2i');
    
    if (hasImages && uploadedFiles.length === 1) {
      if (contentMode === 'image') {
        // IMAGE MODE: Only show image generation and editing models
      modes.push('nano-banana');
      modes.push('seedream-4-edit'); // Seedream 4 Edit
      modes.push('bytedance-seedream-4'); // Seedream 4
      modes.push('gemini-25-flash-image-edit'); // Gemini 2.5 Flash Image Edit
      modes.push('luma-photon-reframe'); // Luma Photon Reframe for image resizing
      } else if (contentMode === 'video') {
        // VIDEO MODE: Only show image-to-video models
      modes.push('veo3-fast'); // Veo3 Fast image-to-video
      modes.push('minimax-2.0'); // Minimax 2.0 image-to-video
      modes.push('kling-2.1-master'); // Kling 2.1 Master image-to-video
      modes.push('kling-ai-avatar'); // Kling AI Avatar
      modes.push('decart-lucy-14b'); // Lucy 14B video variations
      modes.push('stable-video-diffusion-i2v'); // Stable Video Diffusion
      modes.push('modelscope-i2v'); // Modelscope I2V
      modes.push('text2video-zero-i2v'); // Text2Video Zero
      }
    }
    
    // Add endframe mode when 2 images are uploaded
    if (hasImages && uploadedFiles.length === 2) {
      if (contentMode === 'image') {
        // IMAGE MODE: Show image editing models for character combination
      modes.push('nano-banana'); // Character combination
      modes.push('seedream-4-edit'); // Seedream 4 Edit
      modes.push('bytedance-seedream-4'); // Seedream 4
      modes.push('gemini-25-flash-image-edit'); // Gemini Flash Edit for character combination
      } else if (contentMode === 'video') {
        // VIDEO MODE: Show EndFrame mode for 2 images
        modes.push('minimax-2.0'); // EndFrame mode for 2 images
      }
    }
    
    // Add video restyling mode when video files are uploaded
    if (hasVideos) {
        modes.push('runway-video'); // Runway ALEPH for video restyling
    }
    
    return modes;
  }, [uploadedFiles, contentMode]);

  // Get display name for generation mode
  const getModelDisplayName = useCallback((mode: GenerationMode, isMobile: boolean = false): string => {
    const displayNames: Record<GenerationMode, string> = {
      'nano-banana': 'Nana Banana',
      'runway-t2i': isMobile ? 'Text to Image' : 'Runway T2I', // Remove "Runway" from mobile view
      'runway-video': 'Runway ALEPH (Video Restyle)',
      'veo3-fast': 'Veo3 Fast',
      'seedream-4-edit': 'Seedream 4 Edit',
      'bytedance-seedream-4': 'Seedream 4',
      'gemini-25-flash-image-edit': 'Gemini Flash Edit',
      'luma-photon-reframe': 'Luma Photon Reframe',
            'kling-ai-avatar': 'Kling AI Avatar (2-60 min)',
      // Mid-Tier Image-to-Video Models
      'minimax-video-01': 'Minimax Video 01',
      'stable-video-diffusion-i2v': 'Stable Video Diffusion',
      'modelscope-i2v': 'Modelscope I2V',
      'text2video-zero-i2v': 'Text2Video Zero',
      // Lower-Tier Image-to-Video Models
      'wan-v2-2-a14b-i2v-lora': 'Wan V2.2 LoRA',
      'cogvideo-i2v': 'CogVideo I2V',
      'zeroscope-t2v': 'Zeroscope T2V',
      'minimax-2.0': 'MiniMax End Frame',
      'minimax-video': 'Minimax Video',
      'kling-2.1-master': 'Kling 2.1 Master',
      'seedance-pro': 'Seedance Pro',
      'decart-lucy-14b': 'Lucy 14B Video',
      'minimax-i2v-director': 'MiniMax I2V Director',
      'hailuo-02-pro': 'Hailuo 02 Pro',
      'kling-video-pro': 'Kling Video Pro',
      'flux-dev': 'Flux Dev',
      'seedream-3': 'Seedream 3',
      'seedance-1-pro': 'Seedance 1 Pro'
    };
    return displayNames[mode] || mode;
  }, []);

  // Load user's default model preference from profile
  const loadUserDefaultModel = useCallback(async () => {
    try {
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
        const defaultModel = data.profile?.preferences?.defaultModel;
        if (defaultModel) {
          setUserDefaultModel(defaultModel as GenerationMode);
          // Only set as initial generation mode if:
          // 1. No files uploaded (text-to-image context)
          // 2. The default model is available in current context
          // 3. No generation mode is already set
          if (uploadedFiles.length === 0 && !generationMode) {
            const availableModes = getAvailableModes();
            if (availableModes.includes(defaultModel as GenerationMode)) {
              setGenerationMode(defaultModel as GenerationMode);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading user default model:', error);
    }
  }, [getAvailableModes, uploadedFiles.length, generationMode]);

  // Load user preferences on component mount
  useEffect(() => {
    loadUserDefaultModel();
  }, [loadUserDefaultModel]);

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

  // Auto-detect generation mode when files change - but don't override user selections
  useEffect(() => {
    console.log('🔄 [MODEL SELECTION] Auto-detect effect triggered');
    console.log('🔄 [MODEL SELECTION] Current generationMode:', generationMode);
    console.log('🔄 [MODEL SELECTION] Uploaded files:', uploadedFiles.length);
    
    const detectedMode = determineGenerationMode();
    console.log('🔄 [MODEL SELECTION] Detected mode:', detectedMode);
    
    // Only auto-select if no model is currently selected
    // This prevents overriding user selections or models set by content mode changes
    if (detectedMode !== null && !generationMode) {
      console.log('🔄 [MODEL SELECTION] Auto-setting model to:', detectedMode);
      setGenerationMode(detectedMode);
    } else if (detectedMode === null && !generationMode) {
      console.log('🔄 [MODEL SELECTION] No model detected and none selected - keeping null');
    } else if (generationMode) {
      console.log('🔄 [MODEL SELECTION] Model already selected, not overriding:', generationMode);
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

  // Smart defaults for content mode based on uploads
  useEffect(() => {
    // Check if device is mobile
    const isMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (hasImageFiles && !hasVideoFiles) {
      if (uploadedFiles.length === 1) {
        // Single image upload - enable toggle but don't force mode
        // User can choose between image variations (Nano Banana) or video generation
        console.log('🎯 Smart default: Single image detected, toggle enabled for user choice');
        // Keep current contentMode, don't auto-switch
        // Force image mode on mobile for single images
        if (isMobile) {
          setContentMode('image');
        }
      } else if (uploadedFiles.length >= 2) {
        // Multiple images - likely wants image variations, default to image mode
        setContentMode('image');
        console.log('🎯 Smart default: Multiple images detected, switching to image mode');
      }
    } else if (hasVideoFiles) {
      // Video files uploaded - default to video mode (desktop only)
      if (isMobile) {
        setContentMode('image');
        console.log('🎯 Mobile detected: Forcing image mode even for video files');
        // Show mobile-specific notification about video limitations
        showNotification('📱 Mobile users can only generate images. Video generation is available on desktop.', 'info');
      } else {
        setContentMode('video');
        console.log('🎯 Smart default: Video files detected, switching to video mode');
      }
    }
  }, [hasImageFiles, hasVideoFiles, uploadedFiles.length]);

  // Clear selected model when content mode changes to force dropdown update
  useEffect(() => {
    console.log('🔄 [CONTENT MODE] Effect triggered - contentMode:', contentMode, 'generationMode:', generationMode);
    
    if (generationMode) {
      // Check if current model is compatible with new content mode
      const isVideoModel = (
        generationMode === 'veo3-fast' ||
        generationMode === 'minimax-2.0' ||
        generationMode === 'kling-2.1-master' ||
        generationMode === 'kling-ai-avatar' ||
        generationMode === 'decart-lucy-14b' ||
        generationMode === 'minimax-video-01' ||
        generationMode === 'stable-video-diffusion-i2v' ||
        generationMode === 'modelscope-i2v' ||
        generationMode === 'text2video-zero-i2v' ||
        generationMode === 'wan-v2-2-a14b-i2v-lora' ||
        generationMode === 'cogvideo-i2v' ||
        generationMode === 'zeroscope-t2v' ||
        generationMode === 'runway-video' ||
        generationMode === 'seedance-pro' ||
        generationMode === 'minimax-i2v-director' ||
        generationMode === 'hailuo-02-pro' ||
        generationMode === 'kling-video-pro' ||
        generationMode === 'seedream-3' ||
        generationMode === 'seedance-1-pro'
      );
      const isImageModel = (
        generationMode === 'nano-banana' ||
        generationMode === 'flux-dev' ||
        generationMode === 'seedream-4-edit' ||
        generationMode === 'bytedance-seedream-4' ||
        generationMode === 'runway-t2i' ||
        generationMode === 'gemini-25-flash-image-edit' ||
        generationMode === 'luma-photon-reframe'
      );
      
      console.log('🔄 [CONTENT MODE] isVideoModel:', isVideoModel, 'isImageModel:', isImageModel);
      
      if ((contentMode === 'image' && isVideoModel) || (contentMode === 'video' && isImageModel)) {
        console.log('🔄 [CONTENT MODE] Clearing incompatible model:', generationMode);
        setGenerationMode(null);
        
        // Auto-select appropriate model for the new content mode
        setTimeout(() => {
          const detectedMode = determineGenerationMode();
          if (detectedMode) {
            console.log('🔄 [CONTENT MODE] Auto-selecting compatible model:', detectedMode);
            setGenerationMode(detectedMode);
          }
        }, 50); // Small delay to prevent race conditions
      } else {
        console.log('🔄 [CONTENT MODE] Model is compatible, keeping:', generationMode);
      }
    }
  }, [contentMode, generationMode, determineGenerationMode]);

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
  const galleryImagesWithUrls = gallery.filter(item => item.imageUrl || item.videoUrl);

  // Gallery navigation functions
  const navigateImage = useCallback((direction: number) => {
    if (galleryImagesWithUrls.length === 0) return;
    
    setFullScreenImageIndex(prev => {
      const newIndex = prev + direction;
      if (newIndex < 0) return galleryImagesWithUrls.length - 1;
      if (newIndex >= galleryImagesWithUrls.length) return 0;
      
      // Update the full screen image to match the new index
      const nextItem = galleryImagesWithUrls[newIndex];
      setFullScreenImage(nextItem.videoUrl || nextItem.imageUrl!);
      
      return newIndex;
    });
  }, [galleryImagesWithUrls]);

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
          mimeType: 'image/jpeg',
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

      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Authentication required - please sign in');
      }

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
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          images: [base64Image],
          mimeTypes: ['image/jpeg'], // Default MIME type for URL-converted images
          prompt: varyPrompt,
          generationMode: generationMode,
          generationSettings: generationSettings
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
      const storedVariations: StoredVariation[] = newVariations.map((variation: CharacterVariation, index: number) => ({
        ...variation,
        timestamp: Date.now() + index,
        originalPrompt: varyPrompt,
        fileType: variation.fileType || (variation.videoUrl ? 'video' : 'image')
      }));
      setVariations(storedVariations);
      
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
    // No default mode - user must select explicitly

    try {
      console.log('🎨 Starting text-to-image generation:', prompt);
      
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Authentication required - please sign in');
      }
      
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
          'Authorization': `Bearer ${session.access_token}`,
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

  // Handle Seedream 3 text-to-image generation
  const handleSeedream3Generation = async () => {
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

    const actionId = `seedream3-${Date.now()}`;
    setProcessingAction(actionId);

    try {
      console.log('🎨 Starting Seedream 3 text-to-image generation:', prompt);
      
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Authentication required - please sign in');
      }
      
      setProcessing({
        isProcessing: true,
        progress: 10,
        currentStep: 'Generating image with Seedream 3...'
      });

      // Check user credits first
      const creditCheck = await checkUserCredits('bytedance/seedream-3');
      if (!creditCheck.hasCredits) {
        throw new Error(creditCheck.error || 'Insufficient credits for Seedream 3');
      }

      setProcessing(prev => ({ ...prev, progress: 30, currentStep: 'Processing with Seedream 3...' }));

      // Call the Seedream 3 API
      const response = await fetch('/api/replicate/seedream-3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          size: 'regular',
          aspectRatio: generationSettings.aspectRatio,
          guidanceScale: 2.5,
          userId: user?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start Seedream 3 generation');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Seedream 3 generation failed');
      }

      setProcessing(prev => ({ ...prev, progress: 80, currentStep: 'Processing image...' }));

      // If we got a direct image URL (synchronous completion)
      if (data.imageUrl) {
        console.log('✅ Seedream 3 generation completed:', data.imageUrl);
        
        // Add to gallery
        const variation: StoredVariation = {
          id: `seedream3-${Date.now()}`,
          description: prompt.trim(),
          originalPrompt: prompt.trim(),
          angle: 'Seedream 3',
          pose: 'AI Generated',
          imageUrl: data.imageUrl,
          videoUrl: undefined,
          fileType: 'image' as const,
          timestamp: Date.now()
        };

        setVariations(prev => [variation, ...prev]);
        addToGallery([variation], prompt.trim());
        
        setProcessing({
          isProcessing: false,
          progress: 100,
          currentStep: 'Complete!'
        });

        // Track usage
        trackUsage('image_generation', 'seedream_3');
        
        setTimeout(() => {
          setProcessing({
            isProcessing: false,
            progress: 0,
            currentStep: ''
          });
        }, 1000);

      } else if (data.predictionId) {
        // Handle async prediction (polling required)
        console.log('⏳ Seedream 3 prediction started:', data.predictionId);
        await pollSeedream3Prediction(data.predictionId, prompt.trim());
      } else {
        throw new Error('No image URL or prediction ID received');
      }

    } catch (error) {
      console.error('❌ Seedream 3 generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate image with Seedream 3');
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

  // Poll Seedream 3 prediction status
  const pollSeedream3Prediction = async (predictionId: string, originalPrompt: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        attempts++;
        
        const response = await fetch(`/api/replicate/prediction/${predictionId}`);
        if (!response.ok) {
          throw new Error('Failed to check prediction status');
        }

        const data = await response.json();
        
        if (data.status === 'succeeded' && data.output) {
          console.log('✅ Seedream 3 prediction completed:', data.output);
          
          const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
          
          // Add to gallery
          const variation: StoredVariation = {
            id: `seedream3-${Date.now()}`,
            description: originalPrompt,
            originalPrompt: originalPrompt,
            angle: 'Seedream 3',
            pose: 'AI Generated',
            imageUrl: outputUrl,
            videoUrl: undefined,
            fileType: 'image' as const,
            timestamp: Date.now()
          };

          setVariations(prev => [variation, ...prev]);
          addToGallery([variation], originalPrompt);
          
          setProcessing({
            isProcessing: false,
            progress: 100,
            currentStep: 'Complete!'
          });

          // Track usage
          trackUsage('image_generation', 'seedream_3');
          
          setTimeout(() => {
            setProcessing({
              isProcessing: false,
              progress: 0,
              currentStep: ''
            });
          }, 1000);

        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Seedream 3 prediction failed');
        } else if (data.status === 'processing' || data.status === 'starting') {
          setProcessing(prev => ({ 
            ...prev, 
            progress: Math.min(90, 50 + (attempts * 2)), 
            currentStep: `Processing... (${attempts}/${maxAttempts})` 
          }));
          
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            throw new Error('Seedream 3 generation timed out');
          }
        } else {
          throw new Error(`Unexpected prediction status: ${data.status}`);
        }
      } catch (error) {
        console.error('❌ Seedream 3 polling error:', error);
        setError(error instanceof Error ? error.message : 'Failed to check Seedream 3 status');
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }
    };

    await poll();
  };

  // Handle Seedance 1 Pro text-to-video generation
  const handleSeedance1ProGeneration = async () => {
    if (!prompt.trim()) {
      setError('Please enter a text prompt to generate a video');
      showAnimatedErrorNotification('User Error: Please enter a text prompt! TOASTY!', 'toasty');
      return;
    }

    if (!canGenerate) {
      setError('Generation limit reached. Please sign up for unlimited generations.');
      setShowAuthModal(true);
      return;
    }

    const actionId = `seedance1pro-${Date.now()}`;
    setProcessingAction(actionId);

    try {
      console.log('🎬 Starting Seedance 1 Pro text-to-video generation:', prompt);
      
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Authentication required - please sign in');
      }
      
      setProcessing({
        isProcessing: true,
        progress: 10,
        currentStep: 'Generating video with Seedance 1 Pro...'
      });

      // Check user credits first
      const creditCheck = await checkUserCredits('bytedance/seedance-1-pro');
      if (!creditCheck.hasCredits) {
        throw new Error(creditCheck.error || 'Insufficient credits for Seedance 1 Pro');
      }

      setProcessing(prev => ({ ...prev, progress: 30, currentStep: 'Processing with Seedance 1 Pro...' }));

      // Prepare image input if available
      let imageInput = null;
      if (uploadedFiles.length > 0 && uploadedFiles[0].fileType === 'image') {
        imageInput = uploadedFiles[0].base64;
        console.log('🎬 Using uploaded image for image-to-video generation');
      }

      // Call the Seedance 1 Pro API
      const response = await fetch('/api/replicate/seedance-1-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image: imageInput,
          duration: 5,
          resolution: '1080p',
          aspectRatio: '16:9',
          fps: 24,
          cameraFixed: false,
          userId: user?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start Seedance 1 Pro generation');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Seedance 1 Pro generation failed');
      }

      setProcessing(prev => ({ ...prev, progress: 80, currentStep: 'Processing video...' }));

      // If we got a direct video URL (synchronous completion)
      if (data.videoUrl) {
        console.log('✅ Seedance 1 Pro generation completed:', data.videoUrl);
        
        // Add to gallery
        const variation: StoredVariation = {
          id: `seedance1pro-${Date.now()}`,
          description: prompt.trim(),
          originalPrompt: prompt.trim(),
          angle: 'Seedance 1 Pro',
          pose: 'AI Generated',
          imageUrl: undefined,
          videoUrl: data.videoUrl,
          fileType: 'video' as const,
          timestamp: Date.now()
        };

        setVariations(prev => [variation, ...prev]);
        addToGallery([variation], prompt.trim());
        
        setProcessing({
          isProcessing: false,
          progress: 100,
          currentStep: 'Complete!'
        });

        // Track usage
        trackUsage('video_generation', 'seedance_1_pro');
        
        setTimeout(() => {
          setProcessing({
            isProcessing: false,
            progress: 0,
            currentStep: ''
          });
        }, 1000);

      } else if (data.predictionId) {
        // Handle async prediction (polling required)
        console.log('⏳ Seedance 1 Pro prediction started:', data.predictionId);
        await pollSeedance1ProPrediction(data.predictionId, prompt.trim());
      } else {
        throw new Error('No video URL or prediction ID received');
      }

    } catch (error) {
      console.error('❌ Seedance 1 Pro generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate video with Seedance 1 Pro');
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

  // Poll Seedance 1 Pro prediction status
  const pollSeedance1ProPrediction = async (predictionId: string, originalPrompt: string) => {
    const maxAttempts = 120; // 10 minutes max for video generation
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        attempts++;
        
        const response = await fetch(`/api/replicate/prediction/${predictionId}`);
        if (!response.ok) {
          throw new Error('Failed to check prediction status');
        }

        const data = await response.json();
        
        if (data.status === 'succeeded' && data.output) {
          console.log('✅ Seedance 1 Pro prediction completed:', data.output);
          
          const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
          
          // Add to gallery
          const variation: StoredVariation = {
            id: `seedance1pro-${Date.now()}`,
            description: originalPrompt,
            originalPrompt: originalPrompt,
            angle: 'Seedance 1 Pro',
            pose: 'AI Generated',
            imageUrl: undefined,
            videoUrl: outputUrl,
            fileType: 'video' as const,
            timestamp: Date.now()
          };

          setVariations(prev => [variation, ...prev]);
          addToGallery([variation], originalPrompt);
          
          setProcessing({
            isProcessing: false,
            progress: 100,
            currentStep: 'Complete!'
          });

          // Track usage
          trackUsage('video_generation', 'seedance_1_pro');
          
          setTimeout(() => {
            setProcessing({
              isProcessing: false,
              progress: 0,
              currentStep: ''
            });
          }, 1000);

        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Seedance 1 Pro prediction failed');
        } else if (data.status === 'processing' || data.status === 'starting') {
          setProcessing(prev => ({ 
            ...prev, 
            progress: Math.min(90, 50 + (attempts * 0.5)), 
            currentStep: `Processing video... (${attempts}/${maxAttempts})` 
          }));
          
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            throw new Error('Seedance 1 Pro generation timed out');
          }
        } else {
          throw new Error(`Unexpected prediction status: ${data.status}`);
        }
      } catch (error) {
        console.error('❌ Seedance 1 Pro polling error:', error);
        setError(error instanceof Error ? error.message : 'Failed to check Seedance 1 Pro status');
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }
    };

    await poll();
  };

  const handleFileUpload = useCallback(async (files: File[]) => {
    console.log('📤 handleFileUpload called with files:', files.length, files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      
      // Check if video features are disabled
      if (isVideo && !ENABLE_VIDEO_FEATURES) {
        setError('Video-to-video editing is temporarily disabled. Please upload image files only.');
        showAnimatedErrorNotification('User Error: Video features are disabled! TOASTY!', 'toasty');
        return false;
      }
      
      if (!isImage && !isVideo && !isAudio) {
        setError('Please upload valid image files (JPG, PNG), video files (MP4, MOV), or audio files (MP3, WAV)');
        showAnimatedErrorNotification('User Error: Invalid file type! TOASTY!', 'toasty');
        return false;
      }
      
      // Different size limits for images vs videos vs audio
      const maxSize = isImage ? 10 * 1024 * 1024 : isVideo ? 100 * 1024 * 1024 : 25 * 1024 * 1024; // 10MB for images, 100MB for videos, 25MB for audio
      if (file.size > maxSize) {
        const fileType = isImage ? 'Image' : isVideo ? 'Video' : 'Audio';
        const sizeLimit = isImage ? '10MB' : isVideo ? '100MB' : '25MB';
        setError(`${fileType} size must be less than ${sizeLimit}`);
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
    const audioFiles: File[] = [];
    let processedCount = 0;
    
    validFiles.forEach((file) => {
      if (file.type.startsWith('audio/')) {
        // Handle audio files separately for Kling AI Avatar
        audioFiles.push(file);
        processedCount++;
        
        // Update audio state immediately
        setUploadedAudio(file);
        console.log('🎵 Audio file uploaded:', file.name, file.type, file.size);
        
        // Check if all files are processed
        if (processedCount === validFiles.length) {
          if (newFiles.length > 0) {
            setUploadedFiles(prev => [...prev, ...newFiles]);
          }
          
          // Show appropriate notification
          if (audioFiles.length > 0 && newFiles.length > 0) {
            showNotification('🎵 Audio file uploaded! Ready for Kling AI Avatar generation', 'info');
          } else if (audioFiles.length > 0) {
            showNotification('🎵 Audio file uploaded! Please also upload an image for Kling AI Avatar', 'info');
          }
        }
      } else {
        // Handle image and video files as before
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          const preview = URL.createObjectURL(file);
          const fileType = file.type.startsWith('image/') ? 'image' : 'video';
          
          newFiles.push({
            file,
            preview,
            base64: base64.split(',')[1], // Remove data:...;base64, prefix
            mimeType: file.type, // Store original MIME type
            type: 'reference', // Default type
            fileType
          });
          
          processedCount++;
          // Update state when all files are processed
          if (processedCount === validFiles.length) {
            if (newFiles.length > 0) {
              setUploadedFiles(prev => [...prev, ...newFiles]);
            }
            
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
      }
    });
  }, [showNotification, checkVideoDuration, showAnimatedErrorNotification]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverMain(false);
    
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
    setIsDragOverMain(true);
    console.log('🔄 Drag over main area triggered');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverMain(false);
    console.log('🔄 Drag leave main area triggered');
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
          mimeType: file.type,
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
        mimeType: file.type,
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
          const fileNames = oversizedFiles.map(f => f.name).join(', ');
          showAnimatedErrorNotification(
            `📱 Mobile upload limit exceeded! Files over 10MB: ${fileNames}. Please compress your files or use desktop for larger uploads.`,
            'shake-error'
          );
          return;
        }
        
        // Check file types more strictly on mobile
        const unsupportedFiles = Array.from(files).filter(file => {
          const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
          return !validTypes.includes(file.type.toLowerCase());
        });
        
        if (unsupportedFiles.length > 0) {
          const fileNames = unsupportedFiles.map(f => f.name).join(', ');
          showAnimatedErrorNotification(
            `📱 Unsupported file types on mobile: ${fileNames}. Please use JPG, PNG, WebP, or MP4 files.`,
            'shake-error'
          );
          return;
        }
      }
      handleFileUpload(Array.from(files));
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  }, [handleFileUpload, showNotification]);

  // Simplified file upload handler - works for both mobile and desktop
  const handleMobileFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Use the existing handleFileUpload function
      handleFileUpload(Array.from(files));
    }
    
    // Reset the input value
    e.target.value = '';
  }, [handleFileUpload]);

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
  // Helper function to check credits before generation
  const checkCreditsBeforeGeneration = async (modelName: string): Promise<boolean> => {
    if (!user?.id || isAdmin) {
      return true; // Skip credit check for non-authenticated users or admins
    }

    const creditCheck = await checkUserCredits(modelName);
    
    if (!creditCheck.hasCredits) {
      const errorMessage = creditCheck.error || `Insufficient credits! You need $${creditCheck.modelCost.toFixed(4)} but only have $${creditCheck.availableCredits.toFixed(2)}. Purchase more credits to continue.`;
      showAnimatedErrorNotification(`Credit Error: ${errorMessage} TOASTY!`, 'toasty');
      return false;
    }

    return true;
  };


  const handleModelGeneration = async () => {
    if (!generationMode) {
      showAnimatedErrorNotification('User Error: Please select a model first! TOASTY!', 'toasty');
      return;
    }

    // Check credits before generation
    const hasCredits = await checkCreditsBeforeGeneration(generationMode);
    if (!hasCredits) {
      return;
    }

    // Check if we should use video variations based on content mode
    if (contentMode === 'video' && (
      generationMode === 'minimax-video-01' ||
      generationMode === 'stable-video-diffusion-i2v' ||
      generationMode === 'modelscope-i2v' ||
      generationMode === 'text2video-zero-i2v' ||
      generationMode === 'wan-v2-2-a14b-i2v-lora' ||
      generationMode === 'cogvideo-i2v' ||
      generationMode === 'zeroscope-t2v'
    )) {
      console.log('🎬 [ROUTING] Routing to video variance for model:', generationMode);
      await handleVideoVariation();
      return;
    }

    switch (generationMode) {
      case 'runway-t2i':
        // Text-to-image generation - can work with or without images
        await handleTextToImage();
        break;
      case 'seedream-3':
        // Seedream 3 text-to-image generation
        await handleSeedream3Generation();
        break;
      case 'seedance-1-pro':
        // Seedance 1 Pro text-to-video generation
        await handleSeedance1ProGeneration();
        break;
      case 'nano-banana':
        await handleCharacterVariation();
        break;
      case 'flux-dev':
        await handleFluxDevGeneration();
        break;
      case 'bytedance-seedream-4':
        await handleSeedream4Generation();
        break;
      case 'gemini-25-flash-image-edit':
        await handleCharacterVariation(); // Use the same handler as nano-banana since it's also character variation
        break;
      case 'luma-photon-reframe':
        await handleLumaPhotonReframeGeneration();
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
      case 'kling-ai-avatar':
        await handleKlingAiAvatarGeneration();
        break;
      case 'seedance-pro':
        await handleEndFrameGeneration();
        break;
      default:
        await handleCharacterVariation();
        break;
    }
  };

  // Function to convert base64 to blob
  const base64ToBlob = (base64Data: string): Blob => {
    // Remove data URL prefix if present
    const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    
    // Convert base64 to binary
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Determine MIME type from base64 data
    const mimeType = base64Data.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
    
    return new Blob([bytes], { type: mimeType });
  };

  // Function to upload image to Supabase and get FAL URL
  const uploadImageToSupabaseAndFal = async (base64Data: string): Promise<string> => {
    try {
      // Convert base64 to blob
      const blob = base64ToBlob(base64Data);
      
      // Get user session for auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔍 Session check:', { session: !!session, error: sessionError });
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('No active session - please log in again');
      }
      
      console.log('✅ Session found for user:', session.user?.email);
      
      // Step 1: Upload to Supabase storage
      console.log('📤 Uploading to Supabase storage...');
      console.log('🔑 Using access token:', session.access_token ? 'Present' : 'Missing');
      
      const supabaseResponse = await fetch('/api/supabase-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: blob,
      });
      
      console.log('📥 Supabase upload response status:', supabaseResponse.status);
      
      const supabaseData = await supabaseResponse.json();
      console.log('📥 Supabase upload response data:', supabaseData);
      
      if (!supabaseResponse.ok) {
        throw new Error(`Supabase upload failed (${supabaseResponse.status}): ${supabaseData.error || 'Unknown error'}`);
      }
      
      if (!supabaseData.url) {
        throw new Error(supabaseData.error || 'Failed to upload to Supabase');
      }
      
      // Step 2: Transfer from Supabase to FAL
      const falResponse = await fetch('/api/supabase-to-fal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseUrl: supabaseData.url,
          sessionId: session.access_token
        }),
      });
      
      const falData = await falResponse.json();
      if (!falData.url) {
        throw new Error(falData.error || 'Failed to transfer to FAL');
      }
      
      return falData.url;
    } catch (error) {
      console.error('❌ Failed to upload image to Supabase and FAL:', error);
      throw error;
    }
  };

  const handleCharacterVariation = async () => {
    // Check if user can generate
    if (!canGenerate) {
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

    startProcessing('image', 'Processing with FAL AI...', 20);

    try {
      setProcessing(prev => ({ ...prev, progress: 40, currentStep: 'Uploading image...' }));
      
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Authentication required - please sign in');
      }
      
      // Upload image to Supabase and get FAL URL
      const imageUrl = await uploadImageToSupabaseAndFal(uploadedFiles[0].base64);
      
      setProcessing(prev => ({ ...prev, progress: 60, currentStep: 'Generating variations...' }));
      
      // Create 4 distinct prompts for different angles and perspectives
      const variationPrompts = [
        `${prompt.trim()} - extreme close-up shot, dramatic lighting, intense focus on facial features, macro photography style`,
        `${prompt.trim()} - side profile view, three-quarter angle, cinematic composition, professional portrait lighting`,
        `${prompt.trim()} - low angle shot looking up, heroic perspective, dramatic shadows, worm's eye view`,
        `${prompt.trim()} - high angle shot looking down, bird's eye view, environmental context, wide shot composition`
      ];

      // Use the new /api/vary-character endpoint for all models
      console.log('🔄 Making API call to /api/vary-character...');
      const response = await fetch('/api/vary-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          images: uploadedFiles.map(img => img.base64),
          mimeTypes: uploadedFiles.map(img => img.mimeType || 'image/jpeg'),
          prompt: prompt.trim(),
          generationMode: generationMode,
          generationSettings: generationSettings
        }),
      });

      console.log('📡 API response status:', response.status);
      setProcessing(prev => ({ ...prev, progress: 70, currentStep: 'Generating variations...' }));

      const data = await response.json();
      console.log('📊 API response data:', data);

      if (!response.ok) {
        throw new Error(`API HTTP Error: ${response.status} ${response.statusText}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to process character variations');
      }

      // The /api/vary-character endpoint returns variations with images already generated
      const newVariations = data.variations || [];
      
      if (newVariations.length === 0) {
        throw new Error('No variations were generated');
      }

      setProcessing(prev => ({ ...prev, progress: 100, currentStep: 'Complete!' }));
      
      console.log('🎨 Generated variations:', newVariations.length);
      console.log('🎨 Variations details:', newVariations.map((variation: any) => ({ 
        id: variation.id, 
        hasImageUrl: !!variation.imageUrl, 
        imageUrl: variation.imageUrl,
        description: variation.description 
      })));
      
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
      
      const storedVariations: StoredVariation[] = filteredVariations.map((variation: CharacterVariation, index: number) => ({
        ...variation,
        timestamp: Date.now() + index,
        originalPrompt: prompt.trim(),
        fileType: variation.fileType || (variation.videoUrl ? 'video' : 'image')
      }));
      setVariations(storedVariations);
      
      console.log('🎨 Final stored variations:', storedVariations.length);
      console.log('🎨 Stored variations details:', storedVariations.map(v => ({ 
        id: v.id, 
        hasImageUrl: !!v.imageUrl, 
        imageUrl: v.imageUrl,
        description: v.description 
      })));
      
      // Track usage
      await trackUsage('character_variation', 'gemini', {
        prompt: prompt.trim(),
        variations_count: filteredVariations.length,
        file_type: uploadedFiles[0]?.fileType
      });
      
        // Deduct credits after successful generation (regardless of filtering)
        await refreshCreditsAfterGeneration(
          user?.id || '',
          'nano-banana',
          'character_variation',
          isAdmin
        );

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
          stopProcessing();
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

  // Helper function to identify models that don't require prompts
        const isModelThatDoesntNeedPrompt = (model: string): boolean => {
          const modelsWithoutPromptRequired = [
            'runway-video' // Video restyling - no prompt validation in API
          ];
          return modelsWithoutPromptRequired.includes(model);
        };

  // Helper functions for processing items management
  const addProcessingItem = (item: ProcessingItem) => {
    setProcessingItems(prev => [...prev, item]);
  };

  const updateProcessingItem = (id: string, updates: Partial<ProcessingItem>) => {
    setProcessingItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const removeProcessingItem = (id: string) => {
    setProcessingItems(prev => prev.filter(item => item.id !== id));
  };

  const cancelProcessingItem = (id: string) => {
    const item = processingItems.find(p => p.id === id);
    if (item?.abortController) {
      item.abortController.abort();
    }
    removeProcessingItem(id);
  };

  const getEstimatedTimeForModel = (model: string): number => {
    const timeEstimates: Record<string, number> = {
      'kling-ai-avatar': 1200, // 20 minutes
      'veo3-fast': 300, // 5 minutes
      'minimax-2.0': 600, // 10 minutes
      'kling-2.1-master': 600, // 10 minutes
      'runway-video': 180, // 3 minutes
      'default': 300 // 5 minutes default
    };
    return timeEstimates[model] || timeEstimates.default;
  };

  // Helper function to get appropriate placeholder text based on model and state
  const getPromptPlaceholder = () => {
    // Check if current model doesn't require a prompt
    if (generationMode && isModelThatDoesntNeedPrompt(generationMode)) {
      return "Optional: Add a prompt for better results...";
    }
    
    // Default placeholder logic
    if (hasVideoFiles) {
      return "Describe the scene changes, background modifications, or prop changes you want...";
    } else if (processingMode === 'endframe') {
      return "Describe the transition or transformation between your start and end frames...";
    } else if (uploadedFiles.length === 0) {
      return "Imagine...";
    } else {
      return "Describe the angle or pose variations you want...";
    }
  };

  // Helper function to determine if generation should be enabled
  const canGenerateWithCurrentState = () => {
    // Special case for Kling AI Avatar - requires both image and audio
    if (generationMode === 'kling-ai-avatar') {
      const result = uploadedFiles.length > 0 && uploadedAudio !== null;
      console.log('🎯 [canGenerateWithCurrentState] Kling AI Avatar:', generationMode, 'uploadedFiles:', uploadedFiles.length, 'uploadedAudio:', !!uploadedAudio, 'result:', result);
      return result;
    }
    
    // For models that don't require prompts, only check if images are uploaded
    if (generationMode && isModelThatDoesntNeedPrompt(generationMode)) {
      const result = uploadedFiles.length > 0;
      console.log('🎯 [canGenerateWithCurrentState] Model without prompt required:', generationMode, 'uploadedFiles:', uploadedFiles.length, 'result:', result);
      return result;
    }
    
    // For video models, allow generation if images are uploaded (even without prompt)
    if (generationMode && isVideoVariantModel(generationMode)) {
      const result = uploadedFiles.length > 0;
      console.log('🎯 [canGenerateWithCurrentState] Video model:', generationMode, 'uploadedFiles:', uploadedFiles.length, 'result:', result);
      return result;
    }
    
    // For other models, require both images and prompt
    const result = uploadedFiles.length > 0 && prompt.trim().length > 0;
    console.log('🎯 [canGenerateWithCurrentState] Image model:', generationMode, 'uploadedFiles:', uploadedFiles.length, 'prompt length:', prompt.trim().length, 'result:', result);
    return result;
  };

  // Get model-specific default prompt for video generation - Enhanced with Camera Control Logic
  const getDefaultPromptForModel = (model: string) => {
    const defaultPrompts = {
      'decart-lucy-14b': 'slow dolly forward toward character with subtle camera movement, creating intimate cinematic video',
      'minimax-i2v-director': 'smooth tracking shot following character movement with professional camera work',
      'hailuo-02-pro': 'elegant crane shot moving up and over character, cinematic perspective transition',
      'kling-video-pro': 'dynamic orbital movement around character with fluid camera motion',
      'veo3-fast': 'quick zoom in on character with natural camera movement for emphasis',
    };
    
    return defaultPrompts[model as keyof typeof defaultPrompts] || 'slow zoom in on character with subtle camera movement, creating dynamic cinematic video';
  };

  // Get enhanced prompt for camera motion (backend logic)
  const getEnhancedCameraPrompt = (userPrompt: string) => {
    return CAMERA_MOTION_ENHANCED_PROMPTS[userPrompt as keyof typeof CAMERA_MOTION_ENHANCED_PROMPTS] || userPrompt;
  };

  // Extrapolate prompt for video variations - add subtle nuances
  const extrapolateVideoPrompt = (originalPrompt: string) => {
    const variations = [
      // Camera movement variations
      'with subtle camera movement',
      'with gentle camera motion',
      'with cinematic camera work',
      'with dynamic camera movement',
      'with fluid camera motion',
      
      // Lighting variations
      'with enhanced lighting',
      'with dramatic lighting',
      'with soft lighting',
      'with moody lighting',
      'with atmospheric lighting',
      
      // Style variations
      'with cinematic style',
      'with artistic flair',
      'with professional quality',
      'with enhanced detail',
      'with refined aesthetics',
      
      // Motion variations
      'with subtle motion',
      'with gentle movement',
      'with dynamic motion',
      'with fluid movement',
      'with natural motion'
    ];
    
    // If prompt already has camera/lighting/style keywords, add motion variations
    const hasCameraKeywords = /camera|movement|motion|pan|zoom|dolly|tracking/i.test(originalPrompt);
    const hasLightingKeywords = /lighting|light|shadow|bright|dark/i.test(originalPrompt);
    const hasStyleKeywords = /cinematic|artistic|professional|dramatic/i.test(originalPrompt);
    
    let selectedVariations = [];
    
    if (!hasCameraKeywords) {
      selectedVariations.push(variations[Math.floor(Math.random() * 5)]); // Camera variations
    }
    if (!hasLightingKeywords) {
      selectedVariations.push(variations[5 + Math.floor(Math.random() * 5)]); // Lighting variations
    }
    if (!hasStyleKeywords) {
      selectedVariations.push(variations[10 + Math.floor(Math.random() * 5)]); // Style variations
    }
    
    // Always add a motion variation
    selectedVariations.push(variations[15 + Math.floor(Math.random() * 5)]); // Motion variations
    
    // Combine original prompt with selected variations
    const extrapolatedPrompt = `${originalPrompt} ${selectedVariations.join(', ')}`;
    
    console.log('🎬 [VIDEO VARIATION] Original prompt:', originalPrompt);
    console.log('🎬 [VIDEO VARIATION] Extrapolated prompt:', extrapolatedPrompt);
    
    return extrapolatedPrompt;
  };

  // Handle video variation from existing video card
  const handleVideoCardVariation = async (videoItem: any) => {
    console.log('🎬 [VIDEO CARD VARIATION] ===== STARTING VIDEO CARD VARIATION =====');
    console.log('🎯 [VIDEO CARD VARIATION] Video item:', videoItem);
    
    try {
      // Set processing state
      setProcessing(prev => ({ 
        ...prev, 
        isProcessing: true, 
        progress: 0, 
        currentStep: 'Preparing video variation...' 
      }));

      // Extrapolate the original prompt
      const originalPrompt = videoItem.originalPrompt || 'cinematic video';
      const extrapolatedPrompt = extrapolateVideoPrompt(originalPrompt);
      
      console.log('📝 [VIDEO CARD VARIATION] Using extrapolated prompt:', extrapolatedPrompt);
      
      // Set the prompt in the textarea
      setPrompt(extrapolatedPrompt);
      
      // Upload the video's thumbnail/frame as the source image
      if (videoItem.imageUrl) {
        console.log('📤 [VIDEO CARD VARIATION] Using video thumbnail as source:', videoItem.imageUrl);
        
        // Create a file object from the video thumbnail
        const response = await fetch(videoItem.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `video-thumbnail-${videoItem.id}.jpg`, { type: 'image/jpeg' });
        
        // Add to uploaded files
        setUploadedFiles([{
          file: file,
          preview: videoItem.imageUrl,
          base64: '', // Will be populated by the file processing
          mimeType: 'image/jpeg',
          type: 'reference',
          fileType: 'image'
        }]);
        
        console.log('✅ [VIDEO CARD VARIATION] Video thumbnail added as source image');
      }
      
      // Set processing state for generation
      setProcessing(prev => ({ 
        ...prev, 
        progress: 20, 
        currentStep: 'Ready to generate video variation...' 
      }));
      
      // Show success notification
      showNotification('🎬 Video variation ready! Click generate to create your variation.', 'success');
      
    } catch (error) {
      console.error('❌ [VIDEO CARD VARIATION] Error:', error);
      showNotification('❌ Failed to prepare video variation. Please try again.', 'error');
    } finally {
      setProcessing(prev => ({ 
        ...prev, 
        isProcessing: false, 
        progress: 0, 
        currentStep: '' 
      }));
    }
  };

  // Handle video variations generation
  const handleVideoVariation = async () => {
    console.log('🎬 [FRONTEND VIDEO VARIANCE] ===== STARTING VIDEO VARIATION GENERATION =====');
    console.log('🎯 [FRONTEND VIDEO VARIANCE] Selected model:', generationMode);
    console.log('📁 [FRONTEND VIDEO VARIANCE] Uploaded files count:', uploadedFiles.length);
    console.log('📝 [FRONTEND VIDEO VARIANCE] User prompt:', prompt.trim());
    console.log('👤 [FRONTEND VIDEO VARIANCE] User ID:', user?.id);
    console.log('🔐 [FRONTEND VIDEO VARIANCE] Has secret access:', hasSecretAccess);
    console.log('📱 [FRONTEND VIDEO VARIANCE] Is mobile:', isMobile);
    console.log('🎬 [FRONTEND VIDEO VARIANCE] Content mode:', contentMode);
    
    // Log all uploaded files details
    uploadedFiles.forEach((file, index) => {
      console.log(`📄 [FRONTEND VIDEO VARIANCE] File ${index + 1}:`, {
        name: file.file?.name || 'unknown',
        type: file.fileType,
        mimeType: file.mimeType,
        size: file.file?.size,
        hasBase64: !!file.base64,
        base64Length: file.base64?.length || 0
      });
    });
    
    // Check if user can generate
    console.log('🔍 [FRONTEND VIDEO VARIANCE] Checking if user can generate...');
    console.log('✅ [FRONTEND VIDEO VARIANCE] Can generate:', canGenerate);
    
    if (!canGenerate) {
      console.error('❌ [FRONTEND VIDEO VARIANCE] User cannot generate - trial limit reached');
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

    console.log('✅ [FRONTEND VIDEO VARIANCE] User can generate, proceeding...');

    console.log('⚙️ [FRONTEND VIDEO VARIANCE] Creating processing item...');
    
    // Use enhanced camera prompt or model-specific default prompt
    const userPrompt = prompt.trim();
    const finalPrompt = userPrompt 
      ? getEnhancedCameraPrompt(userPrompt) 
      : getDefaultPromptForModel(generationMode || 'default');
    
    // Create processing item for gallery
    const processingId = `video-${Date.now()}`;
    const abortController = new AbortController();
    
    const processingItem: ProcessingItem = {
      id: processingId,
      type: 'video',
      model: generationMode || 'unknown',
      prompt: finalPrompt,
      progress: 20,
      currentStep: 'Preparing video generation...',
      startTime: Date.now(),
      estimatedTime: getEstimatedTimeForModel(generationMode || 'default'),
      cancellable: true,
      abortController
    };
    
    addProcessingItem(processingItem);

    try {
      console.log('📊 [FRONTEND VIDEO VARIANCE] Progress: 20% - Preparing video generation...');
      updateProcessingItem(processingId, { progress: 40, currentStep: 'Uploading images...' });
      console.log('📊 [FRONTEND VIDEO VARIANCE] Progress: 40% - Uploading images...');
      
      console.log('📤 [FRONTEND VIDEO VARIANCE] Preparing request to /api/vary-video...');
      console.log('🔧 [FRONTEND VIDEO VARIANCE] Building request body...');
      
      if (!prompt.trim()) {
        console.log('🎯 [FRONTEND VIDEO VARIANCE] No user prompt provided, using model-specific default:', finalPrompt);
      }
      
      const requestBody = {
        images: uploadedFiles.map(img => img.base64),
        mimeTypes: uploadedFiles.map(img => img.mimeType || 'image/jpeg'),
        prompt: finalPrompt,
        model: generationMode
      };
      
      console.log('📦 [FRONTEND VIDEO VARIANCE] Request body details:', {
        imageCount: requestBody.images.length,
        model: requestBody.model,
        promptLength: requestBody.prompt.length,
        mimeTypesCount: requestBody.mimeTypes.length
      });
      
      // Log each image being sent
      requestBody.images.forEach((image, index) => {
        console.log(`🖼️ [FRONTEND VIDEO VARIANCE] Image ${index + 1} details:`, {
          hasData: !!image,
          dataLength: image?.length || 0,
          mimeType: requestBody.mimeTypes[index]
        });
      });
      
      console.log('🚀 [FRONTEND VIDEO VARIANCE] Sending API request to /api/vary-video...');
      
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ [FRONTEND VIDEO VARIANCE] No active session found');
        throw new Error('Authentication required - please sign in');
      }
      
      console.log('📡 [FRONTEND VIDEO VARIANCE] Request headers:', {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer [REDACTED]',
        'Body size': JSON.stringify(requestBody).length
      });
      
      const response = await fetch('/api/vary-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 [FRONTEND VIDEO VARIANCE] API Response received!');
      console.log('📊 [FRONTEND VIDEO VARIANCE] Response status:', response.status, response.statusText);
      console.log('📊 [FRONTEND VIDEO VARIANCE] Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('📊 [FRONTEND VIDEO VARIANCE] Response ok:', response.ok);

      updateProcessingItem(processingId, { progress: 70, currentStep: 'Generating video variations...' });
      console.log('📊 [FRONTEND VIDEO VARIANCE] Progress: 70% - Generating video variations...');

      console.log('📥 [FRONTEND VIDEO VARIANCE] Parsing response JSON...');
      const data = await response.json();
      console.log('📥 [FRONTEND VIDEO VARIANCE] Response data received:', data);
      console.log('📊 [FRONTEND VIDEO VARIANCE] Response success:', data.success);
      console.log('📊 [FRONTEND VIDEO VARIANCE] Variations count:', data.variations?.length || 0);

      if (!data.success) {
        console.error('❌ [FRONTEND VIDEO VARIANCE] API returned error:', data.error);
        throw new Error(data.error || 'Failed to process video variations');
      }

      updateProcessingItem(processingId, { progress: 100, currentStep: 'Complete!' });
      console.log('📊 [FRONTEND VIDEO VARIANCE] Progress: 100% - Complete!');
      
      const newVariations = data.variations || [];
      console.log('✅ [FRONTEND VIDEO VARIANCE] Received variations:', newVariations.length);
      console.log('🔍 [FRONTEND VIDEO VARIANCE] Raw variations data:', newVariations);
      
      // Log each variation received
      newVariations.forEach((variation: CharacterVariation, index: number) => {
        console.log(`🎬 [FRONTEND VIDEO VARIANCE] Variation ${index + 1}:`, {
          id: variation.id,
          angle: variation.angle,
          description: variation.description,
          imageUrl: variation.imageUrl,
          videoUrl: variation.videoUrl,
          fileType: variation.fileType
        });
      });
      
      console.log('🔍 [FRONTEND VIDEO VARIANCE] Starting content filtering...');
      // Filter out bad content variations
      const filteredVariations = newVariations.filter((variation: CharacterVariation) => {
        const isBad = isBadContent(variation.description || '') || 
                     isBadContent(variation.angle || '') || 
                     isBadContent(variation.pose || '') ||
                     isBadContent(prompt.trim());
        
        if (isBad) {
          console.log('🚫 [FRONTEND VIDEO VARIANCE] Bad content variation detected, filtering out:', variation.description);
          showContentRejectedAnimation();
        } else {
          console.log('✅ [FRONTEND VIDEO VARIANCE] Variation passed content filter:', variation.angle);
        }
        
        return !isBad;
      });
      
      console.log('📊 [FRONTEND VIDEO VARIANCE] Filtering results:');
      console.log('📊 [FRONTEND VIDEO VARIANCE] Original variations:', newVariations.length);
      console.log('📊 [FRONTEND VIDEO VARIANCE] Filtered variations:', filteredVariations.length);
      console.log('🔍 [FRONTEND VIDEO VARIANCE] Filtered variations data:', filteredVariations);
      
      console.log('📊 [FRONTEND VIDEO VARIANCE] Content filtering complete:', {
        originalCount: newVariations.length,
        filteredCount: filteredVariations.length,
        filteredOut: newVariations.length - filteredVariations.length
      });
      
      const storedVariations: StoredVariation[] = filteredVariations.map((variation: CharacterVariation, index: number) => ({
        ...variation,
        timestamp: Date.now() + index,
        originalPrompt: prompt.trim(),
        fileType: 'video' // Always video for this function
      }));
      setVariations(storedVariations);
      
      // Track usage
      await trackUsage('video_generation', 'minimax_endframe', {
        prompt: prompt.trim(),
        variations_count: filteredVariations.length,
        file_type: 'video',
        model: generationMode
      });
      
      // Deduct credits after successful generation (regardless of filtering)
      if (user?.id && !isAdmin) {
        try {
          const response = await fetch('/api/use-credits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              modelName: generationMode,
              generationType: 'video'
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Credits deducted: $${result.creditsUsed.toFixed(4)}, remaining: $${result.remainingCredits.toFixed(2)}`);
            // Trigger credit display refresh
            console.log('🔄 Dispatching creditUpdated event');
            window.dispatchEvent(new CustomEvent('creditUpdated'));
          }
        } catch (error) {
          console.error('Failed to deduct credits:', error);
        }
      }
      
      // Add to gallery
      if (filteredVariations.length > 0) {
        console.log('🎬 Adding video variations to gallery:', filteredVariations.length);
        addToGallery(filteredVariations, prompt.trim(), uploadedFiles[0]?.preview);
        showNotification('🎬 Video variations generated successfully!', 'success');
        
        // Clear input after successful generation
        setPrompt('');
        setUploadedFiles([]);
        console.log('🧹 Cleared input after successful video variation generation');
        
        // Remove processing item after successful completion (give more time for video to load)
        setTimeout(() => {
          removeProcessingItem(processingId);
          stopGenerationTimer();
        }, 3000); // Increased from 1000ms to 3000ms
      } else if (newVariations.length > 0) {
        // All variations were filtered out
        showNotification('🚫 All generated content was filtered out due to content policy', 'error');
        
        // Remove processing item even if filtered out
        setTimeout(() => {
          removeProcessingItem(processingId);
          stopGenerationTimer();
        }, 1000);
      } else {
        // No variations received
        showNotification('❌ No video variations were generated', 'error');
        
        // Remove processing item
        setTimeout(() => {
          removeProcessingItem(processingId);
          stopGenerationTimer();
        }, 1000);
      }

    } catch (err) {
      console.error('❌ Video variation error:', err);
      
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
      
      // Remove processing item on error
      removeProcessingItem(processingId);
      stopGenerationTimer();
    }
  };

  // Handle Flux Dev generation as fallback for Nano Banana
  const handleFluxDevGeneration = async () => {
    // Check if user can generate
    if (!canGenerate) {
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

    setProcessing({
      isProcessing: true,
      progress: 20,
      currentStep: 'Analyzing character with Gemini...'
    });

    try {
      setProcessing(prev => ({ ...prev, progress: 40, currentStep: 'Processing with Gemini AI...' }));
      
      // First, get Gemini analysis (same as Nano Banana)
      const geminiResponse = await fetch('/api/vary-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: uploadedFiles.map(img => img.base64),
          mimeTypes: uploadedFiles.map(img => img.mimeType || 'image/jpeg'),
          prompt: prompt.trim(),
          generationMode: generationMode,
          useFluxDev: true, // Flag to indicate we want Flux Dev instead of Nano Banana
          generationSettings: generationSettings
        }),
      });

      setProcessing(prev => ({ ...prev, progress: 70, currentStep: 'Generating variations with Flux Dev...' }));

      const data = await geminiResponse.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to process character variations with Flux Dev');
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
      
      const storedVariations: StoredVariation[] = filteredVariations.map((variation: CharacterVariation, index: number) => ({
        ...variation,
        timestamp: Date.now() + index,
        originalPrompt: prompt.trim(),
        fileType: variation.fileType || (variation.videoUrl ? 'video' : 'image')
      }));
      setVariations(storedVariations);
      
      // Track usage
      await trackUsage('character_variation', 'gemini', {
        prompt: prompt.trim(),
        variations_count: filteredVariations.length,
        file_type: uploadedFiles[0]?.fileType,
        fallback_used: true
      });
      
      // Add to gallery
      if (filteredVariations.length > 0) {
        addToGallery(filteredVariations, prompt.trim(), uploadedFiles[0]?.preview);
        showNotification('🎨 Character variations generated with Flux Dev!', 'success');
        
        // Deduct credits after successful generation
        if (user?.id && !isAdmin) {
          try {
            const response = await fetch('/api/use-credits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                modelName: 'flux-dev',
                generationType: 'image'
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`✅ Credits deducted: $${result.creditsUsed.toFixed(4)}, remaining: $${result.remainingCredits.toFixed(2)}`);
              // Trigger credit display refresh
              console.log('🔄 Dispatching creditUpdated event');
              window.dispatchEvent(new CustomEvent('creditUpdated'));
            }
          } catch (error) {
            console.error('Failed to deduct credits:', error);
          }
        }
        
        // Clear input after successful generation
        setPrompt('');
        setUploadedFiles([]);
        console.log('🧹 Cleared input after successful Flux Dev generation');
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
      console.error('❌ Flux Dev generation error:', err);
      
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

  // Handle Seedream 4 generation with advanced features
  const handleSeedream4Generation = async () => {
    // Check if user can generate
    if (!canGenerate) {
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

    setProcessing({
      isProcessing: true,
      progress: 20,
      currentStep: 'Preparing Seedream 4 generation...'
    });

    try {
      setProcessing(prev => ({ ...prev, progress: 40, currentStep: 'Generating with Seedream 4...' }));
      
      // Call Seedream 4 directly without Gemini analysis
      const seedreamResponse = await fetch('/api/seedream-4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: uploadedFiles.map(img => img.base64),
          mimeTypes: uploadedFiles.map(img => img.mimeType || 'image/jpeg'),
          prompt: prompt.trim(),
          size: "2K",
          aspect_ratio: generationSettings.aspectRatio,
          max_images: 4 // Generate multiple variations
        }),
      });

      setProcessing(prev => ({ ...prev, progress: 80, currentStep: 'Processing results...' }));

      const data = await seedreamResponse.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate images with Seedream 4');
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
      
      const storedVariations: StoredVariation[] = filteredVariations.map((variation: CharacterVariation, index: number) => ({
        ...variation,
        timestamp: Date.now() + index,
        originalPrompt: prompt.trim(),
        fileType: variation.fileType || (variation.videoUrl ? 'video' : 'image')
      }));
      setVariations(storedVariations);
      
      // Track usage
      await trackUsage('character_variation', 'gemini', {
        prompt: prompt.trim(),
        variations_count: filteredVariations.length,
        file_type: uploadedFiles[0]?.fileType,
        model_used: 'seedream-4'
      });
      
      // Add to gallery
      if (filteredVariations.length > 0) {
        addToGallery(filteredVariations, prompt.trim(), uploadedFiles[0]?.preview);
        showNotification('🎨 Character variations generated with Seedream 4!', 'success');
        
        // Deduct credits after successful generation
        if (user?.id && !isAdmin) {
          try {
            const response = await fetch('/api/use-credits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                modelName: 'bytedance-seedream-4',
                generationType: 'image'
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`✅ Credits deducted: $${result.creditsUsed.toFixed(4)}, remaining: $${result.remainingCredits.toFixed(2)}`);
              // Trigger credit display refresh
              console.log('🔄 Dispatching creditUpdated event');
              window.dispatchEvent(new CustomEvent('creditUpdated'));
            }
          } catch (error) {
            console.error('Failed to deduct credits:', error);
          }
        }
        
        // Clear input after successful generation
        setPrompt('');
        setUploadedFiles([]);
        console.log('🧹 Cleared input after successful Seedream 4 generation');
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
      console.error('❌ Seedream 4 generation error:', err);
      
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
      
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Authentication required - please sign in');
      }
      
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
          'Authorization': `Bearer ${session.access_token}`,
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
        // For mobile, use direct download with better error handling
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
        
        // Show mobile-specific download guidance
        showNotification('📱 Download started! If it doesn\'t work, try long-pressing the image and selecting "Save to Photos".', 'success');
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
        
        // Show mobile-specific video download guidance
        showNotification('📱 Video opened in new tab! If download doesn\'t start, try long-pressing the video and selecting "Save to Photos" or "Download".', 'success');
        return;
      }
      
      // For desktop, try multiple download methods
      console.log('🖥️ Desktop detected, attempting download');
      
      // Method 1: Try blob download with CORS
      try {
        console.log('🔄 Attempting blob download...');
      const response = await fetch(videoUrl, {
        mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'video/*'
          }
      });
      
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
        console.log('✅ Blob created, size:', blob.size);
        
        if (blob.size === 0) {
          throw new Error('Empty blob received');
        }
        
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-edit-${originalPrompt.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}.mp4`;
        a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('🎬 Video downloaded successfully!', 'success');
        return;
        
      } catch (blobError) {
        console.log('❌ Blob download failed:', blobError);
      }
      
      // Method 2: Try direct download with download attribute
      console.log('🔄 Attempting direct download...');
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `video-edit-${originalPrompt.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}.mp4`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      showNotification('🎬 Download initiated! Check your downloads folder.', 'success');
      
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
      
      showNotification('🎬 Video opened in new tab! Right-click the video and select "Save video as..." to download.', 'success');
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
        const storedVariations: StoredVariation[] = generatedVariations.map((variation: CharacterVariation, index: number) => ({
          ...variation,
          timestamp: Date.now() + index,
          originalPrompt: originalPrompt,
          fileType: variation.fileType || (variation.videoUrl ? 'video' : 'image')
        }));
        setVariations(storedVariations);
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

    // Create processing item for gallery
    const processingId = `veo3-${Date.now()}`;
    const controller = new AbortController();
    
    const processingItem: ProcessingItem = {
      id: processingId,
      type: 'video',
      model: 'veo3-fast',
      prompt: prompt.trim() || 'Video generation',
      progress: 0,
      currentStep: 'Starting Veo3 Fast generation...',
      startTime: Date.now(),
      estimatedTime: getEstimatedTimeForModel('veo3-fast'),
      cancellable: true,
      abortController: controller
    };
    
    addProcessingItem(processingItem);
    setAbortController(controller);
    setIsCancellable(true);

    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Authentication required - please sign in');
      }

      updateProcessingItem(processingId, { progress: 20, currentStep: 'Uploading image to Supabase...' });

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

      updateProcessingItem(processingId, { progress: 40, currentStep: 'Transferring image to FAL AI...' });

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

      updateProcessingItem(processingId, { progress: 60, currentStep: 'Generating video with Veo3 Fast...' });

      const response = await fetch('/api/veo3-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image_url: falImageUrl,
          duration: "8s",
          generate_audio: true,
          resolution: "720p"
        }),
        signal: controller.signal,
      });

      updateProcessingItem(processingId, { progress: 70, currentStep: 'Generating video with Veo3 Fast...' });

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

      updateProcessingItem(processingId, { progress: 90, currentStep: 'Processing result...' });

      // Create a variation object for the gallery
      const generatedVariation: CharacterVariation = {
        id: `veo3-${Date.now()}`,
        description: `Veo3 Fast: ${prompt}`,
        angle: 'Image-to-Video',
        pose: 'Veo3 Fast Generated',
        videoUrl: data.videoUrl,
        fileType: 'video'
      };

      const storedVariation: StoredVariation = {
        ...generatedVariation,
        timestamp: Date.now(),
        originalPrompt: prompt.trim(),
        fileType: 'video'
      };
      setVariations(prev => [storedVariation, ...prev]);
      addToGallery([generatedVariation], prompt.trim());

      // Track usage
      trackUsage('video_generation', 'minimax_endframe');

      // Clear input after successful generation
      setPrompt('');
      setUploadedFiles([]);
      console.log('🧹 Cleared input after successful Veo3 Fast generation');

      // Deduct credits after successful generation
      await refreshCreditsAfterGeneration(
        user?.id || '',
        'veo3-fast',
        'video',
        isAdmin
      );

      showNotification('🎬 Video generated successfully with Veo3 Fast!', 'success');

      // Remove processing item after successful completion
      setTimeout(() => {
        removeProcessingItem(processingId);
      }, 1000);

      // Cleanup AbortController
      setAbortController(null);
      setIsCancellable(false);

    } catch (error) {
      console.error('Veo3 Fast generation error:', error);
      
      // Check if error is due to cancellation
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Veo3 Fast generation was cancelled');
        removeProcessingItem(processingId);
        setAbortController(null);
        setIsCancellable(false);
        return; // Don't show error notification for cancellation
      }
      
      showAnimatedErrorNotification(`User Error: ${error instanceof Error ? error.message : 'Failed to generate video with Veo3 Fast'} TOASTY!`, 'toasty');
      
      // Remove processing item on error
      removeProcessingItem(processingId);
      
      // Cleanup AbortController
      setAbortController(null);
      setIsCancellable(false);
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

    // Create processing item for gallery
    const processingId = `minimax2-${Date.now()}`;
    const controller = new AbortController();
    
    const processingItem: ProcessingItem = {
      id: processingId,
      type: 'video',
      model: 'minimax-2.0',
      prompt: prompt.trim() || 'Video generation',
      progress: 0,
      currentStep: 'Starting Minimax 2.0 generation...',
      startTime: Date.now(),
      estimatedTime: getEstimatedTimeForModel('minimax-2.0'),
      cancellable: true,
      abortController: controller
    };
    
    addProcessingItem(processingItem);
    setAbortController(controller);
    setIsCancellable(true);
    
    // Start generation timer
    startGenerationTimer('minimax-2.0');

    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Authentication required - please sign in');
      }

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
          'Authorization': `Bearer ${session.access_token}`,
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

      const storedVariation: StoredVariation = {
        ...generatedVariation,
        timestamp: Date.now(),
        originalPrompt: prompt.trim(),
        fileType: 'video'
      };

      console.log('🔄 Adding variation to gallery...');
      setVariations(prev => {
        const newVariations = [storedVariation, ...prev];
        console.log('📋 Updated variations:', newVariations);
        return newVariations;
      });
      addToGallery([generatedVariation], prompt.trim());
      console.log('✅ Variation added to gallery successfully!');

      // Track usage
      trackUsage('video_generation', 'minimax_endframe');

      // Deduct credits after successful generation
      await refreshCreditsAfterGeneration(
        user?.id || '',
        'minimax-2.0',
        'video',
        isAdmin
      );

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
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Authentication required - please sign in');
      }

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
          'Authorization': `Bearer ${session.access_token}`,
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

      const storedVariation: StoredVariation = {
        ...generatedVariation,
        timestamp: Date.now(),
        originalPrompt: prompt.trim(),
        fileType: 'video'
      };
      setVariations(prev => [storedVariation, ...prev]);
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

  // Handle Kling AI Avatar generation
  const handleKlingAiAvatarGeneration = async () => {
    if (!canGenerate) {
      showAnimatedErrorNotification('User Error: Free trial limit reached! Sign up for unlimited generations! TOASTY!', 'toasty');
      return;
    }

    const imageFile = uploadedFiles.find(file => file.fileType === 'image');
    if (!imageFile) {
      showAnimatedErrorNotification('User Error: Please upload a valid image! TOASTY!', 'toasty');
      return;
    }

    if (!uploadedAudio) {
      showAnimatedErrorNotification('User Error: Please upload an audio file for Kling AI Avatar! TOASTY!', 'toasty');
      return;
    }

    setProcessing({
      isProcessing: true,
      progress: 0,
      currentStep: 'Starting Kling AI Avatar generation... (This may take 2-20 minutes)'
    });

    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Authentication required - please sign in');
      }

      setProcessing({
        isProcessing: true,
        progress: 20,
        currentStep: 'Uploading image and audio...'
      });

      // Upload image to Supabase and get FAL URL
      const imageUrl = await uploadImageToSupabaseAndFal(imageFile.base64);
      
      // Upload audio to Supabase
      const audioUploadResponse = await fetch('/api/supabase-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: uploadedAudio, // Send the file directly, not as FormData
      });

      if (!audioUploadResponse.ok) {
        throw new Error('Failed to upload audio file');
      }

      const audioUploadData = await audioUploadResponse.json();
      const audioUrl = audioUploadData.url;

      setProcessing({
        isProcessing: true,
        progress: 40,
        currentStep: 'Generating AI Avatar video... (Please be patient - this can take 2-20 minutes)'
      });

      const response = await fetch('/api/kling-ai-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          audioUrl: audioUrl,
          prompt: prompt.trim() || 'Generate AI avatar video'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate AI avatar video');
      }

      const data = await response.json();
      console.log('✅ Kling AI Avatar job submitted:', data);

      // Start polling for status
      const requestId = data.requestId;
      if (!requestId) {
        throw new Error('No request ID returned from server');
      }

      console.log('🔄 Starting status polling for request_id:', requestId);
      
      // Poll for completion with longer intervals
        let pollCount = 0;
        const maxPolls = 360; // 60 minutes max (360 * 10 seconds)
        const pollInterval = 10000; // 10 seconds
      
      const pollForStatus = async (): Promise<any> => {
        while (pollCount < maxPolls) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          pollCount++;
          
          console.log(`🔄 [KLING AI AVATAR] Status poll ${pollCount}/${maxPolls}`);
          
          try {
            const statusResponse = await fetch(`/api/kling-ai-avatar-status?requestId=${requestId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            });

            if (!statusResponse.ok) {
              throw new Error('Failed to check status');
            }

            const statusData = await statusResponse.json();
            console.log('📊 [KLING AI AVATAR] Status:', statusData.status);

            // Update progress based on status
            const progressPercent = Math.min(90, 40 + (pollCount / maxPolls) * 50);
            setProcessing(prev => ({
              ...prev,
              progress: progressPercent,
              currentStep: `Generating AI Avatar video... (${statusData.status.toLowerCase()}) - ${Math.round(pollCount * pollInterval / 1000)}s elapsed`
            }));

            if (statusData.status === 'COMPLETED' && statusData.videoUrl) {
              console.log('✅ [KLING AI AVATAR] Generation completed!');
              return statusData;
            }

            if (statusData.status === 'FAILED') {
              throw new Error(statusData.errorMessage || 'Generation failed');
            }

            // Continue polling if still in progress
            if (statusData.status === 'IN_PROGRESS' || statusData.status === 'IN_QUEUE') {
              continue;
            }

          } catch (pollError) {
            console.error('❌ [KLING AI AVATAR] Polling error:', pollError);
            if (pollCount >= maxPolls) {
              throw new Error(`Status polling failed after ${maxPolls} attempts`);
            }
          }
        }
        
          throw new Error('Generation timed out after 60 minutes');
      };

      const finalData = await pollForStatus();
      console.log('✅ Kling AI Avatar generation successful:', finalData);

      setProcessing({
        isProcessing: true,
        progress: 80,
        currentStep: 'Finalizing AI Avatar video... (Almost done!)'
      });

      // Create a variation object for the gallery
      const generatedVariation: CharacterVariation = {
        id: `kling-avatar-${Date.now()}`,
        description: `Kling AI Avatar: ${prompt.trim() || 'AI Avatar Video'}`,
        angle: 'AI Avatar',
        pose: 'AI Avatar',
        videoUrl: finalData.videoUrl,
        fileType: 'video'
      };

      const storedVariation: StoredVariation = {
        ...generatedVariation,
        timestamp: Date.now(),
        originalPrompt: prompt.trim() || 'AI Avatar Video',
        fileType: 'video'
      };
      setVariations(prev => [storedVariation, ...prev]);
      addToGallery([generatedVariation], prompt.trim());

      // Track usage
      trackUsage('video_generation', 'minimax_endframe');

      // Clear input after successful generation
      setPrompt('');
      setUploadedFiles([]);
      setUploadedAudio(null);
      console.log('🧹 Cleared input after successful Kling AI Avatar generation');

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
      console.error('Kling AI Avatar generation error:', error);
      showAnimatedErrorNotification(`User Error: ${error instanceof Error ? error.message : 'Failed to generate AI avatar video'} TOASTY!`, 'toasty');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  // Handle Luma Photon Reframe generation
  const handleLumaPhotonReframeGeneration = async () => {
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
      currentStep: 'Starting Luma Photon Reframe generation...'
    });

    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Authentication required - please sign in');
      }

      setProcessing({
        isProcessing: true,
        progress: 20,
        currentStep: 'Uploading image...'
      });

      // Upload image to Supabase and get FAL URL
      const imageUrl = await uploadImageToSupabaseAndFal(imageFile.base64);
      
      setProcessing({
        isProcessing: true,
        progress: 40,
        currentStep: 'Generating reframed image...'
      });

      // Call the Luma Photon Reframe API
      const response = await fetch('/api/luma-photon-reframe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          aspectRatio: generationSettings.aspectRatio,
          prompt: prompt.trim() || 'Reframe this image to the specified aspect ratio'
        }),
      });

      const data = await response.json();
      console.log('📊 Luma Photon Reframe API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate reframed image');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate reframed image');
      }

      setProcessing({
        isProcessing: true,
        progress: 100,
        currentStep: 'Complete!'
      });

      // Create a variation object for the reframed image
      const reframedVariation: CharacterVariation = {
        id: `reframe-${Date.now()}`,
        description: `Reframed image (${generationSettings.aspectRatio})`,
        angle: 'Reframed',
        pose: 'Reframed',
        imageUrl: data.imageUrl,
        fileType: 'image' as const
      };

      // Add to gallery
      addToGallery([reframedVariation], prompt.trim() || 'Image reframing');

      setProcessing({
        isProcessing: false,
        progress: 100,
        currentStep: 'Complete!'
      });

      console.log('✅ Luma Photon Reframe generation completed successfully');

    } catch (error) {
      console.error('❌ Luma Photon Reframe generation error:', error);
      showAnimatedErrorNotification(`User Error: ${error instanceof Error ? error.message : 'Failed to generate reframed image'} TOASTY!`, 'toasty');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  // Text-to-video functions removed - only image-to-video models supported



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
        onPurchaseCredits={() => {
          setShowCreditPurchaseModal(true);
        }}
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
            {gallery.length === 0 && processingItems.length === 0 ? (
              <div className="text-center py-8">
                <Images className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-xs">No content yet</p>
              </div>
            ) : (
              <>
                {/* Processing Items */}
                {processingItems.map((item: ProcessingItem, index: number) => (
                  <div
                    key={`processing-${item.id}-${index}`}
                    className="floating-gallery-card group relative bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-[30px] border border-purple-500 overflow-hidden cursor-pointer transition-all duration-400"
                    style={{
                      width: '240px',
                      height: '160px',
                      filter: 'brightness(0.8)',
                      transition: 'all 0.4s ease'
                    }}
                  >
                    {/* Processing Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                      {/* Spinner */}
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-3"></div>
                      
                      {/* Model Name */}
                      <div className="text-cyan-300 text-xs font-medium mb-1 text-center">
                        {item.model}
                      </div>
                      
                      {/* Progress */}
                      <div className="text-white text-xs mb-2 text-center">
                        {item.progress}%
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-700 rounded-full h-1 mb-2">
                        <div 
                          className="bg-gradient-to-r from-cyan-400 to-blue-400 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                      
                      {/* Current Step */}
                      <div className="text-gray-300 text-xs text-center leading-tight">
                        {item.currentStep}
                      </div>
                      
                      {/* Cancel Button */}
                      {item.cancellable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelProcessingItem(item.id);
                          }}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                          title="Cancel"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Regular Gallery Items */}
                {gallery.map((item: any, index: number) => (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🖥️ Desktop gallery item clicked for full-screen view:', item);
                    const imageUrl = item.videoUrl || item.imageUrl;
                    setFullScreenImage(imageUrl);
                    // Find the index in galleryImagesWithUrls
                    const index = galleryImagesWithUrls.findIndex(galleryItem => 
                      galleryItem.imageUrl === imageUrl || galleryItem.videoUrl === imageUrl
                    );
                    setFullScreenImageIndex(index >= 0 ? index : 0);
                  }}
                >
                  {/* Content Preview */}
                  <div className="relative w-full h-full">
                    {item.fileType === 'video' ? (
                      <video
                        src={item.videoUrl}
                        className="w-full h-full object-cover rounded-[30px] cursor-pointer"
                        muted
                        loop
                        onMouseEnter={(e) => {
                          e.currentTarget.play();
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
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
                    

                          {/* Hover Overlay with Actions - Centered buttons */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            {/* Centered action buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditImage(item.imageUrl || item.videoUrl, item.originalPrompt);
                                }}
                                disabled={processing.isProcessing}
                                className="text-xs text-blue-300 hover:text-blue-200 transition-colors px-3 py-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                title="Inject into input slot for editing"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.fileType === 'video') {
                                    handleVideoCardVariation(item);
                                  } else {
                                  handleVaryImage(item.imageUrl || item.videoUrl, item.originalPrompt);
                                  }
                                }}
                                disabled={processing.isProcessing}
                                className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/60 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                title={item.fileType === 'video' ? "Generate video variation with extrapolated prompt" : "Generate variations with nano_banana"}
                              >
                                Vary
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.fileType === 'video') {
                                    handleDownloadVideo(item.videoUrl, item.originalPrompt || 'Downloaded video');
                                  } else {
                                    handleDownloadVariation({
                                      id: item.id,
                                      description: item.originalPrompt || 'Downloaded image',
                                      angle: 'Gallery item',
                                      pose: 'Gallery item',
                                      imageUrl: item.imageUrl
                                    });
                                  }
                                }}
                                className="text-xs text-green-300 hover:text-green-200 transition-colors px-3 py-1.5 rounded-lg bg-green-900/40 hover:bg-green-900/60 font-medium"
                                title="Download file"
                              >
                                Download
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('🗑️ Delete button clicked for item:', item.id, item.timestamp);
                                  
                                  // Confirm deletion
                                  if (!confirm('Are you sure you want to delete this item from your gallery? This action cannot be undone.')) {
                                    console.log('🗑️ User cancelled deletion');
                                    return;
                                  }
                                  
                                  try {
                                    console.log('🗑️ Gallery sidebar delete - item data:', { id: item.id, timestamp: item.timestamp, fullItem: item });
                                    removeFromGallery(item.id, item.timestamp);
                                    console.log('✅ removeFromGallery called successfully');
                                    showNotification('✅ Item removed from gallery', 'success');
                                  } catch (error) {
                                    console.error('❌ Error in delete button:', error);
                                    showNotification('❌ Failed to remove item from gallery', 'error');
                                  }
                                }}
                                className="text-xs text-red-300 hover:text-red-200 transition-colors px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/60 font-medium"
                                title="Delete from gallery"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {/* Minimal file type indicator - top right corner */}
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {item.fileType === 'video' ? 'VID' : 'IMG'}
                          </div>
                  </div>
                </div>
              ))}
              </>
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
        <div className="fixed top-4 right-2 sm:right-4 z-[120] animate-in slide-in-from-top-2 duration-300">
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
        <div key={error.id} style={{ bottom: `${20 + (index * 80)}px` }} className="fixed right-4 z-[120]">
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
        <div className={`transition-all duration-300 w-full ${showGallery ? 'lg:pr-0' : 'lg:ml-16'} flex flex-col items-center`}>
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
              <h2 className="text-lg font-bold text-white mb-4 text-center">New Variations</h2>
              
              {/* Main Content Display Area */}
              <div className="w-full aspect-square max-w-md mx-auto bg-black bg-opacity-50 rounded-[30px] border border-gray-700 overflow-hidden">
                {variations.length > 0 ? (
                  <div className="relative w-full h-full">
                    {variations[0].fileType === 'video' ? (
                      <video
                        src={variations[0].videoUrl}
                        className="w-full h-full object-cover cursor-pointer"
                        controls
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onClick={() => setFullScreenImage(variations[0].videoUrl || null)}
                        onMouseEnter={(e) => {
                          console.log('🎬 Main variation video hover start:', variations[0].videoUrl);
                          e.currentTarget.play().catch(err => {
                            console.warn('⚠️ Main variation video autoplay failed:', err);
                          });
                        }}
                        onMouseLeave={(e) => {
                          console.log('🎬 Main variation video hover end:', variations[0].videoUrl);
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
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
                          className="w-full h-full object-cover cursor-pointer"
                          muted
                          loop
                          onMouseEnter={(e) => {
                            e.currentTarget.play();
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0; // Reset to beginning
                          }}
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

            {/* Processing items now appear in gallery instead of modal */}

            {/* Mobile Floating Input - Match Community Page Style */}
            <div className="mobile-chat-interface lg:hidden" data-input-area>

              {/* Quick Shots Button - Only show when image is uploaded */}
              {uploadedFiles.length > 0 && uploadedFiles.some(file => file.fileType === 'image') && (
                <div className="mb-3">
                  <button
                    onClick={() => {
                      setActivePresetTab('shot');
                      setShowPresetModal(true);
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Quick Shots
                  </button>
                </div>
              )}
              
              <div className="mobile-input-container">
                {/* Top Div: 4 Image Upload Slots + Model Selection */}
                <div className="mb-2">
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
                              playsInline
                              preload="metadata"
                              onMouseEnter={(e) => {
                                console.log('🎬 Upload preview video hover start:', file.preview);
                                e.currentTarget.play().catch(err => {
                                  console.warn('⚠️ Upload preview video autoplay failed:', err);
                                });
                              }}
                              onMouseLeave={(e) => {
                                console.log('🎬 Upload preview video hover end:', file.preview);
                                e.currentTarget.pause();
                                e.currentTarget.currentTime = 0;
                              }}
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
                    
                    {/* Model Selection - Inline with image slots - SIMPLIFIED */}
                    {uploadedFiles.length > 0 && (
                      <select
                        value={generationMode || ''}
                        onChange={(e) => {
                          console.log('🔄 [DROPDOWN] Mobile model selection changed to:', e.target.value);
                          setGenerationMode(e.target.value as GenerationMode);
                        }}
                        className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 flex-shrink-0 min-w-[120px]"
                        style={{ 
                          backgroundColor: '#1f2937',
                          color: 'white'
                        }}
                      >
                        <option value="">Select Model</option>
                        {uploadedFiles.some(file => file.fileType === 'image') && (
                          <>
                            <option value="nano-banana">Nano Banana Edit</option>
                            <option value="seedream-4-edit">SeedDance 4 Edit</option>
                            <option value="gemini-25-flash-image-edit">Gemini Flash Edit</option>
                          </>
                        )}
                        {uploadedFiles.some(file => file.fileType === 'video') && (
                          <>
                            <option value="minimax-2.0">MiniMax End Frame</option>
                          </>
                        )}
                      </select>
                    )}
                  </div>
                  
                  {/* Text Input - Directly below the top container */}
                <div className="mt-2">
                <textarea
                  id="prompt-mobile"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={getPromptPlaceholder()}
                    className="mobile-chat-input w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows={2}
                    style={{ fontSize: '16px', minHeight: '44px' }}
                  />
                </div>
                
                {/* Token Warning Message */}
                {showTokenWarning && (
                  <div className="mt-2 px-3 py-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                    <div className="text-yellow-200 text-xs flex items-center gap-2">
                      <span className="text-yellow-400">⚠️</span>
                      <span>Better adherence with fewer presets (3+ may reduce quality)</span>
                    </div>
                  </div>
                )}
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
                      disabled={processing.isProcessing || !canGenerateWithCurrentState()}
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
                      disabled={processing.isProcessing || !canGenerateWithCurrentState()}
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
              <h2 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4 text-center">New Variations</h2>
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
                          className="w-full h-full object-cover rounded-[30px] cursor-pointer"
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          onMouseEnter={(e) => {
                            console.log('🎬 Variation 1 video hover start:', variations[0].videoUrl);
                            e.currentTarget.play().catch(err => {
                              console.warn('⚠️ Variation 1 video autoplay failed:', err);
                            });
                          }}
                          onMouseLeave={(e) => {
                            console.log('🎬 Variation 1 video hover end:', variations[0].videoUrl);
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0; // Reset to beginning
                          }}
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
                              if (variations[0].imageUrl) {
                                handleEditImage(variations[0].imageUrl, variations[0].originalPrompt);
                              }
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
                              if (variations[0].imageUrl) {
                                handleVaryImage(variations[0].imageUrl, variations[0].originalPrompt);
                              }
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate variations with nano_banana"
                          >
                            Vary
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!variations[0].imageUrl) return;
                              try {
                                const url = variations[0].imageUrl;
                                const response = await fetch(url);
                                const blob = await response.blob();
                                const downloadUrl = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = downloadUrl;
                                link.download = `vary-ai-variant-1-${variations[0].id}.jpg`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(downloadUrl);
                              } catch (error) {
                                console.error('Download failed:', error);
                                // Fallback to direct link
                                const link = document.createElement('a');
                                link.href = variations[0].imageUrl;
                                link.download = `vary-ai-variant-1-${variations[0].id}.jpg`;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            }}
                            className="text-xs text-green-300 hover:text-green-200 transition-colors px-2 py-1 rounded bg-green-900/30 hover:bg-green-900/50"
                            title="Download image"
                          >
                            Download
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
                          className="w-full h-full object-cover rounded-[30px] cursor-pointer"
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          onMouseEnter={(e) => {
                            console.log('🎬 Variation 2 video hover start:', variations[1].videoUrl);
                            e.currentTarget.play().catch(err => {
                              console.warn('⚠️ Variation 2 video autoplay failed:', err);
                            });
                          }}
                          onMouseLeave={(e) => {
                            console.log('🎬 Variation 2 video hover end:', variations[1].videoUrl);
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0; // Reset to beginning
                          }}
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
                              if (variations[1].imageUrl) {
                                handleEditImage(variations[1].imageUrl, variations[1].originalPrompt);
                              }
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
                              if (variations[1].imageUrl) {
                                handleVaryImage(variations[1].imageUrl, variations[1].originalPrompt);
                              }
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate variations with nano_banana"
                          >
                            Vary
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!variations[1].imageUrl) return;
                              try {
                                const url = variations[1].imageUrl;
                                const response = await fetch(url);
                                const blob = await response.blob();
                                const downloadUrl = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = downloadUrl;
                                link.download = `vary-ai-variant-2-${variations[1].id}.jpg`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(downloadUrl);
                              } catch (error) {
                                console.error('Download failed:', error);
                                // Fallback to direct link
                                const link = document.createElement('a');
                                link.href = variations[1].imageUrl;
                                link.download = `vary-ai-variant-2-${variations[1].id}.jpg`;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            }}
                            className="text-xs text-green-300 hover:text-green-200 transition-colors px-2 py-1 rounded bg-green-900/30 hover:bg-green-900/50"
                            title="Download image"
                          >
                            Download
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
                          className="w-full h-full object-cover rounded-[30px] cursor-pointer"
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          onMouseEnter={(e) => {
                            console.log('🎬 Variation 3 video hover start:', variations[2].videoUrl);
                            e.currentTarget.play().catch(err => {
                              console.warn('⚠️ Variation 3 video autoplay failed:', err);
                            });
                          }}
                          onMouseLeave={(e) => {
                            console.log('🎬 Variation 3 video hover end:', variations[2].videoUrl);
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0; // Reset to beginning
                          }}
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
                              if (variations[2].imageUrl) {
                                handleEditImage(variations[2].imageUrl, variations[2].originalPrompt);
                              }
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
                              if (variations[2].imageUrl) {
                                handleVaryImage(variations[2].imageUrl, variations[2].originalPrompt);
                              }
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate variations with nano_banana"
                          >
                            Vary
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!variations[2].imageUrl) return;
                              try {
                                const url = variations[2].imageUrl;
                                const response = await fetch(url);
                                const blob = await response.blob();
                                const downloadUrl = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = downloadUrl;
                                link.download = `vary-ai-variant-3-${variations[2].id}.jpg`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(downloadUrl);
                              } catch (error) {
                                console.error('Download failed:', error);
                                // Fallback to direct link
                                const link = document.createElement('a');
                                link.href = variations[2].imageUrl;
                                link.download = `vary-ai-variant-3-${variations[2].id}.jpg`;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            }}
                            className="text-xs text-green-300 hover:text-green-200 transition-colors px-2 py-1 rounded bg-green-900/30 hover:bg-green-900/50"
                            title="Download image"
                          >
                            Download
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
                          className="w-full h-full object-cover rounded-[30px] cursor-pointer"
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          onMouseEnter={(e) => {
                            console.log('🎬 Variation 4 video hover start:', variations[3].videoUrl);
                            e.currentTarget.play().catch(err => {
                              console.warn('⚠️ Variation 4 video autoplay failed:', err);
                            });
                          }}
                          onMouseLeave={(e) => {
                            console.log('🎬 Variation 4 video hover end:', variations[3].videoUrl);
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0; // Reset to beginning
                          }}
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
                              if (variations[3].imageUrl) {
                                handleEditImage(variations[3].imageUrl, variations[3].originalPrompt);
                              }
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
                              if (variations[3].imageUrl) {
                                handleVaryImage(variations[3].imageUrl, variations[3].originalPrompt);
                              }
                            }}
                            disabled={processing.isProcessing}
                            className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate variations with nano_banana"
                          >
                            Vary
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const imageUrl = variations[3].imageUrl;
                              if (!imageUrl) return;
                              try {
                                const response = await fetch(imageUrl);
                                const blob = await response.blob();
                                const downloadUrl = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = downloadUrl;
                                link.download = `vary-ai-variant-4-${variations[3].id}.jpg`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(downloadUrl);
                              } catch (error) {
                                console.error('Download failed:', error);
                                // Fallback to direct link
                                const link = document.createElement('a');
                                link.href = imageUrl;
                                link.download = `vary-ai-variant-4-${variations[3].id}.jpg`;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            }}
                            className="text-xs text-green-300 hover:text-green-200 transition-colors px-2 py-1 rounded bg-green-900/30 hover:bg-green-900/50"
                            title="Download image"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div 
              className={`generate-floating-input hidden md:block transition-all duration-200 ${
                isDragOverMain ? 'bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-400' : ''
              }`}
              data-input-area
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {/* Drop Zone Overlay */}
              {isDragOverMain && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-400 rounded-lg z-50 flex items-center justify-center">
                  <div className="text-center text-blue-200">
                    <Upload className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                    <p className="text-xl font-semibold mb-2">Drop images here</p>
                    <p className="text-sm opacity-80">Release to upload files</p>
                  </div>
                </div>
              )}
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
                          className="w-14 h-14 object-cover rounded-lg border border-white border-opacity-20 cursor-pointer"
                          muted
                          playsInline
                          preload="metadata"
                          onMouseEnter={(e) => {
                            console.log('🎬 Character video hover start:', file.preview);
                            e.currentTarget.play().catch(err => {
                              console.warn('⚠️ Character video autoplay failed:', err);
                            });
                          }}
                          onMouseLeave={(e) => {
                            console.log('🎬 Character video hover end:', file.preview);
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
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
                
                {/* Audio Upload Slot for Kling AI Avatar */}
                {generationMode === 'kling-ai-avatar' && (
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium whitespace-nowrap">Audio:</span>
                    <div className="relative">
                      {uploadedAudio ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-600 bg-opacity-20 border border-green-500 border-opacity-50 rounded-lg">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">🎵</span>
                          </div>
                          <span className="text-white text-xs font-medium truncate max-w-32">
                            {uploadedAudio.name}
                          </span>
                          <button
                            onClick={() => setUploadedAudio(null)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            aria-label="Remove audio file"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => document.getElementById('audio-input')?.click()}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-700 bg-opacity-50 border border-gray-600 border-opacity-50 rounded-lg hover:bg-opacity-70 transition-all duration-200"
                        >
                          <Plus className="w-4 h-4 text-gray-400" />
                          <span className="text-white text-xs">Upload Audio</span>
                        </button>
                      )}
                      <input
                        id="audio-input"
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadedAudio(file);
                            console.log('🎵 Audio file selected:', file.name, file.type, file.size);
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
                
                {/* Model Selection - Compact */}
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium whitespace-nowrap">Model:</span>
                      <select
                        value={generationMode || ''}
                        onChange={(e) => {
                          console.log('🔄 [DROPDOWN] Mobile model selection changed to:', e.target.value);
                          setGenerationMode(e.target.value as GenerationMode);
                        }}
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

                {/* Content Mode Toggle - Image/Video (Desktop Only) */}
                {typeof window !== 'undefined' && window.innerWidth >= 768 && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium whitespace-nowrap">Mode:</span>
                    <div className="flex bg-gray-800 bg-opacity-50 rounded-lg p-1 backdrop-blur-sm">
                      <button
                        onClick={() => setContentMode('image')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                          contentMode === 'image'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Image
                      </button>
                      <button
                        onClick={() => {
                          if (!hasSecretAccess) {
                            showAnimatedErrorNotification('🔒 Video variants require Secret Level access! Enter a promo code in your profile to unlock this feature.', 'toasty');
                            return;
                          }
                          setContentMode('video');
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 relative ${
                          contentMode === 'video'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : hasSecretAccess
                            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                            : 'text-gray-500 cursor-not-allowed opacity-60'
                        }`}
                        disabled={!hasSecretAccess}
                        title={!hasSecretAccess ? 'Secret Level access required - Enter promo code in profile' : 'Switch to video mode'}
                      >
                        Video
                        {!hasSecretAccess && (
                          <span className="absolute -top-1 -right-1 text-xs">🔒</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

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

                {/* Aspect Ratio & Settings Button - Show when model is selected and image is uploaded */}
                {generationMode && uploadedFiles.some(file => file.fileType === 'image') && (
                  <div className="text-center mt-3">
                    <button
                      onClick={() => setShowAspectRatioModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <Settings className="w-4 h-4" />
                      Aspect Ratio & Settings
                    </button>
                  </div>
                )}

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
                placeholder={getPromptPlaceholder()}
                className="generate-floating-textarea"
                rows={1}
                style={{ fontSize: '16px' }} // Prevents zoom on iOS
              />
              
              {/* Token Warning Message - Desktop */}
              {showTokenWarning && (
                <div className="mt-2 px-3 py-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                  <div className="text-yellow-200 text-xs flex items-center gap-2">
                    <span className="text-yellow-400">⚠️</span>
                    <span>Better adherence with fewer presets (3+ may reduce quality)</span>
                  </div>
                </div>
              )}
              
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
                    disabled={processing.isProcessing || !canGenerateWithCurrentState()}
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
                    disabled={processing.isProcessing || !canGenerateWithCurrentState()}
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
            </div>

        {/* Mobile Gallery Panel - Full Viewport */}
        {showGallery && (
          <div className="block lg:hidden fixed inset-0 bg-black bg-opacity-95 backdrop-blur-md z-30 overflow-y-auto h-screen">
            <div className="p-3 h-full">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <Images className="w-5 h-5 text-white" />
                  Library ({filteredGallery.length})
                </h2>
                  <button
                    onClick={() => setShowGallery(false)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors text-sm"
                    title="Hide gallery"
                  >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Close</span>
                  </button>
              </div>

              {/* Accordion Gallery */}
              {filteredGallery.length === 0 ? (
                <div className="text-center py-8">
                  <Images className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-base">No content in gallery yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Recent Creations Accordion */}
                  <div>
                <button
                      className="w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-gray-800/30 rounded-lg transition-colors"
                      onClick={() => setExpandedPrompts(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has('mobile-recent')) {
                          newSet.delete('mobile-recent');
                        } else {
                          newSet.add('mobile-recent');
                        }
                        return newSet;
                      })}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md flex items-center justify-center">
                          <Images className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium text-sm">Recent Creations</h3>
                          <p className="text-gray-400 text-xs">{filteredGallery.length} items</p>
                        </div>
                      </div>
                      <ChevronDown 
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                          expandedPrompts.has('mobile-recent') ? 'rotate-180' : ''
                        }`} 
                      />
                </button>
                    
                    <div className={`transition-all duration-300 ${
                      expandedPrompts.has('mobile-recent') ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      <div className="pt-2 max-h-[70vh] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent touch-pan-y">
                        <div className="grid grid-cols-3 gap-2">
                          {filteredGallery.map((item: any, index: number) => {
                            const itemKey = `mobile-recent-${item.id}-${item.timestamp}-${index}`;
                    
                    return (
                      <div 
                        key={itemKey} 
                                className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('📱 Mobile gallery item clicked for full-screen view:', item);
                                  const imageUrl = item.videoUrl || item.imageUrl;
                                  setFullScreenImage(imageUrl);
                                  // Find the index in galleryImagesWithUrls
                                  const index = galleryImagesWithUrls.findIndex(galleryItem => 
                                    galleryItem.imageUrl === imageUrl || galleryItem.videoUrl === imageUrl
                                  );
                                  setFullScreenImageIndex(index >= 0 ? index : 0);
                                }}
                              >
                                <div className="aspect-square">
                          {item.fileType === 'video' ? (
                            <video
                              src={item.videoUrl}
                                      className="w-full h-full object-cover"
                                      muted
                                      loop
                                      playsInline
                                      preload="metadata"
                                      onMouseEnter={(e) => {
                                        console.log('🎬 Mobile video hover start:', item.videoUrl);
                                        e.currentTarget.play().catch(err => {
                                          console.warn('⚠️ Mobile video autoplay failed:', err);
                                        });
                                      }}
                                      onMouseLeave={(e) => {
                                        console.log('🎬 Mobile video hover end:', item.videoUrl);
                                        e.currentTarget.pause();
                                        e.currentTarget.currentTime = 0;
                                      }}
                                    />
                                  ) : (
                            <img
                              src={getProxiedImageUrl(item.imageUrl)}
                              alt="Gallery item"
                                      className="w-full h-full object-cover"
                              onError={(e) => {
                                  e.currentTarget.src = '/api/placeholder/150/150';
                              }}
                            />
                          )}
                          </div>

                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Collection Accordion */}
                  <div>
                              <button
                      className="w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-gray-800/30 rounded-lg transition-colors"
                      onClick={() => setExpandedPrompts(prev => {
                                      const newSet = new Set(prev);
                        if (newSet.has('mobile-videos')) {
                          newSet.delete('mobile-videos');
                                  } else {
                          newSet.add('mobile-videos');
                        }
                        return newSet;
                      })}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-md flex items-center justify-center">
                          <Images className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium text-sm">Video Collection</h3>
                          <p className="text-gray-400 text-xs">{filteredGallery.filter(item => item.fileType === 'video').length} videos</p>
                        </div>
                      </div>
                      <ChevronDown 
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                          expandedPrompts.has('mobile-videos') ? 'rotate-180' : ''
                        }`} 
                      />
                              </button>
                    
                    <div className={`transition-all duration-300 ${
                      expandedPrompts.has('mobile-videos') ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      <div className="pt-2 max-h-[70vh] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent touch-pan-y">
                        <div className="grid grid-cols-2 gap-2">
                          {filteredGallery.filter(item => item.fileType === 'video').map((item: any, index: number) => {
                            const itemKey = `mobile-video-${item.id}-${item.timestamp}-${index}`;
                            
                            return (
                              <div 
                                key={itemKey} 
                                className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('📱 Mobile video gallery item clicked for full-screen view:', item);
                                  setFullScreenImage(item.videoUrl);
                                  // Find the index in galleryImagesWithUrls
                                  const index = galleryImagesWithUrls.findIndex(galleryItem => 
                                    galleryItem.videoUrl === item.videoUrl
                                  );
                                  setFullScreenImageIndex(index >= 0 ? index : 0);
                                }}
                              >
                                <div className="aspect-square">
                                  <video
                                    src={item.videoUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                    loop
                                    playsInline
                                    preload="metadata"
                                    onMouseEnter={(e) => {
                                      console.log('🎬 Mobile gallery video hover start:', item.videoUrl);
                                      e.currentTarget.play().catch(err => {
                                        console.warn('⚠️ Mobile gallery video autoplay failed:', err);
                                      });
                                    }}
                                    onMouseLeave={(e) => {
                                      console.log('🎬 Mobile gallery video hover end:', item.videoUrl);
                                      e.currentTarget.pause();
                                      e.currentTarget.currentTime = 0;
                                    }}
                                  />
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      </div>
                          </div>
                        </div>

                  {/* Image Collection Accordion */}
                  <div>
                                <button
                      className="w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-gray-800/30 rounded-lg transition-colors"
                      onClick={() => setExpandedPrompts(prev => {
                                        const newSet = new Set(prev);
                        if (newSet.has('mobile-images')) {
                          newSet.delete('mobile-images');
                                    } else {
                          newSet.add('mobile-images');
                        }
                        return newSet;
                      })}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-md flex items-center justify-center">
                          <Images className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium text-sm">Image Collection</h3>
                          <p className="text-gray-400 text-xs">{filteredGallery.filter(item => item.fileType === 'image').length} images</p>
                        </div>
                      </div>
                      <ChevronDown 
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                          expandedPrompts.has('mobile-images') ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>
                    
                    <div className={`transition-all duration-300 ${
                      expandedPrompts.has('mobile-images') ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      <div className="pt-2 max-h-[70vh] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent touch-pan-y">
                        <div className="grid grid-cols-4 gap-2">
                          {filteredGallery.filter(item => item.fileType === 'image').map((item: any, index: number) => {
                            const itemKey = `mobile-image-${item.id}-${item.timestamp}-${index}`;
                            
                            return (
                              <div 
                                key={itemKey} 
                                className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105"
                                onClick={() => setFullScreenImage(item.imageUrl)}
                              >
                                <div className="aspect-square">
                                  <img
                                    src={getProxiedImageUrl(item.imageUrl)}
                                    alt="Gallery item"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = '/api/placeholder/150/150';
                                    }}
                                  />
                                </div>

                              </div>
                            );
                          })}
                            </div>
                          </div>
                      </div>
                  </div>
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

        {/* Desktop Gallery Panel - Accordion Style */}
        {showGallery && (
          <div className="hidden lg:block fixed inset-0 bg-black bg-opacity-95 z-30">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-2xl font-semibold text-white">
                  Gallery ({filteredGallery.length})
                </h2>
                <button
                  onClick={() => setShowGallery(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Close
                </button>
              </div>

              {/* Accordion Gallery */}
              <div className="flex-1 overflow-y-auto">
                {filteredGallery.length === 0 ? (
                  <div className="text-center py-12">
                    <Images className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No content in gallery yet</p>
                  </div>
                ) : (
                  <div className="space-y-4 p-6">
                    {/* Recent Creations Accordion */}
                    <div>
                      <button
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-800/30 rounded-lg transition-colors"
                        onClick={() => setExpandedPrompts(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has('recent')) {
                            newSet.delete('recent');
                          } else {
                            newSet.add('recent');
                          }
                          return newSet;
                        })}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md flex items-center justify-center">
                            <Images className="w-3 h-3 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-medium">Recent Creations</h3>
                            <p className="text-gray-400 text-xs">{filteredGallery.length} items</p>
                          </div>
                        </div>
                        <ChevronDown 
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                            expandedPrompts.has('recent') ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      
                      <div className={`overflow-hidden transition-all duration-300 ${
                        expandedPrompts.has('recent') ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="pt-3">
                          <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                            <div className="grid grid-cols-4 gap-3">
                              {filteredGallery.map((item: any, index: number) => {
                              const itemKey = `recent-${item.id}-${item.timestamp}-${index}`;
                    
                    return (
                        <div 
                          key={itemKey} 
                                  className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🖥️ Desktop recent gallery item clicked for full-screen view:', item);
                            const imageUrl = item.videoUrl || item.imageUrl;
                            setFullScreenImage(imageUrl);
                            // Find the index in galleryImagesWithUrls
                            const index = galleryImagesWithUrls.findIndex(galleryItem => 
                              galleryItem.imageUrl === imageUrl || galleryItem.videoUrl === imageUrl
                            );
                            setFullScreenImageIndex(index >= 0 ? index : 0);
                          }}
                        >
                          <div className="aspect-square">
                            {item.fileType === 'video' ? (
                              <video
                                src={item.videoUrl}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onMouseEnter={(e) => {
                                  console.log('🎬 Mobile gallery video hover start:', item.videoUrl);
                                  e.currentTarget.play().catch(err => {
                                    console.warn('⚠️ Mobile gallery video autoplay failed:', err);
                                  });
                                }}
                                onMouseLeave={(e) => {
                                  console.log('🎬 Mobile gallery video hover end:', item.videoUrl);
                                  e.currentTarget.pause();
                                  e.currentTarget.currentTime = 0;
                                }}
                              />
                            ) : (
                              <img
                                src={getProxiedImageUrl(item.imageUrl)}
                                alt="Gallery item"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/api/placeholder/300/300';
                                }}
                              />
                            )}
                          </div>


                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditImage(item.imageUrl || item.videoUrl, item.originalPrompt);
                                }}
                                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVaryImage(item.imageUrl || item.videoUrl, item.originalPrompt);
                                }}
                                        className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                              >
                                Vary
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.fileType === 'video') {
                                    handleDownloadVideo(item.videoUrl, item.originalPrompt || 'Downloaded video');
                                  } else {
                                    handleDownloadVariation({
                                      id: item.id,
                                      description: item.originalPrompt || 'Downloaded image',
                                      angle: 'Gallery item',
                                      pose: 'Downloaded',
                                      imageUrl: item.imageUrl,
                                      fileType: 'image'
                                    });
                                  }
                                }}
                                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                              >
                                Download
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('🗑️ Gallery modal delete clicked for item:', item.id, item.timestamp);
                                  
                                  // Confirm deletion
                                  if (!confirm('Are you sure you want to delete this item from your gallery? This action cannot be undone.')) {
                                    console.log('🗑️ User cancelled deletion');
                                    return;
                                  }
                                  
                                  try {
                                    console.log('🗑️ Gallery modal delete - item data:', { id: item.id, timestamp: item.timestamp, fullItem: item });
                                    removeFromGallery(item.id, item.timestamp);
                                    console.log('✅ Gallery modal removeFromGallery called successfully');
                                    showNotification('🗑️ Item removed from gallery', 'success');
                                  } catch (error) {
                                    console.error('❌ Error in gallery modal delete button:', error);
                                    showNotification('❌ Failed to remove item from gallery', 'error');
                                  }
                                }}
                                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                      </div>
                    );
                  })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Video Collection Accordion */}
                    <div>
                      <button
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-800/30 rounded-lg transition-colors"
                        onClick={() => setExpandedPrompts(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has('videos')) {
                            newSet.delete('videos');
                          } else {
                            newSet.add('videos');
                          }
                          return newSet;
                        })}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-md flex items-center justify-center">
                            <Images className="w-3 h-3 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-medium">Video Collection</h3>
                            <p className="text-gray-400 text-xs">{filteredGallery.filter(item => item.fileType === 'video').length} videos</p>
                          </div>
                        </div>
                        <ChevronDown 
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                            expandedPrompts.has('videos') ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      
                      <div className={`overflow-hidden transition-all duration-300 ${
                        expandedPrompts.has('videos') ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="pt-3">
                          <div className="grid grid-cols-5 gap-3">
                            {filteredGallery.filter(item => item.fileType === 'video').map((item: any, index: number) => {
                              const itemKey = `video-${item.id}-${item.timestamp}-${index}`;
                              
                              return (
                                <div 
                                  key={itemKey} 
                                  className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105"
                                  onClick={() => setFullScreenImage(item.videoUrl)}
                                >
                                  <div className="aspect-square">
                                    <video
                                      src={item.videoUrl}
                                      className="w-full h-full object-cover"
                                      muted
                                      loop
                                      playsInline
                                      preload="metadata"
                                      onMouseEnter={(e) => {
                                        console.log('🎬 Video hover start:', item.videoUrl);
                                        e.currentTarget.play().catch(err => {
                                          console.warn('⚠️ Video autoplay failed:', err);
                                        });
                                      }}
                                      onMouseLeave={(e) => {
                                        console.log('🎬 Video hover end:', item.videoUrl);
                                        e.currentTarget.pause();
                                        e.currentTarget.currentTime = 0;
                                      }}
                                    />
                                  </div>

                                  {/* Delete Icon - Top Left */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('🗑️ Video collection delete clicked for item:', item.id, item.timestamp);
                                      try {
                                        removeFromGallery(item.id, item.timestamp);
                                        console.log('✅ Video collection removeFromGallery called successfully');
                                      } catch (error) {
                                        console.error('❌ Error in video collection delete button:', error);
                                        showNotification('❌ Failed to remove video from gallery', 'error');
                                      }
                                    }}
                                    className="absolute top-2 left-2 w-6 h-6 bg-red-600/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-20"
                                    title="Delete from gallery"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>

                                  {/* Download Icon - Bottom Left */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadVideo(item.videoUrl, item.originalPrompt || 'Downloaded video');
                                    }}
                                    className="absolute bottom-2 left-2 w-6 h-6 bg-green-600/80 hover:bg-green-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-20"
                                    title="Download file"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>

                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditImage(item.videoUrl, item.originalPrompt);
                                        }}
                                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleVaryImage(item.videoUrl, item.originalPrompt);
                                        }}
                                        className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                                      >
                                        Vary
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Image Collection Accordion */}
                    <div>
                      <button
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-800/30 rounded-lg transition-colors"
                        onClick={() => setExpandedPrompts(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has('images')) {
                            newSet.delete('images');
                          } else {
                            newSet.add('images');
                          }
                          return newSet;
                        })}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-md flex items-center justify-center">
                            <Images className="w-3 h-3 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-medium">Image Collection</h3>
                            <p className="text-gray-400 text-xs">{filteredGallery.filter(item => item.fileType === 'image').length} images</p>
                          </div>
                        </div>
                        <ChevronDown 
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                            expandedPrompts.has('images') ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      
                      <div className={`overflow-hidden transition-all duration-300 ${
                        expandedPrompts.has('images') ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="pt-3">
                          <div className="grid grid-cols-6 gap-3">
                            {filteredGallery.filter(item => item.fileType === 'image').map((item: any, index: number) => {
                              const itemKey = `image-${item.id}-${item.timestamp}-${index}`;
                              
                              return (
                                <div 
                                  key={itemKey} 
                                  className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105"
                                  onClick={() => setFullScreenImage(item.imageUrl)}
                                >
                                  <div className="aspect-square">
                                    <img
                                      src={getProxiedImageUrl(item.imageUrl)}
                                      alt="Gallery item"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.src = '/api/placeholder/300/300';
                                      }}
                                    />
                                  </div>

                                  {/* Delete Icon - Top Left */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('🗑️ Image collection delete clicked for item:', item.id, item.timestamp);
                                      try {
                                        removeFromGallery(item.id, item.timestamp);
                                        console.log('✅ Image collection removeFromGallery called successfully');
                                      } catch (error) {
                                        console.error('❌ Error in image collection delete button:', error);
                                        showNotification('❌ Failed to remove image from gallery', 'error');
                                      }
                                    }}
                                    className="absolute top-2 left-2 w-6 h-6 bg-red-600/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-20"
                                    title="Delete from gallery"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>

                                  {/* Download Icon - Bottom Left */}
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const url = item.imageUrl;
                                        const response = await fetch(url);
                                        const blob = await response.blob();
                                        const downloadUrl = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = downloadUrl;
                                        link.download = `vary-ai-${item.id}.jpg`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(downloadUrl);
                                      } catch (error) {
                                        console.error('Download failed:', error);
                                        // Fallback to direct link
                                        const link = document.createElement('a');
                                        link.href = item.imageUrl;
                                        link.download = `vary-ai-${item.id}.jpg`;
                                        link.target = '_blank';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }
                                    }}
                                    className="absolute bottom-2 left-2 w-6 h-6 bg-green-600/80 hover:bg-green-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-20"
                                    title="Download file"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>

                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditImage(item.imageUrl, item.originalPrompt);
                                        }}
                                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleVaryImage(item.imageUrl, item.originalPrompt);
                                        }}
                                        className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                                      >
                                        Vary
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
              )}
              </div>
            </div>
          </div>
        )}
      </div>

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

            {/* Action buttons row - Positioned higher to avoid mobile footer */}
            <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 flex gap-3 z-10">
              {/* Edit button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentItem = galleryImagesWithUrls[fullScreenImageIndex];
                  if (currentItem && (currentItem.imageUrl || currentItem.videoUrl)) {
                    handleEditImage(currentItem.imageUrl || currentItem.videoUrl!, currentItem.originalPrompt);
                    closeFullScreen();
                  }
                }}
                className="w-12 h-12 bg-blue-600/80 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                title="Edit image"
              >
                <Edit className="w-6 h-6" />
              </button>

              {/* Vary button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentItem = galleryImagesWithUrls[fullScreenImageIndex];
                  if (currentItem && (currentItem.imageUrl || currentItem.videoUrl)) {
                    if (currentItem.fileType === 'video') {
                      handleVideoCardVariation(currentItem);
                    } else {
                      handleVaryImage(currentItem.imageUrl || currentItem.videoUrl!, currentItem.originalPrompt);
                    }
                    closeFullScreen();
                  }
                }}
                className="w-12 h-12 bg-purple-600/80 hover:bg-purple-600 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                title="Generate variations"
              >
                <Sparkles className="w-6 h-6" />
              </button>

              {/* Download button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentItem = galleryImagesWithUrls[fullScreenImageIndex];
                  if (currentItem?.fileType === 'video' && currentItem.videoUrl) {
                    handleDownloadVideo(currentItem.videoUrl!, currentItem.originalPrompt || 'Downloaded video');
                  } else {
                    handleDownloadVariation({
                      id: currentItem?.id || 'gallery-item',
                      description: currentItem?.originalPrompt || 'Downloaded image',
                      angle: 'Gallery item',
                      pose: 'Downloaded',
                      imageUrl: fullScreenImage || '',
                      fileType: 'image'
                    });
                  }
                }}
                className="w-12 h-12 bg-green-600/80 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                title="Download file"
              >
                <Download className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation arrows */}
            {galleryImagesWithUrls.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage(-1);
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage(1);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-900 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
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
                        {EXTENDED_PROMPTS.map((example) => (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-900 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Shot Types */}
                      <div className="space-y-4">
                      <div>
                        <h4 className="text-md font-medium text-gray-300 mb-3">Basic Angles</h4>
                        <div className="flex flex-wrap gap-2">
                          {BASIC_PROMPTS.map((example) => (
                            <button
                              key={example}
                              onClick={() => handlePresetClick(example)}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                            >
                              {example}
                            </button>
                          ))}
                    </div>
                  </div>
                      <div>
                          <h4 className="text-md font-medium text-gray-300 mb-3">Extended Shot Types ({EXTENDED_PROMPTS.length} total)</h4>
                          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                            {EXTENDED_PROMPTS.map((example) => (
                            <button
                              key={example}
                              onClick={() => handlePresetClick(example)}
                              className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
                            >
                              {example}
                            </button>
                          ))}
                      </div>
                    </div>
                      </div>
                      
                      {/* Right Column - Camera Motion */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-md font-medium text-gray-300 mb-3">🎬 Camera Motion Presets ({CAMERA_MOTION_PROMPTS.length} total)</h4>
                          <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto">
                            {CAMERA_MOTION_PROMPTS.map((example) => (
                            <button
                              key={example}
                              onClick={() => {
                                setPrompt(example);
                                setShowPresetModal(false);
                                setActivePresetTab(null);
                              }}
                                className="px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded-full hover:bg-orange-200 transition-colors"
                            >
                              {example}
                            </button>
                          ))}
                      </div>
                    </div>
                      </div>
                    </div>
                  </div>
                )}

                {activePresetTab === 'background' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">🎬 Movie Background Presets</h3>
                    
                    {/* Background Category Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {Object.entries(BACKGROUND_PROMPTS_BY_CATEGORY).map(([key, category]) => (
                        <button
                          key={key}
                          onClick={() => setActiveBackgroundTab(key as any)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeBackgroundTab === key
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {category.icon} {category.name}
                        </button>
                      ))}
                    </div>

                    {/* Background Prompts Dropdown */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-md font-medium text-gray-300 mb-3">
                          {BACKGROUND_PROMPTS_BY_CATEGORY[activeBackgroundTab]?.name} ({BACKGROUND_PROMPTS_BY_CATEGORY[activeBackgroundTab]?.prompts.length} options)
                        </h4>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {BACKGROUND_PROMPTS_BY_CATEGORY[activeBackgroundTab]?.prompts.map((prompt) => (
                            <button
                              key={prompt}
                              onClick={() => {
                                handlePresetClick(prompt);
                                setShowPresetModal(false);
                                setActivePresetTab(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors border border-gray-600 hover:border-purple-500"
                            >
                              {prompt}
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
                              onClick={() => handlePresetClick(style.prompt)}
                              className="w-full text-left px-3 py-2 text-sm bg-pink-100 text-pink-800 rounded hover:bg-pink-200 transition-colors"
                              title={style.description}
                            >
                              <div className="font-medium">{style.name}</div>
                              <div className="text-xs text-pink-600 mt-1">{style.description}</div>
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
        id="file-input-mobile"
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Aspect Ratio Modal */}
      <AspectRatioModal
        isOpen={showAspectRatioModal}
        onClose={() => setShowAspectRatioModal(false)}
        selectedModel={generationMode || ''}
        onSaveSettings={handleSaveGenerationSettings}
        currentSettings={generationSettings}
      />

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={showProcessingModal}
        progress={processing.progress}
        currentStep={processing.currentStep}
        estimatedTime={estimatedTime || undefined}
        timeRemaining={timeRemaining || undefined}
        onCancel={isCancellable ? () => {
          if (abortController) {
            abortController.abort();
            stopProcessing();
          }
        } : undefined}
        cancellable={isCancellable}
        type={processingModalType}
      />

      {/* Credit Purchase Modal */}
      <CreditPurchaseModal
        isOpen={showCreditPurchaseModal}
        onClose={() => setShowCreditPurchaseModal(false)}
        onSuccess={() => {
          setShowCreditPurchaseModal(false);
          // Trigger credit refresh after successful purchase
          window.dispatchEvent(new CustomEvent('creditUpdated', { 
            detail: { 
              type: 'credit_purchase',
              timestamp: new Date().toISOString()
            } 
          }));
        }}
      />

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-4">
        <div className="flex bg-gray-800 rounded-xl overflow-hidden">
          <button 
            onClick={() => {
              if (pathname === '/generate') {
                // If already on generate page, close gallery to show generation interface
                setShowGallery(false);
              } else {
                // Navigate to generate page
                router.push('/generate');
              }
            }}
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
    </div>
  );
}
