import { TrendingUp, ArrowRightLeft, CreditCard, BarChart3, CheckCircle, X } from 'lucide-react'
import { useMemo, useState } from 'react'

function ExpenseList({ expenses, members, onRefresh }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const [paymentModal, setPaymentModal] = useState(null)
  const [processing, setProcessing] = useState(false)

  // Helper function to check if a payment has been made
  const getPaymentStatus = (expense, memberId) => {
    if (!expense.payments || !Array.isArray(expense.payments)) {
      return false
    }
    
    const payment = expense.payments.find(p => {
      if (!p || !p.memberId) return false
      const paymentMemberId = typeof p.memberId === 'object' && p.memberId !== null ? p.memberId._id : p.memberId
      return paymentMemberId === memberId
    })
    
    return payment ? payment.paid : false
  }

  // Create a matrix showing who owes whom
  const calculateOwesMatrix = () => {
    const balances = {}
    
    // Initialize balances
    members.filter(member => member != null).forEach(member => {
      balances[member._id] = { name: member.name, balance: 0 }
    })

    // Calculate balances from expenses, considering payments
    expenses.forEach(expense => {
      if (!expense.splitWith || expense.splitWith.length === 0) return
      const sharePerPerson = expense.amount / expense.splitWith.length
      const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
      
      // Person who paid gets credited
      if (balances[paidById]) {
        balances[paidById].balance += expense.amount
      }
      
      // People who split the expense get debited
      expense.splitWith.forEach(member => {
        if (!member) return
        const memberId = typeof member === 'object' ? member._id : member
        if (balances[memberId]) {
          balances[memberId].balance -= sharePerPerson
        }
      })
    })

    // Create matrix showing who owes whom
    const matrix = {}
    members.filter(member => member != null).forEach(fromMember => {
      matrix[fromMember._id] = {}
      members.filter(member => member != null).forEach(toMember => {
        matrix[fromMember._id][toMember._id] = 0
      })
    })

    // Calculate who owes whom from expenses, EXCLUDING paid amounts
    expenses.forEach(expense => {
      if (!expense.splitWith || expense.splitWith.length === 0) return
      const sharePerPerson = expense.amount / expense.splitWith.length
      const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
      
      expense.splitWith.forEach(member => {
        if (!member) return
        const memberId = typeof member === 'object' ? member._id : member
        
        // Only add to debt if:
        // 1. Not the payer
        // 2. Payment hasn't been marked as complete
        if (memberId !== paidById && matrix[memberId] && matrix[memberId][paidById] !== undefined) {
          const isPaid = getPaymentStatus(expense, memberId)
          
          // If not paid, add to debt
          if (!isPaid) {
            matrix[memberId][paidById] += sharePerPerson
          }
        }
      })
    })

    return { balances, matrix }
  }

  const handlePayClick = (fromMemberId, toMemberId, amount, fromName, toName) => {
    setPaymentModal({
      fromId: fromMemberId,
      toId: toMemberId,
      amount: amount,
      fromName: fromName,
      toName: toName
    })
  }

  const handleMarkAsPaid = async () => {
    if (!paymentModal) return
    
    setProcessing(true)
    try {
      // Find all unpaid expenses where fromId owes toId
      const unpaidExpenses = expenses.filter(expense => {
        const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
        if (paidById !== paymentModal.toId) return false
        
        // Check if fromId is in splitWith and hasn't paid
        return expense.splitWith.some(member => {
          const memberId = typeof member === 'object' ? member._id : member
          return memberId === paymentModal.fromId && !getPaymentStatus(expense, memberId)
        })
      })

      if (unpaidExpenses.length === 0) {
        alert('No unpaid expenses found.')
        setPaymentModal(null)
        setProcessing(false)
        return
      }

      // Mark all as paid
      for (const expense of unpaidExpenses) {
        await fetch(
          `${API_URL}/expenses/${expense._id}/payment/${paymentModal.fromId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paid: true })
          }
        )
      }

      if (onRefresh) await onRefresh()
      alert(`Payment confirmed!\n${paymentModal.fromName} paid ${paymentModal.toName} ₱${paymentModal.amount.toFixed(2)}\n\n${unpaidExpenses.length} expense(s) marked as paid.`)
      setPaymentModal(null)
    } catch (error) {
      console.error('Error marking payment:', error)
      alert('Failed to mark payment. Please try again.')
    } finally {
      setProcessing(false)
    }
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
      {/* Statistics Cards at Top */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Expenses</h3>
            <p className="stat-value">{expenses.length}</p>
            <small style={{ color: '#64748b' }}>Items tracked</small>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <CreditCard size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Amount</h3>
            <p className="stat-value">₱{expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}</p>
            <small style={{ color: '#64748b' }}>All expenses</small>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <ArrowRightLeft size={24} />
          </div>
          <div className="stat-content">
            <h3>Active Members</h3>
            <p className="stat-value">{members.length}</p>
            <small style={{ color: '#64748b' }}>Participants</small>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
            <BarChart3 size={24} />
          </div>
          <div className="stat-content">
            <h3>Average per Person</h3>
            <p className="stat-value">
              ₱{members.length > 0 ? (expenses.reduce((sum, exp) => sum + exp.amount, 0) / members.length).toFixed(2) : '0.00'}
            </p>
            <small style={{ color: '#64748b' }}>Per member</small>
          </div>
        </div>
      </div>

      {/* Simplified Settlement Table */}
      <div className="card">
        <div className="card-header">
          <h2><ArrowRightLeft size={28} style={{ display: 'inline-block', marginRight: '8px' }} /> Simplified Settlements</h2>
        </div>
        <div className="summary-section">
          <p className="settlement-description">Net amounts after offsetting mutual debts (who owes whom)</p>
          <div className="settlement-legend">
            <div className="legend-item">
              <span className="legend-box owes"></span>
              <span>Red cells = The person in that ROW owes money to the person in that COLUMN</span>
            </div>
            <div className="legend-item">
              <span className="legend-box receives"></span>
              <span>Green cells = The person in that ROW will RECEIVE money from the person in that COLUMN</span>
            </div>
          </div>
          <div className="table-container">
            <table className="settlement-matrix-table">
              <thead>
                <tr>
                  <th>Person</th>
                  {members.map(member => (
                    <th key={member._id}>{member.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(fromMember => {
                  return (
                    <tr key={fromMember._id}>
                      <td className="person-name"><strong>{fromMember.name}</strong></td>
                      {members.map(toMember => {
                        if (fromMember._id === toMember._id) {
                          return <td key={toMember._id} className="same-person">-</td>
                        }

                        const fromOwesTo = matrix[fromMember._id]?.[toMember._id] || 0
                        const toOwesFrom = matrix[toMember._id]?.[fromMember._id] || 0
                        const netAmount = fromOwesTo - toOwesFrom

                        // Show net amount only if fromMember owes toMember after offset
                        if (netAmount > 0.01) {
                          return (
                            <td key={toMember._id} className="net-debt-cell owes">
                              <div className="cell-content">
                                <span>₱{netAmount.toFixed(2)}</span>
                                <button
                                  className="pay-btn-small"
                                  onClick={() => handlePayClick(fromMember._id, toMember._id, netAmount, fromMember.name, toMember.name)}
                                  title="Mark as paid"
                                >
                                  <CheckCircle size={14} />
                                </button>
                              </div>
                            </td>
                          )
                        } else if (netAmount < -0.01) {
                          return (
                            <td key={toMember._id} className="net-debt-cell receives">
                              ₱{Math.abs(netAmount).toFixed(2)}
                            </td>
                          )
                        } else {
                          return (
                            <td key={toMember._id} className="net-debt-cell settled">
                              ✓
                            </td>
                          )
                        }
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Who Owes Whom Table */}
      <div className="card">
        <div className="card-header">
          <h2><TrendingUp size={28} style={{ display: 'inline-block', marginRight: '8px' }} /> Who Owes Whom</h2>
        </div>
        
        <div className="summary-section">
          <div className="table-container">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Person</th>
                  {members.map(member => (
                    <th key={member._id}>{member.name}</th>
                  ))}
                  <th>Total Owes</th>
                  <th>Will Collect</th>
                  <th className="net-balance-header">Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {members.map(fromMember => {
                  const totalOwes = Object.values(matrix[fromMember._id] || {}).reduce((sum, val) => sum + val, 0)
                  
                  // Calculate how much this person will collect (what others owe them)
                  let willCollect = 0
                  members.forEach(otherMember => {
                    if (otherMember._id !== fromMember._id) {
                      willCollect += matrix[otherMember._id]?.[fromMember._id] || 0
                    }
                  })
                  
                  const netBalance = willCollect - totalOwes
                  
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
                            {amount > 0 ? (
                              <div className="cell-content">
                                <span>₱{amount.toFixed(0)}</span>
                                <button
                                  className="pay-btn-small"
                                  onClick={() => handlePayClick(fromMember._id, toMember._id, amount, fromMember.name, toMember.name)}
                                  title="Mark as paid"
                                >
                                  <CheckCircle size={14} />
                                </button>
                              </div>
                            ) : '0'}
                          </td>
                        )
                      })}
                      <td className="total-cell owes-cell" data-label="Total Owes">
                        <strong style={{ color: totalOwes > 0 ? '#ef4444' : '#64748b' }}>
                          ₱{totalOwes.toFixed(0)}
                        </strong>
                      </td>
                      <td className="total-cell collect-cell" data-label="Will Collect">
                        <strong style={{ color: willCollect > 0 ? '#10b981' : '#64748b' }}>
                          ₱{willCollect.toFixed(0)}
                        </strong>
                      </td>
                      <td className={`total-cell net-balance-cell ${netBalance >= 0 ? 'positive' : 'negative'}`} data-label="Net Balance">
                        <strong>
                          {netBalance >= 0 ? '+' : ''}₱{netBalance.toFixed(0)}
                        </strong>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Individual Balances */}
      <div className="card">
        <div className="card-header">
          <h2><CreditCard size={28} style={{ display: 'inline-block', marginRight: '8px' }} /> Individual Balances</h2>
        </div>
        <div className="balance-grid">
          {Object.entries(balances)
            .sort((a, b) => b[1].balance - a[1].balance)
            .map(([id, data]) => (
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

      {/* Payment Confirmation Modal */}
      {paymentModal && (
        <div className="modal-overlay" onClick={() => !processing && setPaymentModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Payment</h2>
              <button
                className="modal-close"
                onClick={() => setPaymentModal(null)}
                disabled={processing}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-question">Mark this payment as completed?</p>
              
              <div className="payment-details">
                <div className="detail-row">
                  <span>From:</span>
                  <strong>{paymentModal.fromName}</strong>
                </div>
                <div className="detail-row">
                  <span>To:</span>
                  <strong>{paymentModal.toName}</strong>
                </div>
                <div className="detail-row">
                  <span>Amount:</span>
                  <strong style={{ color: 'var(--color-primary)', fontSize: '1.25rem' }}>
                    ₱{paymentModal.amount.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="modal-note">
                <CheckCircle size={20} />
                <p>This will mark all related expense shares as paid and move them to the Archive.</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setPaymentModal(null)}
                disabled={processing}
              >
                <X size={18} />
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleMarkAsPaid}
                disabled={processing}
              >
                <CheckCircle size={18} />
                {processing ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpenseList
