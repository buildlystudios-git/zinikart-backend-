import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
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
let currentRetailer = null;

const rl = readline.createInterface({ input, output });

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
async function makeRequest(endpoint, method = 'GET', data = null, customToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  const activeToken = customToken || token;
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
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
  log('\n=== Retailer Login / Registration ===', '\x1b[33m');
  log('Enter your mobile number to request an OTP. Use the test number (+919999999999) with code (111111) for quick bypass.');

  const mobileNumber = await rl.question('\nEnter your mobile number: ');
  if (!mobileNumber.trim()) {
    log('Invalid mobile number.');
    return;
  }

  const requestBody = { mobileNumber };
  printApiCall('/api/mobile/auth/otp/request', 'POST', 'Requests an OTP code to be sent to the retailer\'s mobile number.', requestBody);
  const requestRes = await makeRequest('/api/mobile/auth/otp/request', 'POST', requestBody);

  if (requestRes.status !== 200) {
    log(`Failed to request OTP. Status: ${requestRes.status}, Error: ${JSON.stringify(requestRes.body)}`, '\x1b[31m');
    return;
  }
  log('OTP request successful!');

  const code = await rl.question('\nEnter the verification code: ');
  const name = await rl.question('Enter your name (optional): ');

  const verifyBody = {
    mobileNumber,
    code,
    name: name || undefined,
    role: 'retailer',
  };
  printApiCall('/api/mobile/auth/otp/verify', 'POST', 'Verifies the OTP and initiates retailer log in. Returns profile and status.', verifyBody);
  const verifyRes = await makeRequest('/api/mobile/auth/otp/verify', 'POST', verifyBody);

  if (verifyRes.status !== 200) {
    log(`Verification failed. Status: ${verifyRes.status}, Error: ${JSON.stringify(verifyRes.body)}`, '\x1b[31m');
    return;
  }

  const { status, user, token: sessionToken } = verifyRes.body;
  currentUser = user;

  if (status === 'registration_required') {
    token = sessionToken; // Temp token to register
    log('\nRegistration Required! Let\'s set up your Retailer profile first.', '\x1b[33m');
    await registerRetailerProfile(mobileNumber);
  } else if (status === 'pending_approval') {
    log('\nYour profile registration is complete, but approval is still pending.', '\x1b[33m');
    await handleApprovalFlow(mobileNumber);
  } else if (status === 'approved') {
    token = sessionToken;
    log(`\nSuccessfully Logged In! Welcome back, ${currentUser.name || 'Retailer'}!`, '\x1b[32m');
    await fetchRetailerProfile();
  } else {
    log(`Your profile registration status is: ${status}. Access is restricted.`, '\x1b[31m');
  }
}

