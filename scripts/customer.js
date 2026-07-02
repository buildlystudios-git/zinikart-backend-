import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load env variables from workspace root to resolve key secrets (like Razorpay)
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
let token = '';
let currentUser = null;
let currentCart = null;

const rl = readline.createInterface({ input, output });

const parseId = (val) => {
  if (!val) return undefined;
  const num = Number(val);
  return isNaN(num) ? val : num;
};

// Helper to perform colored console logging
function log(msg, color = '\x1b[0m') {
  console.log(`${color}${msg}\x1b[0m`);
}

function printApiCall(endpoint, method, description, payload = null) {
  log(`\n[API CALL] ---> Calling ${method} ${baseUrl}${endpoint}`, '\x1b[36m'); // Cyan
  log(`[API DESC] ---> ${description}`, '\x1b[90m'); // Gray
  if (token) {
    log(`[API HEADERS]-> Authorization: Bearer ${token.substring(0, 15)}...`, '\x1b[90m');
  }
  if (payload) {
    log(`[API BODY] ---> ${JSON.stringify(payload, null, 2)}`, '\x1b[90m'); // Gray
  }
}

// Wrapper for Fetch API requests
async function makeRequest(endpoint, method = 'GET', data = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    let body = null;
    try {
      body = await res.json();
    } catch (_) {}

    return { status: res.status, body };
  } catch (error) {
    return { status: 500, body: { error: error.message } };
  }
}

async function loginFlow() {
  log('\n=== Customer Login / Registration ===', '\x1b[33m');
  log('Use the test mobile number (+919999999999) and OTP (111111) to bypass Twilio SMS, or enter a real mobile number if Twilio is configured.');
  
  const mobileNumber = await rl.question('\nEnter your mobile number (e.g. +919999999999): ');
  if (!mobileNumber.trim()) {
    log('Invalid mobile number.');
    return;
  }

  const requestBody = { mobileNumber };
  printApiCall('/api/mobile/auth/otp/request', 'POST', 'Requests a one-time passcode to be sent to the customer\'s mobile number via Twilio SMS.', requestBody);
  const requestRes = await makeRequest('/api/mobile/auth/otp/request', 'POST', requestBody);

  if (requestRes.status !== 200) {
    log(`Failed to request OTP. Status: ${requestRes.status}, Error: ${JSON.stringify(requestRes.body)}`, '\x1b[31m');
    return;
  }
  log('OTP request successful!');

  const code = await rl.question('\nEnter the verification code (use 111111 for test number): ');
  const name = await rl.question('Enter your name (optional): ');

  const verifyBody = {
    mobileNumber,
    code,
    name: name || undefined,
    role: 'customer',
  };
  printApiCall('/api/mobile/auth/otp/verify', 'POST', 'Verifies the OTP code and signs in/registers the customer. Returns a session JWT token.', verifyBody);
  const verifyRes = await makeRequest('/api/mobile/auth/otp/verify', 'POST', verifyBody);

  if (verifyRes.status !== 200 || !verifyRes.body?.token) {
    log(`Verification failed. Status: ${verifyRes.status}, Error: ${JSON.stringify(verifyRes.body)}`, '\x1b[31m');
    return;
  }

  token = verifyRes.body.token;
  currentUser = verifyRes.body.user;
  log(`\nSuccessfully Logged In as ${currentUser.name || 'Customer'}!`, '\x1b[32m');
  log(`User ID: ${currentUser.id}`);

  // Fetch or create cart for this customer
  await syncCart();
}

async function syncCart() {
  if (!token) return;

  printApiCall('/api/carts', 'GET', 'Retrieves the customer\'s active shopping cart associated with their account.');
  const cartRes = await makeRequest('/api/carts');

  if (cartRes.status === 200 && cartRes.body?.docs?.length > 0) {
    currentCart = cartRes.body.docs[0];
  } else {
    // No active cart found, create a new one
    const createBody = { customer: currentUser.id };
    printApiCall('/api/carts', 'POST', 'Creates a fresh, empty shopping cart record for the authenticated customer.', createBody);
    const createRes = await makeRequest('/api/carts', 'POST', createBody);
    if (createRes.status === 200 || createRes.status === 201) {
      currentCart = createRes.body?.doc || createRes.body;
    }
  }

  if (currentCart) {
    log(`Active Cart ID Synchronized: ${currentCart.id}`, '\x1b[32m');
  }
}

