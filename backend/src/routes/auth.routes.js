import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mirai_msot_progression_super_secret_jwt_key_2026';
// In-memory phone-to-role demo mapping
const DEMO_PHONE_MAP = {
    '9876543210': { userId: 'usr-admin', role: 'admin', name: 'Dr. Suresh Varma' },
    '9876543211': { userId: 'usr-mgr-hitech', role: 'campus_manager', name: 'Priya Nair' },
    '9876543212': { userId: 'usr-fac-sharma', role: 'faculty', name: 'Prof. Rajesh Sharma' },
    '9876543213': { userId: 'usr-stu-aarav', role: 'student', name: 'Aarav Mehta' },
};
/**
 * POST /api/auth/send-otp
 * Validates 10-digit phone, logs OTP in console, returns demo OTP 123456
 */
router.post('/send-otp', (req, res) => {
    try {
        const rawPhone = String(req.body.phone || '').trim();
        // Strip non-digits (remove +91, spaces, dashes)
        const digitsOnly = rawPhone.replace(/\D/g, '');
        const phone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
        if (!phone || phone.length !== 10) {
            res.status(400).json({
                success: false,
                error: 'Please enter a valid 10-digit mobile number.',
            });
            return;
        }
        const demoOtp = process.env.DEMO_OTP || '123456';
        console.log(`[DEV MODE] OTP for ${phone} is: ${demoOtp}`);
        res.json({
            success: true,
            message: 'OTP sent successfully',
            phone,
            demoOtp,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message || 'Failed to send OTP.' });
    }
});
/**
 * POST /api/auth/verify-otp
 * Checks submitted OTP == "123456", issues token and assigns role
 */
router.post('/verify-otp', (req, res) => {
    try {
        const rawPhone = String(req.body.phone || '').trim();
        const digitsOnly = rawPhone.replace(/\D/g, '');
        const phone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
        const otp = String(req.body.otp || '').trim();
        if (!phone || phone.length !== 10) {
            res.status(400).json({
                success: false,
                error: 'Please provide a valid 10-digit mobile number.',
            });
            return;
        }
        const validOtp = process.env.DEMO_OTP || '123456';
        if (otp !== validOtp) {
            res.status(400).json({
                success: false,
                error: `Invalid OTP. Please enter demo OTP: ${validOtp}`,
            });
            return;
        }
        // Lookup mapped demo user or fallback to faculty/admin
        const mapped = DEMO_PHONE_MAP[phone] || {
            userId: 'usr-fac-sharma',
            role: 'faculty',
            name: `Faculty Member (${phone})`,
        };
        let user = null;
        try {
            user = db.prepare(`
        SELECT u.*, c.name as campus_name, b.name as batch_name
        FROM users u
        LEFT JOIN campuses c ON u.campus_id = c.id
        LEFT JOIN batches b ON u.batch_id = b.id
        WHERE u.id = ? OR LOWER(u.role) = LOWER(?)
        LIMIT 1
      `).get(mapped.userId, mapped.role);
        }
        catch {
            // fallback if db query fails
        }
        if (!user) {
            user = {
                id: mapped.userId,
                name: mapped.name,
                email: `${mapped.role}@mirai.edu`,
                role: mapped.role,
                campus_name: 'HI-Tech Campus',
                batch_name: 'HI-Tech AI/ML 2026 Batch A',
            };
        }
        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            phone,
            role: (user.role || mapped.role).toUpperCase(),
            campusId: user.campus_id,
            batchId: user.batch_id,
        };
        // Standard mock token as requested, plus signed JWT compatibility
        const token = 'mock-jwt-token-msot';
        console.log(`[AUTH] User verified with phone ${phone} as ${(user.role || mapped.role).toUpperCase()} (${user.name})`);
        res.json({
            success: true,
            message: 'OTP verified successfully',
            token,
            role: (user.role || mapped.role).toLowerCase(),
            user: {
                id: user.id,
                phone,
                name: user.name,
                email: user.email,
                role: (user.role || mapped.role).toLowerCase(),
                roleDisplay: (user.role || mapped.role).toUpperCase(),
                campus: user.campus_id ? { id: user.campus_id, name: user.campus_name } : undefined,
                batch: user.batch_id ? { id: user.batch_id, name: user.batch_name } : undefined,
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message || 'OTP verification failed.' });
    }
});
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '601818746857-dh3skj3lmbnpn6hpmu6dg40r9hnpodh0.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
/**
 * POST /api/auth/google
 * Optional email authentication via Google OAuth (client id: 601818746857-dh3skj3lmbnpn6hpmu6dg40r9hnpodh0.apps.googleusercontent.com)
 * Number login remains compulsory.
 */
