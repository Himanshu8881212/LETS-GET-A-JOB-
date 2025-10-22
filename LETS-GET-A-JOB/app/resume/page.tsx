'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ResumeBuilder() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: 'John',
    lastName: 'Doe',
    phone: '(555) 123-4567',
    email: 'john.doe@email.com',
    linkedin: 'linkedin.com/in/johndoe',
    github: 'github.com/johndoe',
    
    // Summary
    summary: 'Results-driven software engineer with 5+ years of experience building scalable web applications. Expertise in full-stack development, cloud architecture, and agile methodologies. Proven track record of delivering high-quality solutions that drive business growth.',
    
    // Skills
    skills: [
      { category: 'Languages', items: 'Python, JavaScript, TypeScript, Java, SQL, HTML/CSS' },
      { category: 'Frameworks & Libraries', items: 'React, Node.js, Django, Flask, Express, Next.js' },
      { category: 'Tools & Technologies', items: 'Git, Docker, Kubernetes, AWS, PostgreSQL, MongoDB' },
      { category: '', items: '' },
      { category: '', items: '' },
      { category: '', items: '' },
      { category: '', items: '' },
      { category: '', items: '' },
      { category: '', items: '' },
      { category: '', items: '' },
    ],
    
    // Experience
    experience: [
      {
        company: 'Tech Company Inc.',
        title: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        dates: 'Jan 2020 -- Present',
        bullets: [
          'Led development of microservices architecture serving 1M+ daily users, improving system reliability by 40%',
          'Architected and implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes',
          'Mentored team of 5 junior developers, conducting code reviews and technical training sessions',
          'Optimized database queries resulting in 60% reduction in API response times',
          ''
        ]
      },
      {
        company: 'Startup XYZ',
        title: 'Software Engineer',
        location: 'Remote',
        dates: 'Jun 2018 -- Dec 2019',
        bullets: [
          'Built RESTful APIs using Node.js and Express, handling 10K+ requests per minute',
          'Developed responsive web applications with React and Redux, improving user engagement by 35%',
          'Implemented automated testing suite achieving 85% code coverage',
          '',
          ''
        ]
      },
      { company: '', title: '', location: '', dates: '', bullets: ['', '', '', '', ''] },
      { company: '', title: '', location: '', dates: '', bullets: ['', '', '', '', ''] },
    ],
    
    // Projects
    projects: [
      {
        title: 'E-Commerce Platform',
        tech: 'React, Node.js, PostgreSQL, AWS',
        dates: '2023',
        bullets: [
          'Built full-stack e-commerce platform with payment integration and inventory management',
          'Implemented real-time order tracking using WebSockets',
          'Deployed on AWS with auto-scaling and load balancing',
          ''
        ]
      },
      { title: '', tech: '', dates: '', bullets: ['', '', '', ''] },
      { title: '', tech: '', dates: '', bullets: ['', '', '', ''] },
    ],
    
    // Education
    education: [
      {
        degree: 'Bachelor of Science in Computer Science',
        university: 'University of California',
        location: 'Berkeley, CA',
        dates: '2014 -- 2018',
        gpa: '3.8/4.0'
      },
      { degree: '', university: '', location: '', dates: '', gpa: '' },
      { degree: '', university: '', location: '', dates: '', gpa: '' },
    ],
    
    // Certifications
    certifications: [
      { title: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', date: '2022' },
      { title: '', issuer: '', date: '' },
      { title: '', issuer: '', date: '' },
      { title: '', issuer: '', date: '' },
    ],
    
    // Languages
    languages: [
      { name: 'English', proficiency: 'Native' },
      { name: 'Spanish', proficiency: 'Professional Working Proficiency' },
      { name: '', proficiency: '' },
      { name: '', proficiency: '' },
    ],
    
    // Awards
    awards: [
      { title: 'Employee of the Year', issuer: 'Tech Company Inc.', date: '2022', description: 'Recognized for outstanding contributions to product development' },
      { title: '', issuer: '', date: '', description: '' },
      { title: '', issuer: '', date: '', description: '' },
    ],
    
    // Publications
    publications: ['', '', ''],
    
    // Extracurricular
    extracurricular: ['', '', ''],
    
    // Volunteer
    volunteer: ['', '', ''],
    
    // Hobbies
    hobbies: ['', '', '', '', ''],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate resume')
      }
      
      // Download PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateArrayField = (field: string, index: number, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].map((item: any, i: number) => 
        i === index ? value : item
      )
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-gray-600 hover:text-black">← Back to Home</Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-black">Resume Builder</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-black border-b pb-2">Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="LinkedIn (e.g., linkedin.com/in/username)"
                  value={formData.linkedin}
                  onChange={(e) => updateField('linkedin', e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="GitHub (e.g., github.com/username)"
                  value={formData.github}
                  onChange={(e) => updateField('github', e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </section>

            {/* Professional Summary */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-black border-b pb-2">Professional Summary</h2>
              <textarea
                placeholder="Brief professional summary..."
                value={formData.summary}
                onChange={(e) => updateField('summary', e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </section>

            {/* Skills */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-black border-b pb-2">Technical Skills</h2>
              {formData.skills.slice(0, 3).map((skill, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 mb-3">
                  <input
                    type="text"
                    placeholder="Category (e.g., Languages)"
                    value={skill.category}
                    onChange={(e) => updateArrayField('skills', index, { ...skill, category: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Skills (comma-separated)"
                    value={skill.items}
                    onChange={(e) => updateArrayField('skills', index, { ...skill, items: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2 col-span-2"
                  />
                </div>
              ))}
            </section>

            {/* Experience */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-black border-b pb-2">Professional Experience</h2>
              {formData.experience.slice(0, 2).map((exp, index) => (
                <div key={index} className="mb-6 p-4 border border-gray-200 rounded">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <input
                      type="text"
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) => updateArrayField('experience', index, { ...exp, company: e.target.value })}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Job Title"
                      value={exp.title}
                      onChange={(e) => updateArrayField('experience', index, { ...exp, title: e.target.value })}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Location"
                      value={exp.location}
                      onChange={(e) => updateArrayField('experience', index, { ...exp, location: e.target.value })}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Dates (e.g., Jan 2020 -- Present)"
                      value={exp.dates}
                      onChange={(e) => updateArrayField('experience', index, { ...exp, dates: e.target.value })}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  {exp.bullets.slice(0, 4).map((bullet, bIndex) => (
                    <input
                      key={bIndex}
                      type="text"
                      placeholder={`Achievement ${bIndex + 1}`}
                      value={bullet}
                      onChange={(e) => {
                        const newBullets = [...exp.bullets]
                        newBullets[bIndex] = e.target.value
                        updateArrayField('experience', index, { ...exp, bullets: newBullets })
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
                    />
                  ))}
                </div>
              ))}
            </section>

            {/* Projects */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-black border-b pb-2">Projects</h2>
              {formData.projects.slice(0, 1).map((proj, index) => (
                <div key={index} className="mb-6 p-4 border border-gray-200 rounded">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <input
                      type="text"
                      placeholder="Project Name"
                      value={proj.title}
                      onChange={(e) => updateArrayField('projects', index, { ...proj, title: e.target.value })}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Technologies"
                      value={proj.tech}
                      onChange={(e) => updateArrayField('projects', index, { ...proj, tech: e.target.value })}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Date"
                      value={proj.dates}
                      onChange={(e) => updateArrayField('projects', index, { ...proj, dates: e.target.value })}
                      className="border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  {proj.bullets.slice(0, 3).map((bullet, bIndex) => (
                    <input
                      key={bIndex}
                      type="text"
                      placeholder={`Detail ${bIndex + 1}`}
                      value={bullet}
                      onChange={(e) => {
                        const newBullets = [...proj.bullets]
                        newBullets[bIndex] = e.target.value
                        updateArrayField('projects', index, { ...proj, bullets: newBullets })
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
                    />
                  ))}
                </div>
              ))}
            </section>

            {/* Education */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-black border-b pb-2">Education</h2>
              {formData.education.slice(0, 1).map((edu, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 mb-3">
                  <input
                    type="text"
                    placeholder="Degree"
                    value={edu.degree}
                    onChange={(e) => updateArrayField('education', index, { ...edu, degree: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2 col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="University"
                    value={edu.university}
                    onChange={(e) => updateArrayField('education', index, { ...edu, university: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={edu.location}
                    onChange={(e) => updateArrayField('education', index, { ...edu, location: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Dates"
                    value={edu.dates}
                    onChange={(e) => updateArrayField('education', index, { ...edu, dates: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="GPA (optional)"
                    value={edu.gpa}
                    onChange={(e) => updateArrayField('education', index, { ...edu, gpa: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              ))}
            </section>

            {/* Certifications */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-black border-b pb-2">Certifications</h2>
              {formData.certifications.slice(0, 1).map((cert, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 mb-3">
                  <input
                    type="text"
                    placeholder="Certification Name"
                    value={cert.title}
                    onChange={(e) => updateArrayField('certifications', index, { ...cert, title: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Issuer"
                    value={cert.issuer}
                    onChange={(e) => updateArrayField('certifications', index, { ...cert, issuer: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Date"
                    value={cert.date}
                    onChange={(e) => updateArrayField('certifications', index, { ...cert, date: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              ))}
            </section>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-black text-white py-3 px-6 rounded font-semibold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating PDF...' : 'Generate Resume PDF'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