async function viewCatalog() {
  printApiCall('/api/products?depth=1', 'GET', 'Fetches the list of all published products from the ZiniKart store catalog.');
  const res = await makeRequest('/api/products?depth=1');

  if (res.status !== 200) {
    log(`Failed to fetch catalog. Status: ${res.status}`, '\x1b[31m');
    return;
  }

  const products = res.body?.docs || [];
  if (products.length === 0) {
    log('No products found in catalog.');
    return;
  }

  log('\n=== Products Catalog ===', '\x1b[33m');
  products.forEach((p) => {
    const priceStr = p.priceInINR ? `₹${p.priceInINR / 100}` : 'Pricing not set';
    log(`ID: ${p.id} | ${p.title} | Base Price: ${priceStr} | Has Variants: ${p.enableVariants || false} | Retailer User: ${p.retailer}`);
    if (p.enableVariants && p.variants?.variants?.length > 0) {
      p.variants.variants.forEach((v) => {
        const vPrice = v.priceInINR ? `₹${v.priceInINR / 100}` : 'No price';
        log(`   -> Variant ID: ${v.id} | ${v.title} | Price: ${vPrice}`);
      });
    }
  });
}

async function manageCatalogMenu() {
  while (true) {
    log('\n=== Products & Catalog Menu ===', '\x1b[33m');
    log('1. View All Products');
    log('2. Search Products / Retailers (Text Keyword Search)');
    log('3. Get Product details + Alternative competitor offers');
    log('4. Filter Products by Category');
    log('5. Filter Products by Brand');
    log('6. Back to Main Menu');

    const choice = await rl.question('\nSelect an option (1-6): ');

    if (choice === '1') {
      await viewCatalog();
    } else if (choice === '2') {
      const q = await rl.question('Enter search keyword: ');
      if (!q.trim()) continue;
      
      printApiCall(`/api/mobile/search?q=${encodeURIComponent(q.trim())}`, 'GET', 'Searches active product listings and retailer store profiles matching the text query.');
      const res = await makeRequest(`/api/mobile/search?q=${encodeURIComponent(q.trim())}`);
      
      if (res.status === 200) {
        log('\n--- Search Results ---', '\x1b[32m');
        const products = res.body?.products || [];
        const retailers = res.body?.retailers || [];
        
        log(`\nProducts Found (${products.length}):`);
        products.forEach(p => {
          log(`  ID: ${p.id} | ${p.title} | Price: ₹${p.priceInINR / 100} | Retailer User ID: ${p.retailer}`);
        });

        log(`\nRetailer Stores Found (${retailers.length}):`);
        retailers.forEach(r => {
          log(`  ID: ${r.id} | Shop: ${r.shopName} | City: ${r.shopAddress?.city} | Rating: ${r.averageRating || 0}/5`);
        });
      } else {
        log(`Search failed. Status: ${res.status}`, '\x1b[31m');
      }
    } else if (choice === '3') {
      const id = await rl.question('Enter Product ID: ');
      if (!id.trim()) continue;

      printApiCall(`/api/mobile/product/${id.trim()}`, 'GET', 'Resolves a specific product detail, the retailer store profile, and other sellers offering the same template model.');
      const res = await makeRequest(`/api/mobile/product/${id.trim()}`);
      
      if (res.status === 200) {
        const prod = res.body?.product;
        const retailer = res.body?.retailer;
        const otherOffers = res.body?.otherOffers || [];

        log('\n--- Product details ---', '\x1b[32m');
        log(`Title: ${prod?.title}`);
        log(`Price: ₹${prod?.priceInINR / 100}`);
        log(`Description: ${prod?.description?.root?.children?.[0]?.children?.[0]?.text || 'No description'}`);
        log(`Warranty: ${prod?.warranty || 'No warranty details'}`);
        log(`Rating: ${prod?.averageRating || 0}/5 (${prod?.ratingCount || 0} reviews)`);

        if (retailer) {
          log(`\nStore Offering this item: ${retailer.shopName} (${retailer.city})`);
          log(`Store Rating: ${retailer.averageRating || 0}/5 (${retailer.ratingCount || 0} reviews)`);
          log(`Business Hours: ${retailer.businessHours?.startTime} - ${retailer.businessHours?.endTime}`);
        }

        if (otherOffers.length > 0) {
          log(`\nOther Competitor Offers for this model (${otherOffers.length}):`);
          otherOffers.forEach((off) => {
            log(`  - Shop: ${off.shopName} | Price: ₹${off.price / 100} | Product ID: ${off.productId} | City: ${off.city}`);
          });
        } else {
          log('\nNo other store offers found for this model.');
        }
      } else {
        log(`Failed to fetch product details. Status: ${res.status}, Error: ${JSON.stringify(res.body)}`, '\x1b[31m');
      }
    } else if (choice === '4') {
      printApiCall('/api/categories', 'GET', 'Fetches available product categories.');
      const catRes = await makeRequest('/api/categories');
      const categories = catRes.body?.docs || [];
      
      if (categories.length === 0) {
        log('No categories found.');
        continue;
      }
      
      log('\nSelect a Category:');
      categories.forEach((c, idx) => {
        log(`${idx + 1}. ID: ${c.id} | Name: ${c.title}`);
      });

      const catChoice = await rl.question(`Select option (1-${categories.length}): `);
      const catIdx = parseInt(catChoice) - 1;
      if (catIdx >= 0 && catIdx < categories.length) {
        const catId = categories[catIdx].id;
        printApiCall(`/api/products?where[categories][in]=${catId}&depth=1`, 'GET', 'Queries products associated with the selected category ID.');
        const res = await makeRequest(`/api/products?where[categories][in]=${catId}&depth=1`);
        if (res.status === 200) {
          const docs = res.body?.docs || [];
          log(`\nProducts in "${categories[catIdx].title}" (${docs.length}):`);
          docs.forEach(p => {
            log(`  ID: ${p.id} | ${p.title} | Price: ₹${p.priceInINR / 100}`);
          });
        }
      }
    } else if (choice === '5') {
      printApiCall('/api/brands', 'GET', 'Fetches available brands.');
      const brandRes = await makeRequest('/api/brands');
      const brands = brandRes.body?.docs || [];
      
      if (brands.length === 0) {
        log('No brands found.');
        continue;
      }
      
      log('\nSelect a Brand:');
      brands.forEach((b, idx) => {
        log(`${idx + 1}. ID: ${b.id} | Name: ${b.name}`);
      });

      const brandChoice = await rl.question(`Select option (1-${brands.length}): `);
      const brandIdx = parseInt(brandChoice) - 1;
      if (brandIdx >= 0 && brandIdx < brands.length) {
        const brandId = brands[brandIdx].id;
        printApiCall(`/api/products?where[brand][equals]=${brandId}&depth=1`, 'GET', 'Queries products associated with the selected brand ID.');
        const res = await makeRequest(`/api/products?where[brand][equals]=${brandId}&depth=1`);
        if (res.status === 200) {
          const docs = res.body?.docs || [];
          log(`\nProducts for Brand "${brands[brandIdx].name}" (${docs.length}):`);
          docs.forEach(p => {
            log(`  ID: ${p.id} | ${p.title} | Price: ₹${p.priceInINR / 100}`);
          });
        }
      }
    } else if (choice === '6') {
      break;
    }
  }
}

