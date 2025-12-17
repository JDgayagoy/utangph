import { useState, useEffect } from 'react'
import { Users, Lock, Plus, ArrowRight } from 'lucide-react'
import './GroupSelection.css'

function GroupSelection({ onGroupSelect }) {
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_URL}/groups`)
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      setError('Failed to load groups')
    }
  }

  const handleGroupClick = (group) => {
    setSelectedGroup(group)
    setPassword('')
    setError('')
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/groups/${selectedGroup._id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Store group info in localStorage
        localStorage.setItem('currentGroup', JSON.stringify(data.group))
        onGroupSelect(data.group)
      } else {
        setError(data.message || 'Incorrect password')
      }
    } catch (error) {
      console.error('Error verifying password:', error)
      setError('Failed to verify password')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedGroup(null)
    setPassword('')
    setError('')
  }

  if (showCreateForm) {
    return (
      <CreateGroupForm
        onCancel={() => setShowCreateForm(false)}
        onSuccess={(group) => {
          setShowCreateForm(false)
          fetchGroups()
          onGroupSelect(group)
        }}
        API_URL={API_URL}
      />
    )
  }

  return (
    <div className="group-selection-container">
      <div className="group-selection-card">
        <div className="group-selection-header">
          <h1>UtangPH</h1>
          <p>Select a group to continue</p>
        </div>

        {!selectedGroup ? (
          <>
            <div className="groups-list">
              {groups.length === 0 ? (
                <div className="no-groups">
                  <p>No groups available</p>
                  <p className="hint">Create a new group to get started</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group._id}
                    className="group-item"
                    onClick={() => handleGroupClick(group)}
                  >
                    <div className="group-info">
                      <h3>{group.name}</h3>
                      <div className="group-meta">
                        <Users size={16} />
                        <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
                      </div>
                    </div>
                    <ArrowRight size={20} className="group-arrow" />
                  </div>
                ))
              )}
            </div>

            <button
              className="create-group-button"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus size={20} />
              Create New Group
            </button>
          </>
        ) : (
          <div className="password-form-container">
            <div className="selected-group-info">
              <h2>{selectedGroup.name}</h2>
              <p>{selectedGroup.memberCount} {selectedGroup.memberCount === 1 ? 'member' : 'members'}</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label htmlFor="password">
                  <Lock size={18} />
                  Enter Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Group password"
                  required
                  autoFocus
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !password}
                >
                  {loading ? 'Verifying...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function CreateGroupForm({ onCancel, onSuccess, API_URL }) {
  const [groupName, setGroupName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          password,
          createdBy: 'User'
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Store group info in localStorage
        localStorage.setItem('currentGroup', JSON.stringify(data))
        onSuccess(data)
      } else {
        setError(data.message || 'Failed to create group')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      setError('Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group-selection-container">
      <div className="group-selection-card">
        <div className="group-selection-header">
          <h1>Create New Group</h1>
          <p>Set up a new expense tracking group</p>
        </div>

        <form onSubmit={handleSubmit} className="create-group-form">
          <div className="form-group">
            <label htmlFor="groupName">Group Name</label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., EOG CONDO, Family Expenses"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={18} />
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password for this group"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <Lock size={18} />
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !groupName || !password || !confirmPassword}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GroupSelection
