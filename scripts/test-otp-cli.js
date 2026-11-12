#!/usr/bin/env node
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  }
}

// Terminal ANSI styling
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function printHeader() {
  if (process.stdout.isTTY) {
    console.clear();
  }
  log('====================================================================', colors.cyan);
  log('            ZiniKart Mobile OTP Complete Flow CLI Test              ', colors.bold + colors.cyan);
  log('====================================================================', colors.cyan);
  log(`  Backend URL   : ${process.env.PAYLOAD_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}`, colors.gray);
  log(`  OTP Provider  : ${(process.env.OTP_PROVIDER || 'msg91').toUpperCase()}`, colors.yellow);
  log(`  MSG91 Widget  : ${process.env.MSG91_WIDGET_ID || '(none)'}`, colors.gray);
  log(`  MSG91 AuthKey : ${process.env.MSG91_AUTH_KEY ? process.env.MSG91_AUTH_KEY.substring(0, 8) + '...' : '(none)'}`, colors.gray);
  log(`  MSG91 Token   : ${process.env.MSG91_TOKEN_AUTH ? process.env.MSG91_TOKEN_AUTH.substring(0, 8) + '...' : '(none)'}`, colors.gray);
  log('====================================================================\n', colors.cyan);
}

const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
let currentTokenAuth = process.env.MSG91_TOKEN_AUTH || '';

function formatMobileInput(raw) {
  let cleaned = raw.trim().replace(/[\s-]/g, '');
  if (!cleaned) return '';
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  if (!cleaned.startsWith('+') && /^\d{11,14}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return cleaned;
}

function formatMobileForMsg91(mobileNumber) {
  return mobileNumber.replace(/^\+/, '').replace(/\D/g, '');
}

async function callHttp(url, method, headers, payload, label) {
  log(`\n--> [${label}] ${method} ${url}`, colors.cyan + colors.bold);
  if (headers && Object.keys(headers).length > 0) {
    const safeHeaders = { ...headers };
    if (safeHeaders.authkey) safeHeaders.authkey = safeHeaders.authkey.substring(0, 6) + '...';
    if (safeHeaders.Authorization) safeHeaders.Authorization = safeHeaders.Authorization.substring(0, 20) + '...';
    log(`    Headers: ${JSON.stringify(safeHeaders)}`, colors.gray);
  }
  if (payload) {
    log(`    Payload: ${JSON.stringify(payload, null, 2)}`, colors.gray);
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    let body = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }

    if (res.ok) {
      log(`<-- [${label}] HTTP ${res.status} OK`, colors.green + colors.bold);
    } else {
      log(`<-- [${label}] HTTP ${res.status} ${res.statusText}`, colors.red + colors.bold);
    }

    log(`    Response: ${typeof body === 'object' ? JSON.stringify(body, null, 2) : body}`, colors.dim);
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    log(`❌ Connection Error [${label}]: ${err.message}`, colors.red);
    return { ok: false, status: 0, error: err.message };
  }
}

async function verifyTokenWithBackend(token) {
  log('\n--- Step: Verifying session with GET /api/mobile/auth/me ---', colors.magenta);
  const meRes = await callHttp(
    `${baseUrl}/api/mobile/auth/me`,
    'GET',
    { Authorization: `Bearer ${token}` },
    null,
    'BACKEND /api/mobile/auth/me'
  );

  if (meRes.ok && meRes.body?.user) {
    log('\n🎉 =======================================================', colors.green);
    log('🎉  LOGIN & AUTHENTICATION COMPLETELY VERIFIED!           ', colors.green + colors.bold);
    log('🎉 =======================================================', colors.green);
    log(`    User ID     : ${meRes.body.user.id}`, colors.bold);
    log(`    Mobile      : ${meRes.body.user.mobileNumber}`, colors.bold);
    log(`    Name        : ${meRes.body.user.name || '(not set)'}`, colors.bold);
    log(`    Roles       : ${meRes.body.user.roles?.join(', ') || '(none)'}`, colors.bold);
    log(`    Cart ID     : ${meRes.body.user.cartId || '(none)'}`, colors.bold);
    log(`    Status      : ${meRes.body.status || '(unknown)'}`, colors.bold);
    log(`    Session JWT : ${token.substring(0, 35)}...`, colors.gray);
  } else {
    log('⚠️  Failed to verify session token against /api/mobile/auth/me', colors.yellow);
  }
}

