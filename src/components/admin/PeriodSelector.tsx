'use client'

import React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import type { DashboardPeriod } from '@/services/admin-dashboard/getDashboardData'
import styles from './DashboardView.module.css'

export function PeriodSelector({
  paramKey,
  currentPeriod,
  defaultPeriod = 'today',
}: {
  paramKey: string
  currentPeriod?: DashboardPeriod
  defaultPeriod?: DashboardPeriod
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activePeriod = currentPeriod || defaultPeriod

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPeriod = e.target.value as DashboardPeriod
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
    if (nextPeriod === defaultPeriod) {
      params.delete(paramKey)
    } else {
      params.set(paramKey, nextPeriod)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className={styles.specialDropdownWrap}>
      <select
        className={styles.timeDropdown}
        value={activePeriod}
        onChange={handleChange}
        aria-label="Select time period"
      >
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
      </select>
      <ChevronDown size={14} className={styles.dropdownChevron} />
    </div>
  )
}
