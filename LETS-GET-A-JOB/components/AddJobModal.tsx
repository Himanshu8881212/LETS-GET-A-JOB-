'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { JobApplication, JobStatus } from '@/types/job-tracker'

interface AddJobModalProps {
  onClose: () => void
  onAdd: (job: JobApplication) => void
}

export default function AddJobModal({ onClose, onAdd }: AddJobModalProps) {
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    status: 'applied' as JobStatus,
    applicationDate: new Date().toISOString().split('T')[0],
    salary: '',
    location: '',
    notes: '',
    resumeVersion: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newJob: JobApplication = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      company: formData.company,
      position: formData.position,
      status: formData.status,
      applicationDate: new Date(formData.applicationDate),
      salary: formData.salary || undefined,
      location: formData.location || undefined,
      notes: formData.notes,
      resumeVersion: formData.resumeVersion || undefined,
      statusHistory: [
        {
          from: 'new',
          to: formData.status,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    onAdd(newJob)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border-2 border-gray-900">
        {/* Header */}
        <div className="bg-black text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Add New Application</h2>
            <p className="text-gray-400 text-sm mt-0.5">Track your job application</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors text-sm text-black"
                placeholder="Google, Microsoft, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Position <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors text-sm text-black"
                placeholder="Software Engineer, Product Manager..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as JobStatus })}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors text-sm text-black"
              >
                <option value="applied">Applied</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Application Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.applicationDate}
                onChange={e => setFormData({ ...formData, applicationDate: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors text-sm text-black"
              />
            </div>
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Salary Range
              </label>
              <input
                type="text"
                value={formData.salary}
                onChange={e => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors text-sm text-black"
                placeholder="$100k - $150k"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors text-sm text-black"
                placeholder="San Francisco, CA / Remote"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Resume Version
              </label>
              <input
                type="text"
                value={formData.resumeVersion}
                onChange={e => setFormData({ ...formData, resumeVersion: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors text-sm text-black"
                placeholder="v1.0 - Software Engineer"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors text-sm text-black resize-none"
                placeholder="Quick notes about this application..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
            >
              Add Application
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

