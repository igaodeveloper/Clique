import connectPg from 'connect-pg-simple';
import { pool } from '../db';

/**
 * Cria uma instância de store de sessão no PostgreSQL
 * 
 * @param session Módulo express-session
 * @returns Instância do store de sessão
 */
export const createSessionStore = (session: any) => {
  console.log('Criando store de sessão no PostgreSQL');
  
  // Criar a tabela de sessões se não existir
  const PgStore = connectPg(session);
  
  const sessionStore = new PgStore({ 
    pool,
    tableName: 'sessions',
    createTableIfMissing: true 
  });
  
  console.log('Store de sessão criado com sucesso');
  
  return sessionStore;
};