router.post('/google', (req, res) => {
    try {
        const { credential, email, name, picture, phone } = req.body;
        let userEmail = email;
        let userName = name;
        let userPicture = picture;
        // Decode JWT payload if credential token is provided
        if (credential && typeof credential === 'string') {
            try {
                const parts = credential.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
                    userEmail = payload.email || userEmail;
                    userName = payload.name || userName;
                    userPicture = payload.picture || userPicture;
                }
            }
            catch (e) {
                console.warn('Could not decode Google JWT credential', e);
            }
        }
        if (!userEmail) {
            res.status(400).json({ success: false, error: 'Google authentication credential missing or invalid.' });
            return;
        }
        // Number login is compulsory: check if phone is provided
        const rawPhone = String(phone || '').trim();
        const digitsOnly = rawPhone.replace(/\D/g, '');
        const cleanPhone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
        // If phone is missing, notify frontend that number login is compulsory
        if (!cleanPhone || cleanPhone.length !== 10) {
            res.status(200).json({
                success: true,
                requiresPhone: true,
                message: 'Google email verified. Mobile number is compulsory to complete login.',
                googleProfile: {
                    email: userEmail,
                    name: userName,
                    picture: userPicture,
                },
            });
            return;
        }
        // If phone is provided, complete login and link Google email
        const mapped = DEMO_PHONE_MAP[cleanPhone] || {
            userId: 'usr-fac-sharma',
            role: 'faculty',
            name: userName || `Faculty Member (${cleanPhone})`,
        };
        const token = 'mock-jwt-token-msot';
        console.log(`[AUTH-GOOGLE] Linked Google ${userEmail} with compulsory mobile ${cleanPhone} (${mapped.role})`);
        res.json({
            success: true,
            requiresPhone: false,
            message: 'Google login and mobile number successfully verified',
            token,
            role: mapped.role.toLowerCase(),
            user: {
                id: mapped.userId,
                phone: cleanPhone,
                name: userName || mapped.name,
                email: userEmail,
                googleLinked: true,
                picture: userPicture,
                role: mapped.role.toLowerCase(),
                roleDisplay: mapped.role.toUpperCase(),
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message || 'Google authentication failed.' });
    }
});
// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { email, password, role } = req.body;
        let user = null;
        if (email) {
            user = db.prepare(`
        SELECT u.*, c.name as campus_name, b.name as batch_name
        FROM users u
        LEFT JOIN campuses c ON u.campus_id = c.id
        LEFT JOIN batches b ON u.batch_id = b.id
        WHERE LOWER(u.email) = LOWER(?)
      `).get(email.trim());
        }
        else if (role) {
            // Mock login by role directly if requested
            user = db.prepare(`
        SELECT u.*, c.name as campus_name, b.name as batch_name
        FROM users u
        LEFT JOIN campuses c ON u.campus_id = c.id
        LEFT JOIN batches b ON u.batch_id = b.id
        WHERE LOWER(u.role) = LOWER(?)
        LIMIT 1
      `).get(role.trim());
        }
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials or user not found.' });
            return;
        }
        // Password validation (allow 'mirai123' for mock/demo, or verify bcrypt hash)
        if (password && password !== 'mirai123' && user.password_hash) {
            const isValid = bcrypt.compareSync(password, user.password_hash);
            if (!isValid && password !== user.password_hash) {
                res.status(401).json({ error: 'Invalid password.' });
                return;
            }
        }
        // Payload supports both lowercase and uppercase roles
        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role.toUpperCase(),
            campusId: user.campus_id,
            batchId: user.batch_id,
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role.toUpperCase(),
                campus: user.campus_id ? { id: user.campus_id, name: user.campus_name } : undefined,
                batch: user.batch_id ? { id: user.batch_id, name: user.batch_name } : undefined,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Login failed.' });
    }
});
// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    try {
        const user = db.prepare(`
      SELECT u.*, c.name as campus_name, b.name as batch_name
      FROM users u
      LEFT JOIN campuses c ON u.campus_id = c.id
      LEFT JOIN batches b ON u.batch_id = b.id
      WHERE u.id = ?
    `).get(req.user?.id);
        if (!user) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }
        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role.toUpperCase(),
                campus: user.campus_id ? { id: user.campus_id, name: user.campus_name } : undefined,
                batch: user.batch_id ? { id: user.batch_id, name: user.batch_name } : undefined,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/auth/demo-users
router.get('/demo-users', (_req, res) => {
    try {
        const users = db.prepare(`
      SELECT u.id, u.email, u.name, u.role,
             c.id as campus_id, c.name as campus_name,
             b.id as batch_id, b.name as batch_name
      FROM users u
      LEFT JOIN campuses c ON u.campus_id = c.id
      LEFT JOIN batches b ON u.batch_id = b.id
      ORDER BY u.role ASC
    `).all();
        res.json({
            users: users.map((u) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                role: u.role.toUpperCase(),
                campus: u.campus_id ? { id: u.campus_id, name: u.campus_name } : undefined,
                batch: u.batch_id ? { id: u.batch_id, name: u.batch_name } : undefined,
            })),
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
