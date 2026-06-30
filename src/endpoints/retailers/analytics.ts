import type { PayloadRequest, Where } from 'payload'
import { checkRole } from '@/access/utilities'

export const analyticsEndpoint = async (req: PayloadRequest): Promise<Response> => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized. Login required.' }, { status: 401 })
  }

  const isRetailer = checkRole(['retailer'], req.user)
  const isAdmin = checkRole(['admin'], req.user)

  if (!isRetailer && !isAdmin) {
    return Response.json({ error: 'Forbidden. Retailer or Admin role required.' }, { status: 403 })
  }

  const url = new URL(req.url || '', 'http://localhost:3000')
  const dateParam = url.searchParams.get('date')
  const startDateParam = url.searchParams.get('startDate')
  const endDateParam = url.searchParams.get('endDate')

  let start: Date
  let end: Date

  if (startDateParam || endDateParam) {
    if (!startDateParam || !endDateParam) {
      return Response.json({ error: 'Both startDate and endDate query parameters are required for date range query.' }, { status: 400 })
    }
    start = new Date(`${startDateParam}T00:00:00`)
    end = new Date(`${endDateParam}T23:59:59.999`)
  } else if (dateParam) {
    start = new Date(`${dateParam}T00:00:00`)
    end = new Date(`${dateParam}T23:59:59.999`)
  } else {
    const todayStr = new Date().toISOString().split('T')[0]
    start = new Date(`${todayStr}T00:00:00`)
    end = new Date(`${todayStr}T23:59:59.999`)
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return Response.json({ error: 'Invalid date format. Please use YYYY-MM-DD.' }, { status: 400 })
  }

  // Determine retailer scope
  let retailerUserId: number | string | null = null
  if (isAdmin) {
    const rId = url.searchParams.get('retailer')
    if (rId) {
      retailerUserId = isNaN(Number(rId)) ? rId : Number(rId)
    }
  } else {
    retailerUserId = req.user.id
  }

  try {
    // 1. Fetch retailer's products
    const productWhere: Where = retailerUserId ? { retailer: { equals: retailerUserId } } : {}
    const retailerProducts = await req.payload.find({
      collection: 'products',
      where: productWhere,
      limit: 10000,
      depth: 1, // depth 1 to get category & brand info
      overrideAccess: true,
    })

    const productIds = retailerProducts.docs.map((p) => p.id)

    // Calculate inventory statistics
    let totalStock = 0
    let lowStockCount = 0
    let outOfStockCount = 0

    if (productIds.length > 0) {
      // Find variants of these products
      const variantsRes = await req.payload.find({
        collection: 'variants',
        where: {
          product: { in: productIds },
        },
        limit: 10000,
        depth: 0,
        overrideAccess: true,
      })

      // Sum variant stocks
      for (const v of variantsRes.docs) {
        const stock = v.inventory || 0
        totalStock += stock
        if (stock === 0) {
          outOfStockCount++
        } else if (stock <= 5) {
          lowStockCount++
        }
      }

      // Check simple products (without variants enabled)
      for (const p of retailerProducts.docs) {
        if (p.enableVariants) continue
        const stock = p.inventory || 0
        totalStock += stock
        if (stock === 0) {
          outOfStockCount++
        } else if (stock <= 5) {
          lowStockCount++
        }
      }
    }

    // 2. Fetch orders within the date range
    const ordersRes = await req.payload.find({
      collection: 'orders',
      where: {
        createdAt: {
          greater_than_equal: start.toISOString(),
          less_than_equal: end.toISOString(),
        },
        status: {
          not_equals: 'cancelled', // Exclude cancelled orders from analytics
        },
      },
      limit: 10000,
      depth: 2, // Needs depth 2 to populate item.product & item.variant
      overrideAccess: true,
    })

    let totalGrossSales = 0
    let totalOrdersCount = 0
    let totalProductsSold = 0

    const productSalesMap = new Map<number, { title: string; quantity: number; revenue: number }>()
    const categorySalesMap = new Map<number, { title: string; quantity: number; revenue: number }>()
    const brandSalesMap = new Map<number, { name: string; quantity: number; revenue: number }>()
    const dailyDataMap = new Map<string, { sales: number; orders: number; productsSold: number }>()

    // Pre-populate date range in historical daily map
    const tempDate = new Date(start)
    while (tempDate <= end) {
      const dateStr = tempDate.toISOString().split('T')[0]
      dailyDataMap.set(dateStr, { sales: 0, orders: 0, productsSold: 0 })
      tempDate.setDate(tempDate.getDate() + 1)
    }

    for (const order of ordersRes.docs) {
      let orderContributed = false
      let orderSales = 0
      let orderProductsSold = 0

      const items = order.items || []
      for (const item of items) {
        const prod = item.product
        if (!prod || typeof prod !== 'object') continue

        const pId = prod.id
        // Filter: does it belong to the retailer (or all if admin/no retailer selected)
        if (!retailerUserId || productIds.includes(pId)) {
          orderContributed = true

          // Pricing logic
          let price = 0
          if (item.variant) {
            const v = item.variant
            price = typeof v === 'object' ? (v.priceInINR || 0) : 0
          } else {
            price = prod.discountedPrice !== undefined && prod.discountedPrice !== null
              ? prod.discountedPrice
              : (prod.priceInINR || 0)
          }

          const qty = item.quantity || 0
          const itemRevenue = price * qty // Paise

          orderSales += itemRevenue
          orderProductsSold += qty

          // Product aggregates
          if (!productSalesMap.has(pId)) {
            productSalesMap.set(pId, { title: prod.title, quantity: 0, revenue: 0 })
          }
          const pStat = productSalesMap.get(pId)!
          pStat.quantity += qty
          pStat.revenue += itemRevenue

          // Category aggregates
          const categories = prod.categories || []
          for (const cat of categories) {
            if (typeof cat === 'object') {
              const catId = cat.id
              if (!categorySalesMap.has(catId)) {
                categorySalesMap.set(catId, { title: cat.title, quantity: 0, revenue: 0 })
              }
              const cStat = categorySalesMap.get(catId)!
              cStat.quantity += qty
              cStat.revenue += itemRevenue
            }
          }

          // Brand aggregates
          const brand = prod.brand
          if (brand && typeof brand === 'object') {
            const brandId = brand.id
            if (!brandSalesMap.has(brandId)) {
              brandSalesMap.set(brandId, { name: brand.name, quantity: 0, revenue: 0 })
            }
            const bStat = brandSalesMap.get(brandId)!
            bStat.quantity += qty
            bStat.revenue += itemRevenue
          }
        }
      }

      if (orderContributed) {
        totalOrdersCount++
        totalGrossSales += orderSales
        totalProductsSold += orderProductsSold

        const orderDateStr = new Date(order.createdAt).toISOString().split('T')[0]
        if (dailyDataMap.has(orderDateStr)) {
          const dStat = dailyDataMap.get(orderDateStr)!
          dStat.sales += orderSales
          dStat.orders += 1
          dStat.productsSold += orderProductsSold
        }
      }
    }

    const platformCommissionPercent = 5 // 5% simulated commission fee
    const platformCommission = Math.round(totalGrossSales * (platformCommissionPercent / 100))
    const netEarnings = totalGrossSales - platformCommission

    const topSellingProducts = Array.from(productSalesMap.entries()).map(([id, stat]) => ({
      id,
      title: stat.title,
      quantitySold: stat.quantity,
      revenueInINR: stat.revenue / 100,
    })).sort((a, b) => b.revenueInINR - a.revenueInINR).slice(0, 10)

    const topCategories = Array.from(categorySalesMap.entries()).map(([id, stat]) => ({
      id,
      title: stat.title,
      quantitySold: stat.quantity,
      revenueInINR: stat.revenue / 100,
    })).sort((a, b) => b.revenueInINR - a.revenueInINR).slice(0, 10)

    const topBrands = Array.from(brandSalesMap.entries()).map(([id, stat]) => ({
      id,
      name: stat.name,
      quantitySold: stat.quantity,
      revenueInINR: stat.revenue / 100,
    })).sort((a, b) => b.revenueInINR - a.revenueInINR).slice(0, 10)

    const historicalData = Array.from(dailyDataMap.entries()).map(([date, stat]) => ({
      date,
      salesInINR: stat.sales / 100,
      ordersCount: stat.orders,
      productsSoldCount: stat.productsSold,
    })).sort((a, b) => a.date.localeCompare(b.date))

    const averageOrderValue = totalOrdersCount > 0 ? Math.round(totalGrossSales / totalOrdersCount) : 0

    return Response.json({
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        grossSalesInINR: totalGrossSales / 100,
        platformCommissionInINR: platformCommission / 100,
        netEarningsInINR: netEarnings / 100, // this shows what they have earned
        ordersCount: totalOrdersCount,
        productsSoldCount: totalProductsSold,
        averageOrderValueInINR: averageOrderValue / 100,
      },
      inventory: {
        totalProducts: retailerProducts.totalDocs,
        totalStock,
        lowStockCount,
        outOfStockCount,
      },
      topSellingProducts,
      topCategories,
      topBrands,
      historicalData,
    })
  } catch (err: any) {
    req.payload.logger.error(`Error in retailer analytics endpoint: ${err.message}`)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
