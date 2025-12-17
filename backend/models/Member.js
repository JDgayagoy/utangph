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
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  qrCodes: [qrCodeSchema]
}, {
  timestamps: true
})

const Member = mongoose.model('Member', memberSchema)

export default Member