async function promptRole(rl) {
  log('\nSelect user role:', colors.bold);
  log('  1) Customer (default)');
  log('  2) Retailer');
  log('  3) Delivery Partner');
  const roleChoice = (await rl.question('Enter choice [1/2/3, default: 1]: ')).trim();
  if (roleChoice === '2') return 'retailer';
  if (roleChoice === '3') return 'delivery_partner';
  return 'customer';
}

/**
 * FLOW 1: COMPLETE MOBILE APP INTEGRATION FLOW
 * Step 1: Mobile App calls MSG91 sendOtp endpoint
 * Step 2: User enters the received OTP
 * Step 3: Mobile App calls MSG91 verifyOtp endpoint -> gets MSG91 access-token JWT
 * Step 4: Mobile App sends access-token to ZiniKart Backend (/api/mobile/auth/otp/verify)
 * Step 5: Backend validates access-token with MSG91 verifyAccessToken & logs user in!
 */
async function flowCompleteMobileApp(rl) {
  log('\n====================================================================', colors.blue);
  log('     COMPLETE MOBILE APP SIMULATION (MSG91 -> BACKEND)              ', colors.bold + colors.blue);
  log('====================================================================', colors.blue);
  log('This flow simulates EXACTLY what the Android/iOS Mobile App will do:', colors.gray);
  log('  1. App calls MSG91 sendOtp (https://control.msg91.com/api/v5/widget/sendOtp)', colors.gray);
  log('  2. You receive OTP on SMS/WhatsApp and enter it', colors.gray);
  log('  3. App calls MSG91 verifyOtp (https://control.msg91.com/api/v5/widget/verifyOtp)', colors.gray);
  log('  4. App sends MSG91 access-token to Backend (/api/mobile/auth/otp/verify)', colors.gray);
  log('  5. Backend verifies token with MSG91 and logs you into ZiniKart!\n', colors.gray);

  const authKey = process.env.MSG91_AUTH_KEY;
  const widgetId = process.env.MSG91_WIDGET_ID;

  if (!widgetId) {
    log('❌ MSG91_WIDGET_ID is not configured in .env', colors.red);
    return;
  }

  const rawNumber = await rl.question('Enter your Mobile Number (e.g. 9876543210 or +919876543210): ');
  const mobileNumber = formatMobileInput(rawNumber);
  if (!mobileNumber) {
    log('❌ Mobile number cannot be empty.', colors.red);
    return;
  }

  const formattedMobile = formatMobileForMsg91(mobileNumber);
  log(`Using mobile number: ${mobileNumber} (MSG91 identifier: ${formattedMobile})`, colors.yellow);

  const role = await promptRole(rl);
  const name = (await rl.question('Enter your name (optional, press Enter to skip): ')).trim();

  // --- STEP 1: MOBILE APP CALLS MSG91 SEND OTP ---
  log('\n--------------------------------------------------------------------', colors.cyan);
  log('STEP 1: [Mobile App -> MSG91] Requesting OTP via MSG91 sendOtp API...', colors.bold + colors.cyan);
  log('--------------------------------------------------------------------', colors.cyan);

  let tokenAuth = currentTokenAuth;
  let sendSuccess = false;
  let reqId = null;

  while (!sendSuccess) {
    const headers = {};
    if (authKey) headers['authkey'] = authKey;
    if (tokenAuth) headers['token'] = tokenAuth;

    const payload = {
      widgetId,
      identifier: formattedMobile,
      ...(tokenAuth ? { tokenAuth } : {}),
    };

    const sendRes = await callHttp(
      'https://control.msg91.com/api/v5/widget/sendOtp',
      'POST',
      headers,
      payload,
      'MOBILE APP -> MSG91 sendOtp'
    );

    const body = sendRes.body;
    const isSuccess = sendRes.ok && body && (body.type === 'success' || body.status === 'success');

    if (isSuccess) {
      reqId = body.reqId || body.message;
      sendSuccess = true;
      log(`\n✅ MSG91 accepted OTP send request!`, colors.green + colors.bold);
      log(`   Request ID (reqId): ${reqId}`, colors.green);
      log(`   📱 Check your mobile device for the SMS / WhatsApp OTP.`, colors.yellow + colors.bold);
    } else {
      const errMsg = body?.message || JSON.stringify(body);
      log(`\n❌ MSG91 sendOtp returned an error: ${errMsg}`, colors.red);

      if (errMsg.includes('Web requests are not allowed for this widget') || errMsg.includes('AuthenticationFailure')) {
        log('\n💡 MSG91 Widget Note:', colors.yellow + colors.bold);
        log('   When "Mobile Integration" is enabled on this widget in MSG91, direct HTTP/CLI requests are blocked.', colors.yellow);
        log('   Use the mobile app SDK or generate a Widget Token (tokenAuth) in MSG91 -> OTP -> Token -> "Generate New Token".', colors.yellow);
      } else if (errMsg.includes('Invalid Captcha Token')) {
        log('\n💡 MSG91 Captcha Note:', colors.yellow + colors.bold);
        log('   MSG91 has reCAPTCHA enabled on this widget by default.', colors.yellow);
        log('   Fix: Open MSG91 Dashboard -> OTP -> Widgets -> Edit widget -> turn OFF "Captcha Validation" -> Save.', colors.yellow);
      } else if (errMsg.includes('IPBlocked') || errMsg.includes('408')) {
        log('\n💡 MSG91 IP Rate-Limit Note:', colors.yellow + colors.bold);
        log('   Your IP was temporarily flagged by MSG91 due to rapid failed attempts.', colors.yellow);
        log('   Fix: Switch to a Mobile Hotspot / VPN for a new IP, or whitelist your IP in MSG91 -> Settings -> IP Whitelist.', colors.yellow);
      }

      log('\nOptions:');
      log('  [1] Enter Widget Token (tokenAuth) and retry');
      log('  [2] Enter a custom Request ID (reqId) if you already received an OTP');
      log('  [3] Abort');
      const action = (await rl.question('Select [1/2/3]: ')).trim();

      if (action === '1') {
        tokenAuth = (await rl.question('Paste your MSG91 Widget Token (tokenAuth): ')).trim();
        currentTokenAuth = tokenAuth;
      } else if (action === '2') {
        reqId = (await rl.question('Enter MSG91 reqId: ')).trim();
        if (reqId) {
          sendSuccess = true;
          break;
        }
      } else {
        return;
      }
    }
  }

  // --- STEP 2: USER ENTERS OTP RECEIVED ON PHONE ---
  log('\n--------------------------------------------------------------------', colors.cyan);
  log('STEP 2: [User Input] Enter Received OTP Code', colors.bold + colors.cyan);
  log('--------------------------------------------------------------------', colors.cyan);

  const otpCode = (await rl.question('\nEnter the 4-6 digit OTP code received on your phone: ')).trim();
  if (!otpCode) {
    log('❌ OTP code cannot be empty.', colors.red);
    return;
  }

  // --- STEP 3: MOBILE APP CALLS MSG91 VERIFY OTP ---
  log('\n--------------------------------------------------------------------', colors.cyan);
  log('STEP 3: [Mobile App -> MSG91] Verifying OTP via MSG91 verifyOtp API...', colors.bold + colors.cyan);
  log('--------------------------------------------------------------------', colors.cyan);

  const verifyHeaders = {};
  if (authKey) verifyHeaders['authkey'] = authKey;
  if (tokenAuth) verifyHeaders['token'] = tokenAuth;

  const verifyPayload = {
    widgetId,
    reqId,
    otp: otpCode,
    ...(tokenAuth ? { tokenAuth } : {}),
  };

  const verifyRes = await callHttp(
    'https://control.msg91.com/api/v5/widget/verifyOtp',
    'POST',
    verifyHeaders,
    verifyPayload,
    'MOBILE APP -> MSG91 verifyOtp'
  );

  const vBody = verifyRes.body;
  const isVerifySuccess = verifyRes.ok && vBody && (vBody.type === 'success' || vBody.status === 'success' || vBody.token || vBody['access-token']);

  if (!isVerifySuccess) {
    log(`\n❌ MSG91 OTP verification failed: ${vBody?.message || JSON.stringify(vBody)}`, colors.red + colors.bold);
    return;
  }

  // Extract MSG91 JWT access token
  const msg91AccessToken = vBody.token || vBody['access-token'] || vBody.accessToken || vBody.message;
  log(`\n✅ OTP verified by MSG91 successfully!`, colors.green + colors.bold);
  log(`   Received MSG91 Access Token: ${typeof msg91AccessToken === 'string' ? msg91AccessToken.substring(0, 35) + '...' : JSON.stringify(msg91AccessToken)}`, colors.green);

  // --- STEP 4: MOBILE APP CALLS OUR BACKEND VERIFY & LOGIN ---
  log('\n--------------------------------------------------------------------', colors.cyan);
  log('STEP 4: [Mobile App -> Our Backend] Authenticating with /api/mobile/auth/otp/verify...', colors.bold + colors.cyan);
  log('--------------------------------------------------------------------', colors.cyan);

  const backendVerifyPayload = {
    accessToken: msg91AccessToken,
    role,
    ...(name ? { name } : {}),
  };

  const backendRes = await callHttp(
    `${baseUrl}/api/mobile/auth/otp/verify`,
    'POST',
    {},
    backendVerifyPayload,
    'MOBILE APP -> OUR BACKEND /verify'
  );

  if (!backendRes.ok || !backendRes.body?.token) {
    log(`\n❌ Backend verification failed: ${backendRes.body?.error || JSON.stringify(backendRes.body)}`, colors.red + colors.bold);
    return;
  }

  // --- STEP 5: VERIFY SESSION TOKEN WITH /api/users/me ---
  await verifyTokenWithBackend(backendRes.body.token);
}

