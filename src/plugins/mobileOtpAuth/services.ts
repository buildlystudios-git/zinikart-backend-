import type { CollectionSlug, PayloadRequest } from 'payload'
import { jwtSign } from 'payload'
import { DEFAULT_CUSTOMER_ROLE } from './constants'
import { syntheticEmailForMobile, normalizeMobileNumber } from './helpers'

export const getUsersCollection = (req: PayloadRequest, usersSlug: string) => {
  const collection = req.payload.collections[usersSlug as CollectionSlug]

  if (!collection) {
    throw new Error(`Users collection "${usersSlug}" was not found.`)
  }

  return collection
}

export const findUserByMobileNumber = async (req: PayloadRequest, usersSlug: string, mobileNumber: string) => {
  const digits = mobileNumber.replace(/\D/g, '')
  const core10Digits = digits.length >= 10 ? digits.slice(-10) : digits

  const result = await req.payload.find({
    collection: usersSlug as 'users',
    limit: 1,
    overrideAccess: true,
    pagination: false,
    showHiddenFields: true,
    where: {
      mobileNumber: {
        like: core10Digits,
      },
    } as any,
  })

  return result.docs[0] || null
}

export const createOtpUser = async (
  req: PayloadRequest,
  usersSlug: string,
  mobileNumber: string,
  name?: string,
  role = DEFAULT_CUSTOMER_ROLE,
) => {
  const formattedMobile = normalizeMobileNumber(mobileNumber)

  return req.payload.create({
    collection: usersSlug as 'users',
    data: {
      email: syntheticEmailForMobile(formattedMobile),
      mobileNumber: formattedMobile,
      mobileVerified: true,
      password: crypto.randomUUID(),
      roles: [role],
      name,
    } as any,
    overrideAccess: true,
    showHiddenFields: true,
  })
}

export const markUserOtpLogin = async (
  req: PayloadRequest,
  usersSlug: string,
  userID: number | string,
) => {
  const data: any = {
    lastOtpLoginAt: new Date().toISOString(),
    mobileVerified: true,
  }
  return req.payload.update({
    id: userID as any,
    collection: usersSlug as 'users',
    data,
    overrideAccess: true,
    showHiddenFields: true,
  })
}

export const createSessionToken = async ({
  req,
  user,
  usersSlug,
}: {
  req: PayloadRequest
  user: any
  usersSlug: string
}) => {
  const usersCollection = getUsersCollection(req, usersSlug)
  const collectionConfig = usersCollection.config
  const sid = crypto.randomUUID()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + collectionConfig.auth.tokenExpiration * 1000)
  const sessions = [
    ...((user.sessions || []).filter((session: { expiresAt: string }) => {
      return new Date(session.expiresAt) > now
    }) ?? []),
    {
      id: sid,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
  ]

  if (collectionConfig.auth.useSessions) {
    await req.payload.db.updateOne({
      id: user.id,
      collection: usersSlug as CollectionSlug,
      data: {
        ...user,
        sessions,
        updatedAt: null,
      },
      req,
      returning: false,
    })
  }

  const { exp, token } = await jwtSign({
    fieldsToSign: {
      collection: usersSlug,
      email: user.email,
      id: user.id,
      ...(collectionConfig.auth.useSessions ? { sid } : {}),
    },
    secret: req.payload.secret,
    tokenExpiration: collectionConfig.auth.tokenExpiration,
  })

  return { exp, token }
}

export const getUserStatus = async (
  req: PayloadRequest,
  user: any,
  requestedRole?: string
): Promise<'approved' | 'approved_no_products' | 'registration_required' | 'pending_approval' | 'rejected' | 'suspended'> => {
  const role = requestedRole || (user.roles?.includes('retailer') ? 'retailer' : user.roles?.includes('delivery_partner') ? 'delivery_partner' : 'customer')

  let status: 'approved' | 'approved_no_products' | 'registration_required' | 'pending_approval' | 'rejected' | 'suspended' = 'approved'

  if (role === 'retailer') {
    const retailerDocs = await req.payload.find({
      collection: 'retailers',
      where: { user: { equals: user.id } },
      limit: 1,
      overrideAccess: true,
    })
    const retailer = retailerDocs.docs[0]
    if (!retailer) {
      status = 'registration_required'
    } else {
      const appStatus = retailer.approvalStatus as string
      if (appStatus === 'approved') {
        const productDocs = await req.payload.find({
          collection: 'products',
          where: { retailer: { equals: user.id } },
          limit: 1,
          overrideAccess: true,
        })
        if (productDocs.totalDocs > 0) {
          status = 'approved'
        } else {
          status = 'approved_no_products'
        }
      }
      else if (appStatus === 'pending') status = 'pending_approval'
      else if (appStatus === 'rejected') status = 'rejected'
      else if (appStatus === 'suspended') status = 'suspended'
    }
  } else if (role === 'delivery_partner') {
    const deliveryDocs = await req.payload.find({
      collection: 'delivery-partners',
      where: { user: { equals: user.id } },
      limit: 1,
      overrideAccess: true,
    })
    const partner = deliveryDocs.docs[0]
    if (!partner) {
      status = 'registration_required'
    } else {
      const appStatus = partner.approvalStatus as string
      if (appStatus === 'approved') status = 'approved'
      else if (appStatus === 'pending') status = 'pending_approval'
      else if (appStatus === 'rejected') status = 'rejected'
      else if (appStatus === 'suspended') status = 'suspended'
    }
  }

  return status
}
