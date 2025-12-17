# Quick Start Guide - Group-Based UtangPH

## 🚀 First Time Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Migration Already Done! ✅
The migration has been completed with these results:
- ✅ EOG CONDO group created
- ✅ 5 members migrated
- ✅ 43 expenses migrated
- ✅ Password set to: **password**

### 3. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 📱 Using the Application

### First Visit

1. Open your browser to the frontend URL
2. You'll see the **Group Selection** page
3. You should see **"EOG CONDO"** with **"5 members"**

### Accessing EOG CONDO

1. Click on **"EOG CONDO"**
2. Enter password: **`password`**
3. Click **"Continue"**
4. You're in! All your existing data is there.

### Creating a New Group

1. From the Group Selection page, click **"Create New Group"**
2. Enter a group name (e.g., "Family Expenses")
3. Set a password (min 4 characters)
4. Confirm the password
5. Click **"Create Group"**
6. You'll be automatically logged in to the new group

### Switching Between Groups

1. Look at the sidebar (left side)
2. You'll see a badge showing your current group
3. Click the **"Switch Group"** button at the bottom
4. You'll return to the Group Selection page
5. Select a different group

## 🎨 What's New in the UI

### Group Selection Page
- **Clean, modern gradient design**
- Shows all available groups
- Displays member count for each group
- Password-protected access
- Inline group creation

### Sidebar Updates
- Shows current group name in a badge
- "Switch Group" button at the bottom
- All existing features remain the same

### Data Isolation
- Each group is completely separate
- Members and expenses don't mix between groups
- Perfect for managing multiple households/projects

## 🔑 Default Credentials

**Group**: EOG CONDO  
**Password**: password

⚠️ **Important**: Change this password in production!

## 💡 Tips

1. **Persistent Login**: Your group selection is saved in the browser
2. **No Data Loss**: Switching groups doesn't delete any data
3. **Independent Groups**: Create as many groups as you need
4. **Password Security**: Each group has its own password

## 🛠️ Troubleshooting

### Can't see my old data?
- Make sure you're logged into the **EOG CONDO** group
- Password is **"password"** (all lowercase)

### Want to reset everything?
```bash
cd backend
npm run migrate:groups
```

### Frontend won't start?
```bash
cd frontend
npm install
npm run dev
```

### Backend won't start?
- Check if MongoDB is connected
- Make sure `.env` file has the correct MongoDB URI

## 📊 Current Database State

After migration:
- **1 Group**: EOG CONDO
- **5 Members**: All associated with EOG CONDO
- **43 Expenses**: All associated with EOG CONDO

## 🎯 Next Actions

1. ✅ Test accessing EOG CONDO group
2. ✅ Verify all 5 members are visible
3. ✅ Verify all 43 expenses are visible
4. ✅ Try creating a new group
5. ✅ Test switching between groups
6. ✅ Consider changing the default password

## 📞 Need Help?

Refer to:
- [GROUP_SETUP.md](GROUP_SETUP.md) - Detailed setup instructions
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical details

Enjoy your new multi-group UtangPH! 🎉
