'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Download, Save, CheckCircle } from 'lucide-react'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Button } from './ui/Button'
import { useToast } from './ui/Toast'
import { useAutoSave, loadSavedData, clearSavedData } from '@/hooks/useAutoSave'

interface ImprovedResumeBuilderProps {
  onBack: () => void
}

interface Experience {
  title: string
  company: string
  location: string
  dates: string
  bullets: string[]
}

interface Project {
  title: string
  description: string
  bullets: string[]
}

interface Education {
  degree: string
  institution: string
  location: string
  dates: string
  gpa: string
}

const STORAGE_KEY = 'resume-builder-data'

export default function ImprovedResumeBuilder({ onBack }: ImprovedResumeBuilderProps) {
  const { showToast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load saved data on mount
  const [personalInfo, setPersonalInfo] = useState(() =>
    loadSavedData(STORAGE_KEY, {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      github: ''
    }).personalInfo || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      github: ''
    }
  )

  const [summary, setSummary] = useState(() =>
    loadSavedData(STORAGE_KEY, { summary: '' }).summary || ''
  )

  const [skills, setSkills] = useState(() =>
    loadSavedData(STORAGE_KEY, {
      programming: '',
      frameworks: '',
      databases: '',
      tools: '',
      cloud: ''
    }).skills || {
      programming: '',
      frameworks: '',
      databases: '',
      tools: '',
      cloud: ''
    }
  )

  const [experiences, setExperiences] = useState<Experience[]>(() =>
    loadSavedData(STORAGE_KEY, {
      experiences: [{
        title: '',
        company: '',
        location: '',
        dates: '',
        bullets: ['']
      }]
    }).experiences || [{
      title: '',
      company: '',
      location: '',
      dates: '',
      bullets: ['']
    }]
  )

  const [projects, setProjects] = useState<Project[]>(() =>
    loadSavedData(STORAGE_KEY, {
      projects: [{
        title: '',
        description: '',
        bullets: ['']
      }]
    }).projects || [{
      title: '',
      description: '',
      bullets: ['']
    }]
  )

  const [education, setEducation] = useState<Education[]>(() =>
    loadSavedData(STORAGE_KEY, {
      education: [{
        degree: '',
        institution: '',
        location: '',
        dates: '',
        gpa: ''
      }]
    }).education || [{
      degree: '',
      institution: '',
      location: '',
      dates: '',
      gpa: ''
    }]
  )

  const [certifications, setCertifications] = useState<string[]>(() =>
    loadSavedData(STORAGE_KEY, { certifications: [''] }).certifications || ['']
  )

  const [languages, setLanguages] = useState<string[]>(() =>
    loadSavedData(STORAGE_KEY, { languages: [''] }).languages || ['']
  )

  const [awards, setAwards] = useState<string[]>(() =>
    loadSavedData(STORAGE_KEY, { awards: [''] }).awards || ['']
  )

  // Auto-save all data
  const allData = {
    personalInfo,
    summary,
    skills,
    experiences,
    projects,
    education,
    certifications,
    languages,
    awards
  }

  useAutoSave({ key: STORAGE_KEY, data: allData, delay: 1000 })

  // Update last saved timestamp when data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLastSaved(new Date())
    }, 1100) // Slightly longer than auto-save delay

    return () => clearTimeout(timer)
  }, [personalInfo, summary, skills, experiences, projects, education, certifications, languages, awards])

  const addExperience = () => {
    if (experiences.length < 10) {
      setExperiences([...experiences, {
        title: '',
        company: '',
        location: '',
        dates: '',
        bullets: ['']
      }])
    }
  }

  const removeExperience = (index: number) => {
    if (experiences.length > 1) {
      setExperiences(experiences.filter((_, i) => i !== index))
    }
  }

  const addBullet = (expIndex: number) => {
    const newExperiences = [...experiences]
    if (newExperiences[expIndex].bullets.length < 10) {
      newExperiences[expIndex].bullets.push('')
      setExperiences(newExperiences)
    }
  }

  const removeBullet = (expIndex: number, bulletIndex: number) => {
    const newExperiences = [...experiences]
    if (newExperiences[expIndex].bullets.length > 1) {
      newExperiences[expIndex].bullets = newExperiences[expIndex].bullets.filter((_, i) => i !== bulletIndex)
      setExperiences(newExperiences)
    }
  }

  const updateExperience = (index: number, field: keyof Experience, value: any) => {
    const newExperiences = [...experiences]
    newExperiences[index] = { ...newExperiences[index], [field]: value }
    setExperiences(newExperiences)
  }

  const updateBullet = (expIndex: number, bulletIndex: number, value: string) => {
    const newExperiences = [...experiences]
    newExperiences[expIndex].bullets[bulletIndex] = value
    setExperiences(newExperiences)
  }

  const addProject = () => {
    if (projects.length < 10) {
      setProjects([...projects, {
        title: '',
        description: '',
        bullets: ['']
      }])
    }
  }

  const removeProject = (index: number) => {
    if (projects.length > 1) {
      setProjects(projects.filter((_, i) => i !== index))
    }
  }

  const updateProject = (index: number, field: keyof Project, value: any) => {
    const newProjects = [...projects]
    newProjects[index] = { ...newProjects[index], [field]: value }
    setProjects(newProjects)
  }

  const addEducation = () => {
    if (education.length < 5) {
      setEducation([...education, {
        degree: '',
        institution: '',
        location: '',
        dates: '',
        gpa: ''
      }])
    }
  }

  const removeEducation = (index: number) => {
    if (education.length > 1) {
      setEducation(education.filter((_, i) => i !== index))
    }
  }

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const newEducation = [...education]
    newEducation[index] = { ...newEducation[index], [field]: value }
    setEducation(newEducation)
  }

  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, items: string[], max: number) => {
    if (items.length < max) {
      setter([...items, ''])
    }
  }

  const removeItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, items: string[], index: number) => {
    if (items.length > 1) {
      setter(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, items: string[], index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    setter(newItems)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allData)
      })

      if (!response.ok) {
        throw new Error('Failed to generate resume')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast('success', 'Resume generated successfully!')
    } catch (error) {
      console.error('Error generating resume:', error)
      showToast('error', 'Failed to generate resume. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      clearSavedData(STORAGE_KEY)
      showToast('info', 'All data cleared')
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Resume Builder</h1>
            </div>
            <div className="flex items-center gap-4">
              {lastSaved && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Auto-saved
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearData}
              >
                Clear All
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={isGenerating}
                icon={<Download className="w-5 h-5" />}
                onClick={handleGenerate}
              >
                Generate PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">

          {/* Personal Information */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                required
                value={personalInfo.firstName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                placeholder="John"
                maxLength={50}
                showCharCount
              />
              <Input
                label="Last Name"
                required
                value={personalInfo.lastName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                placeholder="Doe"
                maxLength={50}
                showCharCount
              />
              <Input
                label="Email"
                type="email"
                required
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                placeholder="john.doe@email.com"
                maxLength={100}
              />
              <Input
                label="Phone"
                type="tel"
                required
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                maxLength={20}
              />
              <Input
                label="LinkedIn"
                value={personalInfo.linkedin}
                onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
                placeholder="linkedin.com/in/johndoe"
                maxLength={100}
              />
              <Input
                label="GitHub"
                value={personalInfo.github}
                onChange={(e) => setPersonalInfo({ ...personalInfo, github: e.target.value })}
                placeholder="github.com/johndoe"
                maxLength={100}
              />
            </div>
          </section>

          {/* Professional Summary */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
              Professional Summary
            </h2>
            <Textarea
              label="Summary"
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief professional summary highlighting your key strengths and experience..."
              rows={4}
              maxLength={500}
              showCharCount
              helperText="2-3 sentences that capture your professional identity and value proposition"
            />
          </section>

          {/* Skills */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
              Technical Skills
            </h2>
            <div className="space-y-4">
              <Input
                label="Programming Languages"
                value={skills.programming}
                onChange={(e) => setSkills({ ...skills, programming: e.target.value })}
                placeholder="JavaScript, Python, Java, C++"
                maxLength={200}
                showCharCount
                helperText="Comma-separated list"
              />
              <Input
                label="Frameworks & Libraries"
                value={skills.frameworks}
                onChange={(e) => setSkills({ ...skills, frameworks: e.target.value })}
                placeholder="React, Node.js, Django, Spring Boot"
                maxLength={200}
                showCharCount
                helperText="Comma-separated list"
              />
              <Input
                label="Databases"
                value={skills.databases}
                onChange={(e) => setSkills({ ...skills, databases: e.target.value })}
                placeholder="PostgreSQL, MongoDB, MySQL, Redis"
                maxLength={200}
                showCharCount
                helperText="Comma-separated list"
              />
              <Input
                label="Tools & Technologies"
                value={skills.tools}
                onChange={(e) => setSkills({ ...skills, tools: e.target.value })}
                placeholder="Git, Docker, Kubernetes, Jenkins"
                maxLength={200}
                showCharCount
                helperText="Comma-separated list"
              />
              <Input
                label="Cloud & DevOps"
                value={skills.cloud}
                onChange={(e) => setSkills({ ...skills, cloud: e.target.value })}
                placeholder="AWS, Azure, GCP, CI/CD"
                maxLength={200}
                showCharCount
                helperText="Comma-separated list"
              />
            </div>
          </section>

          {/* Work Experience */}
          <section>
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-blue-500">
              <h2 className="text-xl font-bold text-gray-900">
                Work Experience
              </h2>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={addExperience}
                disabled={experiences.length >= 10}
              >
                Add Experience
              </Button>
            </div>
            <div className="space-y-6">
              {experiences.map((exp, expIndex) => (
                <div key={expIndex} className="p-4 border-2 border-gray-200 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700">Experience {expIndex + 1}</h3>
                    {experiences.length > 1 && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={() => removeExperience(expIndex)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Job Title"
                      required
                      value={exp.title}
                      onChange={(e) => updateExperience(expIndex, 'title', e.target.value)}
                      placeholder="Senior Software Engineer"
                      maxLength={100}
                    />
                    <Input
                      label="Company"
                      required
                      value={exp.company}
                      onChange={(e) => updateExperience(expIndex, 'company', e.target.value)}
                      placeholder="Tech Company Inc."
                      maxLength={100}
                    />
                    <Input
                      label="Location"
                      required
                      value={exp.location}
                      onChange={(e) => updateExperience(expIndex, 'location', e.target.value)}
                      placeholder="San Francisco, CA"
                      maxLength={100}
                    />
                    <Input
                      label="Dates"
                      required
                      value={exp.dates}
                      onChange={(e) => updateExperience(expIndex, 'dates', e.target.value)}
                      placeholder="Jan 2020 - Present"
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Key Achievements
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Plus className="w-3 h-3" />}
                        onClick={() => addBullet(expIndex)}
                        disabled={exp.bullets.length >= 10}
                      >
                        Add Bullet
                      </Button>
                    </div>
                    {exp.bullets.map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="flex gap-2">
                        <Textarea
                          value={bullet}
                          onChange={(e) => updateBullet(expIndex, bulletIndex, e.target.value)}
                          placeholder="Led development of microservices architecture serving 15M+ users..."
                          rows={2}
                          maxLength={300}
                          showCharCount
                        />
                        {exp.bullets.length > 1 && (
                          <button
                            onClick={() => removeBullet(expIndex, bulletIndex)}
                            className="text-red-600 hover:text-red-800 p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Projects */}
          <section>
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-blue-500">
              <h2 className="text-xl font-bold text-gray-900">Projects</h2>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={addProject}
                disabled={projects.length >= 10}
              >
                Add Project
              </Button>
            </div>
            <div className="space-y-6">
              {projects.map((proj, projIndex) => (
                <div key={projIndex} className="p-4 border-2 border-gray-200 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700">Project {projIndex + 1}</h3>
                    {projects.length > 1 && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={() => removeProject(projIndex)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <Input
                    label="Project Title"
                    required
                    value={proj.title}
                    onChange={(e) => updateProject(projIndex, 'title', e.target.value)}
                    placeholder="E-Commerce Platform"
                    maxLength={100}
                  />
                  <Textarea
                    label="Description"
                    required
                    value={proj.description}
                    onChange={(e) => updateProject(projIndex, 'description', e.target.value)}
                    placeholder="Brief description of the project and your role..."
                    rows={3}
                    maxLength={300}
                    showCharCount
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Education */}
          <section>
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-blue-500">
              <h2 className="text-xl font-bold text-gray-900">Education</h2>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={addEducation}
                disabled={education.length >= 5}
              >
                Add Education
              </Button>
            </div>
            <div className="space-y-6">
              {education.map((edu, eduIndex) => (
                <div key={eduIndex} className="p-4 border-2 border-gray-200 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700">Education {eduIndex + 1}</h3>
                    {education.length > 1 && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={() => removeEducation(eduIndex)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Degree"
                      required
                      value={edu.degree}
                      onChange={(e) => updateEducation(eduIndex, 'degree', e.target.value)}
                      placeholder="Bachelor of Science in Computer Science"
                      maxLength={150}
                    />
                    <Input
                      label="Institution"
                      required
                      value={edu.institution}
                      onChange={(e) => updateEducation(eduIndex, 'institution', e.target.value)}
                      placeholder="Stanford University"
                      maxLength={100}
                    />
                    <Input
                      label="Location"
                      required
                      value={edu.location}
                      onChange={(e) => updateEducation(eduIndex, 'location', e.target.value)}
                      placeholder="Stanford, CA"
                      maxLength={100}
                    />
                    <Input
                      label="Dates"
                      required
                      value={edu.dates}
                      onChange={(e) => updateEducation(eduIndex, 'dates', e.target.value)}
                      placeholder="2016 - 2020"
                      maxLength={50}
                    />
                    <Input
                      label="GPA (Optional)"
                      value={edu.gpa}
                      onChange={(e) => updateEducation(eduIndex, 'gpa', e.target.value)}
                      placeholder="3.9/4.0"
                      maxLength={20}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Optional Sections */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
              Optional Sections
            </h2>
            <div className="space-y-6">
              {/* Certifications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Certifications</label>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={() => addItem(setCertifications, certifications, 10)}
                    disabled={certifications.length >= 10}
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {certifications.map((cert, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={cert}
                        onChange={(e) => updateItem(setCertifications, certifications, index, e.target.value)}
                        placeholder="AWS Certified Solutions Architect"
                        maxLength={150}
                      />
                      {certifications.length > 1 && (
                        <button
                          onClick={() => removeItem(setCertifications, certifications, index)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Languages</label>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={() => addItem(setLanguages, languages, 10)}
                    disabled={languages.length >= 10}
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {languages.map((lang, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={lang}
                        onChange={(e) => updateItem(setLanguages, languages, index, e.target.value)}
                        placeholder="English - Native"
                        maxLength={100}
                      />
                      {languages.length > 1 && (
                        <button
                          onClick={() => removeItem(setLanguages, languages, index)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Awards */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Awards & Honors</label>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={() => addItem(setAwards, awards, 10)}
                    disabled={awards.length >= 10}
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {awards.map((award, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={award}
                        onChange={(e) => updateItem(setAwards, awards, index, e.target.value)}
                        placeholder="Best Innovation Award - 2024"
                        maxLength={200}
                      />
                      {awards.length > 1 && (
                        <button
                          onClick={() => removeItem(setAwards, awards, index)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
