import { useState, useMemo } from 'react'
import { User, DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, Filter, Search, Plus, CreditCard } from 'lucide-react'

function PersonSummary({ expenses, members, onPageChange, onRefresh }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const [selectedMember, setSelectedMember] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all') // all, owes, owed, paid
  const [searchQuery, setSearchQuery] = useState('')
  const [showPaidExpenses, setShowPaidExpenses] = useState(true)
  const [showUnpaidExpenses, setShowUnpaidExpenses] = useState(true)
  const [paymentModal, setPaymentModal] = useState(null) // { personId, personName, totalAmount, expenses }
  const [customAmount, setCustomAmount] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  // Helper function to get payment status
  const getPaymentStatus = (expense, memberId) => {
    if (!expense.payments || expense.payments.length === 0) return false
    const payment = expense.payments.find(p => {
      const pId = typeof p.memberId === 'object' ? p.memberId._id : p.memberId
      return pId === memberId
    })
    return payment ? payment.paid : false
  }

  // Process payment
  const processPayment = async (isFull) => {
    if (!paymentModal || !selectedMember) return
    
    setProcessingPayment(true)
    try {
      const amount = isFull ? paymentModal.totalAmount : parseFloat(customAmount)
      
      if (!isFull && (!customAmount || amount <= 0 || amount > paymentModal.totalAmount)) {
        alert('Please enter a valid amount')
        setProcessingPayment(false)
        return
      }

      let remainingAmount = amount
      const expensesToPay = paymentModal.expenses.sort((a, b) => new Date(a.date) - new Date(b.date))

      for (const exp of expensesToPay) {
        if (remainingAmount <= 0) break
        
        const expenseAmount = exp.amount
        if (remainingAmount >= expenseAmount) {
          // Pay this expense in full
          await fetch(`${API_URL}/expenses/${exp.expenseId}/payment/${selectedMember}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paid: true })
          })
          remainingAmount -= expenseAmount
        }
      }

      if (onRefresh) await onRefresh()
      setPaymentModal(null)
      setCustomAmount('')
      alert(`Payment of ₱${amount.toFixed(2)} processed successfully!`)
    } catch (error) {
      console.error('Error processing payment:', error)
      alert('Failed to process payment. Please try again.')
    } finally {
      setProcessingPayment(false)
    }
  }

  // Calculate detailed information for each member
  const memberSummaries = useMemo(() => {
    const summaries = {}

    members.forEach(member => {
      summaries[member._id] = {
        id: member._id,
        name: member.name,
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0,
        expensesPaid: [],
        expensesInvolved: [],
        owesTo: {}, // { personId: amount }
        owedBy: {}, // { personId: amount }
        isPaid: false
      }
    })

    // Process each expense
    expenses.forEach(expense => {
      const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
      const paidByName = typeof expense.paidBy === 'object' ? expense.paidBy.name : 
                         members.find(m => m._id === paidById)?.name || 'Unknown'
      const sharePerPerson = expense.amount / expense.splitWith.length

      // Track who paid this expense
      if (summaries[paidById]) {
        summaries[paidById].totalPaid += expense.amount
        summaries[paidById].expensesPaid.push({
          ...expense,
          sharePerPerson
        })
      }

      // Process each person involved in splitting
      expense.splitWith.forEach(member => {
        const memberId = typeof member === 'object' ? member._id : member
        const memberName = typeof member === 'object' ? member.name : 
                          members.find(m => m._id === memberId)?.name || 'Unknown'

        if (summaries[memberId]) {
          summaries[memberId].totalOwed += sharePerPerson
          summaries[memberId].expensesInvolved.push({
            ...expense,
            sharePerPerson,
            userShare: sharePerPerson
          })

          // If this person didn't pay, they owe the payer (considering payment status)
          if (memberId !== paidById) {
            const isPaid = getPaymentStatus(expense, memberId)
            
            // Only count as debt if not yet paid
            if (!isPaid) {
              if (!summaries[memberId].owesTo[paidById]) {
                summaries[memberId].owesTo[paidById] = {
                  name: paidByName,
                  amount: 0,
                  expenses: []
                }
              }
              summaries[memberId].owesTo[paidById].amount += sharePerPerson
              summaries[memberId].owesTo[paidById].expenses.push({
                description: expense.description,
                amount: sharePerPerson,
                date: expense.date,
                paid: false
              })

              // Track reverse relationship (who owes this payer)
              if (!summaries[paidById].owedBy[memberId]) {
                summaries[paidById].owedBy[memberId] = {
                  name: memberName,
                  amount: 0,
                  expenses: []
                }
              }
              summaries[paidById].owedBy[memberId].amount += sharePerPerson
              summaries[paidById].owedBy[memberId].expenses.push({
                description: expense.description,
                amount: sharePerPerson,
                date: expense.date,
                paid: false
              })
            }
          }
        }
      })
    })

    // Calculate net balance and payment status
    Object.values(summaries).forEach(summary => {
      // Calculate total owes (what this person owes to others)
      const totalOwes = Object.values(summary.owesTo).reduce((sum, debt) => sum + debt.amount, 0)
      
      // Calculate will collect (what others owe to this person)
      const willCollect = Object.values(summary.owedBy).reduce((sum, debt) => sum + debt.amount, 0)
      
      // Net balance = what they will collect - what they owe
      summary.netBalance = willCollect - totalOwes
      summary.isPaid = Math.abs(summary.netBalance) < 0.01
    })

    return summaries
  }, [expenses, members])

  // Filter members based on search and status
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const summary = memberSummaries[member._id]
      if (!summary) return false

      // Search filter
      if (searchQuery && !member.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // Status filter
      if (filterStatus === 'owes' && summary.netBalance >= 0) return false
      if (filterStatus === 'owed' && summary.netBalance <= 0) return false
      if (filterStatus === 'paid' && !summary.isPaid) return false

      return true
    })
  }, [members, memberSummaries, searchQuery, filterStatus])

  // Get selected member's detailed summary
  const selectedSummary = selectedMember ? memberSummaries[selectedMember] : null

  // Filter expenses for selected member
  const filteredExpenses = useMemo(() => {
    if (!selectedSummary) return []

    return selectedSummary.expensesInvolved.filter(expense => {
      if (!showPaidExpenses && selectedSummary.netBalance >= 0) {
        const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
        if (paidById === selectedMember) return false
      }
      if (!showUnpaidExpenses && selectedSummary.netBalance < 0) {
        const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
        if (paidById !== selectedMember) return false
      }
      return true
    })
  }, [selectedSummary, selectedMember, showPaidExpenses, showUnpaidExpenses])

  return (
    <div className="person-summary-container">
      {/* Left Panel - Member List */}
      <div className="person-list-panel">
        <div className="card">
          <div className="card-header">
            <h2><User size={24} /> Members</h2>
          </div>

          {/* Search and Filters */}
          <div className="filter-section">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-buttons">
              <button
                className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All
              </button>
              <button
                className={`filter-btn ${filterStatus === 'owes' ? 'active' : ''}`}
                onClick={() => setFilterStatus('owes')}
              >
                Owes
              </button>
              <button
                className={`filter-btn ${filterStatus === 'owed' ? 'active' : ''}`}
                onClick={() => setFilterStatus('owed')}
              >
                Owed
              </button>
              <button
                className={`filter-btn ${filterStatus === 'paid' ? 'active' : ''}`}
                onClick={() => setFilterStatus('paid')}
              >
                Settled
              </button>
            </div>
          </div>

          {/* Member List */}
          <div className="member-list">
            {filteredMembers.length === 0 ? (
              <div className="empty-state">
                <p>No members found</p>
              </div>
            ) : (
              filteredMembers.map(member => {
                const summary = memberSummaries[member._id]
                return (
                  <div
                    key={member._id}
                    className={`member-card ${selectedMember === member._id ? 'selected' : ''}`}
                    onClick={() => setSelectedMember(member._id)}
                  >
                    <div className="member-info">
                      <h3>{member.name}</h3>
                      <div className="member-stats">
                        <span className="stat">
                          Paid: <strong>₱{summary.totalPaid.toFixed(2)}</strong>
                        </span>
                        <span className="stat">
                          Owes: <strong>₱{summary.totalOwed.toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="member-balance">
                      {summary.isPaid ? (
                        <div className="status-badge settled">
                          <CheckCircle size={16} />
                          <span>Settled</span>
                        </div>
                      ) : summary.netBalance > 0 ? (
                        <div className="balance-amount positive">
                          +₱{summary.netBalance.toFixed(2)}
                          <small>to receive</small>
                        </div>
                      ) : (
                        <div className="balance-amount negative">
                          -₱{Math.abs(summary.netBalance).toFixed(2)}
                          <small>to pay</small>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Member Details */}
      <div className="person-detail-panel">
        {selectedSummary ? (
          <>
            {/* Quick Actions */}
            <div className="quick-actions">
              <button 
                className="quick-action-btn"
                onClick={() => {
                  onPageChange('add')
                  // Store selected member to scroll to their section
                  sessionStorage.setItem('scrollToMember', selectedMember)
                }}
              >
                <Plus size={20} />
                Add Item for {selectedSummary.name}
              </button>
            </div>
            
            {/* Summary Cards */}
            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-icon paid">
                  <DollarSign size={24} />
                </div>
                <div className="summary-content">
                  <h3>Total Paid</h3>
                  <p className="amount">₱{selectedSummary.totalPaid.toFixed(2)}</p>
                  <small>{selectedSummary.expensesPaid.length} expenses</small>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon owed">
                  <TrendingDown size={24} />
                </div>
                <div className="summary-content">
                  <h3>Total Owes</h3>
                  <p className="amount">₱{selectedSummary.totalOwed.toFixed(2)}</p>
                  <small>{selectedSummary.expensesInvolved.length} expenses</small>
                </div>
              </div>

              <div className="summary-card">
                <div className={`summary-icon ${selectedSummary.netBalance >= 0 ? 'positive' : 'negative'}`}>
                  <TrendingUp size={24} />
                </div>
                <div className="summary-content">
                  <h3>Net Balance</h3>
                  <p className={`amount ${selectedSummary.netBalance >= 0 ? 'positive' : 'negative'}`}>
                    {selectedSummary.netBalance >= 0 ? '+' : ''}₱{selectedSummary.netBalance.toFixed(2)}
                  </p>
                  <small>
                    {selectedSummary.isPaid ? 'All settled' : 
                     selectedSummary.netBalance > 0 ? 'Should receive' : 'Should pay'}
                  </small>
                </div>
              </div>
            </div>

            {/* Debts Section */}
            {Object.keys(selectedSummary.owesTo).length > 0 && (
              <div className="card">
                <h2><TrendingDown size={20} /> Owes To</h2>
                <div className="debt-list">
                  {Object.entries(selectedSummary.owesTo).map(([personId, data]) => {
                    // Find actual expense IDs for payment tracking
                    const expensesWithIds = data.expenses.map(exp => {
                      const foundExpense = expenses.find(e => 
                        e.description === exp.description && 
                        new Date(e.date).getTime() === new Date(exp.date).getTime()
                      )
                      return {
                        ...exp,
                        expenseId: foundExpense?._id
                      }
                    }).filter(exp => exp.expenseId)

                    return (
                      <div key={personId} className="debt-item owes">
                        <div className="debt-header">
                          <h3>{data.name}</h3>
                          <span className="debt-amount">₱{data.amount.toFixed(2)}</span>
                        </div>
                        <div className="debt-expenses">
                          {data.expenses.map((exp, idx) => (
                            <div key={idx} className="debt-expense-item">
                              <span>{exp.description}</span>
                              <span>₱{exp.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="payment-actions">
                          <button 
                            className="payment-btn custom"
                            onClick={() => setPaymentModal({
                              personId,
                              personName: data.name,
                              totalAmount: data.amount,
                              expenses: expensesWithIds
                            })}
                          >
                            <CreditCard size={16} />
                            Pay Custom Amount
                          </button>
                          <button 
                            className="payment-btn full"
                            onClick={() => {
                              setPaymentModal({
                                personId,
                                personName: data.name,
                                totalAmount: data.amount,
                                expenses: expensesWithIds
                              })
                              setTimeout(() => processPayment(true), 100)
                            }}
                          >
                            <CheckCircle size={16} />
                            Pay Full ₱{data.amount.toFixed(2)}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Credits Section */}
            {Object.keys(selectedSummary.owedBy).length > 0 && (
              <div className="card">
                <h2><TrendingUp size={20} /> Owed By</h2>
                <div className="debt-list">
                  {Object.entries(selectedSummary.owedBy).map(([personId, data]) => (
                    <div key={personId} className="debt-item owed">
                      <div className="debt-header">
                        <h3>{data.name}</h3>
                        <span className="debt-amount">₱{data.amount.toFixed(2)}</span>
                      </div>
                      <div className="debt-expenses">
                        {data.expenses.map((exp, idx) => (
                          <div key={idx} className="debt-expense-item">
                            <span>{exp.description}</span>
                            <span>₱{exp.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expenses Involved */}
            <div className="card">
              <div className="card-header">
                <h2>All Expenses</h2>
                <div className="expense-filters">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showPaidExpenses}
                      onChange={(e) => setShowPaidExpenses(e.target.checked)}
                    />
                    Show paid by me
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showUnpaidExpenses}
                      onChange={(e) => setShowUnpaidExpenses(e.target.checked)}
                    />
                    Show paid by others
                  </label>
                </div>
              </div>

              <div className="expense-detail-list">
                {filteredExpenses.length === 0 ? (
                  <div className="empty-state">
                    <p>No expenses to show</p>
                  </div>
                ) : (
                  filteredExpenses.map((expense, idx) => {
                    const paidById = typeof expense.paidBy === 'object' ? expense.paidBy._id : expense.paidBy
                    const paidByName = typeof expense.paidBy === 'object' ? expense.paidBy.name : 
                                       members.find(m => m._id === paidById)?.name || 'Unknown'
                    const isPayer = paidById === selectedMember

                    return (
                      <div key={idx} className={`expense-detail-item ${isPayer ? 'paid-by-me' : 'paid-by-other'}`}>
                        <div className="expense-detail-header">
                          <h3>{expense.description}</h3>
                          <span className="expense-total">₱{expense.amount.toFixed(2)}</span>
                        </div>
                        <div className="expense-detail-info">
                          <span className="expense-payer">
                            {isPayer ? (
                              <><CheckCircle size={14} /> You paid</>
                            ) : (
                              <><XCircle size={14} /> Paid by {paidByName}</>
                            )}
                          </span>
                          <span className="expense-split">
                            Split with {expense.splitWith.length} people
                          </span>
                          <span className="expense-date">
                            {new Date(expense.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="expense-your-share">
                          <strong>Your share:</strong> ₱{expense.userShare.toFixed(2)}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="card empty-selection">
            <User size={64} style={{ opacity: 0.2 }} />
            <h2>Select a Member</h2>
            <p>Choose a member from the list to view their detailed summary</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="modal-overlay" onClick={() => !processingPayment && setPaymentModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Pay {paymentModal.personName}</h2>
            <div className="modal-body">
              <div className="payment-info">
                <p>Total Amount Owed: <strong>₱{paymentModal.totalAmount.toFixed(2)}</strong></p>
                <p className="payment-note">Payments will be applied to oldest expenses first</p>
              </div>
              
              <div className="payment-input-group">
                <label>Enter Custom Amount:</label>
                <input
                  type="number"
                  step="0.01"
                  max={paymentModal.totalAmount}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="payment-input"
                  disabled={processingPayment}
                />
              </div>

              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setPaymentModal(null)}
                  disabled={processingPayment}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => processPayment(false)}
                  disabled={processingPayment || !customAmount}
                >
                  {processingPayment ? 'Processing...' : `Pay ₱${customAmount || '0.00'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PersonSummary