async function registerRetailerProfile(mobileNumber) {
  log('\n=== Register Retailer Store ===', '\x1b[33m');
  const shopName = await rl.question('Shop / Store Name: ');
  const ownerName = await rl.question('Owner Display Name: ');
  const emailId = await rl.question('Business Email Address: ');
  const gstNumber = await rl.question('GST Registration Number: ');

  log('\n--- Shop Address Details ---');
  const street = await rl.question('Street / Block: ');
  const city = await rl.question('City: ');
  const state = await rl.question('State: ');
  const zipCode = await rl.question('Postal / Zip Code: ');

  log('\n--- Bank Details for Settlements ---');
  const accountHolderName = await rl.question('Account Holder Name: ');
  const accountNumber = await rl.question('Bank Account Number: ');
  const ifscCode = await rl.question('IFSC Code: ');
  const bankName = await rl.question('Bank Branch Name: ');

  // Fetch standard media for images relation
  printApiCall('/api/media', 'GET', 'Fetches seeded media attachments from ZiniKart to select a store logo/image.');
  const mediaRes = await makeRequest('/api/media');
  const mediaDocs = mediaRes.body?.docs || [];
  let selectedMediaId = '';

  if (mediaDocs.length > 0) {
    log('\nSelect a store logo/image from seeded media:');
    mediaDocs.forEach((m, idx) => {
      log(`${idx + 1}. ID: ${m.id} | Alt: ${m.alt || 'No description'} | URL: ${m.url}`);
    });
    const mediaChoice = await rl.question(`Select option (1-${mediaDocs.length}, default 1): `);
    const mediaIdx = parseInt(mediaChoice) - 1;
    if (mediaIdx >= 0 && mediaIdx < mediaDocs.length) {
      selectedMediaId = mediaDocs[mediaIdx].id;
    } else {
      selectedMediaId = mediaDocs[0].id;
    }
  } else {
    log('Warning: No media found. You must upload images to register a store first.', '\x1b[31m');
    return;
  }

  const retailerData = {
    shopName,
    ownerName,
    mobileNumber,
    emailId,
    gstNumber,
    images: [selectedMediaId],
    shopAddress: {
      street,
      city,
      state,
      zipCode,
    },
    bankDetails: {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
    },
    businessHours: {
      startTime: '09:00 AM',
      endTime: '09:00 PM',
      openEveryday: true,
    },
  };

  printApiCall('/api/retailers', 'POST', 'Submits the retailer business details profile to ZiniKart for review and approval.', retailerData);
  const registerRes = await makeRequest('/api/retailers', 'POST', retailerData);

  if (registerRes.status === 200 || registerRes.status === 201) {
    currentRetailer = registerRes.body?.doc || registerRes.body;
    log('\nStore Profile Submitted successfully! Current status: PENDING APPROVAL', '\x1b[32m');
    await handleApprovalFlow(mobileNumber);
  } else {
    log(`Store registration failed. Status: ${registerRes.status}, Error: ${JSON.stringify(registerRes.body)}`, '\x1b[31m');
  }
}

async function handleApprovalFlow(mobileNumber) {
  log('\n=== Approve Retailer Store Profile ===', '\x1b[33m');
  log('1. Auto-Approve using Administrator credentials (API-driven)');
  log('2. Manually approve via Payload Admin Panel browser dashboard');
  log('3. Log out and exit');

  const choice = await rl.question('\nChoose an option (1-3): ');

  if (choice === '1') {
    const adminEmail = await rl.question('Admin Email (default: admin.user@testing.zinikart.local): ') || 'admin.user@testing.zinikart.local';
    const adminPassword = await rl.question('Admin Password (default: adminPassword123): ') || 'adminPassword123';

    const loginBody = {
      email: adminEmail,
      password: adminPassword,
    };
    printApiCall('/api/users/login', 'POST', 'Authenticates as an administrator to gain elevated update privileges.', loginBody);
    const adminLoginRes = await makeRequest('/api/users/login', 'POST', loginBody);

    const adminToken = adminLoginRes.body?.token;
    if (!adminToken) {
      log(`Admin authorization failed: ${JSON.stringify(adminLoginRes.body)}`, '\x1b[31m');
      return;
    }

    // Find the retailer document to get its ID
    printApiCall('/api/retailers', 'GET', 'Queries the retailer collection to find the store profile linked to this user ID.');
    const queryRes = await makeRequest(`/api/retailers?where[user][equals]=${currentUser.id}`, 'GET', null, adminToken);
    const retailerId = queryRes.body?.docs?.[0]?.id;

    if (!retailerId) {
      log('Could not locate retailer profile document.', '\x1b[31m');
      return;
    }

    const approveBody = { approvalStatus: 'approved' };
    printApiCall(`/api/retailers/${retailerId}`, 'PATCH', 'Updates approvalStatus of the retailer profile to approved.', approveBody);
    const approveRes = await makeRequest(`/api/retailers/${retailerId}`, 'PATCH', approveBody, adminToken);

    if (approveRes.status === 200) {
      log('\nStore profile auto-approved successfully!', '\x1b[32m');
      log('Re-authenticating your session...');
      // Re-run verify OTP to get approved session token
      const reVerifyBody = {
        mobileNumber,
        code: '111111', // bypass verification using test OTP code
        role: 'retailer',
      };
      printApiCall('/api/mobile/auth/otp/verify', 'POST', 'Re-verifies OTP to obtain approved session JWT token.', reVerifyBody);
      const verifyRes = await makeRequest('/api/mobile/auth/otp/verify', 'POST', reVerifyBody);
      if (verifyRes.status === 200 && verifyRes.body?.token) {
        token = verifyRes.body.token;
        currentUser = verifyRes.body.user;
        await fetchRetailerProfile();
        log('Session re-authenticated! You can now add products.', '\x1b[32m');
      }
    } else {
      log(`Approval update failed. Status: ${approveRes.status}`, '\x1b[31m');
    }
  } else if (choice === '2') {
    log('\nTo approve manually:');
    log('1. Go to: http://localhost:3000/admin/collections/retailers');
    log('2. Edit your store registration and set Approval Status to "Approved"');
    log('3. Click Save Changes');
    await rl.question('\nPress Enter once you have saved the approved status in your browser...');
    
    // Re-verify to obtain approved token
    const reVerifyBody = {
      mobileNumber,
      code: '111111',
      role: 'retailer',
    };
    printApiCall('/api/mobile/auth/otp/verify', 'POST', 'Re-verifies OTP to obtain approved session JWT token.', reVerifyBody);
    const verifyRes = await makeRequest('/api/mobile/auth/otp/verify', 'POST', reVerifyBody);
    if (verifyRes.status === 200 && verifyRes.body?.token && verifyRes.body.status === 'approved') {
      token = verifyRes.body.token;
      currentUser = verifyRes.body.user;
      await fetchRetailerProfile();
      log('\nStore verified and approved! Welcome back.', '\x1b[32m');
    } else {
      log('Verification failed or store is still pending approval.', '\x1b[31m');
    }
  } else {
    log('Goodbye!');
    rl.close();
    process.exit(0);
  }
}

