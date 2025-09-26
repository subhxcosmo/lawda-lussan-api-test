// pages/api/admin/keys.js - Get all API keys with status
import { sql } from '@vercel/postgres';
import { validateSession } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin session
    const sessionId = req.cookies.admin_session;
    const session = await validateSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 50, status, user_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build dynamic query based on filters
    let query = `
      SELECT 
        ak.id,
        ak.api_key,
        ak.created_at,
        ak.expires_at,
        ak.is_paused,
        ak.daily_limit,
        ak.daily_used,
        ak.last_reset_date,
        u.username,
        COUNT(aul.id) as total_requests
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      LEFT JOIN api_usage_logs aul ON ak.id = aul.api_key_id
    `;

    const params = [];
    const conditions = [];

    if (status) {
      if (status === 'expired') {
        conditions.push(`ak.expires_at < NOW()`);
      } else if (status === 'paused') {
        conditions.push(`ak.is_paused = true`);
      } else if (status === 'active') {
        conditions.push(`ak.expires_at > NOW() AND ak.is_paused = false`);
      }
    }

    if (user_id) {
      conditions.push(`ak.user_id = $${params.length + 1}`);
      params.push(parseInt(user_id));
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY ak.id, u.username
      ORDER BY ak.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(parseInt(limit), offset);

    const keysResult = await sql.unsafe(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT ak.id) as total
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
    `;

    const countParams = [];
    const countConditions = [];

    if (status) {
      if (status === 'expired') {
        countConditions.push(`ak.expires_at < NOW()`);
      } else if (status === 'paused') {
        countConditions.push(`ak.is_paused = true`);
      } else if (status === 'active') {
        countConditions.push(`ak.expires_at > NOW() AND ak.is_paused = false`);
      }
    }

    if (user_id) {
      countConditions.push(`ak.user_id = $${countParams.length + 1}`);
      countParams.push(parseInt(user_id));
    }

    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(' AND ')}`;
    }

    const countResult = await sql.unsafe(countQuery, countParams);

    // Process keys with remaining time calculation
    const processedKeys = keysResult.rows.map(key => {
      const now = new Date();
      const expiresAt = new Date(key.expires_at);
      let remainingTime = null;
      let status = 'active';

      if (key.expires_at && expiresAt < now) {
        status = 'expired';
      } else if (key.is_paused) {
        status = 'paused';
      }

      if (key.expires_at && expiresAt > now) {
        const diffMs = expiresAt - now;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        remainingTime = { days, hours };
      }

      const today = new Date().toISOString().split('T')[0];
      const usagePercentage = key.daily_limit > 0 
        ? Math.round((key.daily_used / key.daily_limit) * 100) 
        : 0;

      return {
        ...key,
        key_preview: key.api_key.substring(0, 8) + '...',
        status,
        remaining_time: remainingTime,
        usage_percentage: Math.min(usagePercentage, 100),
        is_over_limit: key.daily_used >= key.daily_limit && key.last_reset_date === today
      };
    });

    return res.status(200).json({
      success: true,
      data: processedKeys,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
      },
      filters_applied: {
        status,
        user_id: user_id || null
      }
    });

  } catch (error) {
    console.error('Get keys error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
