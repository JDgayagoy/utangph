# UtangPH - Group-Based Setup Guide

## Overview

UtangPH now supports multiple groups with password protection. Each group maintains its own separate set of members and expenses, providing a decentralized data structure where groups are independent of each other.

## Key Features

- **Multiple Groups**: Create and manage multiple expense tracking groups
- **Password Protected**: Each group requires a password to access
- **Isolated Data**: Each group has its own members and expenses
- **Group Selection UI**: Initial landing page shows all available groups
- **Easy Switching**: Switch between groups without losing data

## Setup Instructions

### 1. Install Dependencies

First, install the new dependency (bcryptjs) for password hashing:

```bash
cd backend
npm install
```

### 2. Run Migration Script

If you have existing data, run the migration script to associate it with the EOG CONDO group:

```bash
npm run migrate:groups
```

This will:
- Create the "EOG CONDO" group with password "password"
- Associate all existing members and expenses with this group
- Display a summary of the migration

**Note**: If you're starting fresh with no existing data, you can skip the migration and just run the seed script.

### 3. Seed Initial Group (Alternative to Migration)

If you don't have existing data or want to manually create the EOG CONDO group:

```bash
npm run seed:groups
```

### 4. Start the Backend Server

```bash
npm run dev
```

### 5. Start the Frontend

In a new terminal:

```bash
cd ../frontend
npm run dev
```

## Usage

### First Time Access

1. Open the application in your browser
2. You'll see the Group Selection page
3. Click on "EOG CONDO" (or any available group)
4. Enter the password: `password`
5. You'll be taken to the main application with that group's data

### Creating a New Group

1. On the Group Selection page, click "Create New Group"
2. Enter a group name (e.g., "Family Expenses", "Office Bills")
3. Set a password for the group
4. Confirm the password
5. Click "Create Group"
6. You'll be automatically logged into the new group

### Switching Groups

1. Click the "Switch Group" button in the sidebar (bottom)
2. You'll be taken back to the Group Selection page
3. Select a different group and enter its password

## Database Structure

### Group Model
```javascript
{
  name: String,          // Group name (e.g., "EOG CONDO")
  password: String,      // Hashed password
  createdBy: String,     // Creator identifier
  createdAt: Date,
  updatedAt: Date
}
```

### Member Model (Updated)
```javascript
{
  name: String,
  groupId: ObjectId,     // Reference to Group - NEW
  qrCodes: Array,
  createdAt: Date,
  updatedAt: Date
}
```

### Expense Model (Updated)
```javascript
{
  description: String,
  amount: Number,
  groupId: ObjectId,     // Reference to Group - NEW
  paidBy: ObjectId,
  splitWith: [ObjectId],
  date: Date,
  payments: Array,
  createdAt: Date,
  updatedAt: Date
}
```

## API Changes

### New Endpoints

- `GET /api/groups` - Get all groups (without passwords)
- `GET /api/groups/:id` - Get single group details
- `POST /api/groups` - Create new group
- `POST /api/groups/:id/verify` - Verify group password
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group (only if no members)

### Modified Endpoints

All member and expense endpoints now support filtering by groupId:

- `GET /api/members?groupId=xxx` - Get members for specific group
- `GET /api/expenses?groupId=xxx` - Get expenses for specific group
- `POST /api/members` - Now requires `groupId` in body
- `POST /api/expenses` - Now requires `groupId` in body

## Security Notes

- Passwords are hashed using bcryptjs before storage
- Group passwords are never returned in API responses
- Each group's data is isolated from other groups
- The `groupId` query parameter ensures data segregation

## Default Group

**Group Name**: EOG CONDO  
**Password**: password  
**Note**: Change this password in production!

## Troubleshooting

### "Member not found" or "Expense not found" errors

Make sure you've run the migration script if you have existing data:
```bash
npm run migrate:groups
```

### Can't create new members or expenses

Ensure:
1. You're logged into a group
2. The groupId is being sent with the request
3. The backend server is running

### Password doesn't work

If you need to reset a group password:
1. Use MongoDB Compass or mongosh
2. Delete the group and recreate it using the seed script
3. Or update the password field (it will be auto-hashed on save)

## Development

### Adding More Default Groups

Edit `seedGroups.js` or `migrateToGroups.js` to add more groups:

```javascript
const newGroup = new Group({
  name: 'Your Group Name',
  password: 'your-password',
  createdBy: 'System'
})
await newGroup.save()
```

### Testing with Multiple Groups

1. Create multiple groups via the UI
2. Add different members to each group
3. Switch between groups to verify data isolation
4. Check that members and expenses don't leak between groups

## Future Enhancements

Potential improvements:
- Group admin/member roles
- Invitation system with tokens
- Group settings and customization
- Export/import group data
- Group statistics and analytics
- Email notifications for group activities
