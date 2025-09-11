'use client'

import { useState } from 'react'
import { X, HelpCircle, Camera, Sparkles, Image, Video, Upload, Download } from 'lucide-react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[85vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">vARY Ai Help Guide</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content - Horizontal Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Getting Started */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Getting Started
                </h3>
                <p className="text-gray-300 text-sm mb-3">
                  vARY Ai helps you create character variations, change backgrounds, and generate videos.
                </p>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Upload images or videos to get started</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Use the prompt box to describe what you want</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Choose from different AI models for different effects</span>
                  </li>
                </ul>
              </div>

              {/* Upload Types */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-green-400" />
                  Upload Types
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Image className="w-4 h-4 text-blue-400 mt-1" />
                    <div>
                      <span className="text-white font-medium text-sm">Images</span>
                      <p className="text-gray-300 text-xs">
                        Character variations, background changes, style modifications.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Video className="w-4 h-4 text-purple-400 mt-1" />
                    <div>
                      <span className="text-white font-medium text-sm">Videos</span>
                      <p className="text-gray-300 text-xs">
                        Scene changes, background modifications, video transformations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pro Tips */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Pro Tips
                </h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span>Be specific in your prompts for better results</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span>Use Quick Shot Presets for common variations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span>Try different models to see which works best</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span>Save favorites to your gallery for easy access</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* AI Models */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-orange-400" />
                  AI Models
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🍌</span>
                    <div>
                      <span className="text-white font-medium text-sm">Nano Banana</span>
                      <p className="text-gray-300 text-xs">
                        Best for character variations and image-to-image transformations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎬</span>
                    <div>
                      <span className="text-white font-medium text-sm">Minimax 2.0</span>
                      <p className="text-gray-300 text-xs">
                        Excellent for video generation and complex scene transformations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <span className="text-white font-medium text-sm">Veo3 Fast</span>
                      <p className="text-gray-300 text-xs">
                        Fast video generation with good quality for quick iterations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-red-400" />
                  Need More Help?
                </h3>
                <p className="text-gray-300 text-sm mb-3">
                  Join our community for tips, examples, and support from other users.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => window.open('/community', '_blank')}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Visit Community
                  </button>
                  <button
                    onClick={() => window.open('https://ko-fi.com/vari-ai', '_blank')}
                    className="px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Support vARY Ai
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
