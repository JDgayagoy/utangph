import { useState } from 'react'
import { Users, UserPlus, Trash2 } from 'lucide-react'

function MemberManagement({ members, onAddMember, onRefresh }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert('Please enter a name')
      return
    }

    onAddMember({ name: name.trim() })
    setName('')
  }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const deleteMember = async (id) => {
    if (!confirm('Are you sure? This will affect expense calculations.')) return
    
    try {
      const response = await fetch(`${API_URL}/members/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error deleting member:', error)
    }
  }

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
              <div key={member._id} className="member-card">
                <div className="member-avatar">{member.name.charAt(0).toUpperCase()}</div>
                <div className="member-info">
                  <span className="member-name">{member.name}</span>
                </div>
                <button 
                  onClick={() => deleteMember(member._id)} 
                  className="member-delete"
                  title="Remove member"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MemberManagement
