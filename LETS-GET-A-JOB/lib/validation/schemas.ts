import { z } from 'zod'

// Job Application Schemas
export const jobApplicationSchema = z.object({
  company: z.string().min(1).max(200).trim(),
  position: z.string().min(1).max(200).trim(),
  location: z.string().max(200).trim().optional(),
  job_url: z.string().url().optional().or(z.literal('')),
  status: z.enum(['applied', 'interviewing', 'offer', 'rejected', 'accepted', 'withdrawn']).default('applied'),
  salary_range: z.string().max(100).trim().optional(),
  job_description: z.string().max(10000).trim().optional(),
  notes: z.string().max(5000).trim().optional(),
  applied_date: z.string().optional(), // ISO date string
  follow_up_date: z.string().optional(),
  interview_date: z.string().optional(),
  offer_date: z.string().optional(),
  rejection_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  source: z.string().max(100).trim().optional(),
  contact_name: z.string().max(200).trim().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().max(50).trim().optional()
})

export const updateJobApplicationSchema = jobApplicationSchema.partial()

// Resume Data Schemas
export const personalInfoSchema = z.object({
  firstName: z.string().max(50).trim(),
  lastName: z.string().max(50).trim(),
  email: z.string().email().or(z.literal('')),
  phone: z.string().max(50).trim(),
  linkedin: z.string().max(200).trim().optional(),
  github: z.string().max(200).trim().optional()
})

export const skillCategorySchema = z.object({
  id: z.string(),
  name: z.string().max(100).trim(),
  skills: z.string().max(500).trim()
})

export const experienceSchema = z.object({
  title: z.string().max(200).trim(),
  company: z.string().max(200).trim(),
  location: z.string().max(200).trim(),
  dates: z.string().max(100).trim(),
  bullets: z.array(z.string().max(300).trim())
})

export const projectSchema = z.object({
  title: z.string().max(200).trim(),
  description: z.string().max(1000).trim()
})

export const educationSchema = z.object({
  degree: z.string().max(200).trim(),
  institution: z.string().max(200).trim(),
  location: z.string().max(200).trim().optional(),
  dates: z.string().max(100).trim().optional(),
  gpa: z.string().max(20).trim().optional()
})

export const publicationSchema = z.object({
  title: z.string().max(300).trim(),
  details: z.string().max(500).trim()
})

export const activitySchema = z.object({
  title: z.string().max(200).trim(),
  details: z.string().max(500).trim()
})

export const sectionConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean()
})

export const resumeDataSchema = z.object({
  personalInfo: personalInfoSchema,
  summary: z.string().max(500).trim().optional(),
  skillCategories: z.array(skillCategorySchema).optional(),
  experiences: z.array(experienceSchema).optional(),
  projects: z.array(projectSchema).optional(),
  education: z.array(educationSchema).optional(),
  certifications: z.array(z.string().max(200).trim()).optional(),
  languages: z.array(z.string().max(100).trim()).optional(),
  awards: z.array(z.string().max(200).trim()).optional(),
  publications: z.array(publicationSchema).optional(),
  extracurricular: z.array(activitySchema).optional(),
  volunteer: z.array(activitySchema).optional(),
  hobbies: z.array(z.string().max(100).trim()).optional(),
  sectionOrder: z.array(sectionConfigSchema).optional()
})

// Cover Letter Data Schemas
export const recipientInfoSchema = z.object({
  company: z.string().max(200).trim(),
  role: z.string().max(200).trim(),
  hiringManager: z.string().max(200).trim().optional(),
  address: z.string().max(300).trim().optional(),
  city: z.string().max(100).trim().optional()
})

export const coverLetterDataSchema = z.object({
  personalInfo: personalInfoSchema,
  recipientInfo: recipientInfoSchema,
  openingParagraph: z.string().max(1000).trim().optional(),
  bodyParagraphs: z.array(z.string().max(1000).trim()).optional(),
  closingParagraph: z.string().max(1000).trim().optional()
})

// Resume Version Schemas
export const saveResumeVersionSchema = z.object({
  version_name: z.string().min(1).max(200).trim(),
  description: z.string().max(500).trim().optional(),
  data: resumeDataSchema,
  tags: z.string().max(200).trim().optional(),
  is_favorite: z.boolean().optional()
})

export const updateResumeVersionSchema = z.object({
  version_name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.string().max(200).trim().optional(),
  is_favorite: z.boolean().optional()
})

// Cover Letter Version Schemas
export const saveCoverLetterVersionSchema = z.object({
  version_name: z.string().min(1).max(200).trim(),
  description: z.string().max(500).trim().optional(),
  data: coverLetterDataSchema,
  tags: z.string().max(200).trim().optional(),
  is_favorite: z.boolean().optional(),
  job_application_id: z.number().int().positive().optional()
})

export const updateCoverLetterVersionSchema = z.object({
  version_name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.string().max(200).trim().optional(),
  is_favorite: z.boolean().optional(),
  job_application_id: z.number().int().positive().optional()
})

// Activity Log Schema
export const activityLogSchema = z.object({
  action: z.string().max(50).trim(),
  entity_type: z.enum(['resume', 'cover_letter', 'job_application']),
  entity_id: z.number().int().positive().optional(),
  details: z.string().max(1000).trim().optional()
})

// Export types
export type JobApplication = z.infer<typeof jobApplicationSchema>
export type UpdateJobApplication = z.infer<typeof updateJobApplicationSchema>
export type ResumeData = z.infer<typeof resumeDataSchema>
export type CoverLetterData = z.infer<typeof coverLetterDataSchema>
export type SaveResumeVersion = z.infer<typeof saveResumeVersionSchema>
export type SaveCoverLetterVersion = z.infer<typeof saveCoverLetterVersionSchema>
export type ActivityLog = z.infer<typeof activityLogSchema>

