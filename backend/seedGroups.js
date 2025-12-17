import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Group from './models/Group.js'
import connectDB from './config/db.js'

dotenv.config()

const seedGroups = async () => {
  try {
    // Connect to MongoDB
    await connectDB()

    // Check if EOG CONDO group already exists
    const existingGroup = await Group.findOne({ name: 'EOG CONDO' })
    
    if (existingGroup) {
      console.log('EOG CONDO group already exists')
      console.log('Group ID:', existingGroup._id)
      process.exit(0)
    }

    // Create EOG CONDO group
    const eogCondo = new Group({
      name: 'EOG CONDO',
      password: 'password', // This will be hashed automatically by the pre-save hook
      createdBy: 'System'
    })

    await eogCondo.save()
    
    console.log('✓ Successfully created EOG CONDO group')
    console.log('Group ID:', eogCondo._id)
    console.log('Group Name:', eogCondo.name)
    console.log('Password: password')
    console.log('\nYou can now use this group in the application!')
    
    process.exit(0)
  } catch (error) {
    console.error('Error seeding groups:', error)
    process.exit(1)
  }
}

seedGroups()
