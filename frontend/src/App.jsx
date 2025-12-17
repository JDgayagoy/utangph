import { useState, useEffect } from 'react'
import './App.css'
import GroupSelection from './components/GroupSelection'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import ItemsList from './components/ItemsList'
import MemberManagement from './components/MemberManagement'
import Archive from './components/Archive'
import PaymentTracking from './components/PaymentTracking'
import QRCodeManagement from './components/QRCodeManagement'
import Sidebar from './components/Sidebar'
import { Users, Plus, ClipboardList, TrendingUp, Archive as ArchiveIcon, CheckSquare, QrCode } from 'lucide-react'

function App() {
  const [currentGroup, setCurrentGroup] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [members, setMembers] = useState([])
  const [currentPage, setCurrentPage] = useState('settlement')

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

  useEffect(() => {
    // Fetch members and expenses when group is selected
    if (currentGroup) {
      fetchMembers()
      fetchExpenses()
    }
  }, [currentGroup])

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const fetchMembers = async () => {
    if (!currentGroup) return
    try {
      const response = await fetch(`${API_URL}/members?groupId=${currentGroup._id}`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const fetchExpenses = async () => {
    if (!currentGroup) return
    try {
      const response = await fetch(`${API_URL}/expenses?groupId=${currentGroup._id}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data)
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    }
  }

  const addExpense = async (expense) => {
    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expense, groupId: currentGroup._id })
      })
      if (response.ok) {
        fetchExpenses()
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
        fetchMembers()
      }
    } catch (error) {
      console.error('Error adding member:', error)
    }
  }

  const handleGroupSelect = (group) => {
    setCurrentGroup(group)
    localStorage.setItem('currentGroup', JSON.stringify(group))
  }

  const handleLogout = () => {
    setCurrentGroup(null)
    setMembers([])
    setExpenses([])
    localStorage.removeItem('currentGroup')
  }

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
            {currentPage === 'qrcodes' && <><QrCode size={32} style={{ display: 'inline-block', marginRight: '12px', verticalAlign: 'middle' }} /> QR Codes</>}
          </h1>
        </header>

        <main className="app-content">
          {currentPage === 'members' && (
            <MemberManagement 
              members={members} 
              onAddMember={addMember} 
              onRefresh={fetchMembers} 
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
              onRefresh={fetchExpenses}
            />
          )}
          {currentPage === 'settlement' && (
            <ExpenseList 
              expenses={expenses} 
              members={members}
              onRefresh={fetchExpenses}
            />
          )}
          
          {currentPage === 'archive' && (
            <Archive 
              expenses={expenses} 
              members={members}
              onRefresh={fetchExpenses}
            />
          )}
          
          {currentPage === 'payments' && (
            <PaymentTracking 
              expenses={expenses} 
              members={members}
              onRefresh={fetchExpenses}
            />
          )}
          
          {currentPage === 'qrcodes' && (
            <QRCodeManagement 
              members={members}
              onRefresh={fetchMembers}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
