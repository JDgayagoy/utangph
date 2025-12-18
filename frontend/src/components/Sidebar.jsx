import { Users, Plus, ClipboardList, TrendingUp, Home, Archive, CheckSquare, LogOut } from 'lucide-react'

function Sidebar({ currentPage, onPageChange, currentGroup, onLogout }) {
  const pages = [
    { id: 'settlement', icon: TrendingUp, label: 'Summary' },
    { id: 'payments', icon: CheckSquare, label: 'Payment Tracking' },
    { id: 'items', icon: ClipboardList, label: 'All Items' },
    { id: 'add', icon: Plus, label: 'Add Items' },
    { id: 'archive', icon: Archive, label: 'Archive' },
    { id: 'members', icon: Users, label: 'Members' }
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1><Home size={32} style={{ display: 'inline-block', marginRight: '8px' }} /> UtangPH</h1>
        <p>Shared Expense Tracker</p>
        {currentGroup && (
          <div className="current-group-info">
            <div className="group-badge">{currentGroup.name}</div>
          </div>
        )}
      </div>
      <nav className="sidebar-nav">
        {pages.map(page => {
          const Icon = page.icon
          return (
            <button
              key={page.id}
              className={`sidebar-item ${currentPage === page.id ? 'active' : ''}`}
              onClick={() => onPageChange(page.id)}
            >
              <span className="sidebar-icon"><Icon size={24} /></span>
              <span className="sidebar-label">{page.label}</span>
            </button>
          )
        })}
      </nav>
      {onLogout && (
        <div className="sidebar-footer">
          <button className="logout-button" onClick={onLogout}>
            <LogOut size={20} />
            <span>Switch Group</span>
          </button>
        </div>
      )}
    </aside>
  )
}

export default Sidebar