async function fetchRetailerProfile() {
  if (!token) return;
  printApiCall(`/api/retailers?where[user][equals]=${currentUser.id}`, 'GET', 'Retrieves the current logged in retailer profile details.');
  const res = await makeRequest(`/api/retailers?where[user][equals]=${currentUser.id}`);
  if (res.status === 200 && res.body?.docs?.length > 0) {
    currentRetailer = res.body.docs[0];
  }
}

async function collectSpecifications(categoryId, existingSpecs = []) {
  printApiCall(`/api/categories/${categoryId}`, 'GET', 'Fetches category specification templates to ensure product complies with listing rules.');
  const res = await makeRequest(`/api/categories/${categoryId}`);
  if (res.status !== 200) return existingSpecs;

  const category = res.body;
  const templates = category.specificationTemplates || [];
  const specs = [...existingSpecs];

  for (const temp of templates) {
    const existing = specs.find(s => s.key && s.key.toLowerCase().trim() === temp.name.toLowerCase().trim());
    
    // If it's already present and valid, skip it
    if (existing && existing.value && existing.value.trim()) {
      continue;
    }

    let val = '';
    const requiredLabel = temp.required ? 'REQUIRED' : 'optional';
    
    if (temp.required) {
      log(`\nMissing required specification: "${temp.name}"`);
      while (true) {
        val = await rl.question(`Enter value for "${temp.name}" (${temp.type}, ${requiredLabel}): `);
        val = val.trim();
        
        if (!val) {
          log(`"${temp.name}" is required. Please provide a value.`);
          continue;
        }
        
        // Basic validation
        if (temp.type === 'number' && isNaN(Number(val))) {
          log('Value must be a valid number. Try again.');
          continue;
        }
        if (temp.type === 'date' && isNaN(Date.parse(val))) {
          log('Value must be a valid date (e.g. YYYY-MM-DD). Try again.');
          continue;
        }
        if (temp.type === 'select' && temp.options && temp.options.length > 0) {
          const allowed = temp.options.map(o => o.option.trim().toLowerCase());
          if (!allowed.includes(val.toLowerCase())) {
            log(`Value must be one of: ${temp.options.map(o => o.option).join(', ')}. Try again.`);
            continue;
          }
        }
        break;
      }
    } else {
      val = await rl.question(`\nEnter value for "${temp.name}" (${temp.type}, ${requiredLabel}, press Enter to skip): `);
      val = val.trim();
      if (val) {
        if (temp.type === 'number' && isNaN(Number(val))) {
          log('Invalid number, skipping optional specification.');
          val = '';
        }
        if (temp.type === 'date' && isNaN(Date.parse(val))) {
          log('Invalid date, skipping optional specification.');
          val = '';
        }
        if (temp.type === 'select' && temp.options && temp.options.length > 0) {
          const allowed = temp.options.map(o => o.option.trim().toLowerCase());
          if (!allowed.includes(val.toLowerCase())) {
            log('Invalid option, skipping optional specification.');
            val = '';
          }
        }
      }
    }

    if (val) {
      if (existing) {
        existing.value = val;
      } else {
        specs.push({
          key: temp.name,
          value: val,
          type: temp.type
        });
      }
    }
  }

  return specs;
}