// FLOW 2: Traditional Server-Initiated OTP Flow
async function flowServerInitiatedOtp(rl) {
  log('\n====================================================================', colors.yellow);
  log('     SERVER-INITIATED OTP FLOW (/api/mobile/auth/otp/...)           ', colors.bold + colors.yellow);
  log('====================================================================', colors.yellow);
  log('This flow routes OTP generation through the Backend server instead of directly from client.\n', colors.gray);

  const rawNumber = await rl.question('Enter Mobile Number (e.g. +919876543210 or 9876543210): ');
  const mobileNumber = formatMobileInput(rawNumber);
  if (!mobileNumber) {
    log('❌ Mobile number cannot be empty.', colors.red);
    return;
  }

  const role = await promptRole(rl);
  const name = (await rl.question('Enter your name (optional, press Enter to skip): ')).trim();

  // 1. Request OTP
  const reqRes = await callHttp(
    `${baseUrl}/api/mobile/auth/otp/request`,
    'POST',
    {},
    { mobileNumber },
    'OUR BACKEND /request'
  );

  if (!reqRes.ok) {
    log('\n❌ Backend OTP Request Failed!', colors.red);
    return;
  }

  const reqId = reqRes.body?.reqId;
  const isTest = reqRes.body?.test;

  if (isTest) {
    log('\nℹ️ Test number detected! Bypass code: 111111', colors.magenta + colors.bold);
  } else {
    log('\n📱 OTP requested! Check your phone SMS/WhatsApp.', colors.green + colors.bold);
    if (reqId) log(`   reqId: ${reqId}`, colors.gray);
  }

  const code = (await rl.question('\nEnter the OTP code received: ')).trim();
  if (!code) {
    log('❌ Code cannot be empty.', colors.red);
    return;
  }

  const verifyRes = await callHttp(
    `${baseUrl}/api/mobile/auth/otp/verify`,
    'POST',
    {},
    {
      mobileNumber,
      code,
      role,
      ...(reqId ? { reqId } : {}),
      ...(name ? { name } : {}),
    },
    'OUR BACKEND /verify'
  );

  if (!verifyRes.ok || !verifyRes.body?.token) {
    log('\n❌ Backend Verification Failed!', colors.red);
    return;
  }

  await verifyTokenWithBackend(verifyRes.body.token);
}

