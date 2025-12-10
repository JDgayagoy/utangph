import mongoose from 'mongoose'

const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  splitWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  }],
  date: {
    type: Date,
    default: Date.now
  },
  payments: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidDate: {
      type: Date
    }
  }]
}, {
  timestamps: true
})

// Virtual field to calculate share per person
expenseSchema.virtual('sharePerPerson').get(function() {
  return this.splitWith.length > 0 ? this.amount / this.splitWith.length : 0
})

// Include virtuals when converting to JSON
expenseSchema.set('toJSON', { virtuals: true })
expenseSchema.set('toObject', { virtuals: true })

const Expense = mongoose.model('Expense', expenseSchema)

export default Expense
