'use client'

import { useState } from 'react'
import { X, Trash2, ExternalLink, Calendar, MapPin, User, Mail, FileText, Clock } from 'lucide-react'
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
    jobUrl: job.jobUrl || '',
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
      jobUrl: formData.jobUrl || undefined,
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
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-black text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{job.company}</h2>
            <p className="text-gray-400 mt-1">{job.position}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
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
                    className="w-full px-4 py-2 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as JobStatus })}
                    className="w-full px-4 py-2 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
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
                    className="w-full px-4 py-2 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resume Version</label>
                  <input
                    type="text"
                    value={formData.resumeVersion}
                    onChange={e => setFormData({ ...formData, resumeVersion: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job URL</label>
                  <input
                    type="url"
                    value={formData.jobUrl}
                    onChange={e => setFormData({ ...formData, jobUrl: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-6">
              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Applied On</p>
                    <p className="font-medium">{formatDate(job.applicationDate)}</p>
                  </div>
                </div>

                {job.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-medium">{job.location}</p>
                    </div>
                  </div>
                )}

                {job.resumeVersion && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Resume Version</p>
                      <p className="font-medium">{job.resumeVersion}</p>
                    </div>
                  </div>
                )}

                {job.contactPerson && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Contact Person</p>
                      <p className="font-medium">{job.contactPerson}</p>
                    </div>
                  </div>
                )}

                {job.contactEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Contact Email</p>
                      <p className="font-medium">{job.contactEmail}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Job URL */}
              {job.jobUrl && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Job Posting</p>
                  <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-black hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Job Posting
                  </a>
                </div>
              )}

              {/* Notes */}
              {job.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Notes</p>
                  <div className="bg-gray-50 border-2 border-gray-900 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{job.notes}</p>
                  </div>
                </div>
              )}

              {/* Status History */}
              {job.statusHistory.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Status History
                  </p>
                  <div className="space-y-2">
                    {job.statusHistory.map((change, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-black rounded-full"></div>
                        <span className="text-gray-600">{formatDateTime(change.timestamp)}</span>
                        <span className="font-medium">
                          {getStatusLabel(change.from)} → {getStatusLabel(change.to)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-900 p-6 flex justify-between">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
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

