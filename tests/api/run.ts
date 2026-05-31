import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload, jwtSign } from 'payload'
import configPromise from '../../src/payload.config'
import { ReportManager, apiRequest } from './helpers'
import { runAuthTests } from './auth'
import { runRetailerTests } from './retailer'
import { runDeliveryTests } from './delivery'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  console.log('=== Starting ZiniKart API Integration Testing ===\n')

  const report = new ReportManager()

  // 1. Boot Payload
  console.log('Initializing Payload CMS local API...')
  const payloadConfig = await configPromise
  const payload = await getPayload({ config: payloadConfig })

  const testMobile = '+919999999999'
  const otherMobile = '+918888888888'

  // 2. Perform Database Cleanup first to ensure clean state
  console.log('\nCleaning up old test data from database...')
  
  const cleanMobiles = [testMobile, otherMobile]
  const existingUsers = await payload.find({
    collection: 'users',
    where: {
      mobileNumber: { in: cleanMobiles },
    },
    overrideAccess: true,
  })

  const userIds = existingUsers.docs.map((u) => u.id)
  if (userIds.length > 0) {
    console.log(`Batch deleting profiles and users for IDs: ${userIds.join(', ')}`)
    await payload.delete({
      collection: 'retailers',
      where: {
        user: { in: userIds },
      },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'delivery-partners',
      where: {
        user: { in: userIds },
      },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'users',
      where: {
        id: { in: userIds },
      },
      overrideAccess: true,
    })
  }

  // Clean up any mock media uploads from previous test runs.
  // This must happen after deleting delivery-partners referencing it to avoid foreign key violations.
  await payload.delete({
    collection: 'media',
    where: {
      alt: { equals: 'Mock License' },
    },
    overrideAccess: true,
  })

  // 3. Create a second test user locally for security/access control checks
  console.log('\nCreating second test user for access control validation...')
  const otherUser = await payload.create({
    collection: 'users',
    data: {
      email: 'other.user@testing.zinikart.local',
      mobileNumber: otherMobile,
      mobileVerified: true,
      password: 'testPassword123',
      roles: ['customer'],
    } as any,
    overrideAccess: true,
  })

  // Generate JWT token for the second user
  const { token: otherUserToken } = await jwtSign({
    fieldsToSign: {
      collection: 'users',
      email: otherUser.email,
      id: otherUser.id,
    },
    secret: payload.secret,
    tokenExpiration: 1209600,
  })

  if (!otherUserToken) {
    throw new Error('Failed to generate JWT token for second user')
  }

  // 4. Run Test Suites
  try {
    await runAuthTests(report, testMobile)
    await runRetailerTests(report, payload, testMobile, otherUserToken)
    await runDeliveryTests(report, payload, testMobile, otherUserToken)
  } catch (err) {
    console.error('Test execution error occurred:', err)
  }

  // 5. Clean up all created test data at the end
  console.log('\nCleaning up created test records from database...')
  
  const finalCleanUsers = await payload.find({
    collection: 'users',
    where: {
      mobileNumber: { in: cleanMobiles },
    },
    overrideAccess: true,
  })

  const finalUserIds = finalCleanUsers.docs.map((u) => u.id)
  if (finalUserIds.length > 0) {
    console.log(`Batch cleaning profiles and users for IDs: ${finalUserIds.join(', ')}`)
    await payload.delete({
      collection: 'retailers',
      where: {
        user: { in: finalUserIds },
      },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'delivery-partners',
      where: {
        user: { in: finalUserIds },
      },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'users',
      where: {
        id: { in: finalUserIds },
      },
      overrideAccess: true,
    })
  }

  // Clean up any mock media uploads created during this test run.
  // This must happen after deleting delivery-partners referencing it to avoid foreign key violations.
  await payload.delete({
    collection: 'media',
    where: {
      alt: { equals: 'Mock License' },
    },
    overrideAccess: true,
  })

  // 6. Generate Report
  const reportPath = path.resolve(__dirname, 'report.md')
  report.generateMarkdownReport(reportPath)

  const failedCount = report.results.filter((r) => !r.success).length
  console.log(`\n=== Testing completed. Failed assertions: ${failedCount} ===`)

  process.exit(failedCount > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Test runner main process crash:', err)
  process.exit(1)
})
