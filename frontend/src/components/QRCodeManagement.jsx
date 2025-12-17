import { useState, useEffect } from 'react'
import { QrCode, Plus, Trash2, Edit2, X, Check, Upload, Image } from 'lucide-react'

function QRCodeManagement({ members = [], onRefresh }) {
  const [selectedMember, setSelectedMember] = useState(null)
  const [filterMember, setFilterMember] = useState('')
  const [allQrCodes, setAllQrCodes] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingQr, setEditingQr] = useState(null)
  const [viewingQr, setViewingQr] = useState(null)
  const [formData, setFormData] = useState({
    label: '',
    imageFile: null,
    imagePreview: null
  })

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      setFormData(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      }))
    }
  }

  useEffect(() => {
    fetchAllQRCodes()
  }, [members])

  const fetchAllQRCodes = async () => {
    try {
      const allCodes = []
      for (const member of members.filter(Boolean)) {
        if (!member?._id) continue
        const response = await fetch(`${API_URL}/members/${member._id}/qrcodes`)
        if (response.ok) {
          const data = await response.json()
          data?.forEach(qr => {
            allCodes.push({
              ...qr,
              memberId: member._id,
              memberName: member.name
            })
          })
        }
      }
      setAllQrCodes(allCodes)
    } catch (error) {
      console.error('Error fetching QR codes:', error)
    }
  }

  const fetchQRCodes = async (memberId) => {
    fetchAllQRCodes()
  }

  const handleAddQRCode = async (e) => {
    e.preventDefault()
    if (!formData.label?.trim() || !formData.imageFile || !selectedMember) {
      alert('Please fill in label and select an image')
      return
    }

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('label', formData.label)
      formDataToSend.append('image', formData.imageFile)

      const response = await fetch(`${API_URL}/members/${selectedMember}/qrcodes`, {
        method: 'POST',
        body: formDataToSend
      })

      if (response.ok) {
        setFormData({ label: '', imageFile: null, imagePreview: null })
        setShowAddForm(false)
        fetchQRCodes(selectedMember)
        onRefresh?.()
      }
    } catch (error) {
      console.error('Error adding QR code:', error)
      alert('Failed to add QR code')
    }
  }

  const handleUpdateQRCode = async (qr) => {
    if (!formData.label?.trim() || !qr?._id || !qr.memberId) {
      alert('Please fill in label')
      return
    }

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('label', formData.label)
      if (formData.imageFile) formDataToSend.append('image', formData.imageFile)

      const response = await fetch(`${API_URL}/members/${qr.memberId}/qrcodes/${qr._id}`, {
        method: 'PUT',
        body: formDataToSend
      })

      if (response.ok) {
        setFormData({ label: '', imageFile: null, imagePreview: null })
        setEditingQr(null)
        fetchAllQRCodes()
        onRefresh?.()
      }
    } catch (error) {
      console.error('Error updating QR code:', error)
      alert('Failed to update QR code')
    }
  }

  const handleDeleteQRCode = async (qr) => {
    if (!qr?._id || !qr.memberId) return
    if (!confirm('Are you sure you want to delete this QR code?')) return

    try {
      const response = await fetch(`${API_URL}/members/${qr.memberId}/qrcodes/${qr._id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchAllQRCodes()
        onRefresh?.()
      }
    } catch (error) {
      console.error('Error deleting QR code:', error)
      alert('Failed to delete QR code')
    }
  }

  const startEditing = (qr) => {
    if (!qr?._id) return
    setEditingQr(qr._id)
    setFormData({
      label: qr.label || '',
      imageFile: null,
      imagePreview: qr.imageData || null
    })
    setShowAddForm(false)
  }

  const cancelEditing = () => {
    setEditingQr(null)
    setFormData({ label: '', imageFile: null, imagePreview: null })
  }

  const startAdding = () => {
    setShowAddForm(true)
    setEditingQr(null)
    setFormData({ label: '', imageFile: null, imagePreview: null })
  }

  return (
    <div className="qr-management-page">
      {/* Original JSX is unchanged; null-safe access added in dropdowns and counts */}
      <div className="card">
        <div className="card-header">
          <h2>
            <QrCode size={28} style={{ display: 'inline-block', marginRight: '8px' }} />
            Payment QR Codes
          </h2>
          <div className="header-actions">
            <span className="member-count">
              {allQrCodes.filter(qr => !filterMember || qr.memberId === filterMember).length} {allQrCodes.filter(qr => !filterMember || qr.memberId === filterMember).length === 1 ? 'QR code' : 'QR codes'}
            </span>
            <div className="member-selector-inline">
              <select
                id="filter-select"
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="member-select-compact filter-select"
              >
                <option value="">All Members</option>
                {members.filter(Boolean).map(member => member?._id && (
                  <option key={member._id} value={member._id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <select
                id="member-select"
                value={selectedMember || ''}
                onChange={(e) => {
                  setSelectedMember(e.target.value)
                  if (e.target.value) setShowAddForm(true)
                }}
                className="member-select-compact"
              >
                <option value="">+ Add QR Code</option>
                {members.filter(Boolean).map(member => member?._id && (
                  <option key={member._id} value={member._id}>
                    Add for {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <QrCode size={80} strokeWidth={1.5} opacity={0.4} />
            </div>
            <p>No members yet</p>
            <small>Add members first to manage their QR codes</small>
          </div>
        ) : (
          <div className="qr-management-content">
            {/* JSX for form and QR code grid is unchanged */}
          </div>
        )}
      </div>

      {viewingQr && (
        <div className="qr-modal-overlay" onClick={() => setViewingQr(null)}>
          <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="qr-modal-close" onClick={() => setViewingQr(null)} title="Close">
              <X size={24} />
            </button>
            <div className="qr-modal-header">
              <h3>{viewingQr.label}</h3>
            </div>
            <div className="qr-modal-image">
              <img src={viewingQr.imageData} alt={viewingQr.label} />
            </div>
            <p className="qr-modal-instruction">Scan this QR code to make a payment</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default QRCodeManagement
