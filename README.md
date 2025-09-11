# vARI Ai - Advanced Character Variation Generator

A cutting-edge AI-powered Next.js application that generates stunning character variations from multiple angles using Google Gemini 2.0 Flash and Fal AI. Upload character images and get professional-quality variations while maintaining perfect character consistency across all angles.

## 🖼️ Application Preview

### Main Interface
![vARI Ai Main Interface](main-interface-screenshot.png)

*vARI Ai main interface - featuring the community energy meter, analytics dashboard, and modern dark UI with transparent elements*

### Character Variation System
![vARI Ai Application Screenshot](Screenshot%20(2190).webp)

*vARI Ai in action - showcasing the modern dark UI, multi-image upload system, and interactive gallery with full-screen navigation*

### Additional Screenshots

![vARI Ai Screenshot 2](Screenshot%20(2192).png)

![vARI Ai Screenshot 3](Screenshot%20(2193).png)

![vARI Ai Screenshot 4](Screenshot%20(2194).png)

![vARI Ai Screenshot 5](Screenshot%20(2195).png)

*Comprehensive view of vARI Ai's features: multi-image processing, character variations, gallery management, and full-screen navigation capabilities*

## ✨ Features

### 🏠 **Main Interface & Dashboard**
- **Community Energy Meter**: Real-time FAL AI balance tracking with donation links
- **Analytics Dashboard**: User statistics, generation counts, and performance metrics
- **Transparent UI**: Modern glass-morphism design with blur effects
- **Navigation**: Seamless access to generate, community, and profile features

### 🌟 **Community Features**
- **Tha Communita**: Interactive message board with posts, comments, and likes
- **Image Sharing**: Drag & drop image uploads with full-screen viewing
- **User Profiles**: Display names, avatars, and post attribution
- **Real-time Updates**: Live post feeds and community engagement

### 🎨 **Multi-Image Upload System**
- **Multiple file support**: Upload face shots, body shots, and reference images simultaneously
- **Smart drag & drop**: Intuitive interface with visual feedback
- **Flexible addition**: Add more images anytime during your session
- **Grid preview**: See all uploaded images in an organized layout

### 🧠 **Advanced AI Processing**
- **Dual AI workflow**: Google Gemini 2.0 Flash for analysis + Fal AI nano-banana for image generation
- **Intelligent analysis**: Deep character understanding from multiple reference images
- **Enhanced prompts**: Context-aware processing for better consistency
- **Content safety**: Automatic content policy handling and sanitization

### 🖼️ **Professional Image Generation**
- **High-quality outputs**: Generated images in JPEG format
- **Character consistency**: Maintains exact features, clothing, and style across variations
- **4 unique angles**: Professional camera angles and perspectives
- **Fallback handling**: Graceful degradation when image generation is restricted

### 🎯 **Interactive Gallery System**
- **Persistent storage**: Local browser storage for all generated variations
- **Full-screen viewing**: Click any image to view at 90-95% screen size
- **Arrow navigation**: Browse through gallery with left/right arrows or keyboard
- **Image details**: View angle, pose, and description information
- **Batch management**: Clear gallery or remove individual items

### 🔄 **Iterative Variation System**
- **"Vary" functionality**: Create new variations from existing generated images
- **Deep re-analysis**: Gemini analyzes existing images for perfect consistency
- **Infinite creativity**: Build chains of variations for endless possibilities
- **Smart prompting**: Reuses context from original generation

### 🎨 **Modern Dark UI**
- **Sleek design**: Dark gray theme with white accents
- **Responsive layout**: Perfect on desktop, tablet, and mobile
- **Intuitive controls**: Clean button layout and visual hierarchy
- **Loading states**: Beautiful progress indicators and status updates

### 📋 **Comprehensive Prompt Library**
- **Quick examples**: Basic prompts for common angles
- **Extended library**: Professional camera angles and shot types
- **Expandable interface**: "More Shot Types" reveal comprehensive options
- **Color-coded categories**: Organized by shot type (close-ups, angles, distances, etc.)

## Quick Start

### 1. Clone and Install
```bash
cd VaryAi
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```bash
# Google Gemini API key from: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your_google_api_key_here

# Fal AI API key from: https://fal.ai/dashboard
FAL_KEY=your_fal_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚀 How to Use

### Basic Workflow
1. **Upload Character Images**: 
   - Drag & drop multiple images (face shots, body shots, references)
   - Or click to browse and select multiple files
   - Add more images anytime using the "Add More" button

2. **Enter Variation Prompt**: 
   - Use quick examples or type custom prompts
   - Click "More Shot Types" for professional camera angles
   - Examples: "side profile", "3/4 angle view", "action pose"

3. **Generate Variations**: 
   - Click the white "Process" button
   - Watch progress indicators during AI processing
   - Gemini analyzes your images → Fal AI generates variations

4. **View & Interact**:
   - See 4 unique variations in a clean grid layout
   - Click any image for full-screen viewing with navigation
   - Use arrow keys or buttons to browse through images

5. **Gallery Management**:
   - All generations automatically saved to persistent gallery
   - Click "Vary" on any image to create new variations
   - Download images or descriptions
   - Clear gallery or remove individual items

