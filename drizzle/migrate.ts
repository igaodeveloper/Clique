import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

async function runMigrations() {
  console.log('🔄 Iniciando migração do banco de dados...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não definida');
  }
  
  // Criar cliente postgres
  const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
  
  try {
    // Criar cliente drizzle
    const db = drizzle(migrationClient, { schema });
    
    // Executar migração
    console.log('🛠️ Aplicando migrações...');
    
    await migrate(db, { migrationsFolder: 'migrations' });
    
    console.log('✅ Migrações aplicadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    process.exit(1);
  } finally {
    // Encerrar conexão
    await migrationClient.end();
  }
}

// Executar migração
runMigrations();