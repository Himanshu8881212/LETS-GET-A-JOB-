import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { WandButton } from '@/components/ui/WandButton'

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

interface SectionProps {
  summary: string
  setSummary: (value: string) => void
  skillCategories: SkillCategory[]
  addSkillCategory: () => void
  removeSkillCategory: (id: string) => void
  updateSkillCategory: (id: string, field: 'name' | 'skills', value: string) => void
  experiences: Experience[]
  addExperience: () => void
  removeExperience: (index: number) => void
  updateExperience: (index: number, field: keyof Experience, value: any) => void
  addBullet: (expIndex: number) => void
  removeBullet: (expIndex: number, bulletIndex: number) => void
  updateBullet: (expIndex: number, bulletIndex: number, value: string) => void
  projects: Project[]
  addProject: () => void
  removeProject: (index: number) => void
  updateProject: (index: number, field: keyof Project, value: string) => void
  education: Education[]
  addEducation: () => void
  removeEducation: (index: number) => void
  updateEducation: (index: number, field: keyof Education, value: string) => void
  certifications: string[]
  languages: string[]
  awards: string[]
  hobbies: string[]
  publications: Publication[]
  extracurricular: Activity[]
  volunteer: Activity[]
  addListItem: (type: 'certifications' | 'languages' | 'awards' | 'hobbies') => void
  removeListItem: (type: 'certifications' | 'languages' | 'awards' | 'hobbies', index: number) => void
  updateListItem: (type: 'certifications' | 'languages' | 'awards' | 'hobbies', index: number, value: string) => void
  addPublication: () => void
  removePublication: (index: number) => void
  updatePublication: (index: number, field: keyof Publication, value: string) => void
  addActivity: (type: 'extracurricular' | 'volunteer') => void
  removeActivity: (type: 'extracurricular' | 'volunteer', index: number) => void
  updateActivity: (type: 'extracurricular' | 'volunteer', index: number, field: keyof Activity, value: string) => void
}

// Professional section header component
function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-brand-ink">{title}</h2>
        {subtitle && <p className="text-brand-steel text-xs mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  )
}

