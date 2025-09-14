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

              {/* Advanced Composition Examples */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Image className="w-5 h-5 text-green-400" />
                  Advanced Composition Examples
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-white font-medium text-sm">👗 Character + Clothing</span>
                    <p className="text-gray-300 text-xs mt-1">
                      &ldquo;Dress the woman from Image 1 with the blue floral dress from Image 2, professional fashion photography style&rdquo;
                    </p>
                  </div>
                  <div>
                    <span className="text-white font-medium text-sm">🏞️ Character + Scene</span>
                    <p className="text-gray-300 text-xs mt-1">
                      &ldquo;Place the character from Image 1 in the forest environment from Image 2, cinematic lighting&rdquo;
                    </p>
                  </div>
                  <div>
                    <span className="text-white font-medium text-sm">🎨 Style Transfer</span>
                    <p className="text-gray-300 text-xs mt-1">
                      &ldquo;Apply the artistic style from Image 1 to the subject in Image 2, maintaining character identity&rdquo;
                    </p>
                  </div>
                </div>
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

              {/* CURB Prompt Guidelines */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  CURB Prompt Guidelines
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-white font-medium text-sm">✅ DO - Clear & Specific</span>
                    <p className="text-gray-300 text-xs mt-1">
                      &ldquo;A woman wearing a blue floral dress walking in a forest scene, professional fashion photography style&rdquo;
                    </p>
                  </div>
                  <div>
                    <span className="text-white font-medium text-sm">❌ AVOID - Vague Lists</span>
                    <p className="text-gray-300 text-xs mt-1">
                      &ldquo;Woman, dress, forest, professional style&rdquo;
                    </p>
                  </div>
                  <div>
                    <span className="text-white font-medium text-sm">🎯 Use Natural Language</span>
                    <p className="text-gray-300 text-xs mt-1">
                      Subject + Action + Environment format works best
                    </p>
                  </div>
                </div>
              </div>

              {/* Model-Specific Tips */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-purple-400" />
                  Model-Specific Tips
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-white font-medium text-sm">🍌 Nano Banana</span>
                    <p className="text-gray-300 text-xs mt-1">
                      Best for character consistency. Use descriptive positioning: &ldquo;character on the left&rdquo;, &ldquo;behind the table&rdquo;
                    </p>
                  </div>
                  <div>
                    <span className="text-white font-medium text-sm">🎨 Seedream 4.0</span>
                    <p className="text-gray-300 text-xs mt-1">
                      Concise prompts work better than complex vocabulary. Specify application scenario clearly.
                    </p>
                  </div>
                  <div>
                    <span className="text-white font-medium text-sm">🎬 Video Models</span>
                    <p className="text-gray-300 text-xs mt-1">
                      Include motion descriptions: &ldquo;walking&rdquo;, &ldquo;dancing&rdquo;, &ldquo;flying&rdquo;. Specify camera angles for better results.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* AI Models */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-orange-400" />
                  AI Models & Best Use Cases
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🍌</span>
                    <div>
                      <span className="text-white font-medium text-sm">Nano Banana</span>
                      <p className="text-gray-300 text-xs">
                        Character variations, multi-character scenes, consistent identity preservation.
                      </p>
                      <p className="text-blue-300 text-xs mt-1">
                        💡 Use: &ldquo;Character A sitting on the left, Character B standing on the right&rdquo;
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎨</span>
                    <div>
                      <span className="text-white font-medium text-sm">Seedream 4.0</span>
                      <p className="text-gray-300 text-xs">
                        Reference-based generation, style transfer, product design.
                      </p>
                      <p className="text-blue-300 text-xs mt-1">
                        💡 Use: &ldquo;Based on the character in Image 1, create variations in different poses&rdquo;
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎬</span>
                    <div>
                      <span className="text-white font-medium text-sm">Video Models</span>
                      <p className="text-gray-300 text-xs">
                        Image-to-video, scene transformations, motion generation.
                      </p>
                      <p className="text-blue-300 text-xs mt-1">
                        💡 Use: &ldquo;Character walking through the scene with cinematic camera movement&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Avoiding Rejections */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-red-400" />
                  Avoiding Rejections
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-white font-medium text-sm">🚫 Common Mistakes</span>
                    <ul className="text-gray-300 text-xs mt-1 space-y-1">
                      <li>• Vague pronouns: &ldquo;put that one in pink clothes&rdquo;</li>
                      <li>• Conflicting terms: &ldquo;dark bright lighting&rdquo;</li>
                      <li>• Missing context: &ldquo;change the background&rdquo; (to what?)</li>
                      <li>• Overly complex vocabulary stacking</li>
                    </ul>
                  </div>
                  <div>
                    <span className="text-white font-medium text-sm">✅ Better Alternatives</span>
                    <ul className="text-gray-300 text-xs mt-1 space-y-1">
                      <li>• &ldquo;Dress the tallest character in pink clothes&rdquo;</li>
                      <li>• &ldquo;Soft natural lighting with warm tones&rdquo;</li>
                      <li>• &ldquo;Change background to a modern cityscape&rdquo;</li>
                      <li>• Use concise, precise descriptions</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-green-400" />
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
