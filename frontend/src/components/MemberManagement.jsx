import { useState, useEffect } from 'react'
import { Users, UserPlus, QrCode, X, Upload, Check, Image, Edit2, Trash2 } from 'lucide-react'

function MemberManagement({ members, onAddMember, onRefresh, expenses = [] }) {
  const [name, setName] = useState('')
  const [selectedMemberForQr, setSelectedMemberForQr] = useState('')
  const [allQrCodes, setAllQrCodes] = useState({})
  const [showAddQrForm, setShowAddQrForm] = useState(false)
  const [editingQr, setEditingQr] = useState(null)
  const [viewingQr, setViewingQr] = useState(null)
  const [confirmToggle, setConfirmToggle] = useState(null)
  const [qrFormData, setQrFormData] = useState({
    label: '',
    imageFile: null,
    imagePreview: null
  })

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  useEffect(() => {
    if (members.length > 0) {
      fetchAllQRCodes()
    }
  }, [members])

  const fetchAllQRCodes = async () => {
    try {
      const qrData = {}
      await Promise.all(
        members.filter(Boolean).map(async (member) => {
          if (!member?._id) return
          try {
            const response = await fetch(`${API_URL}/members/${member._id}/qrcodes`)
            if (response.ok) {
              const data = await response.json()
              qrData[member._id] = data || []
            }
          } catch (error) {
            console.error(`Error fetching QR codes for ${member.name}:`, error)
          }
        })
      )
      setAllQrCodes(qrData)
    } catch (error) {
      console.error('Error fetching QR codes:', error)
    }
  }

  const checkMemberHasTransactions = (memberId) => {
    if (!expenses || expenses.length === 0) return false
    
    return expenses.some(expense => {
      const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
      const splitWithIds = expense.splitWith.map(m => 
        typeof m === 'object' ? m._id : m
      )
      
      return paidById === memberId || splitWithIds.includes(memberId)
    })
  }

  const handleToggleClick = (memberId, currentStatus) => {
    const member = members.find(m => m._id === memberId)
    
    // If trying to deactivate, check for transactions
    if (currentStatus !== false) {
      const hasTransactions = checkMemberHasTransactions(memberId)
      if (hasTransactions) {
        alert(`Cannot deactivate ${member.name} because they have active transactions (either as payer or participant). Please settle all expenses first.`)
        return
      }
    }
    
    setConfirmToggle({ id: memberId, name: member.name, currentStatus })
  }

  const confirmToggleAction = async () => {
    if (!confirmToggle) return
    
    try {
      const response = await fetch(`${API_URL}/members/${confirmToggle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !confirmToggle.currentStatus })
      })
      if (response.ok) {
        onRefresh()
        setConfirmToggle(null)
      }
    } catch (error) {
      console.error('Error toggling member status:', error)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert('Please enter a name')
      return
    }

    onAddMember({ name: name.trim() })
    setName('')
  }

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
      setQrFormData(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      }))
    }
  }

  const handleAddQRCode = async (e) => {
    e.preventDefault()
    if (!qrFormData.label?.trim() || !qrFormData.imageFile || !selectedMemberForQr) {
      alert('Please fill in all fields')
      return
    }

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('label', qrFormData.label)
      formDataToSend.append('image', qrFormData.imageFile)

      const response = await fetch(`${API_URL}/members/${selectedMemberForQr}/qrcodes`, {
        method: 'POST',
        body: formDataToSend
      })

      if (response.ok) {
        setQrFormData({ label: '', imageFile: null, imagePreview: null })
        setShowAddQrForm(false)
        setSelectedMemberForQr('')
        fetchAllQRCodes()
      }
    } catch (error) {
      console.error('Error adding QR code:', error)
      alert('Failed to add QR code')
    }
  }

  const handleUpdateQRCode = async (memberId, qr) => {
    if (!qrFormData.label?.trim()) {
      alert('Please fill in label')
      return
    }

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('label', qrFormData.label)
      if (qrFormData.imageFile) formDataToSend.append('image', qrFormData.imageFile)

      const response = await fetch(`${API_URL}/members/${memberId}/qrcodes/${qr._id}`, {
        method: 'PUT',
        body: formDataToSend
      })

      if (response.ok) {
        setQrFormData({ label: '', imageFile: null, imagePreview: null })
        setEditingQr(null)
        fetchAllQRCodes()
      }
    } catch (error) {
      console.error('Error updating QR code:', error)
      alert('Failed to update QR code')
    }
  }

  const handleDeleteQRCode = async (memberId, qrId) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return

    try {
      const response = await fetch(`${API_URL}/members/${memberId}/qrcodes/${qrId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchAllQRCodes()
      }
    } catch (error) {
      console.error('Error deleting QR code:', error)
      alert('Failed to delete QR code')
    }
  }

  const startEditing = (qr) => {
    setEditingQr(qr._id)
    setQrFormData({
      label: qr.label || '',
      imageFile: null,
      imagePreview: qr.imageData || null
    })
    setShowAddQrForm(false)
  }

  const cancelEditing = () => {
    setEditingQr(null)
    setQrFormData({ label: '', imageFile: null, imagePreview: null })
  }

  const filteredQrCodes = selectedMemberForQr 
    ? Object.entries(allQrCodes).filter(([memberId]) => memberId === selectedMemberForQr)
    : Object.entries(allQrCodes)

  return (
    <div className="members-page">
      <div className="card">
        <div className="card-header">
          <h2><Users size={28} style={{ display: 'inline-block', marginRight: '8px' }} /> Team Members</h2>
          <span className="member-count">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
        </div>
        
        <form onSubmit={handleSubmit} className="add-member-form">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter member name..."
            className="member-input"
          />
          <button type="submit" className="primary">
            <UserPlus size={20} /> Add Member
          </button>
        </form>

        {members.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users size={80} strokeWidth={1.5} opacity={0.4} /></div>
            <p>No members yet</p>
            <small>Add your first member above to get started!</small>
          </div>
        ) : (
          <div className="members-grid">
            {members.map(member => (
              <div key={member._id} className={`member-card ${member.isActive === false ? 'inactive' : ''}`}>
                <div className="member-avatar">{member.name.charAt(0).toUpperCase()}</div>
                <div className="member-info">
                  <span className="member-name">{member.name}</span>
                  {member.isActive === false && <span className="inactive-badge">Inactive</span>}
                </div>
                <div className="member-actions">
                  <label className="toggle-switch" title={member.isActive === false ? "Activate member" : "Deactivate member"}>
                    <input
                      type="checkbox"
                      checked={member.isActive !== false}
                      onChange={() => handleToggleClick(member._id, member.isActive !== false)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Codes Section */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <div className="card-header">
          <h2>
            <QrCode size={28} style={{ display: 'inline-block', marginRight: '8px' }} />
            Payment QR Codes
          </h2>
          <div className="header-actions">
            <select
              value={selectedMemberForQr}
              onChange={(e) => setSelectedMemberForQr(e.target.value)}
              className="member-select-compact"
              style={{ marginRight: 'var(--space-3)' }}
            >
              <option value="">All Members</option>
              {members.filter(Boolean).map(member => member?._id && (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
            <button 
              className="btn-primary"
              onClick={() => {
                if (!selectedMemberForQr) {
                  alert('Please select a member first')
                  return
                }
                setShowAddQrForm(true)
              }}
            >
              <UserPlus size={20} />
              Add QR Code
            </button>
          </div>
        </div>

        {showAddQrForm && selectedMemberForQr && (
          <div className="qr-form-card">
            <div className="qr-form-header">
              <h3>Add QR Code for {members.find(m => m?._id === selectedMemberForQr)?.name}</h3>
              <button
                onClick={() => {
                  setShowAddQrForm(false)
                  setQrFormData({ label: '', imageFile: null, imagePreview: null })
                }}
                className="qr-close-btn"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddQRCode} className="qr-form">
              <div className="form-group">
                <label htmlFor="qr-label">Label *</label>
                <input
                  id="qr-label"
                  type="text"
                  placeholder="e.g., GCash, Maya, Bank Transfer"
                  value={qrFormData.label}
                  onChange={(e) => setQrFormData({ ...qrFormData, label: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="qr-image">QR Code Image *</label>
                <div className="file-input-wrapper">
                  <input
                    id="qr-image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    required
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('qr-image')?.click()}
                    className="file-select-btn"
                  >
                    <Upload size={20} />
                    Choose Image
                  </button>
                  {qrFormData.imagePreview && (
                    <div className="image-preview">
                      <img src={qrFormData.imagePreview} alt="Preview" />
                    </div>
                  )}
                </div>
                <small>Maximum file size: 5MB. Supported formats: JPG, PNG, GIF</small>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  <Check size={20} />
                  Add QR Code
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="qr-codes-grid">
          {filteredQrCodes.flatMap(([memberId, qrCodes]) => 
            qrCodes.map(qr => {
              const member = members.find(m => m._id === memberId)
              return (
                <div key={qr._id} className="qr-code-card">
                  {editingQr === qr._id ? (
                    <div className="qr-edit-form">
                      <div className="form-group">
                        <label>Label</label>
                        <input
                          type="text"
                          value={qrFormData.label}
                          onChange={(e) => setQrFormData({ ...qrFormData, label: e.target.value })}
                          placeholder="QR Code Label"
                        />
                      </div>
                      <div className="form-group">
                        <label>Update Image (optional)</label>
                        <div className="file-input-wrapper">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            id={`edit-file-${qr._id}`}
                            style={{ display: 'none' }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`edit-file-${qr._id}`)?.click()}
                            className="file-select-btn"
                          >
                            <Upload size={16} />
                            Choose New Image
                          </button>
                        </div>
                        {qrFormData.imagePreview && (
                          <div className="image-preview-small">
                            <img src={qrFormData.imagePreview} alt="Preview" />
                          </div>
                        )}
                      </div>
                      <div className="form-actions-inline">
                        <button
                          onClick={() => handleUpdateQRCode(memberId, qr)}
                          className="btn-small btn-primary"
                        >
                          <Check size={16} />
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="btn-small btn-secondary"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="qr-card-header">
                        <div className="qr-card-title">
                          <h3>{qr.label}</h3>
                          <span className="qr-member-badge">{member?.name}</span>
                        </div>
                        <div className="qr-card-actions">
                          <button
                            onClick={() => startEditing(qr)}
                            className="icon-btn"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteQRCode(memberId, qr._id)}
                            className="icon-btn delete"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div
                        className="qr-card-image"
                        onClick={() => setViewingQr(qr)}
                        style={{ cursor: 'pointer' }}
                      >
                        {qr.imageData ? (
                          <img src={qr.imageData} alt={qr.label} />
                        ) : (
                          <div className="qr-placeholder">
                            <Image size={48} opacity={0.3} />
                            <span>No image</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setViewingQr(qr)}
                        className="btn-view-qr"
                      >
                        View Full Size
                      </button>
                    </>
                  )}
                </div>
              )
            })
          ).length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <QrCode size={80} strokeWidth={1.5} opacity={0.4} />
              </div>
              <p>No QR codes yet</p>
              <small>Add QR codes for members to display payment options</small>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmToggle && (
        <div className="modal-overlay" onClick={() => setConfirmToggle(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm {confirmToggle.currentStatus ? 'Deactivate' : 'Activate'} Member</h2>
              <button className="modal-close" onClick={() => setConfirmToggle(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to {confirmToggle.currentStatus ? 'deactivate' : 'activate'} <strong>{confirmToggle.name}</strong>?
              </p>
              {confirmToggle.currentStatus && (
                <p style={{ color: 'var(--color-warning)', marginTop: 'var(--space-3)' }}>
                  Note: Deactivated members won't appear in new expense forms.
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmToggle(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={confirmToggleAction}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View QR Modal */}
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

export default MemberManagement
