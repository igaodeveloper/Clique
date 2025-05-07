import { Store } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db';

// Criar instância do Store PostgreSQL para sessões
export const createSessionStore = (session: any) => {
  const PostgresStore = connectPgSimple(session);
  
  // Inicializar armazenamento de sessão
  return new PostgresStore({
    pool,
    tableName: 'sessions', // Nome da tabela de sessões
    createTableIfMissing: true, // Criar tabela se não existir
    schemaName: 'public', // Esquema do PostgreSQL
    pruneSessionInterval: 60 * 15, // Limpar sessões expiradas a cada 15 minutos
  });
};