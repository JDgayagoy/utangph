import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Group from './models/Group.js'
import Member from './models/Member.js'
import Expense from './models/Expense.js'
import connectDB from './config/db.js'

dotenv.config()

const migrateToGroups = async () => {
  try {
    // Connect to MongoDB
    await connectDB()

    console.log('Starting migration to group-based structure...\n')

    // Get or create EOG CONDO group
    let eogCondo = await Group.findOne({ name: 'EOG CONDO' })
    
    if (!eogCondo) {
      console.log('Creating EOG CONDO group...')
      eogCondo = new Group({
        name: 'EOG CONDO',
        password: 'password',
        createdBy: 'System'
      })
      await eogCondo.save()
      console.log('✓ EOG CONDO group created')
    } else {
      console.log('✓ EOG CONDO group found')
    }

    console.log('Group ID:', eogCondo._id)
    console.log()

    // Migrate members without groupId
    const membersWithoutGroup = await Member.find({ groupId: { $exists: false } })
    
    if (membersWithoutGroup.length > 0) {
      console.log(`Found ${membersWithoutGroup.length} members without groupId`)
      
      for (const member of membersWithoutGroup) {
        member.groupId = eogCondo._id
        await member.save()
      }
      
      console.log(`✓ Migrated ${membersWithoutGroup.length} members to EOG CONDO group`)
    } else {
      console.log('✓ No members need migration')
    }

    // Migrate expenses without groupId
    const expensesWithoutGroup = await Expense.find({ groupId: { $exists: false } })
    
    if (expensesWithoutGroup.length > 0) {
      console.log(`Found ${expensesWithoutGroup.length} expenses without groupId`)
      
      for (const expense of expensesWithoutGroup) {
        expense.groupId = eogCondo._id
        await expense.save()
      }
      
      console.log(`✓ Migrated ${expensesWithoutGroup.length} expenses to EOG CONDO group`)
    } else {
      console.log('✓ No expenses need migration')
    }

    console.log('\n✓ Migration completed successfully!')
    console.log('\nGroup Details:')
    console.log('Name: EOG CONDO')
    console.log('Password: password')
    console.log(`Members: ${await Member.countDocuments({ groupId: eogCondo._id })}`)
    console.log(`Expenses: ${await Expense.countDocuments({ groupId: eogCondo._id })}`)
    
    process.exit(0)
  } catch (error) {
    console.error('Error during migration:', error)
    process.exit(1)
  }
}

migrateToGroups()
