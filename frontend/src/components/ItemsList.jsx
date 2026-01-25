import { useState, useMemo } from 'react'
import { ClipboardList, Edit2, Trash2, Check, X, ArrowUpDown, Search, ChevronDown } from 'lucide-react'

function ItemsList({ expenses, members, onRefresh }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [filterPayer, setFilterPayer] = useState('all')
  const [filterSplitWith, setFilterSplitWith] = useState('all')
  const [sortBy, setSortBy] = useState('date') // date, name, amount
  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(20) // Start with 20 items
  const ITEMS_PER_PAGE = 20

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

  const calculateShare = (total, count) => {
    return count > 0 ? total / count : 0;
  };

  if (expenses.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-icon"><ClipboardList size={80} strokeWidth={1.5} opacity={0.4} /></div>
          <p>No items yet</p>
          <small>Add items from the "Add Items" page to see them here!</small>
        </div>
      </div>
    )
  }

  // Filter and sort expenses - memoized for performance
  const filteredAndSortedExpenses = useMemo(() => {
    // First filter
    let filtered = expenses.filter(expense => {
      const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
      const payerMatch = filterPayer === 'all' || paidById === filterPayer
      
      const splitMatch = filterSplitWith === 'all' || expense.splitWith.some(member => {
        if (!member) return false
        const memberId = typeof member === 'object' ? member._id : member
        return memberId === filterSplitWith
      })
      
      // Search filter
      const searchMatch = searchQuery === '' || 
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getMemberName(paidById).toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.splitWith.some(member => {
          const memberName = typeof member === 'object' ? member.name : getMemberName(member)
          return memberName.toLowerCase().includes(searchQuery.toLowerCase())
        })
      
      return payerMatch && splitMatch && searchMatch
    })
    
    // Then sort
    switch(sortBy) {
      case 'date':
        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
      case 'name':
        return filtered.sort((a, b) => a.description.localeCompare(b.description))
      case 'amount':
        return filtered.sort((a, b) => b.amount - a.amount)
      default:
        return filtered
    }
  }, [expenses, filterPayer, filterSplitWith, searchQuery, sortBy, members])

  // Paginated items to display
  const displayedExpenses = useMemo(() => {
    return filteredAndSortedExpenses.slice(0, displayCount)
  }, [filteredAndSortedExpenses, displayCount])

  // Load more handler
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE)
  }

  // Reset pagination when filters change
  const resetPagination = () => {
    setDisplayCount(ITEMS_PER_PAGE)
  }

  return (
    <div className="items-page">
      <div className="card items-list">
        <div className="card-header">
          <h2><ClipboardList size={28} style={{ display: 'inline-block', marginRight: '8px' }} /> All Items</h2>
          <div className="header-controls">
            <div className="filter-group clickable">
              <label htmlFor="filter-payer">Paid By:</label>
              <select id="filter-payer" value={filterPayer} onChange={(e) => { setFilterPayer(e.target.value); resetPagination(); }} className="filter-select">
                <option value="all">All Payers</option>
                {members.map(member => (
                  <option key={member._id} value={member._id}>{member.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group clickable">
              <label htmlFor="filter-split">Split With:</label>
              <select id="filter-split" value={filterSplitWith} onChange={(e) => { setFilterSplitWith(e.target.value); resetPagination(); }} className="filter-select">
                <option value="all">All Members</option>
                {members.map(member => (
                  <option key={member._id} value={member._id}>{member.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group clickable">
              <label htmlFor="filter-sort"><ArrowUpDown size={16} /> Sort:</label>
              <select id="filter-sort" value={sortBy} onChange={(e) => { setSortBy(e.target.value); resetPagination(); }} className="filter-select">
                <option value="date">Date (Newest)</option>
                <option value="name">Name (A-Z)</option>
                <option value="amount">Amount (High-Low)</option>
              </select>
            </div>
            <span className="item-count">{filteredAndSortedExpenses.length} {filteredAndSortedExpenses.length === 1 ? 'item' : 'items'}</span>
          </div>
        </div>
        <div className="search-bar-container">
          <div className="search-box-full">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search items by description or member name..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); resetPagination(); }}
              className="search-input-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="search-clear-btn"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="table-container">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Item</th>
              <th>Paid By</th>
              <th>Amount</th>
              <th>Split Between</th>
              <th>Each Pays</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedExpenses.map(expense => {
              const isEditing = editingId === expense._id
              const sharePerPerson = calculateShare(
                isEditing ? editForm.amount : expense.amount,
                isEditing ? editForm.splitWith.length : expense.splitWith.length
              );
              const splitNames = expense.splitWith
                .filter(m => m != null)
                .map(m => {
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
                  <td data-label="Paid By" className="paid-by-cell">
                    {getMemberName(typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy)}
                  </td>
                  <td data-label="Amount" className="amount">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value)})}
                        className="edit-input edit-amount"
                      />
                    ) : (
                      `₱${expense.amount.toFixed(2)}`
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
                    ₱{sharePerPerson.toFixed(2)}
                  </td>
                  <td data-label="Actions">
                    {isEditing ? (
                      <div className="action-buttons">
                        <button 
                          onClick={() => saveEdit(expense._id)} 
                          className="save-btn"
                          title="Save"
                        >
                          <Check size={20} />
                        </button>
                        <button 
                          onClick={cancelEdit} 
                          className="cancel-btn"
                          title="Cancel"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="action-buttons">
                        <button 
                          onClick={() => startEdit(expense)} 
                          className="edit-btn"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => deleteExpense(expense._id)} 
                          className="delete-btn"
                          title="Delete"
                        >
                          <Trash2 size={18} />
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
      {displayedExpenses.length < filteredAndSortedExpenses.length && (
        <div className="load-more-container">
          <button onClick={handleLoadMore} className="load-more-btn">
            <ChevronDown size={20} />
            Load More ({filteredAndSortedExpenses.length - displayedExpenses.length} remaining)
          </button>
          <small style={{ color: '#64748b', marginTop: '8px' }}>
            Showing {displayedExpenses.length} of {filteredAndSortedExpenses.length} items
          </small>
        </div>
      )}
    </div>
    </div>
  )
}

export default ItemsList