async function manageCart() {
  if (!token) {
    log('You must login first before managing your cart.', '\x1b[31m');
    return;
  }

  while (true) {
    log('\n=== Shopping Cart Menu ===', '\x1b[33m');
    log('1. View Cart Details');
    log('2. Add Product/Variant to Cart');
    log('3. Update Cart Item Quantity');
    log('4. Remove Item from Cart');
    log('5. Clear Cart');
    log('6. Back to Main Menu');

    const choice = await rl.question('\nSelect an option (1-6): ');

    if (choice === '1') {
      await syncCart();
      if (!currentCart) {
        log('No active cart found.');
        continue;
      }
      log(`\nCart ID: ${currentCart.id}`);
      const items = currentCart.items || [];
      if (items.length === 0) {
        log('Cart is empty.');
      } else {
        items.forEach((item, index) => {
          const productTitle = item.product?.title || `Product #${item.product}`;
          const variantTitle = item.variant?.title ? ` (${item.variant.title})` : '';
          log(`${index + 1}. [LINE ITEM ID: ${item.id}] ${productTitle}${variantTitle} - Qty: ${item.quantity}`);
        });
      }
    } else if (choice === '2') {
      const productId = await rl.question('Enter Product ID: ');
      const variantId = await rl.question('Enter Variant ID (optional, press Enter to skip): ');
      const quantityStr = await rl.question('Enter Quantity: ');
      const quantity = parseInt(quantityStr) || 1;

      if (!productId.trim()) {
        log('Product ID required.');
        continue;
      }

      const addItemBody = {
        item: {
          product: parseId(productId.trim()),
          variant: parseId(variantId.trim()) || undefined,
        },
        quantity,
      };

      printApiCall(`/api/carts/${currentCart.id}/add-item`, 'POST', 'Adds a product or variant to the shopping cart, updating its quantity if already present.', addItemBody);
      const addRes = await makeRequest(`/api/carts/${currentCart.id}/add-item`, 'POST', addItemBody);

      if (addRes.status === 200 || addRes.status === 201) {
        log('Item added to cart successfully!', '\x1b[32m');
        await syncCart();
      } else {
        log(`Failed to add item. Status: ${addRes.status}, Error: ${JSON.stringify(addRes.body)}`, '\x1b[31m');
      }
    } else if (choice === '3') {
      const itemID = await rl.question('Enter Cart Line Item ID to update: ');
      const quantityStr = await rl.question('Enter new quantity (or press Enter for incrementing by +1): ');
      
      let quantityPayload;
      if (!quantityStr.trim()) {
        quantityPayload = { $inc: 1 };
      } else {
        quantityPayload = parseInt(quantityStr) || 1;
      }

      if (!itemID.trim()) {
        log('Line Item ID is required.');
        continue;
      }

      const updateItemBody = {
        itemID: itemID.trim(),
        quantity: quantityPayload,
      };

      printApiCall(`/api/carts/${currentCart.id}/update-item`, 'POST', 'Updates item quantity. Accepts absolute numbers, or adjustments with "$inc" values.', updateItemBody);
      const updateRes = await makeRequest(`/api/carts/${currentCart.id}/update-item`, 'POST', updateItemBody);

      if (updateRes.status === 200) {
        log('Cart item updated successfully!', '\x1b[32m');
        await syncCart();
      } else {
        log(`Failed to update item. Status: ${updateRes.status}, Error: ${JSON.stringify(updateRes.body)}`, '\x1b[31m');
      }
    } else if (choice === '4') {
      const itemID = await rl.question('Enter Cart Line Item ID to remove: ');
      if (!itemID.trim()) {
        log('Line Item ID is required.');
        continue;
      }

      const removeItemBody = {
        itemID: itemID.trim(),
      };

      printApiCall(`/api/carts/${currentCart.id}/remove-item`, 'POST', 'Removes a line item from the shopping cart.', removeItemBody);
      const removeRes = await makeRequest(`/api/carts/${currentCart.id}/remove-item`, 'POST', removeItemBody);

      if (removeRes.status === 200) {
        log('Item removed from cart successfully!', '\x1b[32m');
        await syncCart();
      } else {
        log(`Failed to remove item. Status: ${removeRes.status}, Error: ${JSON.stringify(removeRes.body)}`, '\x1b[31m');
      }
    } else if (choice === '5') {
      printApiCall(`/api/carts/${currentCart.id}/clear`, 'POST', 'Removes all products/variants from the shopping cart.');
      const clearRes = await makeRequest(`/api/carts/${currentCart.id}/clear`, 'POST');
      if (clearRes.status === 200) {
        log('Cart cleared successfully!', '\x1b[32m');
        await syncCart();
      } else {
        log(`Failed to clear cart. Status: ${clearRes.status}`, '\x1b[31m');
      }
    } else if (choice === '6') {
      break;
    }
  }
}

