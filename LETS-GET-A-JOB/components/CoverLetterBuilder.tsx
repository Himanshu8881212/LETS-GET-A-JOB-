'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Download, Eye } from 'lucide-react'

interface CoverLetterBuilderProps {
  onBack: () => void
}

export default function CoverLetterBuilder({ onBack }: CoverLetterBuilderProps) {
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedin: '',
    address: ''
  })

  const [recipient, setRecipient] = useState({
    company: '',
    role: '',
    hiringManager: '',
    address: ''
  })

  const [content, setContent] = useState({
    opening: '',
    bodyParagraphs: ['', '', ''],
    closing: ''
  })

  const addParagraph = () => {
    if (content.bodyParagraphs.length < 5) {
      setContent({
        ...content,
        bodyParagraphs: [...content.bodyParagraphs, '']
      })
    }
  }

  const removeParagraph = (index: number) => {
    const newParagraphs = content.bodyParagraphs.filter((_, i) => i !== index)
    setContent({
      ...content,
      bodyParagraphs: newParagraphs
    })
  }

  const updateParagraph = (index: number, value: string) => {
    const newParagraphs = [...content.bodyParagraphs]
    newParagraphs[index] = value
    setContent({
      ...content,
      bodyParagraphs: newParagraphs
    })
  }

  const handleGenerate = async () => {
    const data = {
      personalInfo,
      recipient,
      content
    }

    console.log('Generating cover letter with data:', data)

    try {
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to generate cover letter')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cover_letter.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log('Cover letter generated successfully!')
    } catch (error) {
      console.error('Error generating cover letter:', error)
      alert('Failed to generate cover letter. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Cover Letter Builder</h1>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Generate
              </button>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              value={personalInfo.firstName}
              onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={personalInfo.lastName}
              onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="email"
              placeholder="Email"
              value={personalInfo.email}
              onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={personalInfo.phone}
              onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="LinkedIn URL"
              value={personalInfo.linkedin}
              onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Address (Optional)"
              value={personalInfo.address}
              onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Recipient Information */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recipient Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Company Name"
              value={recipient.company}
              onChange={(e) => setRecipient({ ...recipient, company: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Role/Position"
              value={recipient.role}
              onChange={(e) => setRecipient({ ...recipient, role: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Hiring Manager Name (Optional)"
              value={recipient.hiringManager}
              onChange={(e) => setRecipient({ ...recipient, hiringManager: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Company Address (Optional)"
              value={recipient.address}
              onChange={(e) => setRecipient({ ...recipient, address: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Letter Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Letter Content</h2>

          {/* Opening Paragraph */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Opening Paragraph
            </label>
            <textarea
              placeholder="Introduce yourself and state the position you're applying for..."
              value={content.opening}
              onChange={(e) => setContent({ ...content, opening: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Body Paragraphs */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Body Paragraphs
              </label>
              <button
                onClick={addParagraph}
                disabled={content.bodyParagraphs.length >= 5}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Paragraph
              </button>
            </div>
            <div className="space-y-4">
              {content.bodyParagraphs.map((paragraph, index) => (
                <div key={index} className="relative">
                  <textarea
                    placeholder={`Body paragraph ${index + 1}...`}
                    value={paragraph}
                    onChange={(e) => updateParagraph(index, e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {content.bodyParagraphs.length > 1 && (
                    <button
                      onClick={() => removeParagraph(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Closing Paragraph */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Closing Paragraph
            </label>
            <textarea
              placeholder="Express enthusiasm and request an interview..."
              value={content.closing}
              onChange={(e) => setContent({ ...content, closing: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

