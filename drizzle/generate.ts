import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../shared/schema";

// Verificar se DATABASE_URL está definido
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL deve ser definido. Você esqueceu de provisionar um banco de dados?"
  );
}

async function main() {
  const connection = postgres(process.env.DATABASE_URL);
  const db = drizzle(connection, { schema });

  console.log("Gerando esquema do banco de dados...");
  
  // Executar push para o banco de dados (isso cria as tabelas sem precisar de migrações formais)
  // Isso é útil para desenvolvimento, mas para produção seria melhor usar migrações formais
  try {
    await db.execute(/* sql */`
      DO $$ 
      BEGIN
        -- Criar tipos de enumeração se não existem
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('user', 'admin');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role') THEN
          CREATE TYPE member_role AS ENUM ('member', 'moderator', 'admin');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
          CREATE TYPE content_type AS ENUM ('text', 'image', 'video', 'audio', 'link', 'code');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_type') THEN
          CREATE TYPE reaction_type AS ENUM ('like', 'love', 'haha', 'wow', 'sad', 'angry');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'badge_type') THEN
          CREATE TYPE badge_type AS ENUM ('engagement', 'contribution', 'creation', 'leadership', 'expertise');
        END IF;
      END $$;
    `);
  } catch (error) {
    console.error("Erro ao criar tipos:", error);
  }

  console.log("Esquema do banco de dados gerado com sucesso!");
  
  await connection.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro ao gerar esquema:", err);
  process.exit(1);
});