function SettlementSummary({ expenses = [], members = [] }) {
  const calculateBalances = () => {
    const balances = {}

    members.filter(Boolean).forEach(member => {
      if (!member?._id) return
      balances[member._id] = { name: member.name, balance: 0 }
    })

    expenses.forEach(expense => {
      if (!expense?.splitWith?.length) return

      const sharePerPerson = expense.amount / expense.splitWith.length
      const paidById = expense.paidBy?._id ?? expense.paidBy

      if (paidById && balances[paidById]) {
        balances[paidById].balance += expense.amount
      }

      expense.splitWith.filter(Boolean).forEach(member => {
        const memberId = member?._id ?? member
        if (memberId && balances[memberId]) {
          balances[memberId].balance -= sharePerPerson
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
          to: creditors[j].name,
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

  const { balances, settlements } = calculateSettlements()

  return (
    <div>
      <div className="card">
        <h2>Individual Balances</h2>
        <div className="settlement-grid">
          {Object.entries(balances).map(([id, data]) => (
            <div key={id} className="settlement-item">
              <strong>{data.name}</strong>
              <div className="settlement-amount" style={{ 
                color: data.balance >= 0 ? '#10b981' : '#ef4444' 
              }}>
                {data.balance >= 0 ? '+' : ''}₱{data.balance.toFixed(2)}
              </div>
              <small style={{ color: '#64748b' }}>
                {data.balance >= 0 ? 'Should receive' : 'Owes'}
              </small>
            </div>
          ))}
        </div>
      </div>

      <div className="card settlement-summary">
        <h2>Settlement Plan</h2>
        {settlements.length === 0 ? (
          <div className="empty-state">
            <p>All settled up! 🎉</p>
          </div>
        ) : (
          <div className="settlement-grid">
            {settlements.map((settlement, index) => (
              <div key={index} className="settlement-item">
                <p>
                  <strong>{settlement.from}</strong> pays <strong>{settlement.to}</strong>
                </p>
                <div className="settlement-amount">
                  ₱{settlement.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SettlementSummary
