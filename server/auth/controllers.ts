import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, insertUserSchema } from '@shared/schema';
import passport from 'passport';
import { eq } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';

/**
 * Registra um novo usuário
 */
export async function register(req: Request, res: Response) {
  try {
    console.log('Processando registro de usuário', { body: req.body });
    
    // Validar dados do usuário
    const userData = insertUserSchema.parse(req.body);
    
    // Verificar se o usuário já existe (username ou email)
    const existingUser = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(
        eq(users.username, userData.username)
      )
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log('Nome de usuário já existe:', userData.username);
      return res.status(400).json({ 
        message: 'Nome de usuário já em uso'
      });
    }
    
    // Verificar email
    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(
        eq(users.email, userData.email)
      )
      .limit(1);
    
    if (existingEmail.length > 0) {
      console.log('Email já cadastrado:', userData.email);
      return res.status(400).json({ 
        message: 'Email já cadastrado'
      });
    }
    
    // Hash da senha
    const hashedPassword = await hash(userData.password, 10);
    
    // Criar usuário
    const [createdUser] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
        createdAt: new Date()
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt
      });
    
    console.log('Usuário registrado com sucesso:', createdUser.id);
    
    // Fazer login automático do usuário
    req.login(createdUser, (err) => {
      if (err) {
        console.error('Erro ao logar após registro:', err);
        return res.status(500).json({ 
          message: 'Erro ao autenticar usuário após registro'
        });
      }
      
      console.log('Usuário autenticado após registro:', createdUser.id);
      return res.status(201).json(createdUser);
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    
    if (error.errors) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: error.errors
      });
    }
    
    res.status(500).json({ 
      message: 'Erro ao processar registro' 
    });
  }
}

/**
 * Autentica um usuário existente
 */
export function login(req: Request, res: Response, next: NextFunction) {
  console.log('Processando login de usuário', { body: req.body });
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Erro na autenticação:', err);
      return next(err);
    }
    
    if (!user) {
      console.log('Autenticação falhou:', info);
      return res.status(401).json({ 
        message: info?.message || 'Credenciais inválidas'
      });
    }
    
    // Usuário encontrado, fazer login
    req.login(user, (err) => {
      if (err) {
        console.error('Erro ao estabelecer sessão:', err);
        return next(err);
      }
      
      console.log('Usuário autenticado com sucesso:', user.id);
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      });
    });
  })(req, res, next);
}

/**
 * Encerra a sessão do usuário
 */
export function logout(req: Request, res: Response) {
  console.log('Processando logout de usuário', { userId: req.user?.id });
  
  req.logout((err) => {
    if (err) {
      console.error('Erro ao fazer logout:', err);
      return res.status(500).json({ 
        message: 'Erro ao encerrar sessão'
      });
    }
    
    console.log('Usuário deslogado com sucesso');
    res.json({ message: 'Logout realizado com sucesso' });
  });
}

/**
 * Retorna dados do usuário atual
 */
export async function getCurrentUser(req: Request, res: Response) {
  console.log('Obtendo usuário atual');
  console.log('Session:', req.session);
  console.log('Auth check:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    hasSession: !!req.session,
    sessionID: req.sessionID,
    cookies: req.headers.cookie
  });
  
  if (!req.isAuthenticated() || !req.user) {
    console.log('Usuário não autenticado');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Usuário está autenticado
  const user = req.user;
  
  console.log('Usuário atual retornado:', user.id);
  
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt
  });
}

/**
 * Verifica se o usuário tem uma sessão válida
 */
export function verifySession(req: Request, res: Response) {
  console.log('Verificando sessão');
  console.log('Session:', req.session);
  console.log('Auth check:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    hasSession: !!req.session,
    sessionID: req.sessionID,
    cookies: req.headers.cookie
  });
  
  const isValid = req.isAuthenticated() && !!req.user;
  
  res.json({
    valid: isValid,
    authenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    sessionID: req.sessionID
  });
}