'use client'

import { useState } from 'react'
import { ArrowLeft, Sparkles, Loader2, Link as LinkIcon, FileText } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'

interface AIResumeGeneratorProps {
    onBack: () => void
    onGenerate: (data: any) => void
}

export default function AIResumeGenerator({ onBack, onGenerate }: AIResumeGeneratorProps) {
    const [profileText, setProfileText] = useState('')
    const [jdUrl, setJdUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleGenerate = async () => {
        if (!profileText.trim()) {
            setError('Please provide your profile information or paste your existing resume content.')
            return
        }

        if (!jdUrl.trim()) {
            setError('Please provide a Job Description URL.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/generate-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile_text: profileText,
                    jd_url: jdUrl
                })
            })

            if (!response.ok) throw new Error('Failed to generate resume')

            const data = await response.json()
            onGenerate(data) // Pass generated JSON back to builder
        } catch (err) {
            console.error(err)
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={onBack} size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Builder
                </Button>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    AI Resume Generator
                </h1>
            </div>

            <div className="bg-white border rounded-lg p-6 shadow-sm space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            1. Your Profile / Resume
                        </h3>
                        <p className="text-sm text-gray-500">
                            Paste your LinkedIn "About" section, experience list, or the text of your current resume.
                        </p>
                        <Textarea
                            placeholder="Paste your resume content or profile details here..."
                            className="h-48 font-mono text-sm"
                            value={profileText}
                            onChange={(e) => setProfileText(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-gray-500" />
                            2. Target Job Description URL
                        </h3>
                        <p className="text-sm text-gray-500">
                            Paste the URL of the job description you want to target.
                        </p>
                        <div className="space-y-3">
                            <Input
                                placeholder="https://linkedin.com/jobs/view/..."
                                value={jdUrl}
                                onChange={(e) => setJdUrl(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                    <Button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700 text-white min-w-[150px]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Resume
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