export function renderSection(sectionId: string, props: SectionProps) {
  switch (sectionId) {
    case 'summary':
      return (
        <section id="summary" key="summary" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <SectionHeader
            title="Professional Summary"
            subtitle="A brief overview of your professional background and key strengths"
            actions={
              <WandButton
                kind="resume_summary"
                content={props.summary}
                onPolished={(p) => props.setSummary(p)}
                title="Polish this summary with AI"
              />
            }
          />
          <div className="p-6">
            <Textarea
              label="Summary"
              required
              value={props.summary}
              onChange={(e) => props.setSummary(e.target.value)}
              rows={4}
              maxLength={500}
              showCharCount
              helperText="2-3 sentences that capture your professional identity and value proposition"
            />
          </div>
        </section>
      )

    case 'skills':
      return (
        <section id="skills" key="skills" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                Technical Skills
              </h2>
              <p className="text-brand-steel text-xs mt-1">Organize your skills into custom categories</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={props.addSkillCategory}
              disabled={props.skillCategories.length >= 10}
            >
              Add Category
            </Button>
          </div>
          <div className="p-6 space-y-4">
            {props.skillCategories.map((category, index) => (
              <div key={category.id} className="rounded-xl bg-brand-mist border border-brand-border p-5 hover:border-brand-steel transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-brand-slate">Category {index + 1}</span>
                  {props.skillCategories.length > 1 && (
                    <button
                      onClick={() => props.removeSkillCategory(category.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full px-2.5 py-1 transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <Input
                    label="Category Name"
                    value={category.name}
                    onChange={(e) => props.updateSkillCategory(category.id, 'name', e.target.value)}
                    maxLength={50}
                  />
                  <Input
                    label="Skills"
                    value={category.skills}
                    onChange={(e) => props.updateSkillCategory(category.id, 'skills', e.target.value)}
                    maxLength={200}
                    showCharCount
                    helperText="Comma-separated list"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )

    case 'experience':
      return (
        <section id="experience" key="experience" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                Work Experience
              </h2>
              <p className="text-brand-steel text-xs mt-1">Your professional work history and achievements</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={props.addExperience}
              disabled={props.experiences.length >= 10}
            >
              Add Experience
            </Button>
          </div>
          <div className="p-6 space-y-4">
            {props.experiences.map((exp, expIndex) => (
              <div key={expIndex} className="rounded-xl bg-brand-mist border border-brand-border p-5 hover:border-brand-steel transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-ink flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{expIndex + 1}</span>
                    </div>
                    <h3 className="text-sm font-bold text-brand-ink">Experience {expIndex + 1}</h3>
                  </div>
                  {props.experiences.length > 1 && (
                    <button
                      onClick={() => props.removeExperience(expIndex)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full px-2.5 py-1 transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Input
                    label="Job Title"
                    required
                    value={exp.title}
                    onChange={(e) => props.updateExperience(expIndex, 'title', e.target.value)}
                  />
                  <Input
                    label="Company"
                    required
                    value={exp.company}
                    onChange={(e) => props.updateExperience(expIndex, 'company', e.target.value)}
                  />
                  <Input
                    label="Location"
                    required
                    value={exp.location}
                    onChange={(e) => props.updateExperience(expIndex, 'location', e.target.value)}
                  />
                  <Input
                    label="Dates"
                    required
                    value={exp.dates}
                    onChange={(e) => props.updateExperience(expIndex, 'dates', e.target.value)}
                  />
                </div>
                <div className="pt-3 border-t border-brand-border">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-brand-slate">Key Achievements & Responsibilities</label>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => props.addBullet(expIndex)}
                      disabled={exp.bullets.length >= 10}
                    >
                      Add Bullet
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {exp.bullets.map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Textarea
                            value={bullet}
                            onChange={(e) => props.updateBullet(expIndex, bulletIndex, e.target.value)}
                            rows={2}
                            maxLength={300}
                            showCharCount
                          />
                        </div>
                        <div className="flex flex-col items-center pt-1">
                          <WandButton
                            kind="resume_experience_bullet"
                            content={bullet}
                            context={{ targetRole: exp.title, companyName: exp.company }}
                            onPolished={(p) => props.updateBullet(expIndex, bulletIndex, p)}
                            title="Polish this bullet"
                          />
                          {exp.bullets.length > 1 && (
                            <button
                              onClick={() => props.removeBullet(expIndex, bulletIndex)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 transition-colors rounded-full"
                              title="Remove bullet"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )

    case 'projects':
      return (
        <section id="projects" key="projects" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                Projects
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={props.addProject}
              disabled={props.projects.length >= 10}
            >
              Add Project
            </Button>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {props.projects.map((project, index) => (
                <div key={index} className="rounded-xl bg-brand-mist border border-brand-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-brand-ink">Project {index + 1}</h3>
                    {props.projects.length > 1 && (
                      <button
                        onClick={() => props.removeProject(index)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                  <Input
                    label="Project Title"
                    required
                    value={project.title}
                    onChange={(e) => props.updateProject(index, 'title', e.target.value)}
                  />
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Textarea
                        label="Description"
                        required
                        value={project.description}
                        onChange={(e) => props.updateProject(index, 'description', e.target.value)}
                        rows={3}
                        maxLength={300}
                        showCharCount
                      />
                    </div>
                    <div className="pt-6">
                      <WandButton
                        kind="resume_project_description"
                        content={project.description}
                        context={{ targetRole: project.title }}
                        onPolished={(p) => props.updateProject(index, 'description', p)}
                        title="Polish this project description"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'education':
      return (
        <section id="education" key="education" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                Education
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={props.addEducation}
              disabled={props.education.length >= 10}
            >
              Add Education
            </Button>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {props.education.map((edu, index) => (
                <div key={index} className="rounded-xl bg-brand-mist border border-brand-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-brand-ink">Education {index + 1}</h3>
                    {props.education.length > 1 && (
                      <button
                        onClick={() => props.removeEducation(index)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Degree"
                      required
                      value={edu.degree}
                      onChange={(e) => props.updateEducation(index, 'degree', e.target.value)}
                    />
                    <Input
                      label="Institution"
                      required
                      value={edu.institution}
                      onChange={(e) => props.updateEducation(index, 'institution', e.target.value)}
                    />
                    <Input
                      label="Location"
                      required
                      value={edu.location}
                      onChange={(e) => props.updateEducation(index, 'location', e.target.value)}
                    />
                    <Input
                      label="Dates"
                      required
                      value={edu.dates}
                      onChange={(e) => props.updateEducation(index, 'dates', e.target.value)}
                    />
                    <Input
                      label="GPA (Optional)"
                      value={edu.gpa}
                      onChange={(e) => props.updateEducation(index, 'gpa', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'certifications':
      return (
        <section id="certifications" key="certifications" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                Certifications
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => props.addListItem('certifications')}
              disabled={props.certifications.length >= 10}
            >
              Add
            </Button>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {props.certifications.map((cert, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={cert}
                    onChange={(e) => props.updateListItem('certifications', index, e.target.value)}
                    maxLength={150}
                  />
                  {props.certifications.length > 1 && (
                    <button
                      onClick={() => props.removeListItem('certifications', index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'languages':
      return (
        <section id="languages" key="languages" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                Languages
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => props.addListItem('languages')}
              disabled={props.languages.length >= 10}
            >
              Add
            </Button>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {props.languages.map((lang, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={lang}
                    onChange={(e) => props.updateListItem('languages', index, e.target.value)}
                    maxLength={100}
                  />
                  {props.languages.length > 1 && (
                    <button
                      onClick={() => props.removeListItem('languages', index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'awards':
      return (
        <section id="awards" key="awards" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                Awards & Honors
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => props.addListItem('awards')}
              disabled={props.awards.length >= 10}
            >
              Add
            </Button>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {props.awards.map((award, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={award}
                    onChange={(e) => props.updateListItem('awards', index, e.target.value)}
                    maxLength={150}
                  />
                  {props.awards.length > 1 && (
                    <button
                      onClick={() => props.removeListItem('awards', index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'publications':
      return (
        <section id="publications" key="publications" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                Publications
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={props.addPublication}
              disabled={props.publications.length >= 10}
            >
              Add Publication
            </Button>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {props.publications.map((pub, index) => (
                <div key={index} className="rounded-xl bg-brand-mist border border-brand-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-brand-ink">Publication {index + 1}</h3>
                    {props.publications.length > 1 && (
                      <button
                        onClick={() => props.removePublication(index)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                  <Input
                    label="Title"
                    value={pub.title}
                    onChange={(e) => props.updatePublication(index, 'title', e.target.value)}
                    maxLength={200}
                  />
                  <Textarea
                    label="Details"
                    value={pub.details}
                    onChange={(e) => props.updatePublication(index, 'details', e.target.value)}
                    rows={2}
                    maxLength={300}
                    showCharCount
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'extracurricular':
      return (
        <section id="extracurricular" key="extracurricular" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                Extracurricular Activities
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => props.addActivity('extracurricular')}
              disabled={props.extracurricular.length >= 10}
            >
              Add Activity
            </Button>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {props.extracurricular.map((activity, index) => (
                <div key={index} className="rounded-xl bg-brand-mist border border-brand-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-brand-ink">Activity {index + 1}</h3>
                    {props.extracurricular.length > 1 && (
                      <button
                        onClick={() => props.removeActivity('extracurricular', index)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                  <Input
                    label="Title/Role"
                    value={activity.title}
                    onChange={(e) => props.updateActivity('extracurricular', index, 'title', e.target.value)}
                    maxLength={150}
                  />
                  <Textarea
                    label="Details"
                    value={activity.details}
                    onChange={(e) => props.updateActivity('extracurricular', index, 'details', e.target.value)}
                    rows={2}
                    maxLength={300}
                    showCharCount
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'volunteer':
      return (
        <section id="volunteer" key="volunteer" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                Volunteer Experience
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => props.addActivity('volunteer')}
              disabled={props.volunteer.length >= 10}
            >
              Add Experience
            </Button>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {props.volunteer.map((activity, index) => (
                <div key={index} className="rounded-xl bg-brand-mist border border-brand-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-brand-ink">Experience {index + 1}</h3>
                    {props.volunteer.length > 1 && (
                      <button
                        onClick={() => props.removeActivity('volunteer', index)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                  <Input
                    label="Title/Organization"
                    value={activity.title}
                    onChange={(e) => props.updateActivity('volunteer', index, 'title', e.target.value)}
                    maxLength={150}
                  />
                  <Textarea
                    label="Details"
                    value={activity.details}
                    onChange={(e) => props.updateActivity('volunteer', index, 'details', e.target.value)}
                    rows={2}
                    maxLength={300}
                    showCharCount
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'hobbies':
      return (
        <section id="hobbies" key="hobbies" className="bg-white rounded-xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 bg-brand-mist border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                Hobbies & Interests
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => props.addListItem('hobbies')}
              disabled={props.hobbies.length >= 10}
            >
              Add
            </Button>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {props.hobbies.map((hobby, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={hobby}
                    onChange={(e) => props.updateListItem('hobbies', index, e.target.value)}
                    maxLength={100}
                  />
                  {props.hobbies.length > 1 && (
                    <button
                      onClick={() => props.removeListItem('hobbies', index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    default:
      return null
  }
}

