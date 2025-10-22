'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Download, Eye } from 'lucide-react'

interface ResumeBuilderProps {
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

export default function ResumeBuilder({ onBack }: ResumeBuilderProps) {
  const [step, setStep] = useState(1)
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    website: ''
  })

  const [summary, setSummary] = useState('')
  const [skills, setSkills] = useState({
    programming: '',
    frameworks: '',
    databases: '',
    tools: '',
    cloud: ''
  })

  const [experiences, setExperiences] = useState<Experience[]>([{
    title: '',
    company: '',
    location: '',
    dates: '',
    bullets: ['']
  }])

  const [projects, setProjects] = useState<Project[]>([{
    title: '',
    description: '',
    bullets: ['']
  }])

  const [education, setEducation] = useState([{
    degree: '',
    institution: '',
    location: '',
    dates: '',
    gpa: ''
  }])

  const [certifications, setCertifications] = useState<string[]>([''])
  const [languages, setLanguages] = useState<string[]>([''])
  const [awards, setAwards] = useState<string[]>([''])
  const [publications, setPublications] = useState<string[]>([''])
  const [extracurricular, setExtracurricular] = useState<string[]>([''])
  const [volunteer, setVolunteer] = useState<string[]>([''])
  const [hobbies, setHobbies] = useState<string[]>([''])

  // Skip flags for optional sections
  const [skipSections, setSkipSections] = useState({
    certifications: false,
    languages: false,
    awards: false,
    publications: false,
    extracurricular: false,
    volunteer: false,
    hobbies: false
  })

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

  const addBullet = (expIndex: number) => {
    const newExperiences = [...experiences]
    if (newExperiences[expIndex].bullets.length < 10) {
      newExperiences[expIndex].bullets.push('')
      setExperiences(newExperiences)
    }
  }

  const updateBullet = (expIndex: number, bulletIndex: number, value: string) => {
    const newExperiences = [...experiences]
    newExperiences[expIndex].bullets[bulletIndex] = value
    setExperiences(newExperiences)
  }

  const removeBullet = (expIndex: number, bulletIndex: number) => {
    const newExperiences = [...experiences]
    newExperiences[expIndex].bullets.splice(bulletIndex, 1)
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

  const handleGenerate = async () => {
    // Call backend API to generate RESUME_DATA.tex
    const data = {
      personalInfo,
      summary,
      skills,
      experiences,
      projects,
      education,
      certifications: skipSections.certifications ? [] : certifications.filter(c => c.trim()),
      languages: skipSections.languages ? [] : languages.filter(l => l.trim()),
      awards: skipSections.awards ? [] : awards.filter(a => a.trim()),
      publications: skipSections.publications ? [] : publications.filter(p => p.trim()),
      extracurricular: skipSections.extracurricular ? [] : extracurricular.filter(e => e.trim()),
      volunteer: skipSections.volunteer ? [] : volunteer.filter(v => v.trim()),
      hobbies: skipSections.hobbies ? [] : hobbies.filter(h => h.trim())
    }

    console.log('Generating resume with data:', data)

    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to generate resume')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log('Resume generated successfully!')
    } catch (error) {
      console.error('Error generating resume:', error)
      alert('Failed to generate resume. Please try again.')
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
            <h1 className="text-2xl font-bold text-gray-900">Resume Builder</h1>
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

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mt-6 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                >
                  {s}
                </div>
                {s < 6 && <div className={`w-8 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-2 text-xs text-gray-600">
            <span className={step === 1 ? 'font-semibold text-blue-600' : ''}>Personal</span>
            <span className={step === 2 ? 'font-semibold text-blue-600' : ''}>Summary</span>
            <span className={step === 3 ? 'font-semibold text-blue-600' : ''}>Experience</span>
            <span className={step === 4 ? 'font-semibold text-blue-600' : ''}>Projects</span>
            <span className={step === 5 ? 'font-semibold text-blue-600' : ''}>Education</span>
            <span className={step === 6 ? 'font-semibold text-blue-600' : ''}>Optional</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
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
                  placeholder="GitHub URL"
                  value={personalInfo.github}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, github: e.target.value })}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 2: Summary & Skills */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Professional Summary</h2>
                <textarea
                  placeholder="Write a brief professional summary (2-3 sentences)..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Skills</h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Programming Languages (e.g., Python, Java, JavaScript)"
                    value={skills.programming}
                    onChange={(e) => setSkills({ ...skills, programming: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Frameworks & Libraries (e.g., React, Django, Spring)"
                    value={skills.frameworks}
                    onChange={(e) => setSkills({ ...skills, frameworks: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Databases (e.g., PostgreSQL, MongoDB, Redis)"
                    value={skills.databases}
                    onChange={(e) => setSkills({ ...skills, databases: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Tools & Technologies (e.g., Git, Docker, Kubernetes)"
                    value={skills.tools}
                    onChange={(e) => setSkills({ ...skills, tools: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Cloud & DevOps (e.g., AWS, Azure, CI/CD)"
                    value={skills.cloud}
                    onChange={(e) => setSkills({ ...skills, cloud: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Experience */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Work Experience</h2>
                <button
                  onClick={addExperience}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Experience
                </button>
              </div>
              {experiences.map((exp, expIndex) => (
                <div key={expIndex} className="border border-gray-200 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">Experience {expIndex + 1}</h3>
                    {experiences.length > 1 && (
                      <button
                        onClick={() => setExperiences(experiences.filter((_, i) => i !== expIndex))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Job Title"
                      value={exp.title}
                      onChange={(e) => {
                        const newExps = [...experiences]
                        newExps[expIndex].title = e.target.value
                        setExperiences(newExps)
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) => {
                        const newExps = [...experiences]
                        newExps[expIndex].company = e.target.value
                        setExperiences(newExps)
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Location"
                      value={exp.location}
                      onChange={(e) => {
                        const newExps = [...experiences]
                        newExps[expIndex].location = e.target.value
                        setExperiences(newExps)
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Dates (e.g., Jan 2020 - Present)"
                      value={exp.dates}
                      onChange={(e) => {
                        const newExps = [...experiences]
                        newExps[expIndex].dates = e.target.value
                        setExperiences(newExps)
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Bullet Points</label>
                      <button
                        onClick={() => addBullet(expIndex)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Bullet
                      </button>
                    </div>
                    {exp.bullets.map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Achievement or responsibility..."
                          value={bullet}
                          onChange={(e) => updateBullet(expIndex, bulletIndex, e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                        {exp.bullets.length > 1 && (
                          <button
                            onClick={() => removeBullet(expIndex, bulletIndex)}
                            className="text-red-600 hover:text-red-800"
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
          )}

          {/* Step 4: Projects */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Projects</h2>
                <button
                  onClick={addProject}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Project
                </button>
              </div>
              {projects.map((proj, projIndex) => (
                <div key={projIndex} className="border border-gray-200 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">Project {projIndex + 1}</h3>
                    {projects.length > 1 && (
                      <button
                        onClick={() => setProjects(projects.filter((_, i) => i !== projIndex))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Project Title"
                    value={proj.title}
                    onChange={(e) => {
                      const newProjs = [...projects]
                      newProjs[projIndex].title = e.target.value
                      setProjects(newProjs)
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    placeholder="Project Description"
                    value={proj.description}
                    onChange={(e) => {
                      const newProjs = [...projects]
                      newProjs[projIndex].description = e.target.value
                      setProjects(newProjs)
                    }}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Key Points</label>
                      <button
                        onClick={() => {
                          const newProjs = [...projects]
                          if (newProjs[projIndex].bullets.length < 10) {
                            newProjs[projIndex].bullets.push('')
                            setProjects(newProjs)
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Point
                      </button>
                    </div>
                    {proj.bullets.map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key achievement or technology used..."
                          value={bullet}
                          onChange={(e) => {
                            const newProjs = [...projects]
                            newProjs[projIndex].bullets[bulletIndex] = e.target.value
                            setProjects(newProjs)
                          }}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                        {proj.bullets.length > 1 && (
                          <button
                            onClick={() => {
                              const newProjs = [...projects]
                              newProjs[projIndex].bullets.splice(bulletIndex, 1)
                              setProjects(newProjs)
                            }}
                            className="text-red-600 hover:text-red-800"
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
          )}

          {/* Step 5: Education */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Education</h2>
                <button
                  onClick={() => {
                    if (education.length < 10) {
                      setEducation([...education, {
                        degree: '',
                        institution: '',
                        location: '',
                        dates: '',
                        gpa: ''
                      }])
                    }
                  }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Education
                </button>
              </div>
              {education.map((edu, eduIndex) => (
                <div key={eduIndex} className="border border-gray-200 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">Education {eduIndex + 1}</h3>
                    {education.length > 1 && (
                      <button
                        onClick={() => setEducation(education.filter((_, i) => i !== eduIndex))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Degree (e.g., B.S. Computer Science)"
                      value={edu.degree}
                      onChange={(e) => {
                        const newEdu = [...education]
                        newEdu[eduIndex].degree = e.target.value
                        setEducation(newEdu)
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Institution"
                      value={edu.institution}
                      onChange={(e) => {
                        const newEdu = [...education]
                        newEdu[eduIndex].institution = e.target.value
                        setEducation(newEdu)
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Location"
                      value={edu.location}
                      onChange={(e) => {
                        const newEdu = [...education]
                        newEdu[eduIndex].location = e.target.value
                        setEducation(newEdu)
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Dates (e.g., 2016 - 2020)"
                      value={edu.dates}
                      onChange={(e) => {
                        const newEdu = [...education]
                        newEdu[eduIndex].dates = e.target.value
                        setEducation(newEdu)
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="GPA (optional)"
                      value={edu.gpa}
                      onChange={(e) => {
                        const newEdu = [...education]
                        newEdu[eduIndex].gpa = e.target.value
                        setEducation(newEdu)
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 6: Optional Sections */}
          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Optional Sections</h2>
              <p className="text-gray-600 mb-6">Add any additional sections that are relevant to your resume. You can skip any section by checking the "Skip" box.</p>

              {/* Certifications */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-700">Certifications</h3>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={skipSections.certifications}
                      onChange={(e) => setSkipSections({ ...skipSections, certifications: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-600">Skip this section</span>
                  </label>
                </div>
                {!skipSections.certifications && (
                  <div className="space-y-2">
                    {certifications.map((cert, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Certification name (e.g., AWS Certified Solutions Architect)"
                          value={cert}
                          onChange={(e) => {
                            const newCerts = [...certifications]
                            newCerts[i] = e.target.value
                            setCertifications(newCerts)
                          }}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                        {certifications.length > 1 && (
                          <button
                            onClick={() => setCertifications(certifications.filter((_, idx) => idx !== i))}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => certifications.length < 10 && setCertifications([...certifications, ''])}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Certification
                    </button>
                  </div>
                )}
              </div>

              {/* Languages */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-700">Languages</h3>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={skipSections.languages}
                      onChange={(e) => setSkipSections({ ...skipSections, languages: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-600">Skip this section</span>
                  </label>
                </div>
                {!skipSections.languages && (
                  <div className="space-y-2">
                    {languages.map((lang, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Language and proficiency (e.g., Spanish - Fluent)"
                          value={lang}
                          onChange={(e) => {
                            const newLangs = [...languages]
                            newLangs[i] = e.target.value
                            setLanguages(newLangs)
                          }}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                        {languages.length > 1 && (
                          <button
                            onClick={() => setLanguages(languages.filter((_, idx) => idx !== i))}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => languages.length < 10 && setLanguages([...languages, ''])}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Language
                    </button>
                  </div>
                )}
              </div>

              {/* Awards */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-700">Awards & Honors</h3>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={skipSections.awards}
                      onChange={(e) => setSkipSections({ ...skipSections, awards: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-600">Skip this section</span>
                  </label>
                </div>
                {!skipSections.awards && (
                  <div className="space-y-2">
                    {awards.map((award, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Award or honor"
                          value={award}
                          onChange={(e) => {
                            const newAwards = [...awards]
                            newAwards[i] = e.target.value
                            setAwards(newAwards)
                          }}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                        {awards.length > 1 && (
                          <button
                            onClick={() => setAwards(awards.filter((_, idx) => idx !== i))}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => awards.length < 10 && setAwards([...awards, ''])}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Award
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setStep(Math.min(6, step + 1))}
              disabled={step === 6}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

