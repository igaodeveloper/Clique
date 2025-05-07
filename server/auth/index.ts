import { Express } from 'express';
import session from 'express-session';
import { configurePassport, isAuthenticated, isAdmin } from './passport';
import authRouter from './routes';
import { cookies } from '../utils/cookies';
import { storage } from '../storage';

/**
 * Configura todo o sistema de autenticação
 */
export function setupAuth(app: Express): void {
  // Usar store de sessão do DatabaseStorage
  const sessionStore = storage.sessionStore;

  // Configurar sessão
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'cliquechain-secret-key',
      name: 'connect.sid',
      resave: false,
      saveUninitialized: true,
      rolling: true,
      cookie: cookies.getSessionOptions()
    })
  );

  // Inicializar Passport
  const passport = configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // Registrar rotas de autenticação
  app.use('/api/auth', authRouter);
}

// Exportar middlewares de autenticação
export { isAuthenticated, isAdmin };

// Exportar controladores
export * from './controllers';