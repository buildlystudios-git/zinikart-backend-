'use client'

import React, { useEffect, useState } from 'react'

export function DashboardGreeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState('Welcome')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting('Good Morning')
    } else if (hour < 17) {
      setGreeting('Good Afternoon')
    } else {
      setGreeting('Good Evening')
    }
  }, [])

  return (
    <div>
      <h1>
        {greeting}, {name} <span>👋</span>
      </h1>
      <p>Here&apos;s what&apos;s happening with ZiniKart today.</p>
    </div>
  )
}

