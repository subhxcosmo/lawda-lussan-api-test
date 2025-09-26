// pages/api/admin/login.js - Admin authentication endpoint
import { sql } from '@vercel/postgres';
import { createSession, comparePassword } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Find user
    const result = await sql`
      SELECT id, username, password_hash 
      FROM users 
      WHERE username = ${username} AND is_active = true
    `;

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    const { sessionId, token } = await createSession(user.id, user.username);

    // Set session cookie
    res.setHeader('Set-Cookie', [
      `admin_session=${sessionId}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`,
      `admin_token=${token}; Path=/; Max-Age=86400; SameSite=Strict`
    ]);

    return res.status(200).json({ 
      success: true, 
      user: { id: user.id, username: user.username },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
