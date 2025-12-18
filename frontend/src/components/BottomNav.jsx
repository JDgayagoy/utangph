import { useState } from 'react'
import { LogOut } from 'lucide-react'

function BottomNav({ currentPage, onPageChange, onLogout }) {
  const pages = [
    { id: 'members', icon: '👥', label: 'Members' },
    { id: 'add', icon: '➕', label: 'Add Items' },
    { id: 'items', icon: '📋', label: 'All Items' },
    { id: 'settlement', icon: '💰', label: 'Summary' }
  ]

  return (
    <nav className="bottom-nav">
      {pages.map(page => (
        <button
          key={page.id}
          className={`nav-item ${currentPage === page.id ? 'active' : ''}`}
          onClick={() => onPageChange(page.id)}
        >
          <span className="nav-icon">{page.icon}</span>
          <span className="nav-label">{page.label}</span>
        </button>
      ))}
      {onLogout && (
        <button
          className="nav-item logout-nav"
          onClick={onLogout}
        >
          <span className="nav-icon"><LogOut size={20} /></span>
          <span className="nav-label">Switch</span>
        </button>
      )}
    </nav>
  )
}

export default BottomNav
