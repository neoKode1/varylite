'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Array of all available videos for canvas text effect
  const videos = [
    '/47debd1b-0cb8-42c2-aeed-f6390e223238.mp4',
    '/561a19e8-94f1-482a-81b5-2c3a8181afb7.mp4',
    '/f63ea944-d2e1-479d-98a0-590a0b18ad3f.mp4',
    '/2025-08-28T20-27-35_generation.mp4',
    '/adarkorchestra_28188_Inside_a_lived-in_spaceship_cockpit_a_no_2f629715-cb74-4eff-b2ee-62bc41318cd7_1.mp4'
  ];

  // Cycle through videos every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [videos.length]);

  // Canvas-based video text effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match CSS
    canvas.width = 1000;
    canvas.height = 400;

    let animationId: number;

    const drawFrame = () => {
      // Always draw, even if video isn't ready
      // Clear canvas with black background
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw video frame if ready
      if (video.readyState >= 2 && !video.paused) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        console.log('Drawing video frame, canvas size:', canvas.width, 'x', canvas.height);
      } else {
        console.log('Video not ready or paused. Ready state:', video.readyState, 'Paused:', video.paused);
      }
      
      // Apply text mask using destination-in
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = 'white';
      ctx.font = 'bold 150px Arial Black'; /* Increased to fill the larger canvas */
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('IMAGINE', canvas.width / 2, canvas.height / 2);
      
      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
      
      // Continue animation loop
      animationId = requestAnimationFrame(drawFrame);
    };

    const handleVideoLoad = () => {
      // Ensure video plays
      video.play().catch(console.error);
      console.log('Video loaded, playing:', !video.paused);
      drawFrame();
    };

    const handleVideoPlay = () => {
      drawFrame();
    };

    // Add event listeners
    video.addEventListener('loadeddata', handleVideoLoad);
    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('timeupdate', drawFrame);
    
    // Start drawing immediately
    drawFrame();

    return () => {
      cancelAnimationFrame(animationId);
      video.removeEventListener('loadeddata', handleVideoLoad);
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('timeupdate', drawFrame);
    };
  }, [currentVideoIndex]);

  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden w-full">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <source src="/47debd1b-0cb8-42c2-aeed-f6390e223238.mp4" type="video/mp4" />
      </video>


      {/* Black Background Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-70 z-10"></div>

      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center px-4 sm:px-8">
        <div className="w-full max-w-5xl mx-auto"> {/* Increased max-width for canvas */}
          <div className="text-center bg-black bg-opacity-87 p-6 md:p-12 rounded-lg">
            
            {/* Tighter container for canvas + text group */}
            <div className="imagine-canvas-container"> {/* Custom class for canvas positioning */}
              
              {/* Canvas container with responsive wrapper */}
              <div className="canvas-wrapper" style={{ marginBottom: '-140px' }}>
                <div className="canvas-text-container">
                  <video
                    ref={videoRef}
                    key={`imagine-${currentVideoIndex}`}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="hidden-video"
                  >
                    <source src={videos[currentVideoIndex]} type="video/mp4" />
                  </video>
                  <canvas
                    ref={canvasRef}
                    className="video-text-canvas"
                  />
                </div>
              </div>
              
              {/* YOUR WORLD text - removed mb-0, using space-y instead */}
              <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black text-white leading-tight bold-block-text">
                <span className="block">YOUR WORLD</span>
              </h1>
            </div>
            <p className="text-lg md:text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
              The AI app made for creation by creators.
            </p>
            
            <p className="text-gray-300 mb-6">Ready to get started?</p>
            
            {/* <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
            No one has these presets... because no one made them.
            </p> */}
            
            <div className="flex flex-col gap-4 justify-center items-center">
              {/* Free Generations Button - Primary CTA */}
              <button
                onClick={() => router.push('/generate')}
                className="flex items-center justify-center space-x-2 text-black bg-white border border-white px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors min-w-[200px] font-semibold text-lg"
              >
                <span>🎨 Get 3 Free Generations</span>
              </button>
              
              {/* Account Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={handleSignUp}
                  className="flex items-center justify-center space-x-2 text-white bg-white bg-opacity-10 border border-white border-opacity-30 px-6 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors min-w-[160px]"
                >
                  <span>Create Account</span>
                </button>
                
                <button
                  onClick={handleSignIn}
                  className="flex items-center justify-center space-x-2 text-white border border-white border-opacity-30 px-6 py-3 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors min-w-[160px]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>→ Sign In</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </div>
  );
}