// FLOW 3: Paste Pre-existing MSG91 Access Token
async function flowPasteAccessToken(rl) {
  log('\n====================================================================', colors.magenta);
  log('     VERIFY PRE-EXISTING MSG91 ACCESS TOKEN                         ', colors.bold + colors.magenta);
  log('====================================================================', colors.magenta);
  log('Use this if you already received a JWT access-token from the MSG91 Mobile SDK.\n', colors.gray);

  const accessToken = (await rl.question('Paste MSG91 access-token (JWT): ')).trim();
  if (!accessToken) {
    log('❌ Access token cannot be empty.', colors.red);
    return;
  }

  const role = await promptRole(rl);
  const name = (await rl.question('Enter your name (optional): ')).trim();

  const res = await callHttp(
    `${baseUrl}/api/mobile/auth/otp/verify`,
    'POST',
    {},
    {
      accessToken,
      role,
      ...(name ? { name } : {}),
    },
    'OUR BACKEND /verify'
  );

  if (!res.ok || !res.body?.token) {
    log('\n❌ Verification Failed!', colors.red);
    return;
  }

  await verifyTokenWithBackend(res.body.token);
}

// FLOW 4: Instant Mock Bypass Test
async function flowMockBypass() {
  log('\n====================================================================', colors.dim + colors.white);
  log('     INSTANT MOCK BYPASS TEST (+919999999999 / 111111)              ', colors.bold + colors.white);
  log('====================================================================', colors.dim + colors.white);

  if (process.env.NODE_ENV === 'production') {
    log('⚠️  Note: Test account bypasses (+919999999999) are strictly disabled when NODE_ENV=production.', colors.yellow);
  }

  const reqRes = await callHttp(
    `${baseUrl}/api/mobile/auth/otp/request`,
    'POST',
    {},
    { mobileNumber: '+919999999999' },
    'BACKEND /request'
  );

  if (!reqRes.ok) return;

  const verifyRes = await callHttp(
    `${baseUrl}/api/mobile/auth/otp/verify`,
    'POST',
    {},
    {
      mobileNumber: '+919999999999',
      code: '111111',
      role: 'customer',
      name: 'Mock Test User',
    },
    'BACKEND /verify'
  );

  if (!verifyRes.ok || !verifyRes.body?.token) return;

  await verifyTokenWithBackend(verifyRes.body.token);
}

