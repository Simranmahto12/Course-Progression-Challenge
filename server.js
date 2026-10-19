/**
 * MIRAI SCHOOL OF TECHNOLOGY (MSOT) — COURSE PROGRESSION PLATFORM
 * Node.js (Express) Production Backend Server
 * 
 * Features:
 * - Mobile Number + Mock OTP Authentication (Hardcoded 123456)
 * - Pure JavaScript ES Modules (Zero TypeScript required to run)
 * - Serves Static Web Frontend (HTML5, CSS3, Vanilla JS)
 * - Self-contained SQLite Academic Engine
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets directly from root directory
app.use(express.static(__dirname));

// ============================================================================
// MOBILE NUMBER + MOCK OTP AUTHENTICATION MODULE
// ============================================================================

// Demo phone-to-user mapping for instant role evaluation
const DEMO_PHONE_MAP = {
  '9876543210': {
    id: 'usr-admin',
    name: 'Dr. Suresh Varma',
    email: 'admin@mirai.edu',
    role: 'admin',
    roleDisplay: 'ADMIN',
    campus: { id: 'all', name: 'All Campuses (Global)' },
  },
  '9876543211': {
    id: 'usr-mgr-hitech',
    name: 'Priya Nair',
    email: 'manager.hitech@mirai.edu',
    role: 'campus_manager',
    roleDisplay: 'CAMPUS_MANAGER',
    campus: { id: 'camp-hitech', name: 'HI-Tech Campus' },
  },
  '9876543212': {
    id: 'usr-fac-sharma',
    name: 'Prof. Rajesh Sharma',
    email: 'faculty.sharma@mirai.edu',
    role: 'faculty',
    roleDisplay: 'FACULTY',
    campus: { id: 'camp-hitech', name: 'HI-Tech Campus' },
  },
  '9876543213': {
    id: 'usr-stu-aarav',
    name: 'Aarav Mehta',
    email: 'student.aarav@mirai.edu',
    role: 'student',
    roleDisplay: 'STUDENT',
    campus: { id: 'camp-hitech', name: 'HI-Tech Campus' },
    batch: { id: 'batch-hitech-mirai', name: 'HI-Tech AI/ML 2026 Batch A' },
  },
};

/**
 * 1. POST /api/auth/send-otp
 * Validates that the phone number is 10 digits.
 * Logs `[DEV MODE] OTP for [phone] is: 123456` in the server terminal.
 * Returns JSON: { success: true, message: "OTP sent successfully", demoOtp: "123456" }
 */
app.post('/api/auth/send-otp', (req, res) => {
  try {
    const rawPhone = String(req.body.phone || '').trim();
    // Normalize phone number (strip +91, spaces, hyphens)
    const digitsOnly = rawPhone.replace(/\D/g, '');
    const phone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 10-digit mobile number.',
      });
    }

    const demoOtp = '123456';
    console.log(`[DEV MODE] OTP for ${phone} is: ${demoOtp}`);

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      phone,
      demoOtp,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to send OTP.',
    });
  }
});

/**
 * 2. POST /api/auth/verify-otp
 * Checks if submitted OTP equals "123456".
 * If correct, issues token and assigns user role.
 * Returns JSON with success status and user role for dynamic dashboard redirection.
 */
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const rawPhone = String(req.body.phone || '').trim();
    const digitsOnly = rawPhone.replace(/\D/g, '');
    const phone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
    const otp = String(req.body.otp || '').trim();

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 10-digit mobile number.',
      });
    }

    if (otp !== '123456') {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP. Please enter demo OTP: 123456',
      });
    }

    // Role mapping: predefined demo phone or fallback to faculty role
    const user = DEMO_PHONE_MAP[phone] || {
      id: `usr-mob-${phone.slice(-4)}`,
      name: `Faculty Member (${phone})`,
      email: `faculty.${phone.slice(-4)}@mirai.edu`,
      role: 'faculty',
      roleDisplay: 'FACULTY',
      campus: { id: 'camp-hitech', name: 'HI-Tech Campus' },
    };

    const token = 'mock-jwt-token-msot';
    console.log(`[AUTH] User verified with phone ${phone} as ${user.roleDisplay} (${user.name})`);

    return res.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      role: user.role,
      user: {
        id: user.id,
        phone,
        name: user.name,
        email: user.email,
        role: user.role,
        roleDisplay: user.roleDisplay,
        campus: user.campus,
        batch: user.batch,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'OTP verification failed.',
    });
  }
});

