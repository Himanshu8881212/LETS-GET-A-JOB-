'use client'

import { useState } from 'react'
import { FileText, Mail, Download, Settings, ChevronRight, Sparkles, CheckCircle } from 'lucide-react'
import EnhancedResumeBuilder from '@/components/EnhancedResumeBuilder'
import ImprovedCoverLetterBuilder from '@/components/ImprovedCoverLetterBuilder'
import { ToastProvider } from '@/components/ui/Toast'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'resume' | 'cover'>('home')

  if (activeTab === 'resume') {
    return (
      <ToastProvider>
        <EnhancedResumeBuilder onBack={() => setActiveTab('home')} />
      </ToastProvider>
    )
  }

  if (activeTab === 'cover') {
    return (
      <ToastProvider>
        <ImprovedCoverLetterBuilder onBack={() => setActiveTab('home')} />
      </ToastProvider>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - DataGen Black/White/Grey Theme */}
      <div className="bg-black border-b-2 border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border-2 border-gray-800">
                <Sparkles className="w-7 h-7 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Professional Resume Builder
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Create ATS-compatible documents in minutes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-gray-300 rounded-lg font-medium border border-gray-700">
                <CheckCircle className="w-4 h-4" />
                Auto-save enabled
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-gray-300 rounded-lg font-medium border border-gray-700">
                <Download className="w-4 h-4" />
                One-click PDF
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Choose Your Document Type
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Build professional resumes and cover letters with our advanced builder featuring drag-and-drop customization,
            real-time validation, and industry-standard formatting.
          </p>
        </div>

        {/* Main Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Resume Card */}
          <div
            onClick={() => setActiveTab('resume')}
            className="group bg-white rounded-2xl border-2 border-gray-900 shadow-lg p-8 cursor-pointer hover:border-black hover:shadow-2xl transition-all transform hover:-translate-y-2 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-bl-full"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-black p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform border-2 border-gray-800">
                  <FileText className="w-full h-full text-white" />
                </div>
                <ChevronRight className="w-7 h-7 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Resume Builder
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Advanced builder with drag-and-drop section ordering, customizable skills, and comprehensive optional sections.
              </p>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>Drag-and-drop section reordering</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>Customizable skill categories</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>12 sections including Publications & Volunteer</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>Auto-save & real-time validation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cover Letter Card */}
          <div
            onClick={() => setActiveTab('cover')}
            className="group bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-8 cursor-pointer hover:border-indigo-500 hover:shadow-2xl transition-all transform hover:-translate-y-2 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <Mail className="w-full h-full text-white" />
                </div>
                <ChevronRight className="w-7 h-7 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Cover Letter Builder
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Streamlined form with auto-save and up to 5 customizable body paragraphs for personalized applications.
              </p>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 text-xs">✓</span>
                  </div>
                  <span>Auto-save to browser storage</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 text-xs">✓</span>
                  </div>
                  <span>Dynamic paragraph management (1-5)</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 text-xs">✓</span>
                  </div>
                  <span>Matching resume design</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 text-xs">✓</span>
                  </div>
                  <span>Professional LaTeX output</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-black border-2 border-gray-800 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              Platform Features
            </h3>
            <p className="text-gray-600 text-sm mt-2 ml-13">Everything you need for professional document creation</p>
          </div>
          <div className="p-8 grid md:grid-cols-4 gap-8">
            <div className="group">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <span className="text-2xl">🔄</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Auto-Save</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your data is automatically saved to browser storage as you type. Never lose your progress.
              </p>
            </div>
            <div className="group">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <span className="text-2xl">✅</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Smart Validation</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Real-time field validation with character counts and helpful hints for optimal content.
              </p>
            </div>
            <div className="group">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                <span className="text-2xl">⚡</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Instant Generation</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                LaTeX-powered PDFs generated in seconds with professional ATS-compatible formatting.
              </p>
            </div>
            <div className="group">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                <span className="text-2xl">📱</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Fully Responsive</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Works seamlessly on desktop, tablet, and mobile devices for editing on the go.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Built with Next.js, React, and LaTeX • Professional ATS-Compatible Documents</p>
        </div>

        {/* Getting Started - Professional CTA */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-10 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">Ready to Build Your Professional Resume?</h3>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto text-lg leading-relaxed">
              Choose a builder above to create your professional documents. Your progress is automatically saved,
              so you can come back anytime to continue where you left off.
            </p>
            <div className="flex items-center justify-center gap-12 text-sm max-w-3xl mx-auto">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center font-bold text-2xl border-2 border-white/30">1</div>
                <span className="font-medium">Fill Information</span>
              </div>
              <div className="w-12 h-0.5 bg-white/30"></div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center font-bold text-2xl border-2 border-white/30">2</div>
                <span className="font-medium">Customize Sections</span>
              </div>
              <div className="w-12 h-0.5 bg-white/30"></div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center font-bold text-2xl border-2 border-white/30">3</div>
                <span className="font-medium">Generate PDF</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

