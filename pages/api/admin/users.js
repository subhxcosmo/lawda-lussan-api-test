// pages/api/admin/users.js - Manage admin users
import { sql } from '@vercel/postgres';
import { hashPassword } from '../../../lib/auth';
import { validateSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const { method } = req;

  try {
    // Verify admin session
    const sessionId = req.cookies.admin_session;
    const session = await validateSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (method === 'GET') {
      // Get all users with password change history
      const result = await sql`
        SELECT 
          u.id,
          u.username,
          u.created_at,
          u.last_password_change,
          u.is_active,
          COUNT(ph.id) as password_change_count,
          MAX(ph.changed_at) as last_change_date
        FROM users u
        LEFT JOIN (
          SELECT 
            user_id,
            id,
            changed_at
          FROM (
            SELECT 
              user_id,
              id,
              changed_at,
              ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY changed_at DESC) as rn
            FROM users
          ) ranked
          WHERE rn = 1
        ) ph ON u.id = ph.user_id
        GROUP BY u.id, u.username, u.created_at, u.last_password_change, u.is_active
        ORDER BY u.created_at DESC
      `;

      const users = result.rows.map(user => ({
        ...user,
        password_preview: user.last_change_date ? 
          new Date(user.last_change_date).toLocaleDateString() : 
          'Never'
      }));

      return res.status(200).json({
        success: true,
        data: users,
        total: users.length
      });

    } else if (method === 'POST') {
      // Create new user
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ error: 'Username must be 3-50 characters' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Check if username exists
      const existingUser = await sql`SELECT id FROM users WHERE username = ${username}`;
      if (existingUser.rowCount > 0) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const passwordHash = await hashPassword(password);

      const result = await sql`
        INSERT INTO users (username, password_hash, last_password_change)
        VALUES (${username}, ${passwordHash}, CURRENT_TIMESTAMP)
        RETURNING id, username, created_at
      `;

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: result.rows[0]
      });

    } else if (method === 'PUT') {
      // Update user (activate/deactivate)
      const { user_id, is_active } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const result = await sql`
        UPDATE users 
        SET is_active = ${Boolean(is_active)}, 
            last_password_change = CASE 
              WHEN ${Boolean(is_active)} = false THEN CURRENT_TIMESTAMP 
              ELSE last_password_change 
            END
        WHERE id = ${parseInt(user_id)}
        RETURNING id, username, is_active
      `;

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        success: true,
        message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
        user: result.rows[0]
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('User management error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
