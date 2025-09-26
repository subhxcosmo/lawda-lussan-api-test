// pages/api/lookup.js - Main phone lookup API endpoint
import { getApiKey, incrementApiUsage, logUsage, query } from '../../../lib/db';
import { hashApiKey } from '../../../lib/auth';
import { sql } from '@vercel/postgres';
import axios from 'axios';

/**
 * Rate limiting middleware
 */
async function checkRateLimit(apiKeyId, ip) {
  const today = new Date().toISOString().split('T')[0];
  
  // IP-based rate limiting (100 requests per hour)
  const ipKey = `rate_limit:${ip}:${today}:hour`;
  const ipUsage = await sql`SELECT COUNT(*) as count FROM api_usage_logs 
    WHERE ip_address = ${ip} AND created_at > NOW() - INTERVAL '1 hour'`;
  
  if (ipUsage.rows[0].count >= 100) {
    throw new Error('Rate limit exceeded. Too many requests from this IP.');
  }
  
  // Key-based daily limit
  const keyInfo = await sql`SELECT daily_used, daily_limit FROM api_keys WHERE id = ${apiKeyId}`;
  if (keyInfo.rows[0].daily_used >= keyInfo.rows[0].daily_limit) {
    throw new Error('Daily quota exceeded for this API key.');
  }
  
  return true;
}

/**
 * Validate Indian mobile number
 */
function validateMobileNumber(number) {
  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(number)) {
    throw new Error('Invalid mobile number. Must be 10 digits starting with 6-9.');
  }
  return true;
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
  // CORS headers for browser compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed: 'GET' 
    });
  }

  // Extract parameters
  const { key, number } = req.query;
  
  if (!key || !number) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      required: 'key and number' 
    });
  }

  try {
    // Validate mobile number
    validateMobileNumber(number);

    // Hash API key for secure lookup (never expose actual key)
    const keyHash = hashApiKey(key);
    
    // Verify API key
    const apiKeyInfo = await getApiKey(keyHash);
    if (!apiKeyInfo) {
      return res.status(401).json({ 
        error: 'Invalid or expired API key' 
      });
    }

    // Check if key is paused
    if (apiKeyInfo.is_paused) {
      return res.status(403).json({ 
        error: 'API key is currently paused' 
      });
    }

    // Check expiration
    if (apiKeyInfo.expires_at && new Date(apiKeyInfo.expires_at) < new Date()) {
      return res.status(401).json({ 
        error: 'API key has expired' 
      });
    }

    // Rate limiting checks
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    await checkRateLimit(apiKeyInfo.id, clientIp);

    // Make request to base API (keeping it completely hidden)
    const startTime = Date.now();
    let baseResponse;
    
    try {
      // This is where the actual base API call happens
      // The URL and parameters are never exposed in any response or error
      const baseApiResponse = await axios.get(`${process.env.BASE_API_URL}?key=${process.env.BASE_API_KEY}&number=${number}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'PhoneLookupAPI/1.0',
          'Accept': 'application/json'
        }
      });

      baseResponse = baseApiResponse.data;
      
      // Validate base API response structure
      if (!baseResponse || typeof baseResponse !== 'object' || !baseResponse.data || !Array.isArray(baseResponse.data)) {
        throw new Error('Invalid base API response format');
      }

    } catch (baseApiError) {
      console.error('Base API request failed:', baseApiError.message);
      
      // Log the failure but don't expose base API details
      await logUsage(apiKeyInfo.id, number, Date.now() - startTime, 'error', clientIp, req.headers['user-agent']);
      
      return res.status(503).json({ 
        error: 'Service temporarily unavailable. Please try again later.',
        retryAfter: 60 
      });
    }

    // Process and clean response data
    const cleanedData = baseResponse.data.map(item => ({
      name: item.name || 'N/A',
      fname: item.fname || 'N/A',
      mobile: item.mobile || number,
      alt: item.alt || 'N/A',
      address: item.address || 'N/A',
      circle: item.circle || 'N/A',
      id: item.id || 'N/A'
    }));

    // Update usage counters
    await incrementApiUsage(apiKeyInfo.id);
    await logUsage(
      apiKeyInfo.id, 
      number, 
      Date.now() - startTime, 
      'success', 
      clientIp, 
      req.headers['user-agent']
    );

    // Return clean JSON response
    return res.status(200).json({
      success: true,
      data: cleanedData,
      meta: {
        query: number,
        results: cleanedData.length,
        processed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('API lookup error:', error.message);
    
    // Generic error responses - never expose internal details
    let statusCode = 400;
    let errorMessage = 'Bad request';
    
    if (error.message.includes('Invalid mobile number')) {
      statusCode = 400;
      errorMessage = 'Invalid mobile number format';
    } else if (error.message.includes('Rate limit')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded';
    } else if (error.message.includes('quota')) {
      statusCode = 429;
      errorMessage = 'Daily quota exceeded';
    } else if (error.message.includes('paused')) {
      statusCode = 403;
      errorMessage = 'Service temporarily suspended';
    } else if (error.message.includes('expired')) {
      statusCode = 401;
      errorMessage = 'Authentication failed';
    }

    // Log error for admin monitoring (without sensitive data)
    if (apiKeyInfo?.id) {
      await logUsage(apiKeyInfo.id, number || 'unknown', 0, 'error', clientIp || 'unknown', req.headers['user-agent']);
    }

    return res.status(statusCode).json({ 
      error: errorMessage 
    });
  }
}