async function manageAddresses() {
  if (!token) {
    log('You must login first to manage addresses.', '\x1b[31m');
    return;
  }

  while (true) {
    log('\n=== Shipping Addresses Menu ===', '\x1b[33m');
    log('1. View Saved Addresses');
    log('2. Create New Address');
    log('3. Edit Existing Address');
    log('4. Delete Saved Address');
    log('5. Back to Main Menu');

    const choice = await rl.question('\nSelect an option (1-5): ');

    if (choice === '1') {
      printApiCall('/api/addresses', 'GET', 'Fetches the list of saved shipping and billing addresses for the authenticated customer.');
      const res = await makeRequest('/api/addresses');
      if (res.status !== 200) {
        log(`Failed to fetch addresses. Status: ${res.status}`, '\x1b[31m');
        continue;
      }
      const docs = res.body?.docs || [];
      if (docs.length === 0) {
        log('No saved addresses found.');
      } else {
        docs.forEach((addr, idx) => {
          log(`${idx + 1}. ID: ${addr.id} | ${addr.firstName} ${addr.lastName}, ${addr.addressLine1}, ${addr.city}, ${addr.state} - ${addr.postalCode} (${addr.country})`);
        });
      }
    } else if (choice === '2') {
      const firstName = await rl.question('First Name: ');
      const lastName = await rl.question('Last Name: ');
      const addressLine1 = await rl.question('Address Line 1: ');
      const city = await rl.question('City: ');
      const state = await rl.question('State: ');
      const postalCode = await rl.question('Postal / Zip Code: ');
      const country = await rl.question('Country ISO Code (e.g. IN, US): ');
      const latStr = await rl.question('Latitude (optional): ');
      const lngStr = await rl.question('Longitude (optional): ');

      if (!firstName || !addressLine1 || !city || !postalCode || !country) {
        log('Missing required fields.');
        continue;
      }

      const addressData = {
        firstName,
        lastName,
        addressLine1,
        city,
        state,
        postalCode,
        country,
      };

      if (latStr.trim()) addressData.lat = parseFloat(latStr.trim()) || undefined;
      if (lngStr.trim()) addressData.lng = parseFloat(lngStr.trim()) || undefined;

      printApiCall('/api/addresses', 'POST', 'Saves a new shipping/billing address document associated with the logged-in customer.', addressData);
      const res = await makeRequest('/api/addresses', 'POST', addressData);
      if (res.status === 200 || res.status === 201) {
        log('Address saved successfully!', '\x1b[32m');
      } else {
        log(`Failed to save address. Status: ${res.status}, Error: ${JSON.stringify(res.body)}`, '\x1b[31m');
      }
    } else if (choice === '3') {
      const addressId = await rl.question('Enter Saved Address ID to edit: ');
      if (!addressId.trim()) continue;

      log('Enter new details (press Enter to skip and keep current value):');
      const firstName = await rl.question('New First Name: ');
      const lastName = await rl.question('New Last Name: ');
      const addressLine1 = await rl.question('New Address Line 1: ');
      const city = await rl.question('New City: ');
      const state = await rl.question('New State: ');
      const postalCode = await rl.question('New Postal Code: ');
      const country = await rl.question('New Country ISO: ');
      const lat = await rl.question('New Latitude: ');
      const lng = await rl.question('New Longitude: ');

      const updateData = {};
      if (firstName.trim()) updateData.firstName = firstName.trim();
      if (lastName.trim()) updateData.lastName = lastName.trim();
      if (addressLine1.trim()) updateData.addressLine1 = addressLine1.trim();
      if (city.trim()) updateData.city = city.trim();
      if (state.trim()) updateData.state = state.trim();
      if (postalCode.trim()) updateData.postalCode = postalCode.trim();
      if (country.trim()) updateData.country = country.trim();
      if (lat.trim()) updateData.lat = parseFloat(lat.trim()) || undefined;
      if (lng.trim()) updateData.lng = parseFloat(lng.trim()) || undefined;

      if (Object.keys(updateData).length === 0) {
        log('No edits specified.');
        continue;
      }

      printApiCall(`/api/addresses/${addressId.trim()}`, 'PATCH', 'Updates an existing saved address document.', updateData);
      const res = await makeRequest(`/api/addresses/${addressId.trim()}`, 'PATCH', updateData);
      if (res.status === 200) {
        log('Address updated successfully!', '\x1b[32m');
      } else {
        log(`Failed to update address. Status: ${res.status}, Error: ${JSON.stringify(res.body)}`, '\x1b[31m');
      }
    } else if (choice === '4') {
      const addressId = await rl.question('Enter Saved Address ID to delete: ');
      if (!addressId.trim()) continue;

      printApiCall(`/api/addresses/${addressId.trim()}`, 'DELETE', 'Deletes a saved address document.');
      const res = await makeRequest(`/api/addresses/${addressId.trim()}`, 'DELETE');
      if (res.status === 200 || res.status === 204) {
        log('Address deleted successfully!', '\x1b[32m');
      } else {
        log(`Failed to delete address. Status: ${res.status}`, '\x1b[31m');
      }
    } else if (choice === '5') {
      break;
    }
  }
}

