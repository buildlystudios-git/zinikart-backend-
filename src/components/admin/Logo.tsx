import React from 'react'

export const Logo: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontWeight: 700,
        fontSize: '18px',
        color: '#ffffff',
        padding: '12px 16px',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: '#138c31',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '16px',
          boxShadow: '0 2px 8px rgba(19, 140, 49, 0.4)',
          flexShrink: 0,
        }}
      >
        Z
      </div>
      <span>
        ZiniKart <span style={{ color: '#86efac', fontWeight: 500, fontSize: '13px' }}>Admin</span>
      </span>
    </div>
  )
}

// Render a clean Home icon in the top header navbar
export const Icon: React.FC = () => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#172018' }}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </div>
  )
}
