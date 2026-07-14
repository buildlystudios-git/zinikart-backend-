import type { Payload } from 'payload'
import { homePageData } from './data/home'
import { contactPageData } from './data/contact-page'
import { contactFormData } from './data/contact-form'

export async function seedPages(payload: Payload, imageHeroId: string, imageHatId: string) {
  payload.logger.info(`— Seeding contact form...`)

  const contactForm = await payload.create({
    collection: 'forms',
    depth: 0,
    data: contactFormData(),
  })

  payload.logger.info(`— Seeding pages...`)

  await Promise.all([
    payload.create({
      collection: 'pages',
      depth: 0,
      context: { disableRevalidate: true },
      data: homePageData({
        contentImage: imageHeroId as any,
        metaImage: imageHatId as any,
      }),
    }),
    payload.create({
      collection: 'pages',
      depth: 0,
      context: { disableRevalidate: true },
      data: contactPageData({
        contactForm: contactForm,
      }),
    }),
  ])
}
