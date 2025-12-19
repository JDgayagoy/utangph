import { User } from 'lucide-react'

function MemberAvatar({ member, size = 'medium', className = '', showFallback = true }) {
  const sizeClasses = {
    small: 'member-avatar-small',
    medium: 'member-avatar',
    large: 'member-avatar-large',
    nav: 'nav-tag-avatar'
  }

  const avatarClass = `${sizeClasses[size]} ${className}`

  if (member?.profilePicture) {
    return (
      <div className={avatarClass}>
        <img 
          src={member.profilePicture} 
          alt={member.name}
          className="avatar-image"
          onError={(e) => {
            // If image fails to load, show fallback
            e.target.style.display = 'none'
            e.target.nextElementSibling.style.display = 'flex'
          }}
        />
        <div className="avatar-fallback" style={{ display: 'none' }}>
          {member.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
      </div>
    )
  }

  if (showFallback && member?.name) {
    return (
      <div className={avatarClass}>
        {member.name.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <div className={`${avatarClass} avatar-placeholder`}>
      <User size={size === 'small' ? 12 : size === 'large' ? 24 : 16} />
    </div>
  )
}

export default MemberAvatar