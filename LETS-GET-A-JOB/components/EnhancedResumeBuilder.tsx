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

  // Default section order
  const defaultSectionOrder: SectionConfig[] = [
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

  // Section ordering
  const [sectionOrder, setSectionOrder] = useState<SectionConfig[]>(() =>
    loadSavedData(STORAGE_KEY, {
      sectionOrder: defaultSectionOrder
    }).sectionOrder || defaultSectionOrder
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(allData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Resume generation error:', errorData)
        throw new Error(errorData.error || 'Failed to generate resume')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setPreviewUrl(url)
      setShowPreview(true)
      showToast('success', 'Preview generated successfully!')
    } catch (error) {
      console.error('Error generating preview:', error)
      showToast('error', error instanceof Error ? error.message : 'Failed to generate preview. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    // Show save modal to save as new version
    setShowSaveModal(true)
  }

  const handleModalSave = async (customName: string, branchName: string) => {
    setIsGenerating(true)
    setShowSaveModal(false)

    try {
      // Save resume to database (lineage)
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_name: customName,
          data: allData,
          description: `Resume version saved on ${new Date().toLocaleDateString()}`,
          parent_version_id: currentParentVersionId || currentVersionId || null,
          branch_name: branchName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save resume')
      }

      const savedVersion = await response.json()

      // Update current version tracking
      setCurrentVersionId(savedVersion.id)
      setCurrentVersionName(savedVersion.version_name || customName)
      setCurrentParentVersionId(savedVersion.parent_version_id)

      showToast('success', `Resume saved to lineage as ${branchName} branch (${savedVersion.version_number})!`)

      // Refresh lineage if visible
      if (showLineage) {
        // Trigger a re-render by toggling state
        setShowLineage(false)
        setTimeout(() => setShowLineage(true), 100)
      }
    } catch (error) {
      console.error('Error saving resume:', error)
      showToast('error', 'Failed to save resume. Please try again.')
    } finally {
      setIsGenerating(false)
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

      // Reset all form state
      setPersonalInfo({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        linkedin: '',
        github: '',
        address: ''
      })
      setSummary('')
      setSkillCategories([])
      setExperiences([])
      setProjects([])
      setEducation([])
      setCertifications([])
      setLanguages([])
      setAwards([])
      setPublications([])
      setExtracurricular([])
      setVolunteer([])
      setHobbies([])
      setSectionOrder(defaultSectionOrder)
      setCurrentVersionId(null)
      setCurrentVersionName('')
      setCurrentParentVersionId(null)

      showToast('info', 'All data cleared')
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
    try {
      const response = await fetch(`/api/resumes/${versionId}`)
      if (response.ok) {
        const version = await response.json()
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

        // IMPORTANT: Set the parent to the version we're branching FROM (not its parent)
        setCurrentVersionId(null) // Clear current version ID since this is a new branch
        setCurrentVersionName(version.version_name)
        setCurrentParentVersionId(version.id) // Set parent to the version we're branching from

        // Hide lineage to show edit view
        setShowLineage(false)
        showToast('info', `Ready to create a branch from ${version.version_name}. Make your changes and save.`)
      }
    } catch (error) {
      console.error('Error loading version for branching:', error)
      showToast('error', 'Failed to load version for branching')
    }
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

        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = `resume-${versionId}.pdf` // fallback
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/i)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
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

  const handleToggleStar = async (versionId: number, currentStarred: boolean) => {
    try {
      const response = await fetch(`/api/resumes/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !currentStarred })
      })

      if (response.ok) {
        showToast('success', currentStarred ? 'Removed from favorites' : 'Added to favorites')
        // Refresh lineage to show updated star status
        setShowLineage(false)
        setTimeout(() => setShowLineage(true), 100)
      } else {
        throw new Error('Failed to update favorite status')
      }
    } catch (error) {
      console.error('Error toggling star:', error)
      showToast('error', 'Failed to update favorite status')
    }
  }

  const handleDeleteVersion = async (versionId: number) => {
    try {
      const response = await fetch(`/api/resumes/${versionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showToast('success', 'Resume deleted successfully')
        // Refresh lineage to remove deleted version
        setShowLineage(false)
        setTimeout(() => setShowLineage(true), 100)
      } else {
        throw new Error('Failed to delete resume')
      }
    } catch (error) {
      console.error('Error deleting resume:', error)
      showToast('error', 'Failed to delete resume')
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
        className={`group flex items-center gap-2 px-2 py-2 transition-all ${section.enabled
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={() => toggleSection(section.id)}
          className="w-3.5 h-3.5 text-black rounded border-gray-400 focus:ring-black cursor-pointer"
        />
        <span className={`flex-1 text-xs ${section.enabled ? 'font-medium' : ''}`}>
          {section.name}
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-800 rounded transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-xl font-bold text-white">
                Resume Builder
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {!showLineage && (
                <>
                  <Button variant="outline" size="md" onClick={handleClearData}>
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    loading={isGenerating}
                    icon={<Eye className="w-4 h-4" />}
                    onClick={handlePreview}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    loading={isGenerating}
                    icon={<CheckCircle className="w-4 h-4" />}
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="md"
                icon={<GitBranch className="w-4 h-4" />}
                onClick={() => setShowLineage(!showLineage)}
              >
                {showLineage ? 'Editor' : 'Versions'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Show Lineage or Resume Builder */}
        {showLineage ? (
          <ResumeLineageDiagram
            onVersionClick={handleVersionClick}
            onDownload={handleDownloadVersion}
            onCreateBranch={handleCreateBranch}
            onToggleStar={handleToggleStar}
            onDelete={handleDeleteVersion}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Section Manager */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-300 sticky top-20">
                <div className="p-4 border-b border-gray-300 bg-gray-50">
                  <h2 className="text-sm font-bold text-gray-900">Sections</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    {sectionOrder.filter(s => s.enabled).length} of {sectionOrder.length} enabled
                  </p>
                </div>
                <div className="p-3">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sectionOrder.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1">
                        {sectionOrder.map((section) => (
                          <SortableSection key={section.id} section={section} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-4">
              {/* Personal Information - Always shown */}
              <section className="bg-white border border-gray-300">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-300">
                  <h2 className="text-lg font-bold text-gray-900">
                    Personal Information
                  </h2>
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
              {
                sectionOrder
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
                  })
              }
            </div >
          </div >
        )
        }
      </div >

      {/* PDF Preview Modal */}
      < PDFPreviewModal
        isOpen={showPreview}
        onClose={handleClosePreview}
        pdfUrl={previewUrl}
        title="Resume Preview"
        onDownload={handleSave}
      />

      {/* Save Resume Modal */}
      < DownloadResumeModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onDownload={handleModalSave}
        versionId={currentVersionId || 0}
        currentVersionName={currentVersionName || 'My Resume'}
        isBranchedResume={currentParentVersionId !== null}
      />
    </div >
  )
}
