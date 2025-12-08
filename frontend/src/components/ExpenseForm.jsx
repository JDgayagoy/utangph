import { useState } from 'react'
import { Plus, Save, X, UserPlus } from 'lucide-react'

function ExpenseForm({ members, onAddExpense }) {
  // Create separate items state for each member
  const [memberItems, setMemberItems] = useState({})

  // Initialize items for a member if not exists
  const getItems = (memberId) => {
    if (!memberItems[memberId]) {
      return [{ description: '', amount: '', splitWith: [] }]
    }
    return memberItems[memberId]
  }

  const handleAddItem = (memberId) => {
    setMemberItems({
      ...memberItems,
      [memberId]: [...getItems(memberId), { description: '', amount: '', splitWith: [] }]
    })
  }

  const handleRemoveItem = (memberId, index) => {
    setMemberItems({
      ...memberItems,
      [memberId]: getItems(memberId).filter((_, i) => i !== index)
    })
  }

  const handleItemChange = (memberId, index, field, value) => {
    const items = getItems(memberId)
    const newItems = [...items]
    newItems[index][field] = value
    setMemberItems({
      ...memberItems,
      [memberId]: newItems
    })
  }

  const handleSplitToggle = (memberId, itemIndex, targetMemberId) => {
    const items = getItems(memberId)
    const newItems = [...items]
    const currentSplit = newItems[itemIndex].splitWith || []
    
    if (currentSplit.includes(targetMemberId)) {
      newItems[itemIndex].splitWith = currentSplit.filter(id => id !== targetMemberId)
    } else {
      newItems[itemIndex].splitWith = [...currentSplit, targetMemberId]
    }
    
    setMemberItems({
      ...memberItems,
      [memberId]: newItems
    })
  }

  const handleSubmit = (e, memberId) => {
    e.preventDefault()
    
    const items = getItems(memberId)
    const validItems = items.filter(item => item.description && item.amount && item.splitWith.length > 0)
    
    if (validItems.length === 0) {
      alert('Please add at least one item with description, amount, and select who will split the cost')
      return
    }

    // Create an expense for each item
    validItems.forEach(item => {
      const expense = {
        description: item.description,
        amount: parseFloat(item.amount),
        paidBy: memberId,
        splitWith: item.splitWith,
        date: new Date().toISOString()
      }
      onAddExpense(expense)
    })
    
    // Reset items for this member
    setMemberItems({
      ...memberItems,
      [memberId]: [{ description: '', amount: '', splitWith: [] }]
    })
  }

  // Get all members including the payer
  const getAvailableMembers = (payerId) => {
    return members
  }

  const calculateRoundedShare = (total, count) => {
    return Math.ceil(total / count);
  };

  return (
    <div className="expense-form-page">
      {members.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><UserPlus size={80} strokeWidth={1.5} opacity={0.4} /></div>
            <p>Add members first to start tracking expenses!</p>
            <small>Go to the Members page to add team members</small>
          </div>
        </div>
      ) : (
        members.map(member => {
          const items = getItems(member._id)
          const availableMembers = getAvailableMembers(member._id)
          
          return (
            <div key={member._id} className="card member-section">
              <div className="section-header">
                <div className="member-avatar-small">{member.name.charAt(0).toUpperCase()}</div>
                <h3>{member.name}'s Items</h3>
              </div>
              <form onSubmit={(e) => handleSubmit(e, member._id)} className="items-form">
                {items.map((item, index) => (
                  <div key={index} className="item-container">
                    <div className="item-row">
                      <input
                        type="text"
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => handleItemChange(member._id, index, 'description', e.target.value)}
                        className="item-description"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="₱0.00"
                        value={item.amount}
                        onChange={(e) => handleItemChange(member._id, index, 'amount', e.target.value)}
                        className="item-amount"
                      />
                      {items.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(member._id, index)}
                          className="remove-item"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                    
                    {availableMembers.length > 0 && (
                      <div className="split-selection">
                        <label className="split-label">Who will split this cost?</label>
                        <div className="split-checkboxes">
                          {availableMembers.map(targetMember => {
                            const sharePerPerson = calculateRoundedShare(
                              item.amount,
                              item.splitWith.length
                            );
                            
                            return (
                              <label key={targetMember._id} className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={(item.splitWith || []).includes(targetMember._id)}
                                  onChange={() => handleSplitToggle(member._id, index, targetMember._id)}
                                />
                                <span>{targetMember.name}</span>
                                {item.amount && (item.splitWith || []).includes(targetMember._id) && (
                                  <span className="split-amount">
                                    ₱{sharePerPerson.toFixed(2)}
                                  </span>
                                )}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="form-actions">
                  <button type="button" onClick={() => handleAddItem(member._id)} className="secondary">
                    <Plus size={20} /> Add Another Item
                  </button>
                  <button type="submit" className="primary">
                    <Save size={20} /> Save Items
                  </button>
                </div>
              </form>
            </div>
          )
        })
      )}
    </div>
  )
}

export default ExpenseForm
