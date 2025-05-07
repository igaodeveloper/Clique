import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, insertUserSchema, personas } from '@shared/schema';
import { cookies } from '../utils/cookies';

// Cadastro de novo usuário
export async function register(req: Request, res: Response) {
  try {
    console.log('Solicitação de registro recebida:', {
      username: req.body.username,
      email: req.body.email,
    });

    // Validar dados de entrada
    const validatedData = insertUserSchema.parse(req.body);

    // Verificar se o nome de usuário já existe
    const existingUsername = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1);

    if (existingUsername.length > 0) {
      console.log(`Nome de usuário já existe: ${validatedData.username}`);
      return res.status(400).json({ 
        message: 'Nome de usuário já existe',
        field: 'username'
      });
    }

    // Verificar se o email já existe
    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingEmail.length > 0) {
      console.log(`Email já existe: ${validatedData.email}`);
      return res.status(400).json({
        message: 'Email já existe',
        field: 'email'
      });
    }

    // Gerar hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(validatedData.password, salt);

    // Inserir usuário no banco
    const [newUser] = await db
      .insert(users)
      .values({
        ...validatedData,
        password: hashedPassword,
        role: 'user',
        verified: false,
        updatedAt: new Date(),
      })
      .returning();

    console.log(`Usuário criado com sucesso: ${newUser.id}`);

    // Criar persona padrão para o usuário
    const [defaultPersona] = await db
      .insert(personas)
      .values({
        userId: newUser.id,
        name: newUser.displayName,
        bio: `Persona padrão de ${newUser.displayName}`,
        isDefault: true,
        updatedAt: new Date(),
      })
      .returning();

    console.log(`Persona padrão criada: ${defaultPersona.id}`);

    // Login automático após registro
    req.login(newUser, (err) => {
      if (err) {
        console.error('Erro no login automático após registro:', err);
        return res.status(500).json({ message: 'Erro no login após registro' });
      }

      // Remover campo de senha da resposta
      const { password, ...userWithoutPassword } = newUser;
      
      // Responder com sucesso e dados do usuário
      return res.status(201).json({
        ...userWithoutPassword,
        personas: [defaultPersona],
      });
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    
    if (error.errors) {
      // Erro de validação
      return res.status(400).json({
        message: 'Dados de registro inválidos',
        errors: error.errors,
      });
    }
    
    // Erro interno
    res.status(500).json({ message: 'Erro no servidor durante registro' });
  }
}

// Login de usuário
export function login(req: Request, res: Response, next: NextFunction) {
  console.log('Solicitação de login recebida:', {
    username: req.body.username,
  });

  passport.authenticate('local', async (err, user, info) => {
    if (err) {
      console.error('Erro na autenticação:', err);
      return next(err);
    }

    if (!user) {
      console.log('Login falhou:', info?.message);
      return res.status(401).json({ message: info?.message || 'Login falhou' });
    }

    console.log('Autenticação bem-sucedida para:', user.username);

    req.login(user, async (err) => {
      if (err) {
        console.error('Erro no login:', err);
        return next(err);
      }

      try {
        // Atualizar último acesso
        await db
          .update(users)
          .set({ lastSeen: new Date() })
          .where(eq(users.id, user.id));

        // Buscar personas do usuário
        const userPersonas = await db
          .select()
          .from(personas)
          .where(eq(personas.userId, user.id));

        // Remover campo de senha
        const { password, ...userWithoutPassword } = user;

        console.log('Login bem-sucedido. Sessão ID:', req.sessionID);

        // Responder com dados do usuário
        return res.json({
          ...userWithoutPassword,
          personas: userPersonas,
        });
      } catch (error) {
        console.error('Erro ao buscar dados adicionais do usuário:', error);
        
        // Ainda retorna o usuário básico mesmo se houver erro nas informações adicionais
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      }
    });
  })(req, res, next);
}

// Logout de usuário
export function logout(req: Request, res: Response) {
  console.log('Solicitação de logout recebida. Sessão ID:', req.sessionID);

  if (req.session) {
    const sessionId = req.sessionID;
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Erro ao destruir sessão:', err);
        return res.status(500).json({ message: 'Erro ao fazer logout' });
      }

      // Limpar cookie
      cookies.clearSession(res);
      
      console.log(`Sessão ${sessionId} destruída com sucesso`);
      res.status(200).json({ message: 'Logout realizado com sucesso' });
    });
  } else {
    console.log('Nenhuma sessão para destruir');
    res.status(200).json({ message: 'Nenhuma sessão ativa' });
  }
}

// Obter usuário atual
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      console.log('Tentativa de acesso a usuário atual sem autenticação');
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const userId = (req.user as any).id;
    console.log(`Buscando informações do usuário atual: ${userId}`);

    // Buscar personas do usuário
    const userPersonas = await db
      .select()
      .from(personas)
      .where(eq(personas.userId, userId));

    // Remover campo de senha da resposta
    const { password, ...userWithoutPassword } = req.user as any;
    
    console.log(`Informações do usuário ${userId} recuperadas com sucesso`);
    
    // Responder com dados do usuário
    res.json({
      ...userWithoutPassword,
      personas: userPersonas,
    });
  } catch (error) {
    console.error('Erro ao buscar usuário atual:', error);
    res.status(500).json({ message: 'Erro ao buscar dados do usuário' });
  }
}