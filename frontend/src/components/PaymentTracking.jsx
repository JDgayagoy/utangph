import { useState, useMemo } from 'react'
import {
  Check,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react'

function PaymentTracking({ expenses = [], members = [], onRefresh }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const [updatingPayment, setUpdatingPayment] = useState(null)
  const [sortBy, setSortBy] = useState('date')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPayer, setFilterPayer] = useState('all')

  const updatePaymentStatus = async (expenseId, memberId, currentStatus) => {
    setUpdatingPayment(`${expenseId}-${memberId}`)
    try {
      const response = await fetch(
        `${API_URL}/expenses/${expenseId}/payment/${memberId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paid: !currentStatus })
        }
      )
      if (response.ok && onRefresh) {
        await onRefresh()
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
      alert('Failed to update payment status. Please try again.')
    } finally {
      setUpdatingPayment(null)
    }
  }

  // ✅ FIXED: merge conflict resolved
  const getPaymentStatus = (expense, memberId) => {
    if (!expense?.payments?.length) return false

    const payment = expense.payments.find(
      p => (p?.memberId?._id ?? p?.memberId) === memberId
    )

    return payment?.paid ?? false
  }

  const getExpensePaymentProgress = (expense) => {
    if (!expense?.splitWith?.length) {
      return { paidCount: 0, totalCount: 0, percentage: 0 }
    }

    const paidById = expense.paidBy?._id ?? expense.paidBy
    let paidCount = 0
    const totalCount = expense.splitWith.length

    expense.splitWith.filter(Boolean).forEach(member => {
      const memberId = member?._id ?? member
      if (memberId === paidById || getPaymentStatus(expense, memberId)) {
        paidCount++
      }
    })

    return {
      paidCount,
      totalCount,
      percentage: totalCount > 0 ? (paidCount / totalCount) * 100 : 0
    }
  }

  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = [...expenses]

    if (filterPayer !== 'all') {
      filtered = filtered.filter(
        exp => (exp?.paidBy?._id ?? exp?.paidBy) === filterPayer
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(exp => {
        const pct = getExpensePaymentProgress(exp).percentage
        if (filterStatus === 'paid') return pct === 100
        if (filterStatus === 'unpaid') return pct === 0
        if (filterStatus === 'partial') return pct > 0 && pct < 100
        return true
      })
    }

    switch (sortBy) {
      case 'date':
        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
      case 'name':
        return filtered.sort((a, b) =>
          a.description.localeCompare(b.description)
        )
      case 'amount':
        return filtered.sort((a, b) => b.amount - a.amount)
      case 'status':
        return filtered.sort(
          (a, b) =>
            getExpensePaymentProgress(a).percentage -
            getExpensePaymentProgress(b).percentage
        )
      default:
        return filtered
    }
  }, [expenses, sortBy, filterStatus, filterPayer])

  const statistics = useMemo(() => {
    let fullyPaid = 0
    let partiallyPaid = 0
    let unpaid = 0
    let totalPaidAmount = 0

    expenses.forEach(expense => {
      const progress = getExpensePaymentProgress(expense)
      const share = expense.amount / (expense.splitWith?.length || 1)
      const paidById = expense.paidBy?._id ?? expense.paidBy

      if (progress.percentage === 100) fullyPaid++
      else if (progress.percentage > 0) partiallyPaid++
      else unpaid++

      expense.splitWith?.filter(Boolean).forEach(member => {
        const memberId = member?._id ?? member
        if (memberId === paidById || getPaymentStatus(expense, memberId)) {
          totalPaidAmount += share
        }
      })
    })

    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0)

    return {
      totalExpenses: expenses.length,
      totalAmount,
      fullyPaid,
      partiallyPaid,
      unpaid,
      totalPaidAmount,
      percentagePaid:
        totalAmount > 0 ? (totalPaidAmount / totalAmount) * 100 : 0
    }
  }, [expenses])

  return (
    <div className="payment-tracking-page">
      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            <Check size={28} />
          </div>
          <div className="stat-content">
            <h3>Total Expenses</h3>
            <p className="stat-value">{statistics.totalExpenses}</p>
            <span className="stat-label">₱{statistics.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <CheckCircle size={28} />
          </div>
          <div className="stat-content">
            <h3>Fully Paid</h3>
            <p className="stat-value">{statistics.fullyPaid}</p>
            <span className="stat-label">
              {statistics.totalExpenses > 0
                ? ((statistics.fullyPaid / statistics.totalExpenses) * 100).toFixed(0)
                : 0}% complete
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <TrendingUp size={28} />
          </div>
          <div className="stat-content">
            <h3>Partial Payment</h3>
            <p className="stat-value">{statistics.partiallyPaid}</p>
            <span className="stat-label">In progress</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <XCircle size={28} />
          </div>
          <div className="stat-content">
            <h3>Unpaid</h3>
            <p className="stat-value">{statistics.unpaid}</p>
            <span className="stat-label">Needs attention</span>
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="card">
        <div className="card-header">
          <h2><DollarSign size={28} /> Overall Payment Progress</h2>
        </div>
        <div className="overall-progress">
          <div className="progress-bar-large">
            <div
              className="progress-bar-fill-large"
              style={{ width: `${statistics.percentagePaid}%` }}
            />
          </div>
          <div className="progress-stats">
            <span>₱{statistics.totalPaidAmount.toFixed(2)} paid</span>
            <span className="progress-percentage">{statistics.percentagePaid.toFixed(1)}%</span>
            <span>₱{statistics.totalAmount.toFixed(2)} total</span>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="card">
        <div className="card-header">
          <h2><Users size={28} /> Expense Payment Tracking</h2>
        </div>
        <div className="filter-controls">
          <div className="filter-group">
            <label>Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Expenses</option>
              <option value="paid">Fully Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Filter by Payer:</label>
            <select
              value={filterPayer}
              onChange={(e) => setFilterPayer(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Payers</option>
              {members.filter(m => m != null).map(member => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="amount">Amount</option>
              <option value="status">Payment Status</option>
            </select>
          </div>
        </div>

        {/* Expense List */}
        <div className="payment-tracking-list">
          {filteredAndSortedExpenses.length === 0 ? (
            <div className="empty-state">
              <p>No expenses found</p>
              <small>Try adjusting your filters</small>
            </div>
          ) : (
            filteredAndSortedExpenses.map(expense => {
              const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
              const paidByName = typeof expense.paidBy === 'object' ? expense.paidBy.name : members.find(m => m?._id === paidById)?.name || 'Unknown'
              const sharePerPerson = expense.amount / (expense.splitWith?.length || 1)
              const progress = getExpensePaymentProgress(expense)

              return (
                <div key={expense._id} className="payment-tracking-item">
                  <div className="payment-item-header">
                    <h3>{expense.description}</h3>
                    <div className="payment-item-info">
                      <span className="payment-total">₱{expense.amount.toFixed(2)}</span>
                      <span className="payment-date">{new Date(expense.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="payment-progress-section">
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${progress.percentage}%`,
                          background: progress.percentage === 100 ? '#10b981' : progress.percentage > 0 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <span className="progress-text">
                      {progress.paidCount} of {progress.totalCount} paid
                    </span>
                  </div>
                  <div className="payment-payer">
                    <strong>Paid by:</strong> {paidByName}
                  </div>
                  <div className="payment-members-grid">
                    {expense.splitWith?.filter(member => member != null).map(member => {
                      const memberId = typeof member === 'object' ? member._id : member
                      const memberName = typeof member === 'object' ? member.name : members.find(m => m?._id === memberId)?.name || 'Unknown'
                      const isPaid = getPaymentStatus(expense, memberId)
                      const isUpdating = updatingPayment === `${expense._id}-${memberId}`
                      const isPayer = memberId === paidById

                      return (
                        <div key={memberId} className={`payment-member-item ${isPaid ? 'paid' : 'unpaid'} ${isPayer ? 'is-payer' : ''}`}>
                          <label className="payment-checkbox-label">
                            <input
                              type="checkbox"
                              checked={isPaid || isPayer}
                              onChange={() => !isPayer && updatePaymentStatus(expense._id, memberId, isPaid)}
                              disabled={isUpdating || isPayer}
                            />
                            <span className="payment-member-name">{memberName}</span>
                            {isPayer && <span className="payer-badge">Payer</span>}
                          </label>
                          <span className="payment-member-amount">₱{sharePerPerson.toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentTracking
