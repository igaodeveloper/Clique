import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { pool } from '../db';

/**
 * Cria store de sessão no PostgreSQL
 */
export function createSessionStore(): session.Store {
  console.log('Criando store de sessão no PostgreSQL');
  
  const PostgresStore = connectPg(session);
  
  const store = new PostgresStore({
    pool,
    tableName: 'session', // Nome padrão da tabela
    createTableIfMissing: true,
  });
  
  console.log('Store de sessão criado com sucesso');
  
  return store;
}