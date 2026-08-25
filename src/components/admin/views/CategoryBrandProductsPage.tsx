import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import CategoryBrandProductsView from './CategoryBrandProductsView'

export default async function CategoryBrandProductsPage({ initPageResult, payload }: AdminViewServerProps) {
  const { req, visibleEntities } = initPageResult
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={req.locale as any}
      params={req.routeParams as any}
      payload={payload}
      permissions={initPageResult.permissions}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <CategoryBrandProductsView />
    </DefaultTemplate>
  )
}
