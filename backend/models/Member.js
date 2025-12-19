import mongoose from 'mongoose'

const qrCodeSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },
  imageData: {
    type: String,
    required: true
  }
}, {
  timestamps: true
})

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  qrCodes: [qrCodeSchema]
}, {
  timestamps: true
})

const Member = mongoose.model('Member', memberSchema)

export default Member
