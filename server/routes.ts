import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { setupAuth } from './auth';
import personaRouter from './routes/personaRoutes';
import cliqueRouter from './routes/cliqueRoutes';
import chainRouter from './routes/chainRoutes';
import { testConnection } from './db';

export async function registerRoutes(app: Express): Promise<Server> {
  // Testar conexão com o banco de dados
  try {
    await testConnection();
    console.log('Conexão com o banco de dados estabelecida');
  } catch (error) {
    console.error('Falha ao conectar ao banco de dados:', error);
  }

  // Configurar autenticação
  await setupAuth(app);

  // Middleware de log para requisições
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Registrar rotas da API
  app.use('/api/personas', personaRouter);
  app.use('/api/cliques', cliqueRouter);
  app.use('/api/chains', chainRouter);

  // Rota de status da API
  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({ status: 'online', time: new Date().toISOString() });
  });

  // Criar servidor HTTP
  const httpServer = createServer(app);

  // Configurar WebSocket para comunicação em tempo real
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Mapeamento de conexões por usuário
  const connectedClients = new Map<number, Set<WebSocket>>();
  
  // Mapeamento de conexões por clique (sala)
  const cliqueRooms = new Map<number, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket, req: Request) => {
    console.log('Nova conexão WebSocket estabelecida');

    // Processar mensagens recebidas
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('Mensagem WebSocket recebida:', data);

        // Autenticação WebSocket
        if (data.type === 'auth') {
          const userId = data.userId;
          if (userId) {
            // Registrar cliente no mapa de conexões
            if (!connectedClients.has(userId)) {
              connectedClients.set(userId, new Set());
            }
            connectedClients.get(userId)?.add(ws);
            
            ws.send(JSON.stringify({
              type: 'auth_success',
              message: 'Autenticado com sucesso'
            }));
            
            console.log(`Cliente ${userId} autenticado via WebSocket`);
          }
        }
        
        // Entrar em uma sala (clique)
        else if (data.type === 'join_room') {
          const cliqueId = data.cliqueId;
          if (cliqueId) {
            // Registrar cliente na sala
            if (!cliqueRooms.has(cliqueId)) {
              cliqueRooms.set(cliqueId, new Set());
            }
            cliqueRooms.get(cliqueId)?.add(ws);
            
            // Número de usuários na sala
            const membersCount = cliqueRooms.get(cliqueId)?.size || 0;
            
            ws.send(JSON.stringify({
              type: 'room_joined',
              cliqueId,
              membersCount
            }));
            
            // Notificar outros membros da sala
            broadcastToClique(cliqueId, {
              type: 'member_joined',
              cliqueId,
              membersCount
            }, ws);
            
            console.log(`Cliente entrou na sala ${cliqueId}, total: ${membersCount}`);
          }
        }
        
        // Enviar indicador de digitação
        else if (data.type === 'typing') {
          const { cliqueId, userId, isTyping } = data;
          if (cliqueId) {
            broadcastToClique(cliqueId, {
              type: 'user_typing',
              userId,
              isTyping
            }, ws);
          }
        }
        
        // Mensagem de chat em tempo real
        else if (data.type === 'chat_message') {
          const { cliqueId, message, userId, personaId } = data;
          if (cliqueId && message) {
            // Aqui você pode salvar a mensagem no banco se necessário
            
            // Enviar mensagem para todos na sala
            broadcastToClique(cliqueId, {
              type: 'new_message',
              userId,
              personaId,
              message,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Erro ao processar mensagem' 
        }));
      }
    });

    // Gerenciar desconexão
    ws.on('close', () => {
      console.log('Conexão WebSocket encerrada');
      
      // Remover cliente de todas as listas
      connectedClients.forEach((clients, userId) => {
        if (clients.has(ws)) {
          clients.delete(ws);
          if (clients.size === 0) {
            connectedClients.delete(userId);
          }
          console.log(`Cliente ${userId} desconectado`);
        }
      });
      
      // Remover das salas
      cliqueRooms.forEach((clients, cliqueId) => {
        if (clients.has(ws)) {
          clients.delete(ws);
          
          // Atualizar contagem para os membros restantes
          const membersCount = clients.size;
          
          if (membersCount === 0) {
            cliqueRooms.delete(cliqueId);
          } else {
            broadcastToClique(cliqueId, {
              type: 'member_left',
              cliqueId,
              membersCount
            });
          }
          
          console.log(`Cliente saiu da sala ${cliqueId}, restantes: ${membersCount}`);
        }
      });
    });
  });
  
  // Função para enviar mensagem para todos os clientes em um clique
  const broadcastToClique = (cliqueId: number, data: any, excludeClient?: WebSocket) => {
    const clients = cliqueRooms.get(cliqueId);
    
    if (clients) {
      clients.forEach(client => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  };

  return httpServer;
}