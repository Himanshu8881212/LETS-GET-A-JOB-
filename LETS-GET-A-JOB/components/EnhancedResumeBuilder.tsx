'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Download, Plus, Trash2, CheckCircle, GripVertical, Eye, GitBranch } from 'lucide-react'
import { useAutoSave, loadSavedData, clearSavedData } from '@/hooks/useAutoSave'
import { useToast } from '@/components/ui/Toast'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { renderSection } from './resume-sections/RenderSections'
import PDFPreviewModal from './PDFPreviewModal'
import ResumeLineageDiagram from './ResumeLineageDiagram'
import DownloadResumeModal from './DownloadResumeModal'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const STORAGE_KEY = 'enhanced-resume-builder-data'

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
}

interface Education {
  degree: string
  institution: string
  location: string
  dates: string
  gpa: string
}

interface SkillCategory {
  id: string
  name: string
  skills: string
}

interface Publication {
  title: string
  details: string
}

interface Activity {
  title: string
  details: string
}

interface SectionConfig {
  id: string
  name: string
  enabled: boolean
}

interface EnhancedResumeBuilderProps {
  onBack: () => void
}

export default function EnhancedResumeBuilder({ onBack }: EnhancedResumeBuilderProps) {
  const { showToast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showLineage, setShowLineage] = useState(false)
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null)
  const [currentVersionName, setCurrentVersionName] = useState<string>('')
  const [currentParentVersionId, setCurrentParentVersionId] = useState<number | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)

  // Personal Info
  const [personalInfo, setPersonalInfo] = useState(() => {
    const saved = loadSavedData(STORAGE_KEY, {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      github: ''
    })
    return (saved as any).personalInfo || saved
  })

  const [summary, setSummary] = useState(() =>
    loadSavedData(STORAGE_KEY, { summary: '' }).summary || ''
  )

  // Customizable Skills - Start completely empty
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>(() =>
    loadSavedData(STORAGE_KEY, {
      skillCategories: []
    }).skillCategories || []
  )

  const [experiences, setExperiences] = useState<Experience[]>(() =>
    loadSavedData(STORAGE_KEY, {
      experiences: []
    }).experiences || []
  )

  const [projects, setProjects] = useState<Project[]>(() =>
    loadSavedData(STORAGE_KEY, {
      projects: []
    }).projects || []
  )

  const [education, setEducation] = useState<Education[]>(() =>
    loadSavedData(STORAGE_KEY, {
      education: []
    }).education || []
  )

  // Optional Sections - Start completely empty
  const [certifications, setCertifications] = useState<string[]>(() =>
    loadSavedData(STORAGE_KEY, { certifications: [] }).certifications || []
  )

  const [languages, setLanguages] = useState<string[]>(() =>
    loadSavedData(STORAGE_KEY, { languages: [] }).languages || []
  )

  const [awards, setAwards] = useState<string[]>(() =>
    loadSavedData(STORAGE_KEY, { awards: [] }).awards || []
  )

  const [publications, setPublications] = useState<Publication[]>(() =>
    loadSavedData(STORAGE_KEY, {
      publications: []
    }).publications || []
  )

  const [extracurricular, setExtracurricular] = useState<Activity[]>(() =>
    loadSavedData(STORAGE_KEY, {
      extracurricular: []
    }).extracurricular || []
  )

  const [volunteer, setVolunteer] = useState<Activity[]>(() =>
    loadSavedData(STORAGE_KEY, {
      volunteer: []
    }).volunteer || []
  )

  const [hobbies, setHobbies] = useState<string[]>(() =>
    loadSavedData(STORAGE_KEY, { hobbies: [] }).hobbies || []
  )

  // Section ordering
  const [sectionOrder, setSectionOrder] = useState<SectionConfig[]>(() =>
    loadSavedData(STORAGE_KEY, {
      sectionOrder: [
        { id: 'summary', name: 'Professional Summary', enabled: true },
        { id: 'skills', name: 'Technical Skills', enabled: true },
        { id: 'experience', name: 'Work Experience', enabled: true },
        { id: 'projects', name: 'Projects', enabled: true },
        { id: 'education', name: 'Education', enabled: true },
        { id: 'certifications', name: 'Certifications', enabled: false },
        { id: 'languages', name: 'Languages', enabled: false },
        { id: 'awards', name: 'Awards & Honors', enabled: false },
        { id: 'publications', name: 'Publications', enabled: false },
        { id: 'extracurricular', name: 'Extracurricular Activities', enabled: false },
        { id: 'volunteer', name: 'Volunteer Experience', enabled: false },
        { id: 'hobbies', name: 'Hobbies & Interests', enabled: false }
      ]
    }).sectionOrder || [
      { id: 'summary', name: 'Professional Summary', enabled: true },
      { id: 'skills', name: 'Technical Skills', enabled: true },
      { id: 'experience', name: 'Work Experience', enabled: true },
      { id: 'projects', name: 'Projects', enabled: true },
      { id: 'education', name: 'Education', enabled: true },
      { id: 'certifications', name: 'Certifications', enabled: false },
      { id: 'languages', name: 'Languages', enabled: false },
      { id: 'awards', name: 'Awards & Honors', enabled: false },
      { id: 'publications', name: 'Publications', enabled: false },
      { id: 'extracurricular', name: 'Extracurricular Activities', enabled: false },
      { id: 'volunteer', name: 'Volunteer Experience', enabled: false },
      { id: 'hobbies', name: 'Hobbies & Interests', enabled: false }
    ]
  )

  const allData = {
    personalInfo,
    summary,
    skillCategories,
    experiences,
    projects,
    education,
    certifications,
    languages,
    awards,
    publications,
    extracurricular,
    volunteer,
    hobbies,
    sectionOrder
  }

  useAutoSave({ key: STORAGE_KEY, data: allData, delay: 1000 })

  // Update last saved timestamp when data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLastSaved(new Date())
    }, 1100)

    return () => clearTimeout(timer)
  }, [personalInfo, summary, skillCategories, experiences, projects, education, certifications, languages, awards, publications, extracurricular, volunteer, hobbies, sectionOrder])

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
      showToast('success', 'Section order updated')
    }
  }

  const toggleSection = (id: string) => {
    setSectionOrder((sections) =>
      sections.map((section) =>
        section.id === id ? { ...section, enabled: !section.enabled } : section
      )
    )
  }

  // Skill category functions
  const addSkillCategory = () => {
    setSkillCategories([...skillCategories, { id: Date.now().toString(), name: '', skills: '' }])
  }

  const removeSkillCategory = (id: string) => {
    if (skillCategories.length > 1) {
      setSkillCategories(skillCategories.filter((cat) => cat.id !== id))
    }
  }

  const updateSkillCategory = (id: string, field: 'name' | 'skills', value: string) => {
    setSkillCategories(
      skillCategories.map((cat) => (cat.id === id ? { ...cat, [field]: value } : cat))
    )
  }

  // Experience functions
  const addExperience = () => {
    if (experiences.length < 10) {
      setExperiences([...experiences, { title: '', company: '', location: '', dates: '', bullets: [''] }])
    }
  }

  const removeExperience = (index: number) => {
    if (experiences.length > 1) {
      setExperiences(experiences.filter((_, i) => i !== index))
    }
  }

  const updateExperience = (index: number, field: keyof Experience, value: any) => {
    const newExperiences = [...experiences]
    newExperiences[index] = { ...newExperiences[index], [field]: value }
    setExperiences(newExperiences)
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

  const updateBullet = (expIndex: number, bulletIndex: number, value: string) => {
    const newExperiences = [...experiences]
    newExperiences[expIndex].bullets[bulletIndex] = value
    setExperiences(newExperiences)
  }

  // Project functions
  const addProject = () => {
    if (projects.length < 10) {
      setProjects([...projects, { title: '', description: '' }])
    }
  }

  const removeProject = (index: number) => {
    if (projects.length > 1) {
      setProjects(projects.filter((_, i) => i !== index))
    }
  }

  const updateProject = (index: number, field: keyof Project, value: string) => {
    const newProjects = [...projects]
    newProjects[index] = { ...newProjects[index], [field]: value }
    setProjects(newProjects)
  }

  // Education functions
  const addEducation = () => {
    if (education.length < 10) {
      setEducation([...education, { degree: '', institution: '', location: '', dates: '', gpa: '' }])
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

  // Publication functions
  const addPublication = () => {
    if (publications.length < 10) {
      setPublications([...publications, { title: '', details: '' }])
    }
  }

  const removePublication = (index: number) => {
    if (publications.length > 1) {
      setPublications(publications.filter((_, i) => i !== index))
    }
  }

  const updatePublication = (index: number, field: keyof Publication, value: string) => {
    const newPublications = [...publications]
    newPublications[index] = { ...newPublications[index], [field]: value }
    setPublications(newPublications)
  }

  // Activity functions (for extracurricular and volunteer)
  const addActivity = (type: 'extracurricular' | 'volunteer') => {
    const setter = type === 'extracurricular' ? setExtracurricular : setVolunteer
    const current = type === 'extracurricular' ? extracurricular : volunteer
    if (current.length < 10) {
      setter([...current, { title: '', details: '' }])
    }
  }

  const removeActivity = (type: 'extracurricular' | 'volunteer', index: number) => {
    const setter = type === 'extracurricular' ? setExtracurricular : setVolunteer
    const current = type === 'extracurricular' ? extracurricular : volunteer
    if (current.length > 1) {
      setter(current.filter((_, i) => i !== index))
    }
  }

  const updateActivity = (type: 'extracurricular' | 'volunteer', index: number, field: keyof Activity, value: string) => {
    const setter = type === 'extracurricular' ? setExtracurricular : setVolunteer
    const current = type === 'extracurricular' ? extracurricular : volunteer
    const newActivities = [...current]
    newActivities[index] = { ...newActivities[index], [field]: value }
    setter(newActivities)
  }

  // Simple list functions (certifications, languages, awards, hobbies)
  const addListItem = (type: 'certifications' | 'languages' | 'awards' | 'hobbies') => {
    const setters = { certifications: setCertifications, languages: setLanguages, awards: setAwards, hobbies: setHobbies }
    const current = { certifications, languages, awards, hobbies }[type]
    if (current.length < 10) {
      setters[type]([...current, ''])
    }
  }

  const removeListItem = (type: 'certifications' | 'languages' | 'awards' | 'hobbies', index: number) => {
    const setters = { certifications: setCertifications, languages: setLanguages, awards: setAwards, hobbies: setHobbies }
    const current = { certifications, languages, awards, hobbies }[type]
    if (current.length > 1) {
      setters[type](current.filter((_, i) => i !== index))
    }
  }

  const updateListItem = (type: 'certifications' | 'languages' | 'awards' | 'hobbies', index: number, value: string) => {
    const setters = { certifications: setCertifications, languages: setLanguages, awards: setAwards, hobbies: setHobbies }
    const current = { certifications, languages, awards, hobbies }[type]
    const newList = [...current]
    newList[index] = value
    setters[type](newList)
  }

  const handlePreview = async () => {
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
      setPreviewUrl(url)
      setShowPreview(true)
      showToast('success', 'Preview generated successfully!')
    } catch (error) {
      console.error('Error generating preview:', error)
      showToast('error', 'Failed to generate preview. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    // Show save modal to save as new version
    setShowSaveModal(true)
  }

  const handleModalSave = async (customName: string) => {
    if (previewUrl) {
      // Download from existing preview
      const a = document.createElement('a')
      a.href = previewUrl
      a.download = `${customName}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      showToast('success', 'Resume downloaded successfully!')
      setShowPreview(false)
    } else {
      // Generate and download directly
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
        a.download = `${customName}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        showToast('success', 'Resume downloaded successfully!')
      } catch (error) {
        console.error('Error generating resume:', error)
        showToast('error', 'Failed to generate resume. Please try again.')
      } finally {
        setIsGenerating(false)
      }
    }
  }

  const handleClosePreview = () => {
    setShowPreview(false)
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      clearSavedData(STORAGE_KEY)
      showToast('info', 'All data cleared')
      window.location.reload()
    }
  }

  // Version Control Handlers
  const handleEditVersion = async (versionId: number) => {
    try {
      const response = await fetch(`/api/resumes/${versionId}`)
      if (response.ok) {
        const version = await response.json()
        // API now returns parsed data in version.data (not version.data_json)
        const data = version.data || {}

        // Load the version data into the form
        setPersonalInfo(data.personalInfo || {})
        setSummary(data.summary || '')
        setSkillCategories(data.skillCategories || [])
        setExperiences(data.experiences || [])
        setProjects(data.projects || [])
        setEducation(data.education || [])
        setCertifications(data.certifications || [])
        setLanguages(data.languages || [])
        setAwards(data.awards || [])
        setHobbies(data.hobbies || [])
        setPublications(data.publications || [])
        setExtracurricular(data.extracurricular || [])
        setVolunteer(data.volunteer || [])

        // Track current version info
        setCurrentVersionId(version.id)
        setCurrentVersionName(version.version_name)
        setCurrentParentVersionId(version.parent_version_id)

        // Hide lineage to show edit view
        setShowLineage(false)
        showToast('success', `Loaded version: ${version.version_name}`)
      }
    } catch (error) {
      console.error('Error loading version:', error)
      showToast('error', 'Failed to load version')
    }
  }

  const handleCreateBranch = async (versionId: number) => {
    // Load the version data first, then switch to edit tab
    await handleEditVersion(versionId)
    showToast('info', 'Ready to create a branch from this version. Make your changes and download.')
  }

  const handleVersionClick = (versionId: number) => {
    handleEditVersion(versionId)
  }

  const handleDownloadVersion = async (versionId: number) => {
    try {
      setIsGenerating(true)
      const response = await fetch(`/api/resumes/${versionId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `resume-${versionId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showToast('success', 'Resume downloaded successfully')
      } else {
        throw new Error('Failed to download resume')
      }
    } catch (error) {
      console.error('Error downloading resume:', error)
      showToast('error', 'Failed to download resume')
    } finally {
      setIsGenerating(false)
    }
  }

  // Professional Sortable Section Component
  function SortableSection({ section }: { section: SectionConfig }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: section.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all ${section.enabled
          ? 'bg-gray-900 border-2 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
          : 'bg-gray-100 border-2 border-gray-300 hover:border-gray-400'
          }`}
      >
        <button
          {...attributes}
          {...listeners}
          className={`cursor-grab active:cursor-grabbing transition-colors ${section.enabled ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={() => toggleSection(section.id)}
          className="w-4 h-4 text-black rounded border-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-0 cursor-pointer"
        />
        <span className={`flex-1 text-sm transition-colors ${section.enabled ? 'text-white font-semibold' : 'text-gray-600 font-medium'
          }`}>
          {section.name}
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - DataGen Black/White/Grey Theme */}
      <div className="bg-black border-b border-gray-800 sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-lg transition-all font-medium shadow-sm hover:shadow border border-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <div className="h-8 w-px bg-gray-700"></div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Resume Builder
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">Professional ATS-Compatible Resume • Drag to Reorder Sections</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleClearData}>
                Clear All
              </Button>
              <Button
                variant="outline"
                size="md"
                icon={<GitBranch className="w-5 h-5" />}
                onClick={() => setShowLineage(!showLineage)}
              >
                {showLineage ? 'Hide Lineage' : 'Show Lineage'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                loading={isGenerating}
                icon={<Eye className="w-5 h-5" />}
                onClick={handlePreview}
              >
                {isGenerating ? 'Generating...' : 'Preview PDF'}
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={isGenerating}
                icon={<CheckCircle className="w-5 h-5" />}
                onClick={handleSave}
              >
                {isGenerating ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
        {/* Progress bar when generating */}
        {isGenerating && (
          <div className="h-1 bg-gray-900">
            <div className="h-full bg-white animate-pulse"></div>
          </div>
        )}
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Show Lineage or Resume Builder */}
        {showLineage ? (
          <ResumeLineageDiagram
            onVersionClick={handleVersionClick}
            onDownload={handleDownloadVersion}
            onCreateBranch={handleCreateBranch}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Sidebar - Section Manager - Black/White/Grey Theme */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border-2 border-gray-900 shadow-lg sticky top-28 overflow-hidden">
                <div className="p-6 border-b-2 border-gray-900 bg-black">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <h2 className="text-lg font-bold text-white">Section Manager</h2>
                  </div>
                  <p className="text-xs text-gray-400">
                    Drag to reorder • Toggle to enable
                  </p>
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-xs text-gray-400 flex items-center justify-between">
                      <span>Enabled Sections</span>
                      <span className="font-bold text-white">{sectionOrder.filter(s => s.enabled).length}/{sectionOrder.length}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sectionOrder.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1.5">
                        {sectionOrder.map((section) => (
                          <SortableSection key={section.id} section={section} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>

            {/* Main Content - Black/White/Grey Theme */}
            <div className="lg:col-span-4 space-y-6">
              {/* Quick Tips Banner */}
              <div className="bg-gray-100 border-2 border-gray-900 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Resume Best Practices</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0"></div>
                        <span><strong>Concise:</strong> Keep it to one page if possible</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0"></div>
                        <span><strong>Quantify:</strong> Use numbers and metrics in achievements</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0"></div>
                        <span><strong>Keywords:</strong> Match job description terminology</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information - Always shown */}
              <section className="bg-white rounded-xl border-2 border-gray-900 shadow-sm overflow-hidden">
                <div className="px-8 py-5 bg-black border-b-2 border-gray-900">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-white rounded-full"></div>
                    Personal Information
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">Your contact details and professional links</p>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      required
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                      placeholder="john.doe@email.com"
                    />
                    <Input
                      label="Phone"
                      required
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                    <Input
                      label="LinkedIn"
                      value={personalInfo.linkedin}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
                      placeholder="linkedin.com/in/johndoe"
                    />
                    <Input
                      label="GitHub"
                      value={personalInfo.github}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, github: e.target.value })}
                      placeholder="github.com/johndoe"
                    />
                  </div>
                </div>
              </section>

              {/* Render sections based on order and enabled status */}
              {sectionOrder
                .filter((section) => section.enabled)
                .map((section) => {
                  const sectionProps = {
                    summary,
                    setSummary,
                    skillCategories,
                    addSkillCategory,
                    removeSkillCategory,
                    updateSkillCategory,
                    experiences,
                    addExperience,
                    removeExperience,
                    updateExperience,
                    addBullet,
                    removeBullet,
                    updateBullet,
                    projects,
                    addProject,
                    removeProject,
                    updateProject,
                    education,
                    addEducation,
                    removeEducation,
                    updateEducation,
                    certifications,
                    languages,
                    awards,
                    hobbies,
                    publications,
                    extracurricular,
                    volunteer,
                    addListItem,
                    removeListItem,
                    updateListItem,
                    addPublication,
                    removePublication,
                    updatePublication,
                    addActivity,
                    removeActivity,
                    updateActivity,
                  }

                  return renderSection(section.id, sectionProps)
                })}
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={handleClosePreview}
        pdfUrl={previewUrl}
        title="Resume Preview"
        onDownload={handleSave}
      />

      {/* Save Resume Modal */}
      <DownloadResumeModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onDownload={handleModalSave}
        versionId={currentVersionId || 0}
        currentVersionName={currentVersionName || 'My Resume'}
        isBranchedResume={currentParentVersionId !== null}
      />
    </div>
  )
}
