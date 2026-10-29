import type { PayloadRequest } from 'payload'
import { transformProductDetail } from '../transformers/product'
import { transformCategory } from '../transformers/category'
import { transformBrand } from '../transformers/brand'

// ---------------------------------------------------------------------------
// Helper: haversine distance in km between two lat/lng pairs
// ---------------------------------------------------------------------------
const haversineDistanceKm = (
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------------------------------------------------------------------------
// Helper: unwrap a Promise.allSettled result into docs or a fallback
// ---------------------------------------------------------------------------
const settled = <T>(
  result: PromiseSettledResult<{ docs: T[] }>,
  fallback: T[] = [],
  label: string,
  req: PayloadRequest,
): T[] => {
  if (result.status === 'fulfilled') return result.value.docs
  req.payload.logger.error(
    { err: result.reason },
    `[mobile/home] Section "${label}" failed — returning empty`,
  )
  return fallback
}

// ---------------------------------------------------------------------------
// Helper: standard published retailer-product where clause
// ---------------------------------------------------------------------------
const buildProductWhere = (overrides: any[] = []): any => ({
  and: [
    { isMasterTemplate: { equals: false } },
    { _status: { equals: 'published' } },
    { deletedAt: { exists: false } },
    ...overrides,
  ],
})

// ---------------------------------------------------------------------------
// Helper: validate and clamp an integer query param
// ---------------------------------------------------------------------------
const parseIntParam = (
  raw: string | null,
  defaultVal: number,
  min: number,
  max: number,
): number => {
  const n = parseInt(raw ?? String(defaultVal), 10)
  if (isNaN(n)) return defaultVal
  return Math.min(Math.max(n, min), max)
}

// ---------------------------------------------------------------------------
// Helper: validate and clamp a float query param
// ---------------------------------------------------------------------------
const parseFloatParam = (
  raw: string | null,
  defaultVal: number,
  min: number,
  max: number,
): number => {
  const n = parseFloat(raw ?? String(defaultVal))
  if (isNaN(n)) return defaultVal
  return Math.min(Math.max(n, min), max)
}

// ---------------------------------------------------------------------------
// Helper: validate a document ID (UUID v4 format used by this project)
// ---------------------------------------------------------------------------
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isValidId = (id: string): boolean => UUID_REGEX.test(id)

// ---------------------------------------------------------------------------
// Transformer for a retailer store card (used in "Nearby Stores" section)
// ---------------------------------------------------------------------------
const transformRetailerCard = (r: any, distanceKm?: number) => ({
  id: r.id,
  shopName: r.shopName,
  ownerName: r.ownerName,
  images: Array.isArray(r.images)
    ? r.images
        .map((img: any) => (typeof img === 'string' ? img : img?.url || null))
        .filter(Boolean)
    : [],
  shopAddress: {
    street: r.shopAddress?.street || null,
    landmark: r.shopAddress?.landmark || null,
    city: r.shopAddress?.city || null,
    state: r.shopAddress?.state || null,
    zipCode: r.shopAddress?.zipCode || null,
    lat: r.shopAddress?.lat ?? null,
    lng: r.shopAddress?.lng ?? null,
  },
  businessHours: {
    startTime: r.businessHours?.startTime || null,
    endTime: r.businessHours?.endTime || null,
    openEveryday: r.businessHours?.openEveryday || false,
    weekOff: r.businessHours?.weekOff || [],
  },
  averageRating: r.averageRating || 0,
  ratingCount: r.ratingCount || 0,
  onlineStatus: r.onlineStatus || 'online',
  ...(distanceKm !== undefined
    ? { distanceKm: Math.round(distanceKm * 10) / 10 }
    : {}),
})

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export const homeEndpoint = async (req: PayloadRequest): Promise<Response> => {
  try {
    const raw = req.url || ''
    let url: URL
    try {
      url = new URL(raw, 'http://localhost:3000')
    } catch {
      return Response.json({ error: 'Malformed request URL' }, { status: 400 })
    }

    // ------------------------------------------------------------------ //
    // Parse & validate query params
    // ------------------------------------------------------------------ //
    const sectionLimit = parseIntParam(url.searchParams.get('sectionLimit'), 10, 1, 30)
    const brandsLimit  = parseIntParam(url.searchParams.get('brandsLimit'),  12, 1, 50)
    const nearbyLimit  = parseIntParam(url.searchParams.get('nearbyLimit'),   6, 1, 30)
    const maxPrice     = parseIntParam(url.searchParams.get('maxPrice'),    999, 1, 1_000_000)
    const radiusKm     = parseFloatParam(url.searchParams.get('radius'),    5.0, 0.1, 50)

    const userLat = parseFloat(url.searchParams.get('lat') ?? '')
    const userLng = parseFloat(url.searchParams.get('lng') ?? '')
    const hasLocation = !isNaN(userLat) && !isNaN(userLng)

    // Validate lat/lng ranges when supplied
    if (
      (url.searchParams.has('lat') || url.searchParams.has('lng')) &&
      (!hasLocation || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180)
    ) {
      return Response.json(
        { error: 'Invalid lat/lng. lat must be [-90, 90], lng must be [-180, 180].' },
        { status: 400 },
      )
    }

    // ------------------------------------------------------------------ //
    // Validate & sanitize category ID lists
    // ------------------------------------------------------------------ //
    const warnings: string[] = []

    const rawFeaturedIds = (url.searchParams.get('featuredCategoryIds') ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean)
    const rawByCategoryIds = (url.searchParams.get('byCategoryIds') ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean)

    const featuredCategoryIds: string[] = []
    for (const id of rawFeaturedIds) {
      if (isValidId(id)) {
        featuredCategoryIds.push(id)
      } else {
        warnings.push(`featuredCategoryIds: "${id}" is not a valid ID and was ignored`)
      }
    }

    const byCategoryIds: string[] = []
    for (const id of rawByCategoryIds) {
      if (isValidId(id)) {
        byCategoryIds.push(id)
      } else {
        warnings.push(`byCategoryIds: "${id}" is not a valid ID and was ignored`)
      }
    }

    // Guard against too many dynamic sections to prevent abuse
    const MAX_DYNAMIC_SECTIONS = 10
    if (featuredCategoryIds.length + byCategoryIds.length > MAX_DYNAMIC_SECTIONS) {
      return Response.json(
        { error: `Too many category sections requested. Maximum is ${MAX_DYNAMIC_SECTIONS} combined after filtering invalid IDs.` },
        { status: 400 },
      )
    }

    // ------------------------------------------------------------------ //
    // Fetch variantTypes map once — shared across all product transforms
    // ------------------------------------------------------------------ //
    let variantTypesMap: Record<string, string> = {}
    try {
      const typesRes = await req.payload.find({
        collection: 'variantTypes',
        limit: 1000,
        overrideAccess: true,
        req,
      })
      typesRes.docs.forEach((t: any) => {
        variantTypesMap[t.id] = t.name || t.label || 'Option'
      })
    } catch {
      // variantTypes may not exist — safe to proceed with empty map
    }

    // ------------------------------------------------------------------ //
    // Build nearby retailers bounding-box where clause
    // ------------------------------------------------------------------ //
    const degPerKm = 1 / 111
    const latDelta = radiusKm * degPerKm
    const lngDelta = radiusKm * degPerKm

    const nearbyRetailersWhere: any = {
      and: [{ approvalStatus: { equals: 'approved' } }],
    }
    if (hasLocation) {
      nearbyRetailersWhere.and.push(
        { 'shopAddress.lat': { greater_than_equal: userLat - latDelta } },
        { 'shopAddress.lat': { less_than_equal: userLat + latDelta } },
        { 'shopAddress.lng': { greater_than_equal: userLng - lngDelta } },
        { 'shopAddress.lng': { less_than_equal: userLng + lngDelta } },
      )
    }

    // ------------------------------------------------------------------ //
    // Fire ALL queries in parallel using Promise.allSettled.
    //
    // Unlike Promise.all, allSettled NEVER throws — every query either
    // fulfills or rejects independently. A failed "top selling" query
    // returns an empty array but does not destroy the whole home page.
    // ------------------------------------------------------------------ //
    const allCategoryIds = [...featuredCategoryIds, ...byCategoryIds]

    const results = await Promise.allSettled([
      // [0] Categories
      req.payload.find({
        collection: 'categories',
        limit: 100,
        depth: 1,
        sort: 'title',
        overrideAccess: true,
        req,
      }),

      // [1] Brands
      req.payload.find({
        collection: 'brands',
        limit: brandsLimit,
        depth: 1,
        sort: 'name',
        overrideAccess: true,
        req,
      }),

      // [2] Top Selling
      req.payload.find({
        collection: 'products',
        where: buildProductWhere(),
        sort: '-averageRating',
        limit: sectionLimit,
        depth: 4,
        overrideAccess: true,
        req,
      }),

      // [3] Quick Picks (under maxPrice)
      req.payload.find({
        collection: 'products',
        where: buildProductWhere([
          { priceInINR: { less_than_equal: maxPrice } },
        ]),
        sort: 'priceInINR',
        limit: sectionLimit,
        depth: 4,
        overrideAccess: true,
        req,
      }),

      // [4] Nearby Retailers (bounding-box or all approved when no location)
      req.payload.find({
        collection: 'retailers',
        where: nearbyRetailersWhere,
        // Fetch extra so we can re-sort by precise haversine distance then slice
        limit: hasLocation ? nearbyLimit * 3 : nearbyLimit,
        depth: 1,
        overrideAccess: true,
        req,
      }),

      // [5+] Dynamic category sections (featured + byCategory) all in parallel
      ...allCategoryIds.map((categoryId) =>
        req.payload.find({
          collection: 'products',
          where: buildProductWhere([
            { categories: { in: [categoryId] } },
          ]),
          sort: '-averageRating',
          limit: sectionLimit,
          depth: 4,
          overrideAccess: true,
          req,
        }),
      ),
    ])

    // ------------------------------------------------------------------ //
    // Destructure results — every section falls back to [] on failure
    // ------------------------------------------------------------------ //
    const [
      categoriesResult,
      brandsResult,
      topSellingResult,
      quickPicksResult,
      nearbyRetailersResult,
      ...dynamicResults
    ] = results

    const categoryDocs   = settled(categoriesResult,     [], 'categories',   req)
    const brandDocs      = settled(brandsResult,         [], 'brands',       req)
    const topSellingDocs = settled(topSellingResult,     [], 'topSelling',   req)
    const quickPicksDocs = settled(quickPicksResult,     [], 'quickPicks',   req)
    const nearbyRetDocs  = settled(nearbyRetailersResult,[], 'nearbyStores', req)

    // ------------------------------------------------------------------ //
    // Transform
    // ------------------------------------------------------------------ //
    const categories = categoryDocs.map(transformCategory).filter(Boolean)
    const brands     = brandDocs.map(transformBrand).filter(Boolean)
    const topSelling = topSellingDocs.map((p) => transformProductDetail(p, variantTypesMap)).filter(Boolean)
    const quickPicks = quickPicksDocs.map((p) => transformProductDetail(p, variantTypesMap)).filter(Boolean)

    // Nearby stores: precise haversine sort + radius clip
    let nearbyStores: any[] = nearbyRetDocs.map((r: any) => {
      const storeLat = r.shopAddress?.lat
      const storeLng = r.shopAddress?.lng
      const distanceKm =
        hasLocation && storeLat != null && storeLng != null
          ? haversineDistanceKm(userLat, userLng, storeLat, storeLng)
          : undefined
      return transformRetailerCard(r, distanceKm)
    })

    if (hasLocation) {
      nearbyStores = nearbyStores
        .filter((s) => s.distanceKm !== undefined && s.distanceKm <= radiusKm)
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
        .slice(0, nearbyLimit)
    } else {
      nearbyStores = nearbyStores.slice(0, nearbyLimit)
    }

    // Build category ID → title lookup from the successfully fetched categories
    const categoryIdToTitle = new Map<string, string>(
      categoryDocs.map((c: any) => [String(c.id), c.title as string]),
    )

    // Featured sections
    const featuredSections = featuredCategoryIds.map((categoryId, i) => {
      const docs = settled(dynamicResults[i], [], `featured:${categoryId}`, req)
      return {
        categoryId,
        title: categoryIdToTitle.get(categoryId) || 'Featured',
        products: docs.map((p) => transformProductDetail(p, variantTypesMap)).filter(Boolean),
      }
    })

    // By-Category sections
    const byCategorySections = byCategoryIds.map((categoryId, i) => {
      const docs = settled(dynamicResults[featuredCategoryIds.length + i], [], `byCategory:${categoryId}`, req)
      return {
        categoryId,
        title: categoryIdToTitle.get(categoryId) || 'Category',
        products: docs.map((p) => transformProductDetail(p, variantTypesMap)).filter(Boolean),
      }
    })

    // ------------------------------------------------------------------ //
    // Final response — always 200 with whatever data we have.
    // _warnings is only present when the client passed invalid/ignored params.
    // ------------------------------------------------------------------ //
    return Response.json({
      categories,
      brands,
      topSelling,
      quickPicks: {
        maxPrice,
        products: quickPicks,
      },
      nearbyStores,
      featuredSections,
      byCategorySections,
      ...(warnings.length > 0 ? { _warnings: warnings } : {}),
    })
  } catch (err: any) {
    req.payload.logger.error({ err }, '[mobile/home] Unexpected error building home feed')
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
