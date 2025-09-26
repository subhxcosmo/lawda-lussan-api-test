// pages/api/admin/change-password.js - Change user password
import { sql } from '@vercel/postgres';
import { hashPassword } from '../../../lib/auth';
import { validateSession } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin session
    const sessionId = req.cookies.admin_session;
    const session = await validateSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user_id, current_password, new_password } = req.body;

    if (!user_id || !new_password) {
      return res.status(400).json({ error: 'User ID and new password required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get current user info
    const userResult = await sql`
      SELECT id, password_hash, username 
      FROM users 
      WHERE id = ${parseInt(user_id)}
    `;

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // If changing own password, verify current password
    if (parseInt(user_id) === session.userId) {
      const isValidCurrentPassword = await comparePassword(current_password, user.password_hash);
      if (!isValidCurrentPassword) {
        return res.status(401).json({ error: 'Current password incorrect' });
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update password and timestamp
    await sql`
      UPDATE users 
      SET password_hash = ${newPasswordHash}, 
          last_password_change = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(user_id)}
    `;

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      user: {
        id: user.id,
        username: user.username,
        password_changed_at: new Date().toISOString()
      },
      security_notice: 'User should log out from all sessions after password change'
    });

  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
