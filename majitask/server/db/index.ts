import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

config();

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
}

const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'majitask_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'majitask',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
};

// Create connection pool
export const pool = mysql.createPool(dbConfig);

/**
 * Execute a query with optional parameters and timing logging
 */
export async function query<T extends RowDataPacket>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const startTime = Date.now();
  const label = `Query-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.time(label);
    const [rows] = await pool.execute<T[]>(sql, params);
    const duration = Date.now() - startTime;
    
    // Log slow queries (>300ms)
    if (duration > 300) {
      console.warn(`🐌 Slow query detected (${duration}ms):`, {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        params: params?.slice(0, 3),
        duration
      });
    }
    
    return rows;
  } catch (error) {
    console.error('Database query error:', {
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      params: params?.slice(0, 3),
      error: error instanceof Error ? error.message : error
    });
    throw error;
  } finally {
    console.timeEnd(label);
  }
}

/**
 * Execute multiple queries within a transaction
 */
export async function transaction<T>(
  fn: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Execute a query within an existing connection (for transactions)
 */
export async function queryWithConnection<T extends RowDataPacket>(
  connection: mysql.PoolConnection,
  sql: string,
  params?: any[]
): Promise<T[]> {
  const startTime = Date.now();
  const label = `TxQuery-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.time(label);
    const [rows] = await connection.execute<T[]>(sql, params);
    const duration = Date.now() - startTime;
    
    if (duration > 300) {
      console.warn(`🐌 Slow transaction query (${duration}ms):`, {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        params: params?.slice(0, 3),
        duration
      });
    }
    
    return rows;
  } catch (error) {
    console.error('Transaction query error:', {
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      params: params?.slice(0, 3),
      error: error instanceof Error ? error.message : error
    });
    throw error;
  } finally {
    console.timeEnd(label);
  }
}

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal: string) => {
  console.log(`📡 Received ${signal}. Gracefully shutting down database connections...`);
  
  try {
    await pool.end();
    console.log('✅ Database pool closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default { pool, query, transaction, queryWithConnection };
