import { TrendingUp, ArrowRightLeft, CreditCard, Check, ArrowUpDown } from 'lucide-react'
import { useState, useMemo } from 'react'

function ExpenseList({ expenses, members, onRefresh }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const [updatingPayment, setUpdatingPayment] = useState(null)
  const [sortBy, setSortBy] = useState('date') // date, name, amount, status

  const updatePaymentStatus = async (expenseId, memberId, currentStatus) => {
    setUpdatingPayment(`${expenseId}-${memberId}`)
    try {
      const response = await fetch(`${API_URL}/expenses/${expenseId}/payment/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: !currentStatus })
      })
      if (response.ok) {
        // Trigger refresh from parent
        if (onRefresh) {
          await onRefresh()
        }
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
      alert('Failed to update payment status. Please try again.')
    } finally {
      setUpdatingPayment(null)
    }
  }

  const getPaymentStatus = (expense, memberId) => {
    if (!expense.payments || expense.payments.length === 0) return false
    const payment = expense.payments.find(p => {
      const pId = typeof p.memberId === 'object' ? p.memberId._id : p.memberId
      return pId === memberId
    })
    return payment ? payment.paid : false
  }

  const getExpensePaymentProgress = (expense) => {
    const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
    let paidCount = 0
    let totalCount = expense.splitWith.length
    
    expense.splitWith.forEach(member => {
      const memberId = typeof member === 'object' ? member._id : member
      if (memberId === paidById || getPaymentStatus(expense, memberId)) {
        paidCount++
      }
    })
    
    return { paidCount, totalCount, percentage: (paidCount / totalCount) * 100 }
  }

  // Sort expenses based on selected criteria
  const sortedExpenses = useMemo(() => {
    const sorted = [...expenses]
    
    switch(sortBy) {
      case 'date':
        return sorted.sort((a, b) => new Date(b.date) - new Date(a.date))
      case 'name':
        return sorted.sort((a, b) => a.description.localeCompare(b.description))
      case 'amount':
        return sorted.sort((a, b) => b.amount - a.amount)
      case 'status':
        return sorted.sort((a, b) => {
          const progressA = getExpensePaymentProgress(a).percentage
          const progressB = getExpensePaymentProgress(b).percentage
          return progressA - progressB
        })
      default:
        return sorted
    }
  }, [expenses, sortBy])
  // Create a matrix showing who owes whom
  const calculateOwesMatrix = () => {
    const balances = {}
    
    // Initialize balances
    members.forEach(member => {
      balances[member._id] = { name: member.name, balance: 0 }
    })

    // Calculate balances from expenses
    expenses.forEach(expense => {
      const sharePerPerson = expense.amount / expense.splitWith.length
      const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
      
      // Person who paid gets credited
      if (balances[paidById]) {
        balances[paidById].balance += expense.amount
      }
      
      // People who split the expense get debited
      expense.splitWith.forEach(member => {
        const memberId = typeof member === 'object' ? member._id : member
        if (balances[memberId]) {
          balances[memberId].balance -= sharePerPerson
        }
      })
    })

    // Create matrix showing who owes whom
    const matrix = {}
    members.forEach(fromMember => {
      matrix[fromMember._id] = {}
      members.forEach(toMember => {
        matrix[fromMember._id][toMember._id] = 0
      })
    })

    // Calculate who owes whom from expenses
    expenses.forEach(expense => {
      const sharePerPerson = expense.amount / expense.splitWith.length
      const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
      
      expense.splitWith.forEach(member => {
        const memberId = typeof member === 'object' ? member._id : member
        if (memberId !== paidById && matrix[memberId] && matrix[memberId][paidById] !== undefined) {
          matrix[memberId][paidById] += sharePerPerson
        }
      })
    })

    return { balances, matrix }
  }

  if (expenses.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-icon"><TrendingUp size={80} strokeWidth={1.5} opacity={0.4} /></div>
          <p>No expenses yet</p>
          <small>Add items to see the settlement summary!</small>
        </div>
      </div>
    )
  }

  const { balances, matrix } = calculateOwesMatrix()

  return (
    <div className="settlement-page">
      <div className="card">
        <div className="card-header">
          <h2><TrendingUp size={28} style={{ display: 'inline-block', marginRight: '8px' }} /> Settlement Summary</h2>
        </div>
        
        <div className="summary-section">
          <h3><ArrowRightLeft size={24} style={{ display: 'inline-block', marginRight: '8px' }} /> Who Owes Whom</h3>
        <div className="table-container">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Person</th>
                {members.map(member => (
                  <th key={member._id}>{member.name}</th>
                ))}
                <th>Total Owes</th>
              </tr>
            </thead>
            <tbody>
              {members.map(fromMember => {
                const totalOwes = Object.values(matrix[fromMember._id] || {}).reduce((sum, val) => sum + val, 0)
                return (
                  <tr key={fromMember._id}>
                    <td className="person-name"><strong>{fromMember.name}</strong></td>
                    {members.map(toMember => {
                      const amount = matrix[fromMember._id]?.[toMember._id] || 0
                      return (
                        <td 
                          key={toMember._id} 
                          className={`matrix-cell ${amount > 0 ? 'has-debt' : ''}`}
                          data-label={toMember.name}
                        >
                          {amount > 0 ? `₱${amount.toFixed(0)}` : '0'}
                        </td>
                      )
                    })}
                    <td className="total-cell" data-label="Total">
                      <strong>₱{totalOwes.toFixed(0)}</strong>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      </div>

      <div className="card">
        <div className="card-header">
          <h2><Check size={28} style={{ display: 'inline-block', marginRight: '8px' }} /> Payment Tracking</h2>
          <div className="sort-controls">
            <label><ArrowUpDown size={16} /> Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
              <option value="date">Date (Newest)</option>
              <option value="name">Name (A-Z)</option>
              <option value="amount">Amount (High-Low)</option>
              <option value="status">Payment Status</option>
            </select>
          </div>
        </div>
        <div className="payment-tracking-list">
          {sortedExpenses.map(expense => {
            const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
            const paidByName = typeof expense.paidBy === 'object' ? expense.paidBy.name : members.find(m => m._id === paidById)?.name || 'Unknown'
            const sharePerPerson = expense.amount / expense.splitWith.length
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
                <div className="payment-progress-bar">
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {progress.paidCount} of {progress.totalCount} paid
                  </span>
                </div>
                <div className="payment-payer">
                  <strong>Paid by:</strong> {paidByName}
                </div>
                <div className="payment-members-grid">
                  {expense.splitWith.map(member => {
                    const memberId = typeof member === 'object' ? member._id : member
                    const memberName = typeof member === 'object' ? member.name : members.find(m => m._id === memberId)?.name || 'Unknown'
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
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2><CreditCard size={28} style={{ display: 'inline-block', marginRight: '8px' }} /> Individual Balances</h2>
        </div>
        <div className="balance-grid">
          {Object.entries(balances).map(([id, data]) => (
            <div key={id} className="balance-card">
              <div className="balance-name">{data.name}</div>
              <div 
                className="balance-amount" 
                style={{ color: data.balance >= 0 ? '#10b981' : '#ef4444' }}
              >
                {data.balance >= 0 ? '+' : ''}₱{data.balance.toFixed(2)}
              </div>
              <div className="balance-status">
                {data.balance > 0.01 ? 'Should receive' : data.balance < -0.01 ? 'Owes' : 'All settled'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ExpenseList
