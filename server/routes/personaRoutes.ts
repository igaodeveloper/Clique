import { Router } from 'express';
import { personaController } from '../controllers/personaController';
import { isAuthenticated } from '../auth';

const personaRouter = Router();

// Todas rotas requerem autenticação
personaRouter.use(isAuthenticated);

// Obter todas as personas do usuário atual
personaRouter.get('/', personaController.getUserPersonas);

// Criar nova persona
personaRouter.post('/', personaController.createPersona);

// Obter persona específica
personaRouter.get('/:id', personaController.getPersona);

// Atualizar persona
personaRouter.patch('/:id', personaController.updatePersona);

// Excluir persona
personaRouter.delete('/:id', personaController.deletePersona);

export default personaRouter;