// lib/db.js - Database connection and schema management
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

/**
 * Initialize database schema and default admin user
 * This runs only once during deployment
 */
export async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');
    
    // Create API Keys table
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        api_key VARCHAR(64) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE,
        is_paused BOOLEAN DEFAULT FALSE,
        daily_limit INTEGER DEFAULT 1000,
        daily_used INTEGER DEFAULT 0,
        last_reset_date DATE DEFAULT CURRENT_DATE
      );
    `;

    // Create Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_password_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      );
    `;

    // Create API Usage Logs table
    await sql`
      CREATE TABLE IF NOT EXISTS api_usage_logs (
        id SERIAL PRIMARY KEY,
        api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
        mobile_number VARCHAR(10),
        response_time INTEGER,
        status VARCHAR(20),
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key_id ON api_usage_logs(api_key_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON api_usage_logs(created_at);`;

    // Check if default admin exists
    const existingAdmin = await sql`
      SELECT id FROM users WHERE username = ${process.env.ADMIN_USERNAME}
    `;
    
    if (existingAdmin.rowCount === 0) {
      // Create default admin user
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      
      await sql`
        INSERT INTO users (username, password_hash, last_password_change)
        VALUES (${process.env.ADMIN_USERNAME}, ${hashedPassword}, CURRENT_TIMESTAMP)
      `;
      
      console.log(`Default admin created: ${process.env.ADMIN_USERNAME}`);
      console.log(`Default password: ${defaultPassword} (CHANGE IMMEDIATELY)`);
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Database connection wrapper
 */
export async function query(sqlQuery, params = []) {
  try {
    const result = await sql`${sqlQuery} ${sql(params)}`;
    return result;
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get API key by hash (without exposing the actual key)
 */
export async function getApiKey(keyHash) {
  const result = await sql`
    SELECT 
      ak.id,
      ak.user_id,
      ak.expires_at,
      ak.is_paused,
      ak.daily_limit,
      ak.daily_used,
      ak.last_reset_date,
      u.username
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    WHERE ak.key_hash = ${keyHash}
  `;
  
  return result.rows[0];
}

/**
 * Update daily usage count
 */
export async function incrementApiUsage(apiKeyId) {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if we need to reset daily counter
  const keyInfo = await sql`SELECT last_reset_date FROM api_keys WHERE id = ${apiKeyId}`;
  
  if (keyInfo.rows[0]?.last_reset_date !== today) {
    await sql`
      UPDATE api_keys 
      SET daily_used = 1, last_reset_date = ${today} 
      WHERE id = ${apiKeyId}
    `;
  } else {
    await sql`
      UPDATE api_keys 
      SET daily_used = daily_used + 1 
      WHERE id = ${apiKeyId}
    `;
  }
}

/**
 * Log API usage
 */
export async function logUsage(apiKeyId, mobileNumber, responseTime, status, ip, userAgent) {
  await sql`
    INSERT INTO api_usage_logs (
      api_key_id, 
      mobile_number, 
      response_time, 
      status, 
      ip_address, 
      user_agent
    )
    VALUES (${apiKeyId}, ${mobileNumber}, ${responseTime}, ${status}, ${ip}, ${userAgent})
  `;
}
