import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { compare } from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, User } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Configura o Passport com a estratégia de autenticação local
 */
export function configurePassport() {
  // Configurar estratégia de autenticação por username/password
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password'
      },
      async (username, password, done) => {
        try {
          console.log(`Tentativa de login: ${username}`);
          
          // Buscar usuário pelo username
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.username, username));
          
          // Usuário não encontrado
          if (!user) {
            console.log(`Usuário não encontrado: ${username}`);
            return done(null, false, { message: 'Usuário não encontrado' });
          }
          
          // Verificar senha
          const isValid = await compare(password, user.password);
          
          if (!isValid) {
            console.log(`Senha incorreta para usuário: ${username}`);
            return done(null, false, { message: 'Senha incorreta' });
          }
          
          // Autenticação bem-sucedida
          console.log(`Login bem-sucedido para usuário: ${username} (ID: ${user.id})`);
          return done(null, user);
        } catch (error) {
          console.error('Erro na estratégia de autenticação:', error);
          return done(error);
        }
      }
    )
  );
  
  // Serializar usuário para a sessão
  passport.serializeUser((user: User, done) => {
    console.log(`Serializando usuário para sessão: ${user.id}`);
    done(null, user.id);
  });
  
  // Deserializar usuário da sessão
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializando usuário da sessão: ${id}`);
      
      // Buscar usuário pelo ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      
      if (!user) {
        console.log(`Usuário não encontrado para ID: ${id}`);
        return done(null, false);
      }
      
      // Atualizar última atividade do usuário
      await db
        .update(users)
        .set({ 
          updatedAt: new Date()
        })
        .where(eq(users.id, id));
      
      console.log(`Usuário deserializado com sucesso: ${id}`);
      done(null, user);
    } catch (error) {
      console.error('Erro ao deserializar usuário:', error);
      done(error);
    }
  });
  
  return passport;
}

/**
 * Middleware para verificar se o usuário está autenticado
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log('Verificando autenticação');
  console.log('Auth check:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    hasSession: !!req.session,
    sessionID: req.sessionID,
    cookies: req.headers.cookie
  });
  
  if (!req.isAuthenticated()) {
    console.log('Acesso negado: usuário não autenticado');
    return res.status(401).json({ message: 'Não autorizado' });
  }
  
  next();
}

/**
 * Middleware para verificar se o usuário é administrador
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Acesso negado: usuário não autenticado');
    return res.status(401).json({ message: 'Não autorizado' });
  }
  
  const user = req.user as any;
  
  if (user.role !== 'admin') {
    console.log(`Acesso negado: usuário ${user.id} não é administrador`);
    return res.status(403).json({ message: 'Acesso negado' });
  }
  
  next();
}