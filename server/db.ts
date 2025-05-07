import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configurar WebSockets para conexão Neon
neonConfig.webSocketConstructor = ws;

// Verificar se DATABASE_URL está definido
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL deve ser definido. Você esqueceu de provisionar um banco de dados?"
  );
}

// Criar pool de conexões
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // máximo de conexões
  idleTimeoutMillis: 30000, // tempo limite para conexões ociosas
  connectionTimeoutMillis: 5000 // tempo limite para tentativas de conexão
});

// Instância do Drizzle ORM
export const db = drizzle(pool, { schema });

// Função para testar a conexão com o banco
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Conexão com o banco de dados bem-sucedida:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
    return false;
  }
}

// Função para encerrar a conexão com o pool
export async function closePool() {
  await pool.end();
}

// Registrar manipulador para encerrar conexões ao finalizar o processo
process.on('SIGINT', async () => {
  console.log('Fechando conexões com o banco de dados...');
  await closePool();
  process.exit(0);
});