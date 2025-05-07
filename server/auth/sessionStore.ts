import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { pool } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Cria store de sessão no PostgreSQL
 */
export async function createSessionStore(): Promise<session.Store> {
  console.log('Criando store de sessão no PostgreSQL');
  
  // Verificar se a tabela já existe antes de tentar criá-la
  try {
    // Primeiro verificamos se a tabela já existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'session'
      );
    `);
    
    // Se a tabela não existir, criamos
    if (!tableExists.rows[0].exists) {
      console.log('Criando tabela de sessão...');
      await pool.query(`
        CREATE TABLE "session" (
          "sid" varchar NOT NULL,
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          PRIMARY KEY ("sid")
        );
      `);
      console.log('Tabela de sessão criada com sucesso');
    } else {
      console.log('Tabela de sessão já existe');
    }
  } catch (error) {
    console.error('Erro ao verificar/criar tabela de sessão:', error);
    // Continuar mesmo se houver erro
  }
  
  const PostgresStore = connectPg(session);
  
  const store = new PostgresStore({
    pool,
    tableName: 'session',
    createTableIfMissing: false // Não tenta criar a tabela novamente
  });
  
  console.log('Store de sessão criado com sucesso');
  
  return store;
}