'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'

export default function ContactUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile)
        setResult(null)
      } else {
        alert('Please select a CSV file')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post('/contacts/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setResult(response.data)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.response?.data?.error || 'Upload failed'
      })
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = `name,company,phone,email,title,notes
John Smith,ABC Realty,+19135551234,john@abcrealty.com,Broker,High-value properties
Jane Doe,XYZ Properties,+18165555678,jane@xyzprop.com,Property Manager,Multiple locations
Bob Wilson,Prime Commercial,+19135559876,bob@prime.com,Owner,Interested in aerial photos`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Contacts</h2>
        <p className="text-sm text-gray-600">
          Upload a CSV file with contact information. Phone numbers will be validated and duplicates will be skipped.
        </p>
      </div>

      <div className="space-y-4">
        {/* File Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              Click to upload CSV file
            </p>
            <p className="text-xs text-gray-500">
              or drag and drop
            </p>
          </label>
        </div>

        {/* Selected File */}
        {file && (
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-900">{file.name}</span>
              <span className="text-xs text-gray-500 ml-2">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              onClick={() => {
                setFile(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Contacts'}
          </button>
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Download Template
          </button>
        </div>

        {/* Upload Result */}
        {result && (
          <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-start">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.success ? 'Upload Successful' : 'Upload Failed'}
                </p>
                {result.success ? (
                  <div className="text-sm text-green-700 mt-1">
                    <p>• {result.imported} contacts imported</p>
                    {result.errors > 0 && (
                      <p>• {result.errors} contacts skipped (duplicates or invalid)</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-700 mt-1">{result.error}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSV Format Guide */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">CSV Format Guide</h3>
        <p className="text-xs text-blue-700 mb-2">
          Your CSV file should include the following columns:
        </p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <strong>name</strong> - Contact's full name</li>
          <li>• <strong>company</strong> - Company or organization</li>
          <li>• <strong>phone</strong> - Phone number (10 or 11 digits)</li>
          <li>• <strong>email</strong> - Email address (optional)</li>
          <li>• <strong>title</strong> - Job title or position (optional)</li>
          <li>• <strong>notes</strong> - Any additional notes (optional)</li>
        </ul>
      </div>
    </div>
  )
}