async function manageProfileAndOrders() {
  if (!token) {
    log('You must login first to manage profile & orders.', '\x1b[31m');
    return;
  }

  while (true) {
    log('\n=== Profile & Orders Menu ===', '\x1b[33m');
    log('1. View My Profile Information');
    log('2. Edit Profile Details (Name / Email)');
    log('3. View Order History');
    log('4. Back to Main Menu');

    const choice = await rl.question('\nSelect an option (1-4): ');

    if (choice === '1') {
      printApiCall('/api/mobile/auth/me', 'GET', 'Retrieves current authenticated mobile customer profile info.');
      const res = await makeRequest('/api/mobile/auth/me');
      if (res.status === 200) {
        log(`\nProfile:`);
        log(`Name: ${res.body?.user?.name || 'Not set'}`);
        log(`Mobile: ${res.body?.user?.mobileNumber}`);
        log(`Email: ${res.body?.user?.email || 'Not set'}`);
        log(`Roles: ${JSON.stringify(res.body?.user?.roles)}`);
      } else {
        log(`Failed to get profile. Status: ${res.status}`, '\x1b[31m');
      }
    } else if (choice === '2') {
      log('\nUpdate Profile details (press Enter to skip):');
      const name = await rl.question('New Name: ');
      const email = await rl.question('New Email: ');
      
      const updateData = {};
      if (name.trim()) updateData.name = name.trim();
      if (email.trim()) updateData.email = email.trim();

      if (Object.keys(updateData).length === 0) {
        log('No changes specified.');
        continue;
      }

      printApiCall(`/api/users/${currentUser.id}`, 'PATCH', 'Updates profile properties of the authenticated user.', updateData);
      const res = await makeRequest(`/api/users/${currentUser.id}`, 'PATCH', updateData);
      if (res.status === 200) {
        log('Profile updated successfully!', '\x1b[32m');
        currentUser = res.body?.doc || res.body;
      } else {
        log(`Failed to update profile. Status: ${res.status}, Error: ${JSON.stringify(res.body)}`, '\x1b[31m');
      }
    } else if (choice === '3') {
      const orderQuery = `/api/orders?where[customer][equals]=${currentUser.id}&depth=1`;
      printApiCall(orderQuery, 'GET', 'Queries order history for the authenticated customer user ID.');
      const res = await makeRequest(orderQuery);
      if (res.status === 200) {
        const docs = res.body?.docs || [];
        if (docs.length === 0) {
          log('No orders placed yet.');
        } else {
          docs.forEach((order, idx) => {
            const price = order.amount ? `₹${order.amount / 100}` : '₹0';
            log(`${idx + 1}. Order ID: ${order.id} | Date: ${new Date(order.createdAt).toLocaleDateString()} | Amount: ${price} | Status: ${order.status}`);
          });
        }
      } else {
        log(`Failed to fetch orders. Status: ${res.status}`, '\x1b[31m');
      }
    } else if (choice === '4') {
      break;
    }
  }
}

