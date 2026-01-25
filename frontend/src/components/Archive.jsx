import { useState, useMemo } from 'react'
import { Archive as ArchiveIcon, Calendar, User, DollarSign, Search, Filter, RotateCcw, CheckCircle, AlertCircle, X, ChevronDown } from 'lucide-react'

function Archive({ expenses, members, onRefresh }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMember, setFilterMember] = useState('all')
  const [filterPaidBy, setFilterPaidBy] = useState('all')
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month, custom
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('date-desc') // date-desc, date-asc, amount-desc, amount-asc
  const [confirmReverse, setConfirmReverse] = useState(null) // { expenseId, memberId, memberName, amount, description }
  const [processing, setProcessing] = useState(false)
  const [displayCount, setDisplayCount] = useState(20) // Start with 20 transactions
  const ITEMS_PER_PAGE = 20

  // Helper function to get payment status and details
  const getPaymentInfo = (expense, memberId) => {
    if (!expense.payments || expense.payments.length === 0) return null
    const payment = expense.payments.find(p => {
      if (!p || !p.memberId) return false
      const pId = typeof p.memberId === 'object' && p.memberId !== null ? p.memberId._id : p.memberId
      return pId === memberId
    })
    return payment && payment.paid ? payment : null
  }

  // Get all paid transactions
  const paidTransactions = useMemo(() => {
    const transactions = []

    expenses.forEach(expense => {
      const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
      const paidByName = typeof expense.paidBy === 'object' ? expense.paidBy.name : 
                         members.find(m => m._id === paidById)?.name || 'Unknown'
      const sharePerPerson = expense.amount / expense.splitWith.length

      // Check each person who split the expense
      expense.splitWith.forEach(member => {
        if (!member) return
        const memberId = typeof member === 'object' ? member._id : member
        const memberName = typeof member === 'object' ? member.name : 
                          members.find(m => m._id === memberId)?.name || 'Unknown'

        // Skip if this person is the payer (they don't owe themselves)
        if (memberId === paidById) return

        // Check if payment has been made
        const paymentInfo = getPaymentInfo(expense, memberId)
        if (paymentInfo) {
          transactions.push({
            id: `${expense._id}-${memberId}`,
            expenseId: expense._id,
            description: expense.description,
            totalAmount: expense.amount,
            shareAmount: sharePerPerson,
            paidBy: paidByName,
            paidById: paidById,
            paidFor: memberName,
            paidForId: memberId,
            paymentDate: paymentInfo.paidDate || expense.date,
            expenseDate: expense.date,
            splitCount: expense.splitWith.length,
            canReverse: true
          })
        }
      })
    })

    return transactions
  }, [expenses, members])

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = paidTransactions.filter(transaction => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchDescription = transaction.description.toLowerCase().includes(query)
        const matchPaidBy = transaction.paidBy.toLowerCase().includes(query)
        const matchPaidFor = transaction.paidFor.toLowerCase().includes(query)
        if (!matchDescription && !matchPaidBy && !matchPaidFor) return false
      }

      // Member filter (who paid the debt)
      if (filterMember !== 'all' && transaction.paidForId !== filterMember) return false

      // Paid by filter (who was owed)
      if (filterPaidBy !== 'all' && transaction.paidById !== filterPaidBy) return false

      // Date filter
      if (dateFilter !== 'all') {
        const paymentDate = new Date(transaction.paymentDate)
        const now = new Date()

        if (dateFilter === 'today') {
          if (paymentDate.toDateString() !== now.toDateString()) return false
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.setDate(now.getDate() - 7))
          if (paymentDate < weekAgo) return false
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1))
          if (paymentDate < monthAgo) return false
        } else if (dateFilter === 'custom') {
          if (startDate && new Date(transaction.paymentDate) < new Date(startDate)) return false
          if (endDate && new Date(transaction.paymentDate) > new Date(endDate)) return false
        }
      }

      return true
    })

    // Sort
    switch(sortBy) {
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
        break
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate))
        break
      case 'amount-desc':
        filtered.sort((a, b) => b.shareAmount - a.shareAmount)
        break
      case 'amount-asc':
        filtered.sort((a, b) => a.shareAmount - b.shareAmount)
        break
    }

    return filtered
  }, [paidTransactions, searchQuery, filterMember, filterPaidBy, dateFilter, startDate, endDate, sortBy])

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalTransactions = filteredTransactions.length
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.shareAmount, 0)
    
    // Initialize all members with 0 values
    const byMember = {}
    members.forEach(member => {
      byMember[member._id] = { 
        name: member.name, 
        count: 0, 
        amount: 0 
      }
    })
    
    // Add payment data for members who have made payments
    filteredTransactions.forEach(t => {
      if (byMember[t.paidForId]) {
        byMember[t.paidForId].count++
        byMember[t.paidForId].amount += t.shareAmount
      }
    })

    return { totalTransactions, totalAmount, byMember }
  }, [filteredTransactions, members])

  // Paginated transactions to display
  const displayedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, displayCount)
  }, [filteredTransactions, displayCount])

  // Load more handler
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE)
  }

  // Reset pagination when filters change
  const resetPagination = () => {
    setDisplayCount(ITEMS_PER_PAGE)
  }

  // Reverse payment
  const handleReversePayment = async () => {
    if (!confirmReverse) return
    
    setProcessing(true)
    try {
      const response = await fetch(
        `${API_URL}/expenses/${confirmReverse.expenseId}/payment/${confirmReverse.memberId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paid: false })
        }
      )

      if (response.ok) {
        if (onRefresh) await onRefresh()
        alert(`Payment reversed successfully!\n${confirmReverse.memberName} now owes ₱${confirmReverse.amount.toFixed(2)} again.`)
        setConfirmReverse(null)
      } else {
        const error = await response.json()
        alert(`Failed to reverse payment: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error reversing payment:', error)
      alert('Failed to reverse payment. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="archive-page">
      {/* Header Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <ArchiveIcon size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Transactions</h3>
            <p className="stat-value">{statistics.totalTransactions}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Amount Paid</h3>
            <p className="stat-value">₱{statistics.totalAmount.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <User size={24} />
          </div>
          <div className="stat-content">
            <h3>Active Members</h3>
            <p className="stat-value">{Object.keys(statistics.byMember).length}</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="archive-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); resetPagination(); }}
            />
          </div>

          <div className="filter-controls">
            <div className="filter-group">
              <Filter size={16} />
              <select value={filterMember} onChange={(e) => { setFilterMember(e.target.value); resetPagination(); }}>
                <option value="all">All Members</option>
                {members.map(member => (
                  <option key={member._id} value={member._id}>{member.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <select value={filterPaidBy} onChange={(e) => { setFilterPaidBy(e.target.value); resetPagination(); }}>
                <option value="all">Paid To (All)</option>
                {members.map(member => (
                  <option key={member._id} value={member._id}>{member.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <Calendar size={16} />
              <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); resetPagination(); }}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); resetPagination(); }}
                  className="date-input"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); resetPagination(); }}
                  className="date-input"
                />
              </>
            )}

            <div className="filter-group">
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); resetPagination(); }}>
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        <div className="card-header">
          <h2><ArchiveIcon size={28} style={{ display: 'inline-block', marginRight: '8px' }} /> Payment Archive</h2>
          <span className="item-count">{filteredTransactions.length} transactions</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <ArchiveIcon size={80} strokeWidth={1.5} opacity={0.4} />
            <p>No paid transactions found</p>
            <small>Completed payments will appear here for tracking and auditing</small>
          </div>
        ) : (
          <>
          <div className="transactions-list">
            {displayedTransactions.map(transaction => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-main">
                  <div className="transaction-icon">
                    <CheckCircle size={24} style={{ color: 'white' }} />
                  </div>
                  
                  <div className="transaction-details">
                    <h3>{transaction.description}</h3>
                    <div className="transaction-meta">
                      <span className="meta-item">
                        <User size={14} />
                        <strong>{transaction.paidFor}</strong> paid <strong>{transaction.paidBy}</strong>
                      </span>
                      <span className="meta-item">
                        <Calendar size={14} />
                        {formatDate(transaction.paymentDate)}
                      </span>
                      <span className="meta-item">
                        Original expense: {formatDateShort(transaction.expenseDate)}
                      </span>
                    </div>
                    <div className="transaction-breakdown">
                      <span>Total expense: ₱{transaction.totalAmount.toFixed(2)}</span>
                      <span>Split between {transaction.splitCount} people</span>
                      <span>Share paid: ₱{transaction.shareAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="transaction-actions">
                  <div className="transaction-amount">
                    ₱{transaction.shareAmount.toFixed(2)}
                  </div>
                  {transaction.canReverse && (
                    <button
                      className="reverse-btn"
                      onClick={() => setConfirmReverse({
                        expenseId: transaction.expenseId,
                        memberId: transaction.paidForId,
                        memberName: transaction.paidFor,
                        amount: transaction.shareAmount,
                        description: transaction.description
                      })}
                      title="Reverse this payment"
                    >
                      <RotateCcw size={18} />
                      Reverse
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {displayedTransactions.length < filteredTransactions.length && (
            <div className="load-more-container">
              <button onClick={handleLoadMore} className="load-more-btn">
                <ChevronDown size={20} />
                Load More ({filteredTransactions.length - displayedTransactions.length} remaining)
              </button>
              <small style={{ color: '#64748b', marginTop: '8px' }}>
                Showing {displayedTransactions.length} of {filteredTransactions.length} transactions
              </small>
            </div>
          )}
          </>
        )}
      </div>

      {/* Member Summary */}
      {members && members.length > 0 && (
        <div className="card">
          <h2>Payment Summary by Member</h2>
          <div className="member-summary-grid">
            {Object.entries(statistics.byMember).map(([memberId, data]) => (
              <div key={memberId} className="member-summary-card">
                <h3>{data.name}</h3>
                <div className="member-summary-stats">
                  <div className="summary-stat">
                    <span className="summary-label">Transactions</span>
                    <span className="summary-value">{data.count}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-label">Total Paid</span>
                    <span className="summary-value">₱{data.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reverse Confirmation Modal */}
      {confirmReverse && (
        <div className="modal-overlay" onClick={() => !processing && setConfirmReverse(null)}>
          <div className="modal-content reverse-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertCircle size={48} color="#f59e0b" />
              <h2>Reverse Payment</h2>
            </div>
            
            <div className="modal-body">
              <p className="warning-text">
                Are you sure you want to reverse this payment?
              </p>
              
              <div className="reverse-details">
                <div className="detail-row">
                  <span>Member:</span>
                  <strong>{confirmReverse.memberName}</strong>
                </div>
                <div className="detail-row">
                  <span>Description:</span>
                  <strong>{confirmReverse.description}</strong>
                </div>
                <div className="detail-row">
                  <span>Amount:</span>
                  <strong>₱{confirmReverse.amount.toFixed(2)}</strong>
                </div>
              </div>

              <div className="warning-box">
                <AlertCircle size={20} />
                <p>
                  This will restore the debt to the summary page. 
                  The member will need to pay again to clear this expense.
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmReverse(null)}
                disabled={processing}
              >
                <X size={18} />
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleReversePayment}
                disabled={processing}
              >
                <RotateCcw size={18} />
                {processing ? 'Reversing...' : 'Reverse Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Archive
