import express from 'express'
import Group from '../models/Group.js'
import Member from '../models/Member.js'

const router = express.Router()

// Get all groups (without passwords)
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find().select('-password').sort({ name: 1 })
    
    // Get member count for each group
    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const memberCount = await Member.countDocuments({ groupId: group._id })
        return {
          _id: group._id,
          name: group.name,
          memberCount,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt
        }
      })
    )
    
    res.json(groupsWithCounts)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get single group
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).select('-password')
    if (!group) {
      return res.status(404).json({ message: 'Group not found' })
    }
    
    const memberCount = await Member.countDocuments({ groupId: group._id })
    
    res.json({
      _id: group._id,
      name: group.name,
      memberCount,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Create new group
router.post('/', async (req, res) => {
  try {
    const { name, password, createdBy } = req.body
    
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' })
    }
    
    const group = new Group({
      name: name.trim(),
      password,
      createdBy: createdBy || 'User'
    })
    
    const newGroup = await group.save()
    
    res.status(201).json({
      _id: newGroup._id,
      name: newGroup.name,
      memberCount: 0,
      createdAt: newGroup.createdAt
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Verify group password
router.post('/:id/verify', async (req, res) => {
  try {
    const { password } = req.body
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' })
    }
    
    const group = await Group.findById(req.params.id)
    if (!group) {
      return res.status(404).json({ message: 'Group not found' })
    }
    
    const isMatch = await group.comparePassword(password)
    
    if (isMatch) {
      const memberCount = await Member.countDocuments({ groupId: group._id })
      res.json({
        success: true,
        group: {
          _id: group._id,
          name: group.name,
          memberCount,
          createdAt: group.createdAt
        }
      })
    } else {
      res.status(401).json({ success: false, message: 'Incorrect password' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Update group
router.put('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) {
      return res.status(404).json({ message: 'Group not found' })
    }
    
    if (req.body.name) {
      group.name = req.body.name
    }
    
    if (req.body.password) {
      group.password = req.body.password
    }
    
    const updatedGroup = await group.save()
    
    res.json({
      _id: updatedGroup._id,
      name: updatedGroup.name,
      updatedAt: updatedGroup.updatedAt
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// Delete group
router.delete('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) {
      return res.status(404).json({ message: 'Group not found' })
    }
    
    // Check if group has members
    const memberCount = await Member.countDocuments({ groupId: req.params.id })
    if (memberCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete group with existing members. Please remove all members first.' 
      })
    }
    
    await group.deleteOne()
    res.json({ message: 'Group deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router
