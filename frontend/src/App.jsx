import { useState, useEffect, useCallback } from 'react'
import './App.css'
import GroupSelection from './components/GroupSelection'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import ItemsList from './components/ItemsList'
import MemberManagement from './components/MemberManagement'
import Archive from './components/Archive'
import PaymentTracking from './components/PaymentTracking'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import { Users, Plus, ClipboardList, TrendingUp, Archive as ArchiveIcon, CheckSquare } from 'lucide-react'

function App() {
  const [currentGroup, setCurrentGroup] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [members, setMembers] = useState([])
  const [currentPage, setCurrentPage] = useState('settlement')
  
  // Track which data has been loaded to avoid refetching
  const [loadedData, setLoadedData] = useState({
    members: false,
    expenses: false
  })
  
  // Track loading state
  const [isLoading, setIsLoading] = useState({
    members: false,
    expenses: false
  })

  useEffect(() => {
    // Check if user has a stored group
    const storedGroup = localStorage.getItem('currentGroup')
    if (storedGroup) {
      try {
        const group = JSON.parse(storedGroup)
        setCurrentGroup(group)
      } catch (error) {
        console.error('Error parsing stored group:', error)
        localStorage.removeItem('currentGroup')
      }
    }
  }, [])

  // Lazy load data based on current page - only fetch when needed
  useEffect(() => {
    if (!currentGroup) return

    // Determine what data is needed for the current page
    const needsMembers = ['members', 'add', 'items', 'settlement', 'archive', 'payments'].includes(currentPage)
    const needsExpenses = ['items', 'settlement', 'archive', 'payments'].includes(currentPage)

    // Fetch members if needed and not already loaded
    if (needsMembers && !loadedData.members) {
      fetchMembers()
    }

    // Fetch expenses if needed and not already loaded
    if (needsExpenses && !loadedData.expenses) {
      fetchExpenses()
    }
  }, [currentGroup, currentPage, loadedData])

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const fetchMembers = useCallback(async (forceRefresh = false) => {
    if (!currentGroup) return
    
    // Skip if already loaded and not forcing refresh
    if (loadedData.members && !forceRefresh) return
    
    setIsLoading(prev => ({ ...prev, members: true }))
    try {
      const response = await fetch(`${API_URL}/members?groupId=${currentGroup._id}`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data)
        setLoadedData(prev => ({ ...prev, members: true }))
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, members: false }))
    }
  }, [currentGroup, loadedData.members, API_URL])

  const fetchExpenses = useCallback(async (forceRefresh = false) => {
    if (!currentGroup) return
    
    // Skip if already loaded and not forcing refresh
    if (loadedData.expenses && !forceRefresh) return
    
    setIsLoading(prev => ({ ...prev, expenses: true }))
    try {
      // Fetch with pagination - get first 100 expenses
      const response = await fetch(`${API_URL}/expenses?groupId=${currentGroup._id}&limit=100&skip=0`)
      if (response.ok) {
        const data = await response.json()
        // Handle new paginated response format
        setExpenses(data.expenses || data)
        setLoadedData(prev => ({ ...prev, expenses: true }))
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, expenses: false }))
    }
  }, [currentGroup, loadedData.expenses, API_URL])

  const addExpense = async (expense) => {
    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expense, groupId: currentGroup._id })
      })
      if (response.ok) {
        fetchExpenses(true) // Force refresh after adding
      }
    } catch (error) {
      console.error('Error adding expense:', error)
    }
  }

  const addMember = async (member) => {
    try {
      const response = await fetch(`${API_URL}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...member, groupId: currentGroup._id })
      })
      if (response.ok) {
        fetchMembers(true) // Force refresh after adding
      }
    } catch (error) {
      console.error('Error adding member:', error)
    }
  }

  const handleGroupSelect = (group) => {
    setCurrentGroup(group)
    localStorage.setItem('currentGroup', JSON.stringify(group))
    // Reset loaded data cache when switching groups
    setLoadedData({ members: false, expenses: false })
    setMembers([])
    setExpenses([])
  }

  const handleLogout = () => {
    setCurrentGroup(null)
    setMembers([])
    setExpenses([])
    setLoadedData({ members: false, expenses: false })
    localStorage.removeItem('currentGroup')
  }

  // Wrapper functions to force refresh
  const handleRefreshMembers = () => fetchMembers(true)
  const handleRefreshExpenses = () => fetchExpenses(true)

  // Show group selection if no group is selected
  if (!currentGroup) {
    return <GroupSelection onGroupSelect={handleGroupSelect} />
  }

  return (
    <div className="app">
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        currentGroup={currentGroup}
        onLogout={handleLogout}
      />
      
      <div className="main-container">
        <header className="app-header">
          <h1>
            {currentPage === 'members' && <><Users size={32} style={{ display: 'inline-block', marginRight: '12px', verticalAlign: 'middle' }} /> Members</>}
            {currentPage === 'add' && <><Plus size={32} style={{ display: 'inline-block', marginRight: '12px', verticalAlign: 'middle' }} /> Add Items</>}
            {currentPage === 'items' && <><ClipboardList size={32} style={{ display: 'inline-block', marginRight: '12px', verticalAlign: 'middle' }} /> All Items</>}
            {currentPage === 'settlement' && <><TrendingUp size={32} style={{ display: 'inline-block', marginRight: '12px', verticalAlign: 'middle' }} /> Summary</>}
            {currentPage === 'archive' && <><ArchiveIcon size={32} style={{ display: 'inline-block', marginRight: '12px', verticalAlign: 'middle' }} /> Archive</>}
            {currentPage === 'payments' && <><CheckSquare size={32} style={{ display: 'inline-block', marginRight: '12px', verticalAlign: 'middle' }} /> Payment Tracking</>}
          </h1>
        </header>

        <main className="app-content">
          {currentPage === 'members' && (
            <MemberManagement 
              members={members} 
              onAddMember={addMember} 
              onRefresh={handleRefreshMembers}
              expenses={expenses}
            />
          )}
          
          {currentPage === 'add' && (
            <ExpenseForm 
              members={members} 
              onAddExpense={addExpense} 
            />
          )}
          
          {currentPage === 'items' && (
            <ItemsList 
              expenses={expenses} 
              members={members}
              onRefresh={handleRefreshExpenses}
            />
          )}
          {currentPage === 'settlement' && (
            <ExpenseList 
              expenses={expenses} 
              members={members}
              onRefresh={handleRefreshExpenses}
            />
          )}
          
          {currentPage === 'archive' && (
            <Archive 
              expenses={expenses} 
              members={members}
              onRefresh={handleRefreshExpenses}
            />
          )}
          
          {currentPage === 'payments' && (
            <PaymentTracking 
              expenses={expenses} 
              members={members}
              onRefresh={handleRefreshExpenses}
            />
          )}
        </main>

        <BottomNav 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
          onLogout={handleLogout}
        />
      </div>
    </div>
  )
}

export default App
