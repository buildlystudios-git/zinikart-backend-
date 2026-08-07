import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import CategoryBrandsView from './CategoryBrandsView'

export default async function CategoryBrandsPage({ initPageResult, payload }: AdminViewServerProps) {
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
      <CategoryBrandsView />
    </DefaultTemplate>
  )
}
