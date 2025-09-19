# vARYLite

**Free AI Scene Generator - No registration required**

vARYLite is a browser-based AI scene generator that allows you to create amazing images and videos using state-of-the-art AI models. Everything is stored locally in your browser - no database, no registration, no restrictions.

## ✨ Features

- **6 Powerful AI Models**: Nano Banana, Seedance 4 Edit, Gemini Flash Edit, Mini Max 2.0, KlingAvatar, and Mini Max End Frame
- **Browser-Based Storage**: All your creations are saved locally in your browser
- **No Registration**: Start generating immediately without any signup
- **Keyboard Navigation**: Use arrow keys to navigate through your gallery
- **Fullscreen View**: Click any image for a fullscreen experience
- **Download Support**: Save your creations directly to your device
- **Modern UI**: Clean, intuitive interface with dark theme

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/varylite.git
cd varylite
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with your API keys:
```env
FAL_KEY=your_fal_ai_key
GOOGLE_API_KEY=your_google_api_key
MINIMAX_API_KEY=your_minimax_api_key
REPLICATE_API_TOKEN=your_replicate_token
RUNWAYML_API_SECRET=your_runway_api_secret
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎨 How to Use

1. **Upload Images**: Drag and drop or click to upload your source images
2. **Describe Your Scene**: Write a detailed prompt describing what you want to create
3. **Choose Model**: Select from 6 different AI models based on your needs
4. **Generate**: Click the generate button and wait for your creation
5. **Gallery**: Use the bottom-right gallery to navigate through your creations
6. **Fullscreen**: Click any image for fullscreen viewing with keyboard navigation

## 🤖 Available Models

| Model | Type | Best For | Cost |
|-------|------|----------|------|
| Nano Banana | Image Edit | Quick image edits | 3 credits |
| Seedance 4 Edit | Video | Video generation | 8 credits |
| Gemini Flash Edit | Image Edit | Character variations | 2 credits |
| Mini Max 2.0 | Video | High-quality videos | 10 credits |
| KlingAvatar | Video | Avatar creation | 15 credits |
| Mini Max End Frame | Video | End frame generation | 12 credits |

## ⌨️ Keyboard Shortcuts

- **Arrow Keys**: Navigate through gallery images (in fullscreen mode)
- **Escape**: Exit fullscreen mode
- **Enter/Space**: Activate buttons and inputs

## 💾 Browser Storage

vARYLite stores all your data locally in your browser using localStorage:
- Generated scenes and videos
- Generation history
- User preferences

**Note**: Data is stored locally and will be lost if you clear your browser data.

## 🛠️ Development

### Project Structure

```
src/
├── app/
│   ├── page.tsx          # Landing page
│   ├── generate/
│   │   └── page.tsx      # Main generator interface
│   └── api/              # API routes for AI models
├── components/           # Reusable components
└── lib/                  # Utility functions
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FAL_KEY` | Fal AI API key | Yes |
| `GOOGLE_API_KEY` | Google Gemini API key | Yes |
| `MINIMAX_API_KEY` | MiniMax API key | Yes |
| `REPLICATE_API_TOKEN` | Replicate API token | Yes |
| `RUNWAYML_API_SECRET` | Runway ML API secret | Yes |

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Powered by various AI providers including Fal AI, Google Gemini, MiniMax, and more

---

**vARYLite** - Free AI Scene Generator for everyone! 🎨✨