// FLOW 5: Direct MSG91 Diagnostics
async function flowDirectDiagnostic(rl) {
  log('\n====================================================================', colors.gray);
  log('     DIRECT MSG91 API DIAGNOSTICS                                   ', colors.bold + colors.gray);
  log('====================================================================', colors.gray);

  log('Select diagnostic target:');
  log('  1) Test verifyAccessToken endpoint (control.msg91.com/api/v5/widget/verifyAccessToken)');
  log('  2) Test verifyOtp with a mock reqId to check authkey acceptance');
  const dChoice = (await rl.question('Select [1/2]: ')).trim();

  const authKey = process.env.MSG91_AUTH_KEY;
  const widgetId = process.env.MSG91_WIDGET_ID;

  if (dChoice === '1') {
    const dummyToken = (await rl.question('Enter access-token [default: dummy_token]: ')).trim() || 'dummy_token';
    await callHttp(
      'https://control.msg91.com/api/v5/widget/verifyAccessToken',
      'POST',
      {},
      { authkey: authKey, 'access-token': dummyToken },
      'MSG91 verifyAccessToken'
    );
  } else if (dChoice === '2') {
    await callHttp(
      'https://control.msg91.com/api/v5/widget/verifyOtp',
      'POST',
      { authkey: authKey },
      { widgetId, reqId: 'dummy_req_id', otp: '1234' },
      'MSG91 verifyOtp'
    );
  }
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    let running = true;
    while (running) {
      printHeader();
      log('Choose flow to test:');
      log('  [1] 🚀 FULL MOBILE APP FLOW (MSG91 sendOtp -> MSG91 verifyOtp -> Backend Login)', colors.bold + colors.green);
      log('  [2] 🔄 Server-Initiated Flow (Backend /request -> Backend /verify)', colors.yellow);
      log('  [3] 🔑 Verify Pre-existing MSG91 Access Token (Paste JWT)', colors.magenta);
      log('  [4] ⚡ Quick Mock Bypass Test (+919999999999 / 111111)', colors.dim + colors.white);
      log('  [5] 🔍 Direct MSG91 Diagnostics (Raw MSG91 API checks)', colors.gray);
      log('  [6] 🚪 Exit\n', colors.cyan);

      const choice = (await rl.question('Select option [1-6]: ')).trim();

      switch (choice) {
        case '1':
          await flowCompleteMobileApp(rl);
          break;
        case '2':
          await flowServerInitiatedOtp(rl);
          break;
        case '3':
          await flowPasteAccessToken(rl);
          break;
        case '4':
          await flowMockBypass();
          break;
        case '5':
          await flowDirectDiagnostic(rl);
          break;
        case '6':
        case 'q':
        case 'exit':
          running = false;
          log('\nGoodbye! 👋\n', colors.cyan);
          continue;
        default:
          log('\nInvalid choice. Please select 1-6.', colors.red);
          break;
      }

      log('\n--------------------------------------------------------------------', colors.gray);
      await rl.question('Press Enter to return to main menu...');
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
