// lib/auth.js - Authentication and session management
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { kv } from '@vercel/kv';

/**
 * JWT Secret - In production, use Vercel environment variables
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

/**
 * Generate JWT token
 */
export function generateToken(userId, username) {
  const payload = {
    userId,
    username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Hash API key for secure storage
 */
export function hashApiKey(apiKey) {
  return require('crypto')
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

/**
 * Generate secure random API key
 */
export function generateApiKey() {
  return require('crypto').randomBytes(32).toString('hex');
}

/**
 * Create user session
 */
export async function createSession(userId, username) {
  const sessionId = require('crypto').randomUUID();
  const token = generateToken(userId, username);
  
  // Store session in Vercel KV (expires in 24 hours)
  await kv.setex(`session:${sessionId}`, 86400, JSON.stringify({
    token,
    userId,
    username,
    createdAt: new Date().toISOString()
  }));
  
  return { sessionId, token };
}

/**
 * Validate user session
 */
export async function validateSession(sessionId) {
  if (!sessionId) return null;
  
  const sessionData = await kv.get(`session:${sessionId}`);
  if (!sessionData) return null;
  
  try {
    const session = JSON.parse(sessionData);
    const decoded = verifyToken(session.token);
    
    if (decoded && decoded.userId === session.userId) {
      // Extend session by 30 minutes
      await kv.expire(`session:${sessionId}`, 1800);
      return decoded;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Destroy user session
 */
export async function destroySession(sessionId) {
  if (sessionId) {
    await kv.del(`session:${sessionId}`);
  }
}

/**
 * Compare password hash
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Hash password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