### Advanced Features
- **Iterative Creation**: Use "Vary" button on generated images for infinite possibilities
- **Full-Screen Gallery**: Navigate through all your generations with arrow keys
- **Character Consistency**: AI maintains exact features across all variations
- **Content Safety**: Automatic handling of content policy restrictions

## 📝 Example Prompts

### Basic Angles
- "Show this character from the side profile"
- "Display this character from behind" 
- "Show this character at a 3/4 angle"
- "Generate this character in an action pose"

### Professional Shot Types
- "Close-up shot of this character"
- "Low angle shot looking up at this character"
- "High angle shot looking down at this character"
- "Dutch angle (tilted) shot of this character"
- "Wide shot showing full body of this character"
- "Cinematic wide angle of this character"

### Dynamic Perspectives
- "Three-quarter back view of this character"
- "Profile silhouette of this character"
- "Character from a diagonal perspective"
- "Heroic upward angle of this character"

## 🛠️ Technologies Used

- **Next.js 14** - React framework with App Router architecture
- **TypeScript** - Type safety and enhanced development experience
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Google Gemini 2.0 Flash** - Advanced AI for character image analysis
- **Fal AI nano-banana/edit** - State-of-the-art image generation model
- **Lucide React** - Beautiful, customizable icon library
- **Local Storage API** - Persistent gallery storage in browser

## 🤖 AI Integration

### Google Gemini 2.0 Flash
- **Multi-image analysis**: Processes multiple reference images simultaneously
- **Deep character understanding**: Analyzes facial features, clothing, style, and proportions
- **Intelligent prompting**: Different strategies for multi-upload vs. "Vary" requests
- **Content safety**: Built-in content policy compliance and sanitization

### Fal AI nano-banana/edit
- **Professional image generation**: High-quality character variations
- **Style consistency**: Maintains exact character design across all angles
- **JPEG output**: Optimized format for web display and download
- **Error resilience**: Graceful handling of content policy restrictions

### Dual-AI Workflow
1. **Gemini Analysis**: Deep character understanding and variation planning
2. **Fal Generation**: Professional image creation based on Gemini's analysis
3. **Smart fallbacks**: Text descriptions when image generation is restricted
4. **Progress tracking**: Real-time status updates throughout the process

## Project Structure

```
VaryAi/
├── src/
│   ├── app/
│   │   ├── api/vary-character/route.ts  # Gemini API integration
│   │   ├── page.tsx                     # Main application page
│   │   ├── layout.tsx                   # App layout
│   │   └── globals.css                  # Global styles
│   └── types/
│       └── gemini.ts                    # TypeScript interfaces
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 🔧 Environment Variables

| Variable | Description | Required | Get From |
|----------|-------------|----------|----------|
| `GOOGLE_API_KEY` | Google Gemini 2.0 Flash API key | Yes | [AI Studio](https://aistudio.google.com/app/apikey) |
| `FAL_KEY` | Fal AI API key for image generation | Yes | [Fal AI Dashboard](https://fal.ai/dashboard) |

### API Key Setup
1. **Google Gemini**: Create account at [AI Studio](https://aistudio.google.com/app/apikey)
2. **Fal AI**: Sign up at [Fal AI](https://fal.ai/dashboard) and get your API key
3. **Environment**: Add both keys to your `.env.local` file

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## 🔧 Troubleshooting

### Common Issues

1. **API Key Errors**: 
   - Ensure both `GOOGLE_API_KEY` and `FAL_KEY` are in `.env.local`
   - Restart development server after adding keys
   - Check console logs for specific API error messages

2. **Image Upload Issues**: 
   - Images must be under 10MB each
   - Supported formats: JPG, PNG
   - Try single image upload first to test functionality

3. **Content Policy Violations**:
   - Some images may be flagged by AI content filters
   - App will show warning and provide text descriptions
   - Try uploading different reference images

4. **Gallery/Navigation Issues**:
   - Clear browser localStorage if gallery acts strangely
   - Check browser console for any JavaScript errors
   - Refresh page to reset application state

### Performance Tips

- **Multiple images**: 2-4 reference images work best for consistency
- **Image size**: Compress large images for faster processing  
- **Network**: Stable internet connection recommended for AI processing

### Getting Help

- **Next.js**: [Official Documentation](https://nextjs.org/docs)
- **Google Gemini**: [AI Studio Documentation](https://aistudio.google.com/)
- **Fal AI**: [Platform Documentation](https://fal.ai/docs)
- **Tailwind CSS**: [Styling Documentation](https://tailwindcss.com/docs)

## 🎯 Key Features Summary

✅ **Multi-image upload** with smart file handling  
✅ **Dual AI processing** (Gemini + Fal AI)  
✅ **Persistent gallery** with full-screen navigation  
✅ **Iterative variation** system with "Vary" buttons  
✅ **Content safety** handling and sanitization  
✅ **Dark theme** with modern, responsive UI  
✅ **Professional prompts** library with categorization  
✅ **Real-time progress** tracking and status updates  

---

🚀 **Built with cutting-edge AI technology**  
**Next.js 14** • **Google Gemini 2.0 Flash** • **Fal AI nano-banana** • **TypeScript** • **Tailwind CSS**
