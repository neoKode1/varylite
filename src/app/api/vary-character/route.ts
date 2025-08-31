import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CharacterVariationRequest, CharacterVariationResponse, CharacterVariation } from '@/types/gemini';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body: CharacterVariationRequest = await request.json();
    const { image, prompt } = body;

    if (!image || !prompt) {
      return NextResponse.json({
        success: false,
        error: 'Both image and prompt are required'
      } as CharacterVariationResponse, { status: 400 });
    }

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Google API key not configured. Please add GOOGLE_API_KEY to your environment variables.'
      } as CharacterVariationResponse, { status: 500 });
    }

    // Get the generative model - using Gemini 2.0 Flash for better performance
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Create the prompt for character variation
    const enhancedPrompt = `
Analyze this character image and generate 4 distinct variations based on the user's request: "${prompt}"

You are a character design expert. Create 4 different views of this EXACT SAME character, maintaining perfect character consistency while showing different angles or perspectives.

CRITICAL REQUIREMENTS for character consistency:
- Keep IDENTICAL facial features, expression, and proportions
- Maintain the EXACT SAME clothing, accessories, and outfit details
- Preserve the SAME hair style, color, and length
- Use the IDENTICAL color palette throughout
- Keep the SAME body type, height, and build
- Maintain any distinctive markings, scars, or unique features

For each of the 4 variations, provide:
1. A specific viewing angle (e.g., "Side Profile View", "Rear View", "3/4 Angle View", "Low Angle View")
2. A detailed pose description (e.g., "Standing straight", "Action stance", "Relaxed posture")
3. A comprehensive visual description that preserves ALL character details while showing the new perspective

The 4 variations should cover different angles while keeping the character absolutely identical in design:
- Front/side profile views
- Back/rear perspective  
- 3/4 diagonal angles
- Action poses or dynamic views (if requested)

Format each variation clearly with the angle, pose, and detailed character description that maintains perfect consistency.
`;

    // Convert base64 to the format expected by Gemini
    const imagePart = {
      inlineData: {
        data: image,
        mimeType: 'image/jpeg' // Assume JPEG, could be enhanced to detect actual type
      }
    };

    // Generate content with both image and text
    const result = await model.generateContent([enhancedPrompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      return NextResponse.json({
        success: false,
        error: 'No response received from Gemini AI'
      } as CharacterVariationResponse, { status: 500 });
    }

    // Parse the response to extract variations
    const variations = parseGeminiResponse(text);

    if (variations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse character variations from AI response'
      } as CharacterVariationResponse, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      variations
    } as CharacterVariationResponse);

  } catch (error) {
    console.error('Error in vary-character API:', error);
    
    let errorMessage = 'An unexpected error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage
    } as CharacterVariationResponse, { status: 500 });
  }
}

function parseGeminiResponse(text: string): CharacterVariation[] {
  const variations: CharacterVariation[] = [];
  
  try {
    // Split the response into sections (looking for numbered variations or clear separators)
    const sections = text.split(/(?:\d+\.|Variation \d+|###|\n\n\n)/g)
      .filter(section => section.trim().length > 50); // Filter out short/empty sections

    let variationCount = 0;
    const maxVariations = 4;

    for (const section of sections) {
      if (variationCount >= maxVariations) break;
      
      const trimmedSection = section.trim();
      if (trimmedSection.length < 50) continue; // Skip very short sections

      // Extract angle/view information (look for common angle terms)
      const angleKeywords = ['side', 'front', 'back', 'profile', 'angle', 'view', 'perspective', 'pose', 'stance'];
      const lines = trimmedSection.split('\n').filter(line => line.trim());
      
      let angle = 'Character View';
      let pose = 'Standard Pose';
      
      // Try to find angle and pose in the first few lines
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i].toLowerCase();
        if (angleKeywords.some(keyword => line.includes(keyword))) {
          if (line.includes('side') || line.includes('profile')) {
            angle = 'Side Profile View';
          } else if (line.includes('back')) {
            angle = 'Back View';
          } else if (line.includes('front')) {
            angle = 'Front View';
          } else if (line.includes('3/4') || line.includes('quarter')) {
            angle = '3/4 Angle View';
          } else if (line.includes('action') || line.includes('dynamic')) {
            angle = 'Action View';
            pose = 'Dynamic Action Pose';
          } else {
            angle = lines[i].trim().length > 0 ? lines[i].trim() : angle;
          }
          break;
        }
      }

      // If we couldn't determine a specific angle, assign based on variation number
      if (angle === 'Character View') {
        const defaultAngles = ['Front View', 'Side Profile', '3/4 Angle View', 'Back View'];
        angle = defaultAngles[variationCount] || `Variation ${variationCount + 1}`;
      }

      variations.push({
        id: `variation-${variationCount + 1}`,
        description: trimmedSection,
        angle: angle,
        pose: pose
      });

      variationCount++;
    }

    // If we didn't get enough variations, try a different parsing approach
    if (variations.length < 2) {
      // Fallback: split by paragraphs and take the longest ones
      const paragraphs = text.split('\n\n')
        .filter(p => p.trim().length > 100)
        .slice(0, 4);

      variations.length = 0; // Clear previous attempts

      paragraphs.forEach((paragraph, index) => {
        const defaultAngles = ['Front View', 'Side Profile', '3/4 Angle View', 'Back View'];
        const defaultPoses = ['Standard Stance', 'Profile Pose', 'Angled Stance', 'Rear View Pose'];
        
        variations.push({
          id: `variation-${index + 1}`,
          description: paragraph.trim(),
          angle: defaultAngles[index] || `View ${index + 1}`,
          pose: defaultPoses[index] || `Pose ${index + 1}`
        });
      });
    }

    // Ensure we have at least 4 variations, even if we need to create fallbacks
    while (variations.length < 4) {
      const index = variations.length;
      const fallbackAngles = ['Front View', 'Side Profile', '3/4 Angle View', 'Back View'];
      const fallbackPoses = ['Standard Stance', 'Profile Pose', 'Angled Stance', 'Rear View Pose'];
      
      variations.push({
        id: `variation-${index + 1}`,
        description: `Character variation ${index + 1}: Show the same character from a ${fallbackAngles[index].toLowerCase()} with ${fallbackPoses[index].toLowerCase()}. Maintain all original design elements, clothing, and features while changing the viewing angle and pose.`,
        angle: fallbackAngles[index],
        pose: fallbackPoses[index]
      });
    }

    return variations.slice(0, 4); // Ensure exactly 4 variations

  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    
    // Return fallback variations if parsing completely fails
    return [
      {
        id: 'variation-1',
        description: 'Front view of the character maintaining original design and features.',
        angle: 'Front View',
        pose: 'Standard Stance'
      },
      {
        id: 'variation-2',
        description: 'Side profile view of the character with same clothing and style.',
        angle: 'Side Profile',
        pose: 'Profile Pose'
      },
      {
        id: 'variation-3',
        description: '3/4 angle view showing character from diagonal perspective.',
        angle: '3/4 Angle View',
        pose: 'Angled Stance'
      },
      {
        id: 'variation-4',
        description: 'Back view of the character showing rear perspective.',
        angle: 'Back View',
        pose: 'Rear View Pose'
      }
    ];
  }
}