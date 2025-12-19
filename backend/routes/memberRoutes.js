import express from 'express'
import multer from 'multer'
import Member from '../models/Member.js'
import Expense from '../models/Expense.js'

const router = express.Router()

// Configure multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Get all members (filtered by groupId)
router.get('/', async (req, res) => {
  try {
    const { groupId } = req.query
    const filter = groupId ? { groupId } : {}
    const members = await Member.find(filter).sort({ name: 1 })
    res.json(members)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get single member
router.get('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }
    res.json(member)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get member balance and transactions
router.get('/:id/balance', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    // Get all expenses involving this member within the same group
    const expenses = await Expense.find({
      groupId: member.groupId,
      $or: [
        { paidBy: req.params.id },
        { splitWith: req.params.id }
      ]
    })
      .populate('paidBy', 'name')
      .populate('splitWith', 'name')
      .sort({ date: -1 })

    let totalPaid = 0
    let totalOwed = 0

    expenses.forEach(expense => {
      const sharePerPerson = expense.amount / expense.splitWith.length

      // If this member paid
      if (expense.paidBy._id.toString() === req.params.id) {
        totalPaid += expense.amount
      }

      // If this member is in the split
      if (expense.splitWith.some(m => m._id.toString() === req.params.id)) {
        totalOwed += sharePerPerson
      }
    })

    const balance = totalPaid - totalOwed

    res.json({
      member,
      totalPaid,
      totalOwed,
      balance,
      expenses
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Create new member
router.post('/', async (req, res) => {
  const member = new Member({
    name: req.body.name,
    groupId: req.body.groupId
  })

  try {
    const newMember = await member.save()
    res.status(201).json(newMember)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Update member
router.put('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    if (req.body.name) member.name = req.body.name

    const updatedMember = await member.save()
    res.json(updatedMember)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Get all QR codes for a member (MUST be before /:id routes)
router.get('/:id/qrcodes', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }
    
    res.json(member.qrCodes)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Add QR code to member (MUST be before /:id routes)
router.post('/:id/qrcodes', upload.single('image'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    const { label } = req.body
    
    if (!label || !req.file) {
      return res.status(400).json({ message: 'Label and image are required' })
    }

    // Convert image to base64
    const imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`

    member.qrCodes.push({ label, imageData })
    await member.save()
    
    res.status(201).json(member)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Update QR code (MUST be before /:id routes)
router.put('/:id/qrcodes/:qrId', upload.single('image'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    const qrCode = member.qrCodes.id(req.params.qrId)
    if (!qrCode) {
      return res.status(404).json({ message: 'QR code not found' })
    }

    if (req.body.label) qrCode.label = req.body.label
    if (req.file) {
      const imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      qrCode.imageData = imageData
    }

    await member.save()
    res.json(member)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Delete QR code (MUST be before /:id routes)
router.delete('/:id/qrcodes/:qrId', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    member.qrCodes.pull(req.params.qrId)
    await member.save()
    
    res.json(member)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Update member profile picture (MUST be before general /:id PATCH route)
router.patch('/:id/profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    if (req.file) {
      // Convert image to base64
      const imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      member.profilePicture = imageData
    } else if (req.body.removeProfilePicture) {
      member.profilePicture = null
    }

    const updatedMember = await member.save()
    res.json(updatedMember)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Toggle member active status (This general /:id route should be last)
router.patch('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    if (req.body.hasOwnProperty('isActive')) {
      member.isActive = req.body.isActive
    }

    const updatedMember = await member.save()
    res.json(updatedMember)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Delete member
router.delete('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    await member.deleteOne()
    res.json({ message: 'Member deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
