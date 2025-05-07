import { Router } from 'express';
import { chainController } from '../controllers/chainController';
import { isAuthenticated } from '../auth';

const chainRouter = Router();

// Todas rotas requerem autenticação
chainRouter.use(isAuthenticated);

// Obter feed de chains para o usuário
chainRouter.get('/feed', chainController.getFeed);

// Criar nova chain
chainRouter.post('/', chainController.createChain);

// Obter chain específica com conteúdos
chainRouter.get('/:id', chainController.getChainWithContents);

// Adicionar conteúdo a uma chain
chainRouter.post('/:id/content', chainController.addContentToChain);

// Adicionar reação a um conteúdo
chainRouter.post('/content/:contentId/reaction', chainController.addReaction);

export default chainRouter;