// pages/api/admin/revoke-key.js - Revoke API key
import { sql } from '@vercel/postgres';
import { validateSession } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin session
    const sessionId = req.cookies.admin_session;
    const session = await validateSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { key_id } = req.body;

    if (!key_id) {
      return res.status(400).json({ error: 'Key ID required' });
    }

    // Soft delete - mark as revoked by setting expiration to past date
    const result = await sql`
      UPDATE api_keys 
      SET expires_at = NOW() - INTERVAL '1 day', 
          is_paused = true
      WHERE id = ${parseInt(key_id)}
      RETURNING id, api_key, expires_at
    `;

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'API key revoked successfully',
      revoked_key: {
        id: result.rows[0].id,
        key: result.rows[0].api_key.substring(0, 8) + '...', // Partial display
        revoked_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Revoke key error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
