import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { User } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';

// Configurar estratégia de autenticação com passport
export function configurePassport() {
  // Estratégia de login com nome de usuário e senha
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
      },
      async (username, password, done) => {
        try {
          // Buscar usuário pelo nome de usuário
          const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
          const user = result[0];
          
          if (!user) {
            console.log(`Usuário não encontrado: ${username}`);
            return done(null, false, { message: 'Usuário não encontrado' });
          }

          // Verificar senha
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            console.log(`Senha inválida para o usuário: ${username}`);
            return done(null, false, { message: 'Senha incorreta' });
          }

          console.log(`Autenticação bem-sucedida para o usuário: ${username}`);
          return done(null, user);
        } catch (err) {
          console.error('Erro na autenticação:', err);
          return done(err);
        }
      }
    )
  );

  // Serialização de usuário para a sessão - armazena apenas o ID
  passport.serializeUser((user: User, done) => {
    console.log(`Serializando usuário: ${user.id}`);
    done(null, user.id);
  });

  // Desserialização de usuário - recupera o usuário pelo ID armazenado
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Buscar usuário pelo ID
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      const user = result[0];
      
      if (!user) {
        console.log(`Usuário não encontrado na desserialização: ${id}`);
        return done(null, false);
      }
      
      console.log(`Usuário desserializado: ${user.id}`);
      done(null, user);
    } catch (err) {
      console.error('Erro na desserialização do usuário:', err);
      done(err);
    }
  });

  return passport;
}

// Middleware para verificar autenticação
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log('Verificando autenticação:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    hasSession: !!req.session,
    sessionID: req.sessionID || 'sem ID de sessão',
  });

  if (req.isAuthenticated()) {
    return next();
  }

  // Responder com erro se não estiver autenticado
  res.status(401).json({ message: 'Não autorizado' });
}

// Middleware para verificar se é administrador
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user && (req.user as User).role === 'admin') {
    return next();
  }

  // Responder com erro se não tiver permissão
  res.status(403).json({ message: 'Acesso negado' });
}