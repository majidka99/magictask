import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'majitask',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Typed query wrapper with slow query logging
export const query = async <T = any>(
  sql: string, 
  params?: any[]
): Promise<T[]> => {
  const queryId = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.time(queryId);
  const startTime = Date.now();
  
  try {
    const [rows] = await pool.execute(sql, params);
    const duration = Date.now() - startTime;
    
    console.timeEnd(queryId);
    
    // Log slow queries (>300ms)
    if (duration > 300) {
      console.warn(`🐌 Slow query detected (${duration}ms):`, {
        sql: sql.replace(/\s+/g, ' ').trim(),
        params,
        duration: `${duration}ms`
      });
    }
    
    return rows as T[];
  } catch (error) {
    console.timeEnd(queryId);
    console.error('❌ Database query error:', {
      sql: sql.replace(/\s+/g, ' ').trim(),
      params,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
};

// Get a single row result
export const queryOne = async <T = any>(
  sql: string, 
  params?: any[]
): Promise<T | null> => {
  const results = await query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
};

// Execute transaction
export const transaction = async <T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Health check function
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    connections: number;
    responseTime: number;
    error?: string;
  };
}> => {
  const startTime = Date.now();
  
  try {
    await query('SELECT 1 as health');
    const responseTime = Date.now() - startTime;
    
    const [stats] = await query(`
      SHOW STATUS WHERE 
      Variable_name = 'Threads_connected' OR 
      Variable_name = 'Max_used_connections'
    `);
    
    return {
      status: 'healthy',
      details: {
        connections: parseInt((stats as any)?.Value || '0'),
        responseTime
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connections: 0,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (): Promise<void> => {
  console.log('📦 Closing database connection pool...');
  
  try {
    await pool.end();
    console.log('✅ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
  
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

export default pool;