async function listNewProduct() {
  if (!token || !currentRetailer) {
    log('You must be registered and approved to list products.', '\x1b[31m');
    return;
  }

  log('\n=== List New Product ===', '\x1b[33m');
  log('1. List from a Master Catalog Template (Standard Brand/Item)');
  log('2. Create a custom unique product from scratch');
  const typeChoice = await rl.question('\nSelect option (1-2): ');

  let title = '';
  let description = '';
  let parentTemplateId = null;
  let selectedCategory = '';
  let galleryImageId = '';
  let specifications = [];
  let templateEnableVariants = false;
  let templateVariantTypes = [];

  if (typeChoice === '1') {
    const query = '/api/products?where[isMasterTemplate][equals]=true&depth=1';
    printApiCall(query, 'GET', 'Fetches Master Catalog Templates that retailers can sell in their own shops.');
    const res = await makeRequest(query);
    const templates = res.body?.docs || [];
    
    if (templates.length === 0) {
      log('No Master Templates found in database. Creating custom product instead.');
    } else {
      log('\nSelect a Master Catalog Template to sell:');
      templates.forEach((t, idx) => {
        log(`${idx + 1}. ID: ${t.id} | Brand: ${t.brand?.name || 'N/A'} | ${t.title}`);
      });
      const tChoice = await rl.question(`Select option (1-${templates.length}): `);
      const tIdx = parseInt(tChoice) - 1;
      if (tIdx >= 0 && tIdx < templates.length) {
        const template = templates[tIdx];
        parentTemplateId = template.id;
        title = template.title;
        description = template.description?.root?.children?.[0]?.children?.[0]?.text || 'Listed cloned product';
        selectedCategory = template.categories?.[0]?.id || template.categories?.[0];
        galleryImageId = template.gallery?.[0]?.image?.id || template.gallery?.[0]?.image;
        templateEnableVariants = template.enableVariants || false;
        templateVariantTypes = template.variantTypes || [];

        // Copy existing specifications from template if available
        if (template.specifications && Array.isArray(template.specifications)) {
          specifications = template.specifications.map(s => ({
            key: s.key,
            value: s.value,
            type: s.type
          }));
          log(`\nCopied ${specifications.length} specifications from Master Template automatically.`);
        }
      }
    }
  }

  if (!parentTemplateId) {
    title = await rl.question('Product Title: ');
    description = await rl.question('Product Description / Features: ');

    // Fetch categories
    printApiCall('/api/categories', 'GET', 'Fetches active store categories to group your product.');
    const catRes = await makeRequest('/api/categories');
    const categories = catRes.body?.docs || [];
    if (categories.length > 0) {
      log('\nSelect a product category:');
      categories.forEach((cat, idx) => {
        log(`${idx + 1}. ${cat.title}`);
      });
      const catChoice = await rl.question(`Select option (1-${categories.length}): `);
      const catIdx = parseInt(catChoice) - 1;
      if (catIdx >= 0 && catIdx < categories.length) {
        selectedCategory = categories[catIdx].id;
      }
    }

    // Fetch media
    printApiCall('/api/media', 'GET', 'Fetches media to select product gallery image.');
    const mediaRes = await makeRequest('/api/media');
    const mediaDocs = mediaRes.body?.docs || [];
    if (mediaDocs.length > 0) {
      galleryImageId = mediaDocs[0].id;
    }
  }

  // Collect/Verify specifications based on category requirements (prompting for missing ones)
  if (selectedCategory) {
    specifications = await collectSpecifications(selectedCategory, specifications);
  }

  let priceInINR = null;
  if (!templateEnableVariants) {
    const basePriceStr = await rl.question('\nEnter Selling Price in INR (e.g. 500 for ₹500.00): ');
    priceInINR = (parseFloat(basePriceStr) || 0) * 100;
  } else {
    log('\nNote: This product uses variants. Prices and inventory are configured at the variant level.', '\x1b[33m');
  }
  
  if ((!title.trim() && !parentTemplateId) || (!templateEnableVariants && priceInINR <= 0)) {
    log('Invalid product details.');
    return;
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 1000);

  const productData = {
    title,
    slug,
    description: {
      root: {
        children: [
          {
            children: [{ detail: 0, format: 0, mode: 'normal', text: description, type: 'text', version: 1 }],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1
          }
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1
      }
    },
    priceInINR: priceInINR || undefined,
    enableVariants: templateEnableVariants,
    variantTypes: templateVariantTypes.map(vt => typeof vt === 'object' ? vt.id : vt),
    categories: selectedCategory ? [selectedCategory] : undefined,
    gallery: galleryImageId ? [{ image: galleryImageId }] : undefined,
    retailer: currentUser.id, // Linked to the retailer's authenticated User ID
    isMasterTemplate: false,
    parentTemplate: parentTemplateId || undefined,
    specifications: specifications.length > 0 ? specifications : undefined,
    _status: 'published',
  };

  printApiCall('/api/products', 'POST', 'Submits a new product listing (either cloned or custom) to the store catalog under the retailer\'s ownership.', productData);
  const res = await makeRequest('/api/products', 'POST', productData);

  if (res.status === 200 || res.status === 201) {
    log(`\n🎉 Product listed successfully!`, '\x1b[32m');
    log(`Product ID Created: ${res.body?.doc?.id || res.body?.id}`, '\x1b[32m');
  } else {
    log(`Product creation failed. Status: ${res.status}, Error: ${JSON.stringify(res.body)}`, '\x1b[31m');
  }
}

async function viewStoreProducts() {
  if (!token || !currentRetailer) {
    log('Login first to view your store products.', '\x1b[31m');
    return;
  }

  printApiCall(`/api/products?where[retailer][equals]=${currentUser.id}&depth=1`, 'GET', 'Fetches the list of products listed by this retailer user.');
  const res = await makeRequest(`/api/products?where[retailer][equals]=${currentUser.id}&depth=1`);

  if (res.status !== 200) {
    log(`Failed to fetch store products. Status: ${res.status}`, '\x1b[31m');
    return;
  }

  const docs = res.body?.docs || [];
  log('\n=== Your Listed Products ===', '\x1b[33m');
  if (docs.length === 0) {
    log('No products listed by your store yet.');
  } else {
    docs.forEach((p, idx) => {
      const priceStr = p.priceInINR ? `₹${p.priceInINR / 100}` : 'No price set';
      log(`${idx + 1}. ID: ${p.id} | Title: ${p.title} | Price: ${priceStr} | Status: ${p._status} | Parent Template: ${p.parentTemplate || 'None'}`);
    });
  }
}

async function manageRetailerStoreMenu() {
  if (!token) {
    log('You must login first.', '\x1b[31m');
    return;
  }

  while (true) {
    log('\n=== Store Profile Menu ===', '\x1b[33m');
    log('1. View My Store Profile Details');
    log('2. Edit Store Details (Shop Name / Email)');
    log('3. Back to Main Menu');

    const choice = await rl.question('\nSelect an option (1-3): ');

    if (choice === '1') {
      await fetchRetailerProfile();
      if (!currentRetailer) {
        log('No store profile found. Please register your store first.');
        continue;
      }
      log(`\nStore Details (ID: ${currentRetailer.id}):`);
      log(`Shop Name: ${currentRetailer.shopName}`);
      log(`Owner Name: ${currentRetailer.ownerName}`);
      log(`GST Number: ${currentRetailer.gstNumber}`);
      log(`Email ID: ${currentRetailer.emailId}`);
      log(`Approval Status: ${currentRetailer.approvalStatus}`);
      log(`Business Hours: ${currentRetailer.businessHours?.startTime} - ${currentRetailer.businessHours?.endTime}`);
      log(`Bank Account: ${currentRetailer.bankDetails?.bankName} (${currentRetailer.bankDetails?.accountNumber})`);
      log(`Store Rating: ${currentRetailer.averageRating || 0}/5 (${currentRetailer.ratingCount || 0} reviews)`);
    } else if (choice === '2') {
      await fetchRetailerProfile();
      if (!currentRetailer) {
        log('No store profile found to edit.');
        continue;
      }
      log('Enter new values (press Enter to skip and keep current value):');
      const shopName = await rl.question(`New Shop Name [${currentRetailer.shopName}]: `);
      const emailId = await rl.question(`New Business Email [${currentRetailer.emailId}]: `);
      
      const updateData = {};
      if (shopName.trim()) updateData.shopName = shopName.trim();
      if (emailId.trim()) updateData.emailId = emailId.trim();

      if (Object.keys(updateData).length === 0) {
        log('No changes specified.');
        continue;
      }

      printApiCall(`/api/retailers/${currentRetailer.id}`, 'PATCH', 'Updates retailer business profile details.', updateData);
      const res = await makeRequest(`/api/retailers/${currentRetailer.id}`, 'PATCH', updateData);
      if (res.status === 200) {
        log('Store details updated successfully!', '\x1b[32m');
        currentRetailer = res.body?.doc || res.body;
      } else {
        log(`Failed to update store details. Status: ${res.status}, Error: ${JSON.stringify(res.body)}`, '\x1b[31m');
      }
    } else if (choice === '3') {
      break;
    }
  }
}

async function manageProductVariants() {
  if (!token || !currentRetailer) {
    log('You must be registered and approved to list variants.', '\x1b[31m');
    return;
  }

  // 1. Fetch current retailer products
  const productsQuery = `/api/products?where[retailer][equals]=${currentUser.id}&depth=1`;
  printApiCall(productsQuery, 'GET', 'Fetches products listed by the current retailer.');
  const prodRes = await makeRequest(productsQuery);
  const products = prodRes.body?.docs || [];

  if (products.length === 0) {
    log('No products found in your store catalog. Please list a product first.');
    return;
  }

  log('\n=== Select Product to Manage Variants ===');
  products.forEach((p, idx) => {
    log(`${idx + 1}. ID: ${p.id} | ${p.title} (Variants: ${p.enableVariants ? 'Enabled' : 'Disabled'})`);
  });

  const pChoice = await rl.question(`Select option (1-${products.length}): `);
  const pIdx = parseInt(pChoice) - 1;
  if (pIdx < 0 || pIdx >= products.length) {
    log('Invalid selection.');
    return;
  }

  const selectedProduct = products[pIdx];

  // 2. Check if product has variants enabled
  if (!selectedProduct.enableVariants) {
    log('\nVariants are not enabled for this product. You can update its direct price/inventory under option 3.', '\x1b[31m');
    return;
  }

  const productId = selectedProduct.id;

  // 3. Fetch all variant configurations for this product
  const variantsQuery = `/api/variants?where[product][equals]=${productId}&depth=1&limit=100`;
  printApiCall(variantsQuery, 'GET', 'Fetches all variants currently linked to this retailer product.');
  const variantsRes = await makeRequest(variantsQuery);
  const variants = variantsRes.body?.docs || [];

  // Map option ID to name/value for readability
  const optionMap = {};
  const vtList = selectedProduct.variantTypes || [];
  vtList.forEach((vt) => {
    const opts = vt.options || [];
    opts.forEach((opt) => {
      optionMap[opt.id] = { typeName: vt.name, optValue: opt.value };
    });
  });

  function getVariantLabel(v) {
    const opts = v.options || [];
    const labels = opts.map((o) => {
      const optId = typeof o === 'object' ? o.id : o;
      const mapping = optionMap[optId];
      return mapping ? `${mapping.typeName}: ${mapping.optValue}` : `Option #${optId}`;
    });
    return labels.join(', ') || 'Default Configuration';
  }

  while (true) {
    log(`\n=== Variants for: ${selectedProduct.title} ===`, '\x1b[33m');
    if (variants.length === 0) {
      log('No variants currently configured.');
    } else {
      variants.forEach((v, idx) => {
        log(`${idx + 1}. ID: ${v.id} | Configuration: [${getVariantLabel(v)}]`);
        log(`   Price: ₹${v.priceInINR / 100} | Qty: ${v.inventory} | Status: ${v._status}`);
      });
    }

    log('\n1. Create / Update a Variant Combination');
    log('2. Back to Product Catalog Menu');

    const subChoice = await rl.question('\nSelect an option (1-2): ');

    if (subChoice === '1') {
      if (vtList.length === 0) {
        log('No variant types found on the master template. Cannot define combinations.', '\x1b[31m');
        continue;
      }

      const chosenOptionIds = [];
      let aborted = false;

      for (const vt of vtList) {
        log(`\nSelect option for: "${vt.name}"`);
        const opts = vt.options || [];
        if (opts.length === 0) {
          log(`No options defined for variant type "${vt.name}".`);
          aborted = true;
          break;
        }

        opts.forEach((o, idx) => {
          log(`${idx + 1}. ${o.value}`);
        });

        const oChoice = await rl.question(`Choose option (1-${opts.length}): `);
        const oIdx = parseInt(oChoice) - 1;
        if (oIdx < 0 || oIdx >= opts.length) {
          log('Invalid selection.');
          aborted = true;
          break;
        }
        chosenOptionIds.push(opts[oIdx].id);
      }

      if (aborted) continue;

      // Ask for Price, Stock, Status
      const priceStr = await rl.question('\nEnter Selling Price in INR: ');
      const priceInINR = (parseFloat(priceStr) || 0) * 100;
      const qtyStr = await rl.question('Enter Stock Quantity: ');
      const inventory = parseInt(qtyStr) || 0;
      const status = await rl.question('Enter Status (draft or published, default: published): ') || 'published';

      if (priceInINR <= 0 || inventory < 0) {
        log('Invalid price or inventory values.', '\x1b[31m');
        continue;
      }

      // Check if this combination already exists
      const existing = variants.find((v) => {
        const vOpts = (v.options || []).map((o) => typeof o === 'object' ? o.id : o);
        return chosenOptionIds.every((id) => vOpts.includes(id));
      });

      if (existing) {
        // Update existing variant
        const updateData = {
          priceInINR,
          inventory,
          _status: status,
        };
        printApiCall(`/api/variants/${existing.id}`, 'PATCH', 'Updates price/stock for an existing variant combination.', updateData);
        const res = await makeRequest(`/api/variants/${existing.id}`, 'PATCH', updateData);
        if (res.status === 200) {
          log('\nVariant updated successfully!', '\x1b[32m');
          const updatedDoc = res.body?.doc || res.body;
          const idx = variants.findIndex(v => v.id === existing.id);
          if (idx !== -1) variants[idx] = updatedDoc;
        } else {
          log(`Failed to update variant. Status: ${res.status}, Error: ${JSON.stringify(res.body)}`, '\x1b[31m');
        }
      } else {
        // Create new variant
        const createData = {
          product: productId,
          options: chosenOptionIds,
          priceInINR,
          inventory,
          priceInINREnabled: true,
          _status: status,
        };
        printApiCall('/api/variants', 'POST', 'Registers a new variant combination (e.g. Storage + Color) with custom stock/pricing.', createData);
        const res = await makeRequest('/api/variants', 'POST', createData);
        if (res.status === 200 || res.status === 201) {
          log('\nVariant created successfully!', '\x1b[32m');
          variants.push(res.body?.doc || res.body);
        } else {
          log(`Failed to create variant. Status: ${res.status}, Error: ${JSON.stringify(res.body)}`, '\x1b[31m');
        }
      }
    } else {
      break;
    }
  }
}

async function manageRetailerProductsMenu() {
  if (!token || !currentRetailer) {
    log('You must be registered and approved to list products.', '\x1b[31m');
    return;
  }

  while (true) {
    log('\n=== Product Catalog Menu ===', '\x1b[33m');
    log('1. View My Listed Store Products');
    log('2. List New Product for Sale');
    log('3. Update Existing Product Details (Price / Status)');
    log('4. Delete / De-list Product');
    log('5. Manage Product Variants (Stock / Price / Status)');
    log('6. Back to Main Menu');

    const choice = await rl.question('\nSelect an option (1-6): ');

    if (choice === '1') {
      await viewStoreProducts();
    } else if (choice === '2') {
      await listNewProduct();
    } else if (choice === '3') {
      const productId = await rl.question('Enter Product ID to update: ');
      if (!productId.trim()) continue;

      log('Enter new values (press Enter to skip and keep current value):');
      const title = await rl.question('New Title: ');
      const basePriceStr = await rl.question('New Base Price in INR: ');
      const status = await rl.question('New status (draft or published): ');

      const updateData = {};
      if (title.trim()) updateData.title = title.trim();
      if (basePriceStr.trim()) {
        updateData.priceInINR = (parseFloat(basePriceStr) || 0) * 100;
      }
      if (status.trim() === 'draft' || status.trim() === 'published') {
        updateData._status = status.trim();
      }

      if (Object.keys(updateData).length === 0) {
        log('No changes specified.');
        continue;
      }

      printApiCall(`/api/products/${productId.trim()}`, 'PATCH', 'Updates details of an existing listed product.', updateData);
      const res = await makeRequest(`/api/products/${productId.trim()}`, 'PATCH', updateData);
      if (res.status === 200) {
        log('Product updated successfully!', '\x1b[32m');
      } else {
        log(`Failed to update product. Status: ${res.status}, Error: ${JSON.stringify(res.body)}`, '\x1b[31m');
      }
    } else if (choice === '4') {
      const productId = await rl.question('Enter Product ID to delete: ');
      if (!productId.trim()) continue;

      printApiCall(`/api/products/${productId.trim()}`, 'DELETE', 'Deletes a product listing from the store catalog.');
      const res = await makeRequest(`/api/products/${productId.trim()}`, 'DELETE');
      if (res.status === 200 || res.status === 204) {
        log('Product deleted successfully!', '\x1b[32m');
      } else {
        log(`Failed to delete product. Status: ${res.status}`, '\x1b[31m');
      }
    } else if (choice === '5') {
      await manageProductVariants();
    } else if (choice === '6') {
      break;
    }
  }
}

async function mainMenu() {
  while (true) {
    log('\n=======================================', '\x1b[34m');
    log('       ZINIKART RETAILER WORKFLOW       ', '\x1b[34m');
    log('=======================================', '\x1b[34m');
    if (currentUser) {
      const storeName = currentRetailer ? currentRetailer.shopName : 'Setting up Store...';
      log(`Logged in as: ${currentUser.name || 'Retailer'} (${currentUser.mobileNumber})`, '\x1b[32m');
      log(`Store Profile: ${storeName}`, '\x1b[32m');
    } else {
      log('Status: Not Logged In', '\x1b[31m');
    }

    log('\n1. Log In / Register Store with OTP');
    log('2. Manage Store Profile');
    log('3. Manage Product Catalog');
    log('4. Exit');

    const choice = await rl.question('\nSelect an option (1-4): ');

    switch (choice) {
      case '1':
        await loginFlow();
        break;
      case '2':
        await manageRetailerStoreMenu();
        break;
      case '3':
        await manageRetailerProductsMenu();
        break;
      case '4':
        log('Goodbye!');
        rl.close();
        process.exit(0);
      default:
        log('Invalid choice. Choose between 1 and 4.');
    }
  }
}

mainMenu().catch((err) => {
  console.error(err);
  rl.close();
});