async function manageWishlistAndReviews() {
  if (!token) {
    log('You must login first to manage wishlist & reviews.', '\x1b[31m');
    return;
  }

  while (true) {
    log('\n=== Wishlist & Reviews Menu ===', '\x1b[33m');
    log('1. View Wishlist');
    log('2. Add Product to Wishlist');
    log('3. Remove Product from Wishlist');
    log('4. Submit a Product Review / Rating');
    log('5. View Product Reviews');
    log('6. Back to Main Menu');

    const choice = await rl.question('\nSelect an option (1-6): ');

    if (choice === '1') {
      printApiCall('/api/wishlists', 'GET', 'Fetches active customer\'s wishlist items.');
      const res = await makeRequest('/api/wishlists');
      if (res.status === 200) {
        const docs = res.body?.docs || [];
        if (docs.length === 0) {
          log('Wishlist is empty.');
        } else {
          docs.forEach((w, idx) => {
            const prodTitle = w.product?.title || `Product #${w.product}`;
            log(`${idx + 1}. Wishlist ID: ${w.id} | Product ID: ${w.product?.id || w.product} | Title: ${prodTitle}`);
          });
        }
      } else {
        log(`Failed to fetch wishlist. Status: ${res.status}`, '\x1b[31m');
      }
    } else if (choice === '2') {
      const productId = await rl.question('Enter Product ID to add: ');
      if (!productId.trim()) continue;
      
      const wishBody = { product: parseId(productId.trim()) };
      printApiCall('/api/wishlists', 'POST', 'Saves a product reference into the customer\'s wishlist collection.', wishBody);
      const res = await makeRequest('/api/wishlists', 'POST', wishBody);
      if (res.status === 201 || res.status === 200) {
        log('Added to wishlist successfully!', '\x1b[32m');
      } else {
        log(`Failed to add: Status ${res.status}, Error: ${JSON.stringify(res.body)}`, '\x1b[31m');
      }
    } else if (choice === '3') {
      const wishlistId = await rl.question('Enter Wishlist Document ID to delete: ');
      if (!wishlistId.trim()) continue;

      printApiCall(`/api/wishlists/${wishlistId.trim()}`, 'DELETE', 'Deletes a product entry from the customer\'s wishlist.');
      const res = await makeRequest(`/api/wishlists/${wishlistId.trim()}`, 'DELETE');
      if (res.status === 200 || res.status === 204) {
        log('Removed from wishlist successfully!', '\x1b[32m');
      } else {
        log(`Failed to delete: Status ${res.status}`, '\x1b[31m');
      }
    } else if (choice === '4') {
      const productId = await rl.question('Enter Product ID to review: ');
      const retailerId = await rl.question('Enter Retailer User ID: ');
      const ratingStr = await rl.question('Enter Rating (1 to 5): ');
      const reviewText = await rl.question('Enter Review Comment: ');
      
      const rating = parseInt(ratingStr) || 5;

      if (!productId.trim() || !retailerId.trim()) {
        log('Product ID and Retailer User ID are required.');
        continue;
      }

      const ratingBody = {
        product: parseId(productId.trim()),
        retailer: parseId(retailerId.trim()),
        rating,
        reviewText,
      };

      printApiCall('/api/ratings', 'POST', 'Submits a customer rating and review. Product and retailer average scores will update automatically.', ratingBody);
      const res = await makeRequest('/api/ratings', 'POST', ratingBody);
      if (res.status === 201 || res.status === 200) {
        log('Review submitted successfully!', '\x1b[32m');
      } else {
        log(`Failed to submit: Status ${res.status}, Error: ${JSON.stringify(res.body)}`, '\x1b[31m');
      }
    } else if (choice === '5') {
      const productId = await rl.question('Enter Product ID to view reviews for: ');
      if (!productId.trim()) continue;

      const reviewQuery = `/api/ratings?where[product][equals]=${productId.trim()}&depth=1`;
      printApiCall(reviewQuery, 'GET', 'Fetches all rating and review documents for a specific product.');
      const res = await makeRequest(reviewQuery);
      if (res.status === 200) {
        const docs = res.body?.docs || [];
        if (docs.length === 0) {
          log('No reviews for this product yet.');
        } else {
          docs.forEach((doc, idx) => {
            log(`${idx + 1}. Stars: ${doc.rating}/5 | Comment: ${doc.reviewText || 'No comment'} (Submitted by: ${doc.customer?.name || 'Anonymous'})`);
          });
        }
      } else {
        log(`Failed to fetch reviews. Status: ${res.status}`, '\x1b[31m');
      }
    } else if (choice === '6') {
      break;
    }
  }
}

