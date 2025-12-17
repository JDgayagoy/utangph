import { TrendingUp, ArrowRightLeft, CreditCard, BarChart3 } from 'lucide-react'
import { useMemo } from 'react'

function ExpenseList({ expenses, members, onRefresh }) {
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
                          {amount > 0 ? `₱${amount.toFixed(0)}` : '0'}
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
                              ₱{netAmount.toFixed(2)}
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

      {/* Statistics Section */}
      <div className="card">
        <div className="card-header">
          <h2><BarChart3 size={28} style={{ display: 'inline-block', marginRight: '8px' }} /> Statistics</h2>
        </div>
        <div className="statistics-grid">
          <div className="stat-box">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              <TrendingUp size={32} />
            </div>
            <div className="stat-details">
              <h4>Total Expenses</h4>
              <p className="stat-number">{expenses.length}</p>
              <span className="stat-description">Items tracked</span>
            </div>
          </div>
          
          <div className="stat-box">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <CreditCard size={32} />
            </div>
            <div className="stat-details">
              <h4>Total Amount</h4>
              <p className="stat-number">₱{expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}</p>
              <span className="stat-description">All expenses</span>
            </div>
          </div>
          
          <div className="stat-box">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <ArrowRightLeft size={32} />
            </div>
            <div className="stat-details">
              <h4>Active Members</h4>
              <p className="stat-number">{members.length}</p>
              <span className="stat-description">Participants</span>
            </div>
          </div>
          
          <div className="stat-box">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
              <BarChart3 size={32} />
            </div>
            <div className="stat-details">
              <h4>Average per Person</h4>
              <p className="stat-number">
                ₱{members.length > 0 ? (expenses.reduce((sum, exp) => sum + exp.amount, 0) / members.length).toFixed(2) : '0.00'}
              </p>
              <span className="stat-description">Per member</span>
            </div>
          </div>
        </div>

        {/* Balance Distribution Chart */}
        <div className="balance-distribution">
          <h3>Balance Distribution</h3>
          <div className="distribution-bars">
            {Object.entries(balances)
              .sort((a, b) => b[1].balance - a[1].balance)
              .map(([id, data]) => {
                const maxBalance = Math.max(...Object.values(balances).map(b => Math.abs(b.balance)))
                const barWidth = maxBalance > 0 ? (Math.abs(data.balance) / maxBalance) * 100 : 0
                
                return (
                  <div key={id} className="distribution-bar-item">
                    <span className="distribution-name">{data.name}</span>
                    <div className="distribution-bar-container">
                      <div 
                        className={`distribution-bar ${data.balance >= 0 ? 'positive' : 'negative'}`}
                        style={{ width: `${barWidth}%` }}
                      >
                        <span className="distribution-value">
                          {data.balance >= 0 ? '+' : ''}₱{data.balance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExpenseList
