import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../server/db';

// Função para executar migrações
async function runMigrations() {
  try {
    console.log('Iniciando migrações do banco de dados...');
    
    // Executar migrações
    await migrate(db, { migrationsFolder: 'drizzle/migrations' });
    
    console.log('Migrações concluídas com sucesso.');
    
    // Encerrar processo
    process.exit(0);
  } catch (error) {
    console.error('Erro nas migrações:', error);
    process.exit(1);
  }
}

// Executar migrações
runMigrations();