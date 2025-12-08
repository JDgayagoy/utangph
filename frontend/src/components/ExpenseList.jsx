import { TrendingUp, ArrowRightLeft, CreditCard } from 'lucide-react'

function ExpenseList({ expenses, members }) {
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
