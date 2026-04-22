import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Use Supabase database (from DATABASE_URL)
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.includes('undefined')) {
  throw new Error(
    "DATABASE_URL must be set. Please configure your Supabase connection string.",
  );
}

// Log connection attempt (without sensitive info)
console.log('Connecting to Supabase database...', databaseUrl.split('@')[1] || 'host info not found');

// Use postgres-js with the connection string directly
// This handles URL encoding/decoding automatically
// Configure connection pooling for better performance
const isSupabase = databaseUrl.includes('supabase');
const client = postgres(databaseUrl, {
  ssl: isSupabase ? { rejectUnauthorized: false } : false, // SSL required for Supabase
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 30, // Close idle connections after 30 seconds
  connect_timeout: 30, // Connection timeout increased for initial connection
  prepare: false // Supabase pooler doesn't support prepared statements
});

export const db = drizzle(client, { schema });
