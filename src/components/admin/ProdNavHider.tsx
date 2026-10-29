'use client'

import React, { useEffect } from 'react'

export const ProdNavHider: React.FC = () => {
  const isProd =
    process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_NODE_ENV === 'production'

  useEffect(() => {
    if (!isProd) return

    const hideItems = () => {
      const selectors = [
        '#nav-brands',
        '#nav-products',
        '.nav a[href$="/collections/brands"]',
        '.nav a[href$="/collections/products"]',
        '.nav__wrap a[href$="/collections/brands"]',
        '.nav__wrap a[href$="/collections/products"]',
        'aside.sidebar a[href$="/collections/brands"]',
        'aside.sidebar a[href$="/collections/products"]',
      ]
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.display = 'none'
          }
        })
      })
    }

    hideItems()
    const observer = new MutationObserver(hideItems)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [isProd])

  if (!isProd) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          #nav-brands,
          #nav-products,
          a[id="nav-brands"],
          a[id="nav-products"],
          div[id="nav-brands"],
          div[id="nav-products"],
          .nav a[href$="/collections/brands"],
          .nav a[href$="/collections/products"],
          .nav__wrap a[href$="/collections/brands"],
          .nav__wrap a[href$="/collections/products"],
          aside.sidebar a[href$="/collections/brands"],
          aside.sidebar a[href$="/collections/products"] {
            display: none !important;
          }
        `,
      }}
    />
  )
}

export default ProdNavHider
