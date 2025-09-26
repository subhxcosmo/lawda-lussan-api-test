// pages/api/admin/create-key.js - Create new API key
import { sql } from '@vercel/postgres';
import { generateApiKey, hashApiKey } from '../../../lib/auth';
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

    const { expires_in_days, daily_limit, user_id } = req.body;

    // Validation
    if (!expires_in_days || !daily_limit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (parseInt(expires_in_days) < 1 || parseInt(expires_in_days) > 3650) {
      return res.status(400).json({ error: 'Expiration must be between 1-3650 days' });
    }

    if (parseInt(daily_limit) < 10 || parseInt(daily_limit) > 100000) {
      return res.status(400).json({ error: 'Daily limit must be between 10-100000' });
    }

    // Generate secure API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expires_in_days));

    // Create key in database
    const result = await sql`
      INSERT INTO api_keys (
        api_key, 
        key_hash, 
        user_id, 
        expires_at, 
        daily_limit
      )
      VALUES (${apiKey}, ${keyHash}, ${user_id || null}, ${expiresAt.toISOString()}, ${parseInt(daily_limit)})
      RETURNING id, created_at, expires_at, daily_limit
    `;

    if (result.rowCount === 0) {
      return res.status(500).json({ error: 'Failed to create API key' });
    }

    const newKey = result.rows[0];

    return res.status(201).json({
      success: true,
      message: 'API key created successfully',
      key: {
        id: newKey.id,
        api_key: apiKey, // Only shown once during creation
        created_at: newKey.created_at,
        expires_at: newKey.expires_at,
        daily_limit: newKey.daily_limit,
        warning: 'Save this API key immediately - it will not be shown again!'
      }
    });

  } catch (error) {
    console.error('Create key error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