async function checkoutFlow() {
  if (!token) {
    log('You must login first to checkout.', '\x1b[31m');
    return;
  }

  await syncCart();
  if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
    log('Your cart is empty. Add products before checking out.', '\x1b[31m');
    return;
  }

  log('\n=== Checkout & Payment Processing ===', '\x1b[33m');
  
  // Select or input an address
  printApiCall('/api/addresses', 'GET', 'Fetches saved addresses for shipping.');
  const addrRes = await makeRequest('/api/addresses');
  const addresses = addrRes.body?.docs || [];
  
  let selectedAddress = null;
  if (addresses.length > 0) {
    log('Select a shipping address:');
    addresses.forEach((addr, idx) => {
      log(`${idx + 1}. ${addr.firstName} ${addr.lastName}, ${addr.addressLine1}, ${addr.city} (${addr.country})`);
    });
    log(`${addresses.length + 1}. Input a temporary test address`);

    const selection = await rl.question(`Select option (1-${addresses.length + 1}): `);
    const selIdx = parseInt(selection) - 1;
    if (selIdx >= 0 && selIdx < addresses.length) {
      selectedAddress = addresses[selIdx];
    }
  }

  if (!selectedAddress) {
    log('\nUsing a default temporary test address for checkout...');
    selectedAddress = {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'IN',
      lat: 19.0760,
      lng: 72.8777,
    };
  }

  // Select Payment Method
  log('\nSelect Payment Method:');
  log('1. Online Payment (Razorpay)');
  log('2. Cash on Delivery (COD)');
  const payChoice = await rl.question('Choose option (1-2, default is 1): ');

  if (payChoice === '2') {
    // Step 1: Initiate COD payment
    const initiateBody = {
      cartID: currentCart.id,
      billingAddress: selectedAddress,
      shippingAddress: selectedAddress,
    };
    printApiCall('/api/payments/cod/initiate', 'POST', 'Initiates a COD payment. Generates a pending Transaction with paymentMethod cod in ZiniKart database.', initiateBody);
    const initRes = await makeRequest('/api/payments/cod/initiate', 'POST', initiateBody);

    if (initRes.status !== 200 && initRes.status !== 201) {
      log(`Failed to initiate COD. Status: ${initRes.status}, Error: ${JSON.stringify(initRes.body)}`, '\x1b[31m');
      return;
    }

    const { transactionID, amount } = initRes.body;
    log(`\nCOD Transaction Initiated successfully!`, '\x1b[32m');
    log(`Transaction ID: ${transactionID}`);
    log(`Total Amount: ₹${amount / 100}`);

    // Step 2: Confirm COD Order immediately
    const confirmBody = {
      cartID: currentCart.id,
      transactionID,
      billingAddress: selectedAddress,
      shippingAddress: selectedAddress,
    };

    printApiCall('/api/payments/cod/confirm-order', 'POST', 'Finalizes the COD order, clears the cart, and creates a permanent Order document.', confirmBody);
    const confirmRes = await makeRequest('/api/payments/cod/confirm-order', 'POST', confirmBody);

    if (confirmRes.status === 200 || confirmRes.status === 201) {
      const finalOrderId = confirmRes.body?.orderID || confirmRes.body?.order?.id;
      log(`\n🎉 COD ORDER PLACED SUCCESSFULLY!`, '\x1b[32m');
      log(`Order Document ID Created: ${finalOrderId}`, '\x1b[32m');
      currentCart = null;
    } else {
      log(`Order confirmation failed. Status: ${confirmRes.status}, Error: ${JSON.stringify(confirmRes.body)}`, '\x1b[31m');
    }
  } else {
    // Step 1: Initiate Razorpay payment
    const initiateBody = {
      cartID: currentCart.id,
      billingAddress: selectedAddress,
      shippingAddress: selectedAddress,
    };
    printApiCall('/api/payments/razorpay/initiate', 'POST', 'Initiates a payment session with Razorpay. Resolves product stock/pricing and generates a pending Transaction in ZiniKart database.', initiateBody);
    const initRes = await makeRequest('/api/payments/razorpay/initiate', 'POST', initiateBody);

    if (initRes.status !== 200 && initRes.status !== 201) {
      log(`Failed to initiate payment. Status: ${initRes.status}, Error: ${JSON.stringify(initRes.body)}`, '\x1b[31m');
      return;
    }

    const { razorpayOrderID, amount } = initRes.body;
    log(`\nRazorpay Payment Initiated successfully!`, '\x1b[32m');
    log(`Razorpay Order ID: ${razorpayOrderID}`);
    log(`Total Amount: ₹${amount / 100}`);

    log('\nSimulating customer payment overlay and authorization...');
    
    // Step 2: Confirm Order with Signature
    const mockPaymentID = 'pay_' + crypto.randomBytes(8).toString('hex');
    const keySecret = process.env.RAZORPAY_API_SECRET || process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_mock';
    
    // Hash order_id + "|" + payment_id using HMAC-SHA256 to sign
    const mockSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderID}|${mockPaymentID}`)
      .digest('hex');

    log('Creating payment verification signature...');

    const confirmBody = {
      cartID: currentCart.id,
      razorpayOrderID,
      razorpayPaymentID: mockPaymentID,
      razorpaySignature: mockSignature,
      billingAddress: selectedAddress,
      shippingAddress: selectedAddress,
    };

    printApiCall('/api/payments/razorpay/confirm-order', 'POST', 'Validates the payment signature, marks the Transaction as succeeded, clears the cart, and creates a permanent Order document.', confirmBody);
    const confirmRes = await makeRequest('/api/payments/razorpay/confirm-order', 'POST', confirmBody);

    if (confirmRes.status === 200 || confirmRes.status === 201) {
      const finalOrderId = confirmRes.body?.orderID || confirmRes.body?.order?.id;
      log(`\n🎉 PURCHASE COMPLETED SUCCESSFULLY!`, '\x1b[32m');
      log(`Order Document ID Created: ${finalOrderId}`, '\x1b[32m');
      currentCart = null;
    } else {
      log(`Order confirmation failed. Status: ${confirmRes.status}, Error: ${JSON.stringify(confirmRes.body)}`, '\x1b[31m');
    }
  }
}

async function mainMenu() {
  while (true) {
    log('\n=======================================', '\x1b[35m');
    log('       ZINIKART CUSTOMER WORKFLOW       ', '\x1b[35m');
    log('=======================================', '\x1b[35m');
    if (currentUser) {
      log(`Logged in as: ${currentUser.name || 'Customer'} (${currentUser.mobileNumber})`, '\x1b[32m');
    } else {
      log('Status: Not Logged In', '\x1b[31m');
    }

    log('\n1. Log In / Register with OTP');
    log('2. View Products Catalog & Search Menu');
    log('3. Open Shopping Cart Menu');
    log('4. Open Addresses Menu');
    log('5. Open Profile & Orders Menu');
    log('6. Open Wishlist & Reviews Menu');
    log('7. Proceed to Checkout & Pay');
    log('8. Exit');

    const choice = await rl.question('\nSelect an option (1-8): ');

    switch (choice) {
      case '1':
        await loginFlow();
        break;
      case '2':
        await manageCatalogMenu();
        break;
      case '3':
        await manageCart();
        break;
      case '4':
        await manageAddresses();
        break;
      case '5':
        await manageProfileAndOrders();
        break;
      case '6':
        await manageWishlistAndReviews();
        break;
      case '7':
        await checkoutFlow();
        break;
      case '8':
        log('Goodbye!');
        rl.close();
        process.exit(0);
      default:
        log('Invalid choice. Choose between 1 and 8.');
    }
  }
}

mainMenu().catch((err) => {
  console.error(err);
  rl.close();
});
