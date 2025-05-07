import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { generateMigration } from 'drizzle-kit';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import { resolve } from 'path';

async function main() {
  console.log('🔄 Gerando migração do banco de dados...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não definida');
  }
  
  const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient, { schema });
  
  try {
    // Gerar migrações
    const migrationsFolder = resolve('./migrations');
    
    console.log(`📁 Pasta de migrações: ${migrationsFolder}`);
    console.log('📝 Gerando arquivos de migração...');
    
    // Gerar SQL para criação do schema
    const result = await generateMigration({
      db, 
      schema, 
      out: migrationsFolder,
      migrationsFolder: migrationsFolder,
      breakpoints: false
    });
    
    console.log('✅ Migração gerada com sucesso!', result);
  } catch (error) {
    console.error('❌ Erro durante geração de migração:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

main();