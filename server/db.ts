import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

// Configurar WebSocket para Neon DB
global.WebSocket = ws as any;

// Verificar se a URL do banco de dados está definida
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não está definida');
}

console.log('Inicializando conexão com o banco de dados PostgreSQL');

// Criar pool de conexões
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Criar cliente Drizzle ORM
export const db = drizzle(pool, { schema });

/**
 * Testa a conexão com o banco de dados
 * @returns Promise<boolean> True se a conexão foi bem-sucedida
 */
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Conexão com PostgreSQL bem-sucedida:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Erro ao conectar ao PostgreSQL:', error);
    throw error;
  }
}

/**
 * Fecha o pool de conexões
 */
export async function closePool() {
  try {
    await pool.end();
    console.log('Pool de conexões encerrado');
  } catch (error) {
    console.error('Erro ao encerrar pool de conexões:', error);
    throw error;
  }
}