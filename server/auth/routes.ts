import { Router } from 'express';
import { register, login, logout, getCurrentUser, verifySession } from './controllers';
import { isAuthenticated } from './passport';

const authRouter = Router();

// Rota de registro
authRouter.post('/register', register);

// Rota de login
authRouter.post('/login', login);

// Rota de logout
authRouter.post('/logout', logout);

// Rota para obter usuário atual
authRouter.get('/me', isAuthenticated, getCurrentUser);

// Rota para verificar sessão
authRouter.get('/verify', verifySession);

export default authRouter;;