import { TrendingUp, ArrowDown, ArrowUp, DollarSign, Users, CheckCircle, X } from 'lucide-react'
import { useState } from 'react'

function SettlementSummary({ expenses, members, onRefresh }) {
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

  const calculateBalances = () => {
    // Initialize balances for each member
    const balances = {}
    members.filter(member => member != null).forEach(member => {
      balances[member._id] = { name: member.name, balance: 0 }
    })

    // Calculate balances, excluding paid expenses
    expenses.forEach(expense => {
      const sharePerPerson = expense.amount / expense.splitWith.length
      
      // Get paidBy ID (handle both populated and non-populated)
      const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
      
      // The person who paid gets credited
      if (balances[paidById]) {
        balances[paidById].balance += expense.amount
      }
      
      // Everyone who splits the expense gets debited (only if not paid)
      expense.splitWith.forEach(member => {
        if (!member) return
        // Handle both populated and non-populated
        const memberId = typeof member === 'object' ? member._id : member
        if (balances[memberId]) {
          // Only debit if this person hasn't paid their share
          const isPaid = getPaymentStatus(expense, memberId)
          if (!isPaid) {
            balances[memberId].balance -= sharePerPerson
          }
        }
      })
    })

    return balances
  }

  const calculateSettlements = () => {
    const balances = calculateBalances()
    const settlements = []
    
    // Separate debtors and creditors
    const debtors = []
    const creditors = []
    
    Object.entries(balances).forEach(([id, data]) => {
      if (data.balance < -0.01) {
        debtors.push({ id, name: data.name, amount: -data.balance })
      } else if (data.balance > 0.01) {
        creditors.push({ id, name: data.name, amount: data.balance })
      }
    })

    // Match debtors with creditors
    let i = 0, j = 0
    while (i < debtors.length && j < creditors.length) {
      const debt = debtors[i].amount
      const credit = creditors[j].amount
      const settleAmount = Math.min(debt, credit)

      if (settleAmount > 0.01) {
        settlements.push({
          from: debtors[i].name,
          fromId: debtors[i].id,
          to: creditors[j].name,
          toId: creditors[j].id,
          amount: settleAmount
        })
      }

      debtors[i].amount -= settleAmount
      creditors[j].amount -= settleAmount

      if (debtors[i].amount < 0.01) i++
      if (creditors[j].amount < 0.01) j++
    }

    return { balances, settlements }
  }

  const handlePaymentClick = (settlement) => {
    setPaymentModal(settlement)
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
      alert(`Payment confirmed!\n${paymentModal.from} paid ${paymentModal.to} ₱${paymentModal.amount.toFixed(2)}`)
      setPaymentModal(null)
    } catch (error) {
      console.error('Error marking payment:', error)
      alert('Failed to mark payment. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const { balances, settlements } = calculateSettlements()
  
  // Calculate statistics
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const totalDebt = Object.values(balances).reduce((sum, data) => sum + (data.balance < 0 ? -data.balance : 0), 0)
  const totalCredit = Object.values(balances).reduce((sum, data) => sum + (data.balance > 0 ? data.balance : 0), 0)

  return (
    <div>
      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Expenses</h3>
            <p className="stat-value">₱{totalExpenses.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <ArrowDown size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Debt</h3>
            <p className="stat-value" style={{ color: '#ef4444' }}>₱{totalDebt.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <ArrowUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Credit</h3>
            <p className="stat-value" style={{ color: '#10b981' }}>₱{totalCredit.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>Active Members</h3>
            <p className="stat-value">{members.length}</p>
          </div>
        </div>
      </div>

      {/* Settlement Plan */}
      <div className="card settlement-summary">
        <h2><TrendingUp size={28} style={{ display: 'inline-block', marginRight: '8px' }} /> Settlement Plan</h2>
        {settlements.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={80} strokeWidth={1.5} opacity={0.4} />
            <p>All settled up! 🎉</p>
            <small>No outstanding debts between members</small>
          </div>
        ) : (
          <div className="settlement-transactions">
            {settlements.map((settlement, index) => (
              <div key={index} className="settlement-transaction">
                <div className="settlement-flow">
                  <div className="settlement-person debtor">
                    <span className="person-label">From</span>
                    <strong>{settlement.from}</strong>
                  </div>
                  <div className="settlement-arrow">
                    <ArrowUp size={24} style={{ transform: 'rotate(90deg)' }} />
                  </div>
                  <div className="settlement-person creditor">
                    <span className="person-label">To</span>
                    <strong>{settlement.to}</strong>
                  </div>
                </div>
                <div className="settlement-actions-group">
                  <div className="settlement-amount-large">
                    ₱{settlement.amount.toFixed(2)}
                  </div>
                  <button
                    className="mark-paid-btn"
                    onClick={() => handlePaymentClick(settlement)}
                    title="Mark as paid"
                  >
                    <CheckCircle size={18} />
                    Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Individual Balances Integrated */}
      <div className="card">
        <h2>Individual Balances</h2>
        <div className="balances-list">
          {Object.entries(balances)
            .sort(([, a], [, b]) => b.balance - a.balance)
            .map(([id, data]) => (
            <div key={id} className="balance-item">
              <div className="balance-info">
                <strong className="member-name">{data.name}</strong>
                <span className="balance-status" style={{ 
                  color: data.balance >= 0 ? '#10b981' : '#ef4444' 
                }}>
                  {data.balance >= 0 ? (
                    <><ArrowUp size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Should receive</>
                  ) : (
                    <><ArrowDown size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Owes</>
                  )}
                </span>
              </div>
              <div className="balance-amount" style={{ 
                color: data.balance >= 0 ? '#10b981' : '#ef4444',
                fontWeight: 800
              }}>
                {data.balance >= 0 ? '+' : ''}₱{data.balance.toFixed(2)}
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
                  <strong>{paymentModal.from}</strong>
                </div>
                <div className="detail-row">
                  <span>To:</span>
                  <strong>{paymentModal.to}</strong>
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

export default SettlementSummary
