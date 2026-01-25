import express from 'express'
import mongoose from 'mongoose'
import Expense from '../models/Expense.js'

const router = express.Router()

// Get all expenses (filtered by groupId)
router.get('/', async (req, res) => {
  try {
    const { groupId, limit = 50, skip = 0 } = req.query
    const filter = groupId ? { groupId } : {}
    
    // Use lean() for faster read-only queries and select only needed fields
    const expenses = await Expense.find(filter)
      .select('description amount date paidBy splitWith payments')
      .populate('paidBy', 'name')
      .populate('splitWith', 'name')
      .populate('payments.memberId', 'name')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean()
    
    // Get total count for pagination
    const total = await Expense.countDocuments(filter)
    
    res.json({ expenses, total, hasMore: skip + expenses.length < total })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get single expense
router.get('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .select('description amount date paidBy splitWith payments groupId')
      .populate('paidBy', 'name')
      .populate('splitWith', 'name')
      .lean()
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' })
    }
    res.json(expense)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Create new expense
router.post('/', async (req, res) => {
  const expense = new Expense({
    description: req.body.description,
    amount: req.body.amount,
    groupId: req.body.groupId,
    paidBy: req.body.paidBy,
    splitWith: req.body.splitWith,
    date: req.body.date || Date.now()
  })

  try {
    const newExpense = await expense.save()
    const populatedExpense = await Expense.findById(newExpense._id)
      .populate('paidBy', 'name')
      .populate('splitWith', 'name')
    res.status(201).json(populatedExpense)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Update expense
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' })
    }

    if (req.body.description) expense.description = req.body.description
    if (req.body.amount) expense.amount = req.body.amount
    if (req.body.paidBy) expense.paidBy = req.body.paidBy
    if (req.body.splitWith) expense.splitWith = req.body.splitWith
    if (req.body.date) expense.date = req.body.date

    const updatedExpense = await expense.save()
    const populatedExpense = await Expense.findById(updatedExpense._id)
      .populate('paidBy', 'name')
      .populate('splitWith', 'name')
    res.json(populatedExpense)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' })
    }

    await expense.deleteOne()
    res.json({ message: 'Expense deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get settlement summary (filtered by groupId) - optimized with aggregation
router.get('/settlements/summary', async (req, res) => {
  try {
    const { groupId } = req.query
    if (!groupId) {
      return res.status(400).json({ message: 'groupId is required' })
    }

    // Use aggregation pipeline for faster calculation
    const result = await Expense.aggregate([
      { $match: { groupId: mongoose.Types.ObjectId(groupId) } },
      {
        $lookup: {
          from: 'members',
          localField: 'paidBy',
          foreignField: '_id',
          as: 'paidByMember'
        }
      },
      {
        $lookup: {
          from: 'members',
          localField: 'splitWith',
          foreignField: '_id',
          as: 'splitWithMembers'
        }
      },
      { $unwind: '$paidByMember' },
      {
        $project: {
          amount: 1,
          paidBy: { _id: '$paidByMember._id', name: '$paidByMember.name' },
          splitWith: '$splitWithMembers',
          sharePerPerson: { $divide: ['$amount', { $size: '$splitWithMembers' }] }
        }
      }
    ])

    // Calculate balances from aggregation result
    const balances = {}
    
    result.forEach(expense => {
      // Add amount for payer
      if (!balances[expense.paidBy._id]) {
        balances[expense.paidBy._id] = {
          name: expense.paidBy.name,
          balance: 0
        }
      }
      balances[expense.paidBy._id].balance += expense.amount
      
      // Subtract share from each split member
      expense.splitWith.forEach(member => {
        if (!balances[member._id]) {
          balances[member._id] = {
            name: member.name,
            balance: 0
          }
        }
        balances[member._id].balance -= expense.sharePerPerson
      })
    })
    
    res.json(balances)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Update payment status for a member in an expense
router.patch('/:id/payment/:memberId', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' })
    }

    const memberId = req.params.memberId
    const { paid } = req.body

    // Find existing payment record
    const paymentIndex = expense.payments.findIndex(
      p => p.memberId.toString() === memberId
    )

    if (paymentIndex >= 0) {
      // Update existing payment record
      expense.payments[paymentIndex].paid = paid
      expense.payments[paymentIndex].paidDate = paid ? new Date() : null
    } else {
      // Add new payment record
      expense.payments.push({
        memberId,
        paid,
        paidDate: paid ? new Date() : null
      })
    }

    await expense.save()
    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name')
      .populate('splitWith', 'name')
      .populate('payments.memberId', 'name')
    
    res.json(populatedExpense)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

export default router
