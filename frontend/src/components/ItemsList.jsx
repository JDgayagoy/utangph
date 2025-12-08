import { useState } from 'react'

function ItemsList({ expenses, members, onRefresh }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const getMemberName = (memberId) => {
    const member = members.find(m => m._id === memberId)
    return member ? member.name : 'Unknown'
  }

  const startEdit = (expense) => {
    setEditingId(expense._id)
    setEditForm({
      description: expense.description,
      amount: expense.amount,
      splitWith: expense.splitWith.map(m => typeof m === 'object' ? m._id : m)
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (id) => {
    try {
      const response = await fetch(`${API_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (response.ok) {
        setEditingId(null)
        setEditForm({})
        onRefresh()
      }
    } catch (error) {
      console.error('Error updating expense:', error)
    }
  }

  const deleteExpense = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      const response = await fetch(`${API_URL}/expenses/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const toggleSplitMember = (memberId) => {
    const currentSplit = editForm.splitWith || []
    if (currentSplit.includes(memberId)) {
      setEditForm({
        ...editForm,
        splitWith: currentSplit.filter(id => id !== memberId)
      })
    } else {
      setEditForm({
        ...editForm,
        splitWith: [...currentSplit, memberId]
      })
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const calculateRoundedShare = (total, count) => {
    return Math.ceil(total / count);
  };

  if (expenses.length === 0) {
    return (
      <div className="card">
        <h2>All Items</h2>
        <div className="empty-state">
          <p>No items yet. Add items above to get started!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card items-list">
      <h2>All Items</h2>
      <div className="table-container">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Item</th>
              <th>Total</th>
              <th>Split Between</th>
              <th>Each Pays</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(expense => {
              const isEditing = editingId === expense._id
              const sharePerPerson = calculateRoundedShare(
                isEditing ? editForm.amount : expense.amount,
                isEditing ? editForm.splitWith.length : expense.splitWith.length
              );
              const splitNames = expense.splitWith.map(m => {
                const name = typeof m === 'object' ? m.name : getMemberName(m)
                return name
              }).join(', ')
              
              return (
                <tr key={expense._id} className={isEditing ? 'editing-row' : ''}>
                  <td data-label="Date">{formatDate(expense.date)}</td>
                  <td data-label="Item">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        className="edit-input"
                      />
                    ) : (
                      expense.description
                    )}
                  </td>
                  <td data-label="Total" className="amount">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value)})}
                        className="edit-input edit-amount"
                      />
                    ) : (
                      `
                      \u20b1${expense.amount.toFixed(2)}`
                    )}
                  </td>
                  <td data-label="Split Between">
                    {isEditing ? (
                      <div className="edit-split-checkboxes">
                        {members.map(member => (
                          <label key={member._id} className="edit-checkbox-label">
                            <input
                              type="checkbox"
                              checked={editForm.splitWith.includes(member._id)}
                              onChange={() => toggleSplitMember(member._id)}
                            />
                            <span>{member.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      splitNames
                    )}
                  </td>
                  <td data-label="Each Pays" className="amount">
                    \u20b1{sharePerPerson.toFixed(2)}
                  </td>
                  <td data-label="Actions">
                    {isEditing ? (
                      <div className="action-buttons">
                        <button 
                          onClick={() => saveEdit(expense._id)} 
                          className="save-btn"
                          title="Save"
                        >
                          \u2713
                        </button>
                        <button 
                          onClick={cancelEdit} 
                          className="cancel-btn"
                          title="Cancel"
                        >
                          \u2715
                        </button>
                      </div>
                    ) : (
                      <div className="action-buttons">
                        <button 
                          onClick={() => startEdit(expense)} 
                          className="edit-btn"
                          title="Edit"
                        >
                          \u270f\ufe0f
                        </button>
                        <button 
                          onClick={() => deleteExpense(expense._id)} 
                          className="delete-btn"
                          title="Delete"
                        >
                          \ud83d\uddd1\ufe0f
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ItemsList
