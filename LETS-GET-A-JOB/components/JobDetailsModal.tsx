'use client'

import { useState } from 'react'
import { X, Trash2, ExternalLink, Calendar, MapPin, User, Mail, FileText, Clock, DollarSign, Phone, Tag, AlertCircle, CheckCircle2, XCircle, Briefcase } from 'lucide-react'
import { JobApplication, JobStatus } from '@/types/job-tracker'

interface JobDetailsModalProps {
  job: JobApplication
  onClose: () => void
  onUpdate: (job: JobApplication) => void
  onDelete: (jobId: string) => void
}

export default function JobDetailsModal({ job, onClose, onUpdate, onDelete }: JobDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    const d = new Date(date)
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0]
    return d.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    company: job.company,
    position: job.position,
    status: job.status,
    applicationDate: formatDateForInput(job.applicationDate),
    location: job.location || '',
    salary: job.salary || '',
    jobUrl: job.jobUrl || '',
    jobDescription: job.jobDescription || '',
    contactPerson: job.contactPerson || '',
    contactEmail: job.contactEmail || '',
    notes: job.notes,
    resumeVersion: job.resumeVersion || '',
  })

  const handleSave = () => {
    const updatedJob: JobApplication = {
      ...job,
      company: formData.company,
      position: formData.position,
      status: formData.status,
      applicationDate: new Date(formData.applicationDate),
      location: formData.location || undefined,
      salary: formData.salary || undefined,
      jobUrl: formData.jobUrl || undefined,
      jobDescription: formData.jobDescription || undefined,
      contactPerson: formData.contactPerson || undefined,
      contactEmail: formData.contactEmail || undefined,
      notes: formData.notes,
      resumeVersion: formData.resumeVersion || undefined,
      updatedAt: new Date(),
      statusHistory:
        formData.status !== job.status
          ? [
            ...job.statusHistory,
            {
              from: job.status,
              to: formData.status,
              timestamp: new Date(),
            },
          ]
          : job.statusHistory,
    }

    onUpdate(updatedJob)
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the application for ${job.position} at ${job.company}?`)) {
      onDelete(job.id)
      onClose()
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'applied': 'Applied',
      'interview': 'Interview',
      'offer': 'Offer',
      'rejected': 'Rejected'
    }
    return labels[status] || status
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-300">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 text-white p-6 flex justify-between items-center border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold">{job.company}</h2>
            <p className="text-gray-400 mt-1">{job.position}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as JobStatus })}
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  >
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Application Date</label>
                  <input
                    type="date"
                    value={formData.applicationDate}
                    onChange={e => setFormData({ ...formData, applicationDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., San Francisco, CA or Remote"
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salary Range</label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={e => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="e.g., $120,000 - $150,000"
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resume Version</label>
                  <input
                    type="text"
                    value={formData.resumeVersion}
                    onChange={e => setFormData({ ...formData, resumeVersion: e.target.value })}
                    placeholder="e.g., v1.2 - Software Engineer"
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g., John Smith"
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="e.g., recruiter@company.com"
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Posting URL</label>
                  <input
                    type="url"
                    value={formData.jobUrl}
                    onChange={e => setFormData({ ...formData, jobUrl: e.target.value })}
                    placeholder="https://company.com/careers/job-posting"
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
                  <textarea
                    value={formData.jobDescription}
                    onChange={e => setFormData({ ...formData, jobDescription: e.target.value })}
                    rows={6}
                    placeholder="Paste the full job description here for reference..."
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Personal Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="Add your notes, interview prep, follow-up reminders, etc..."
                    className="w-full px-4 py-2 border border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 text-black"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-6">
              {/* Application Details Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Application Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Applied On</p>
                      <p className="font-medium text-gray-900">{formatDate(job.applicationDate)}</p>
                    </div>
                  </div>

                  {job.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium text-gray-900">{job.location}</p>
                      </div>
                    </div>
                  )}

                  {job.salary && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600">Salary Range</p>
                        <p className="font-medium text-gray-900">{job.salary}</p>
                      </div>
                    </div>
                  )}

                  {job.resumeVersion && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600">Resume Version</p>
                        <p className="font-medium text-gray-900">{job.resumeVersion}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information Section */}
              {(job.contactPerson || job.contactEmail) && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {job.contactPerson && (
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-600">Contact Person</p>
                          <p className="font-medium text-gray-900">{job.contactPerson}</p>
                        </div>
                      </div>
                    )}

                    {job.contactEmail && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <a href={`mailto:${job.contactEmail}`} className="font-medium text-gray-900 hover:text-black hover:underline">
                            {job.contactEmail}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Job Posting Link */}
              {job.jobUrl && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Job Posting
                  </h3>
                  <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Original Posting
                  </a>
                </div>
              )}

              {/* Job Description */}
              {job.jobDescription && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Job Description
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 p-4">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.jobDescription}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {job.notes && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notes
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 p-4">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.notes}</p>
                  </div>
                </div>
              )}

              {/* Status History */}
              {job.statusHistory.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Application Timeline
                  </h3>
                  <div className="space-y-3">
                    {job.statusHistory.map((change, index) => (
                      <div key={index} className="flex items-start gap-4 pb-3 border-b border-gray-200 last:border-0">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-900 flex items-center justify-center">
                          {change.to === 'applied' && <CheckCircle2 className="w-5 h-5 text-white" />}
                          {change.to === 'interview' && <Calendar className="w-5 h-5 text-white" />}
                          {change.to === 'offer' && <CheckCircle2 className="w-5 h-5 text-white" />}
                          {change.to === 'rejected' && <XCircle className="w-5 h-5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {getStatusLabel(change.from)} → {getStatusLabel(change.to)}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{formatDateTime(change.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-300 p-6 flex justify-between">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

