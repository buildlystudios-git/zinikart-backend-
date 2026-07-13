import 'dotenv/config'

async function run() {
    console.log("Logging in...")
    const loginRes = await fetch('http://localhost:3000/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer1@example.com', password: 'password' })
    })
    
    if (!loginRes.ok) {
        console.error("Login failed!", await loginRes.text())
        process.exit(1)
    }

    const loginData = await loginRes.json()
    const token = loginData.token
    console.log("Logged in! Token acquired.")

    console.log("Fetching cart...")
    const meRes = await fetch('http://localhost:3000/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    const meData = await meRes.json()
    
    const cart = meData?.user?.cart
    console.log("Cart items:", cart?.items?.length)

    // Simulate COD confirm order payload
    console.log("Confirming order...")
    const startTime = Date.now()
    try {
        const confirmRes = await fetch('http://localhost:3000/api/payments/cod/confirm-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                cartID: cart?.id || 'fake-id',
                transactionID: 'fake-tx-id',
                shippingAddress: {
                    street: '123 Test',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                    phone: '1234567890'
                }
            })
        })
        const duration = (Date.now() - startTime) / 1000
        console.log(`Response received in ${duration} seconds. Status:`, confirmRes.status)
        console.log("Body:", await confirmRes.text())
    } catch (err: any) {
        const duration = (Date.now() - startTime) / 1000
        console.error(`Fetch failed after ${duration} seconds:`, err.message)
    }
}

run().catch(console.error)