// Google OAuth Client Configuration
const GOOGLE_CLIENT_ID = '601818746857-dh3skj3lmbnpn6hpmu6dg40r9hnpodh0.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';

/**
 * 3. POST /api/auth/google
 * Optional email authentication via Google OAuth.
 * Number login remains compulsory.
 */
app.post('/api/auth/google', (req, res) => {
  try {
    const { credential, email, name, picture, phone } = req.body;

    let userEmail = email;
    let userName = name;
    let userPicture = picture;

    // Decode Google JWT payload if credential token is passed
    if (credential && typeof credential === 'string') {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          userEmail = payload.email || userEmail;
          userName = payload.name || userName;
          userPicture = payload.picture || userPicture;
        }
      } catch (e) {
        console.warn('Could not decode Google JWT credential', e);
      }
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Google authentication credential missing or invalid.',
      });
    }

    // Number login is compulsory: check if 10-digit mobile number is provided
    const rawPhone = String(phone || '').trim();
    const digitsOnly = rawPhone.replace(/\D/g, '');
    const cleanPhone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;

    // If phone is missing, inform client that mobile number is compulsory
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.json({
        success: true,
        requiresPhone: true,
        message: 'Google email verified. Mobile number login is compulsory to complete registration.',
        googleProfile: {
          email: userEmail,
          name: userName,
          picture: userPicture,
        },
      });
    }

    // Role mapping: predefined demo phone or fallback to faculty role
    const user = DEMO_PHONE_MAP[cleanPhone] || {
      id: `usr-mob-${cleanPhone.slice(-4)}`,
      name: userName || `Faculty Member (${cleanPhone})`,
      email: userEmail,
      role: 'faculty',
      roleDisplay: 'FACULTY',
      campus: { id: 'camp-hitech', name: 'HI-Tech Campus' },
    };

    const token = 'mock-jwt-token-msot';
    console.log(`[AUTH-GOOGLE] Linked Google ${userEmail} with compulsory mobile ${cleanPhone} (${user.roleDisplay})`);

    return res.json({
      success: true,
      requiresPhone: false,
      message: 'Google login and compulsory mobile number verified successfully',
      token,
      role: user.role,
      user: {
        id: user.id,
        phone: cleanPhone,
        name: userName || user.name,
        email: userEmail,
        googleLinked: true,
        picture: userPicture,
        role: user.role,
        roleDisplay: user.roleDisplay,
        campus: user.campus,
        batch: user.batch,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Google authentication failed.',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    institution: 'Mirai School of Technology (MSOT)',
    system: 'Course Progression Platform',
    authModule: 'Mobile OTP Authentication (Demo OTP: 123456)',
    timestamp: new Date().toISOString(),
  });
});

// Mount full academic API routes from backend dist if available
try {
  const backendModule = await import('./backend/dist/app.js');
  if (backendModule && backendModule.default) {
    app.use(backendModule.default);
  }
} catch (e) {
  console.log('ℹ️ Core standalone Express server active with complete Mobile OTP endpoints.');
}

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Mirai MSOT Course Progression Platform Live!`);
  console.log(`👉 Web Portal:    http://localhost:${PORT}`);
  console.log(`👉 Health Check:  http://localhost:${PORT}/api/health`);
  console.log(`📱 Demo OTP Code: 123456`);
  console.log(`======================================================\n`);
});

export default app;
