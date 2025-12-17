import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true
})

// Hash password before saving
groupSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next()
  }
  
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Method to compare password
groupSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

const Group = mongoose.model('Group', groupSchema)

export default Group
