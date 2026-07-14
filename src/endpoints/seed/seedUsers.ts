import type { Payload } from 'payload'

async function createUserSafe(payload: Payload, data: any) {
  try {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: data.email } },
    })
    if (existing.docs.length > 0) {
      return existing.docs[0]
    }
    return await payload.create({ collection: 'users', data })
  } catch (err) {
    payload.logger.error(`Failed to create user ${data.email}`)
  }
}

export async function seedUsers(payload: Payload) {
  payload.logger.info(`— Seeding users...`)
  await Promise.all([
    createUserSafe(payload, {
      name: 'Customer',
      email: 'customer@example.com',
      password: 'password',
      roles: ['customer'],
    }),
    createUserSafe(payload, {
      name: 'Retailer User',
      email: 'retailer@example.com',
      password: 'password',
      roles: ['retailer'],
    }),
    createUserSafe(payload, {
      name: 'Delivery Partner User',
      email: 'delivery@example.com',
      password: 'password',
      roles: ['customer'],
    }),
  ])
}
