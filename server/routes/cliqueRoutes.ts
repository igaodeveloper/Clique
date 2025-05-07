import { Router } from 'express';
import { cliqueController } from '../controllers/cliqueController';
import { isAuthenticated } from '../auth';

const cliqueRouter = Router();

// Todas rotas requerem autenticação
cliqueRouter.use(isAuthenticated);

// Listar todos os cliques
cliqueRouter.get('/', cliqueController.getAllCliques);

// Listar cliques sugeridos
cliqueRouter.get('/suggested', cliqueController.getSuggestedCliques);

// Listar cliques do usuário
cliqueRouter.get('/user', cliqueController.getUserCliques);

// Obter clique específico com membros
cliqueRouter.get('/:id', cliqueController.getCliqueWithMembers);

// Criar novo clique
cliqueRouter.post('/', cliqueController.createClique);

// Atualizar clique
cliqueRouter.patch('/:id', cliqueController.updateClique);

// Entrar em um clique
cliqueRouter.post('/:id/join', cliqueController.joinClique);

// Sair de um clique
cliqueRouter.post('/:id/leave', cliqueController.leaveClique);

export default cliqueRouter;