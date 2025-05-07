import { Request, Response } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { 
  chains, 
  chainContents, 
  insertChainSchema, 
  insertChainContentSchema,
  users,
  personas,
  cliques,
  cliqueMembers,
  reactions
} from '@shared/schema';

/**
 * Controlador para operações relacionadas a chains (threads de conteúdo)
 */
export const chainController = {
  /**
   * Obter feed de chains para o usuário
   */
  async getFeed(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      console.log(`Gerando feed para o usuário ${userId}`);
      
      // Buscar cliques dos quais o usuário é membro
      const userCliques = await db
        .select({ id: cliqueMembers.cliqueId })
        .from(cliqueMembers)
        .where(eq(cliqueMembers.userId, userId));
      
      const cliqueIds = userCliques.map(c => c.id);
      
      // Se o usuário não participa de nenhum clique, retornar feed vazio
      if (cliqueIds.length === 0) {
        console.log('Usuário não participa de nenhum clique');
        return res.json([]);
      }
      
      // Buscar chains dos cliques dos quais o usuário é membro
      const chainsQuery = db
        .select({
          chainId: chains.id,
          chainTitle: chains.title,
          chainCreatedAt: chains.createdAt,
          cliqueId: chains.cliqueId,
          cliqueName: cliques.name,
          cliqueCoverUrl: cliques.coverImageUrl,
          creatorId: chains.creatorId,
          creatorUsername: users.username,
          creatorDisplayName: users.displayName,
          creatorAvatarUrl: users.avatarUrl,
          recentUpdate: sql`MAX(${chainContents.createdAt})`.mapWith(Date)
        })
        .from(chains)
        .innerJoin(cliques, eq(chains.cliqueId, cliques.id))
        .innerJoin(users, eq(chains.creatorId, users.id))
        .innerJoin(chainContents, eq(chains.id, chainContents.chainId))
        .where(cliqueIds.length > 0 ? sql`${chains.cliqueId} IN ${cliqueIds}` : sql`1=0`)
        .groupBy(
          chains.id, 
          cliques.id, 
          users.id
        )
        .orderBy(desc(sql`recent_update`))
        .limit(20);
      
      const feedChains = await chainsQuery;
      
      // Buscar conteúdos e reações de cada chain
      const feedWithContents = await Promise.all(
        feedChains.map(async (chain) => {
          // Buscar conteúdos da chain
          const contents = await db
            .select({
              id: chainContents.id,
              chainId: chainContents.chainId,
              content: chainContents.content,
              contentType: chainContents.contentType,
              createdAt: chainContents.createdAt,
              userId: chainContents.userId,
              personaId: chainContents.personaId,
              username: users.username,
              displayName: users.displayName,
              userAvatarUrl: users.avatarUrl,
              personaName: personas.name,
              personaAvatarUrl: personas.avatarUrl
            })
            .from(chainContents)
            .innerJoin(users, eq(chainContents.userId, users.id))
            .leftJoin(personas, eq(chainContents.personaId, personas.id))
            .where(eq(chainContents.chainId, chain.chainId))
            .orderBy(chainContents.createdAt);
          
          // Para cada conteúdo, buscar reações
          const contentsWithReactions = await Promise.all(
            contents.map(async (content) => {
              const contentReactions = await db
                .select({
                  id: reactions.id,
                  type: reactions.type,
                  userId: reactions.userId,
                  username: users.username,
                  displayName: users.displayName,
                  userAvatarUrl: users.avatarUrl
                })
                .from(reactions)
                .innerJoin(users, eq(reactions.userId, users.id))
                .where(eq(reactions.chainContentId, content.id));
              
              // Verificar se o usuário atual reagiu a este conteúdo
              const userReaction = contentReactions.find(reaction => 
                reaction.userId === userId
              );
              
              return {
                id: content.id,
                chainId: content.chainId,
                content: content.content,
                contentType: content.contentType,
                createdAt: content.createdAt,
                user: {
                  id: content.userId,
                  username: content.username,
                  displayName: content.displayName,
                  avatarUrl: content.userAvatarUrl
                },
                persona: content.personaId ? {
                  id: content.personaId,
                  name: content.personaName,
                  avatarUrl: content.personaAvatarUrl
                } : null,
                reactions: contentReactions.map(r => ({
                  id: r.id,
                  type: r.type,
                  user: {
                    id: r.userId,
                    username: r.username,
                    displayName: r.displayName,
                    avatarUrl: r.userAvatarUrl
                  }
                })),
                userReaction: userReaction ? userReaction.type : null
              };
            })
          );
          
          return {
            id: chain.chainId,
            title: chain.chainTitle,
            createdAt: chain.chainCreatedAt,
            clique: {
              id: chain.cliqueId,
              name: chain.cliqueName,
              coverImageUrl: chain.cliqueCoverUrl
            },
            creator: {
              id: chain.creatorId,
              username: chain.creatorUsername,
              displayName: chain.creatorDisplayName,
              avatarUrl: chain.creatorAvatarUrl
            },
            contentsCount: contents.length,
            lastUpdate: chain.recentUpdate,
            contents: contentsWithReactions
          };
        })
      );
      
      console.log(`Feed gerado com ${feedWithContents.length} chains`);
      
      res.json(feedWithContents);
    } catch (error) {
      console.error('Erro ao gerar feed:', error);
      res.status(500).json({ message: 'Erro ao gerar feed' });
    }
  },
  
  /**
   * Criar nova chain
   */
  async createChain(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      const { cliqueId, personaId, initialContent, contentType = 'text' } = req.body;
      
      console.log(`Criando nova chain no clique ${cliqueId} pelo usuário ${userId}`);
      
      // Verificar se o usuário é membro do clique
      const membership = await db
        .select()
        .from(cliqueMembers)
        .where(
          and(
            eq(cliqueMembers.cliqueId, cliqueId),
            eq(cliqueMembers.userId, userId)
          )
        )
        .limit(1);
      
      if (membership.length === 0) {
        console.log(`Usuário ${userId} não é membro do clique ${cliqueId}`);
        return res.status(403).json({ message: 'Você precisa ser membro do clique para criar uma chain' });
      }
      
      // Validar dados da chain
      const validatedChainData = insertChainSchema.parse({
        ...req.body,
        creatorId: userId
      });
      
      // Iniciar transação
      const chainResult = await db.transaction(async (tx) => {
        // Criar chain
        const [newChain] = await tx
          .insert(chains)
          .values(validatedChainData)
          .returning();
        
        console.log(`Chain criada com sucesso: ${newChain.id}`);
        
        // Se houver conteúdo inicial, adicionar à chain
        if (initialContent) {
          const validatedContentData = insertChainContentSchema.parse({
            chainId: newChain.id,
            userId,
            personaId,
            content: initialContent,
            contentType
          });
          
          const [newContent] = await tx
            .insert(chainContents)
            .values(validatedContentData)
            .returning();
          
          console.log(`Conteúdo inicial adicionado à chain: ${newContent.id}`);
          
          return { chain: newChain, content: newContent };
        }
        
        return { chain: newChain };
      });
      
      // Buscar informações do clique
      const [cliqueInfo] = await db
        .select({
          id: cliques.id,
          name: cliques.name,
          coverImageUrl: cliques.coverImageUrl
        })
        .from(cliques)
        .where(eq(cliques.id, cliqueId));
      
      // Construir resposta
      const response = {
        id: chainResult.chain.id,
        title: chainResult.chain.title,
        createdAt: chainResult.chain.createdAt,
        clique: cliqueInfo,
        creator: {
          id: userId,
          // Estas informações seriam obtidas do banco
          username: (req.user as any).username,
          displayName: (req.user as any).displayName,
          avatarUrl: (req.user as any).avatarUrl
        },
        contentsCount: chainResult.content ? 1 : 0,
        lastUpdate: chainResult.content ? chainResult.content.createdAt : chainResult.chain.createdAt,
        contents: chainResult.content ? [
          {
            id: chainResult.content.id,
            chainId: chainResult.content.chainId,
            content: chainResult.content.content,
            contentType: chainResult.content.contentType,
            createdAt: chainResult.content.createdAt,
            user: {
              id: userId,
              username: (req.user as any).username,
              displayName: (req.user as any).displayName,
              avatarUrl: (req.user as any).avatarUrl
            },
            persona: personaId ? {
              // Aqui seria necessário obter detalhes da persona do banco
              id: personaId,
              // Estes valores são placeholders
              name: 'Persona',
              avatarUrl: null
            } : null,
            reactions: [],
            userReaction: null
          }
        ] : []
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Erro ao criar chain:', error);
      
      if (error.errors) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Erro ao criar chain' });
    }
  },
  
  /**
   * Obter chain específica com conteúdos
   */
  async getChainWithContents(req: Request, res: Response) {
    try {
      const chainId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      console.log(`Buscando chain ${chainId} com conteúdos`);
      
      // Buscar chain com informações do clique e criador
      const [chain] = await db
        .select({
          id: chains.id,
          title: chains.title,
          createdAt: chains.createdAt,
          cliqueId: chains.cliqueId,
          cliqueName: cliques.name,
          cliqueCoverUrl: cliques.coverImageUrl,
          creatorId: chains.creatorId,
          creatorUsername: users.username,
          creatorDisplayName: users.displayName,
          creatorAvatarUrl: users.avatarUrl
        })
        .from(chains)
        .innerJoin(cliques, eq(chains.cliqueId, cliques.id))
        .innerJoin(users, eq(chains.creatorId, users.id))
        .where(eq(chains.id, chainId));
      
      if (!chain) {
        console.log(`Chain ${chainId} não encontrada`);
        return res.status(404).json({ message: 'Chain não encontrada' });
      }
      
      // Verificar se o usuário tem acesso (é membro do clique)
      const isPrivate = await db
        .select({ isPrivate: cliques.isPrivate })
        .from(cliques)
        .where(eq(cliques.id, chain.cliqueId));
      
      if (isPrivate[0].isPrivate) {
        const membership = await db
          .select()
          .from(cliqueMembers)
          .where(
            and(
              eq(cliqueMembers.cliqueId, chain.cliqueId),
              eq(cliqueMembers.userId, userId)
            )
          )
          .limit(1);
        
        if (membership.length === 0) {
          console.log(`Usuário ${userId} não tem acesso à chain ${chainId}`);
          return res.status(403).json({ message: 'Você não tem acesso a esta chain' });
        }
      }
      
      // Buscar conteúdos da chain
      const contents = await db
        .select({
          id: chainContents.id,
          chainId: chainContents.chainId,
          content: chainContents.content,
          contentType: chainContents.contentType,
          createdAt: chainContents.createdAt,
          userId: chainContents.userId,
          personaId: chainContents.personaId,
          username: users.username,
          displayName: users.displayName,
          userAvatarUrl: users.avatarUrl,
          personaName: personas.name,
          personaAvatarUrl: personas.avatarUrl
        })
        .from(chainContents)
        .innerJoin(users, eq(chainContents.userId, users.id))
        .leftJoin(personas, eq(chainContents.personaId, personas.id))
        .where(eq(chainContents.chainId, chainId))
        .orderBy(chainContents.createdAt);
      
      // Para cada conteúdo, buscar reações
      const contentsWithReactions = await Promise.all(
        contents.map(async (content) => {
          const contentReactions = await db
            .select({
              id: reactions.id,
              type: reactions.type,
              userId: reactions.userId,
              username: users.username,
              displayName: users.displayName,
              userAvatarUrl: users.avatarUrl
            })
            .from(reactions)
            .innerJoin(users, eq(reactions.userId, users.id))
            .where(eq(reactions.chainContentId, content.id));
          
          // Verificar se o usuário atual reagiu a este conteúdo
          const userReaction = contentReactions.find(reaction => 
            reaction.userId === userId
          );
          
          return {
            id: content.id,
            chainId: content.chainId,
            content: content.content,
            contentType: content.contentType,
            createdAt: content.createdAt,
            user: {
              id: content.userId,
              username: content.username,
              displayName: content.displayName,
              avatarUrl: content.userAvatarUrl
            },
            persona: content.personaId ? {
              id: content.personaId,
              name: content.personaName,
              avatarUrl: content.personaAvatarUrl
            } : null,
            reactions: contentReactions.map(r => ({
              id: r.id,
              type: r.type,
              user: {
                id: r.userId,
                username: r.username,
                displayName: r.displayName,
                avatarUrl: r.userAvatarUrl
              }
            })),
            userReaction: userReaction ? userReaction.type : null
          };
        })
      );
      
      // Construir resposta final
      const response = {
        id: chain.id,
        title: chain.title,
        createdAt: chain.createdAt,
        clique: {
          id: chain.cliqueId,
          name: chain.cliqueName,
          coverImageUrl: chain.cliqueCoverUrl
        },
        creator: {
          id: chain.creatorId,
          username: chain.creatorUsername,
          displayName: chain.creatorDisplayName,
          avatarUrl: chain.creatorAvatarUrl
        },
        contentsCount: contents.length,
        lastUpdate: contents.length > 0 ? contents[contents.length - 1].createdAt : chain.createdAt,
        contents: contentsWithReactions
      };
      
      console.log(`Chain ${chainId} encontrada com ${contents.length} conteúdos`);
      
      res.json(response);
    } catch (error) {
      console.error('Erro ao buscar chain com conteúdos:', error);
      res.status(500).json({ message: 'Erro ao buscar chain' });
    }
  },
  
  /**
   * Adicionar conteúdo a uma chain
   */
  async addContentToChain(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      const chainId = parseInt(req.params.id);
      const { content, contentType = 'text', personaId } = req.body;
      
      console.log(`Adicionando conteúdo à chain ${chainId} pelo usuário ${userId}`);
      
      // Verificar se a chain existe
      const [chain] = await db
        .select({ id: chains.id, cliqueId: chains.cliqueId })
        .from(chains)
        .where(eq(chains.id, chainId));
      
      if (!chain) {
        console.log(`Chain ${chainId} não encontrada`);
        return res.status(404).json({ message: 'Chain não encontrada' });
      }
      
      // Verificar se o usuário é membro do clique
      const membership = await db
        .select()
        .from(cliqueMembers)
        .where(
          and(
            eq(cliqueMembers.cliqueId, chain.cliqueId),
            eq(cliqueMembers.userId, userId)
          )
        )
        .limit(1);
      
      if (membership.length === 0) {
        console.log(`Usuário ${userId} não é membro do clique da chain ${chainId}`);
        return res.status(403).json({ message: 'Você precisa ser membro do clique para adicionar conteúdo' });
      }
      
      // Validar dados do conteúdo
      const validatedContentData = insertChainContentSchema.parse({
        chainId,
        userId,
        personaId,
        content,
        contentType
      });
      
      // Adicionar conteúdo
      const [newContent] = await db
        .insert(chainContents)
        .values(validatedContentData)
        .returning();
      
      console.log(`Conteúdo adicionado com sucesso: ${newContent.id}`);
      
      // Buscar informações do usuário e persona (se houver)
      const [userInfo] = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl
        })
        .from(users)
        .where(eq(users.id, userId));
      
      let personaInfo = null;
      if (personaId) {
        const [persona] = await db
          .select({
            id: personas.id,
            name: personas.name,
            avatarUrl: personas.avatarUrl
          })
          .from(personas)
          .where(eq(personas.id, personaId));
        
        if (persona) {
          personaInfo = persona;
        }
      }
      
      // Construir resposta
      const response = {
        id: newContent.id,
        chainId: newContent.chainId,
        content: newContent.content,
        contentType: newContent.contentType,
        createdAt: newContent.createdAt,
        user: userInfo,
        persona: personaInfo,
        reactions: [],
        userReaction: null
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Erro ao adicionar conteúdo à chain:', error);
      
      if (error.errors) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Erro ao adicionar conteúdo à chain' });
    }
  },
  
  /**
   * Adicionar reação a um conteúdo
   */
  async addReaction(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      const contentId = parseInt(req.params.contentId);
      const { type } = req.body;
      
      console.log(`Adicionando reação do tipo ${type} ao conteúdo ${contentId} pelo usuário ${userId}`);
      
      // Verificar se o conteúdo existe
      const [content] = await db
        .select({ 
          id: chainContents.id, 
          chainId: chainContents.chainId 
        })
        .from(chainContents)
        .where(eq(chainContents.id, contentId));
      
      if (!content) {
        console.log(`Conteúdo ${contentId} não encontrado`);
        return res.status(404).json({ message: 'Conteúdo não encontrado' });
      }
      
      // Buscar a chain e o clique
      const [chainInfo] = await db
        .select({ cliqueId: chains.cliqueId })
        .from(chains)
        .where(eq(chains.id, content.chainId));
      
      if (!chainInfo) {
        console.log(`Chain ${content.chainId} não encontrada`);
        return res.status(404).json({ message: 'Chain não encontrada' });
      }
      
      // Verificar se o usuário é membro do clique
      const membership = await db
        .select()
        .from(cliqueMembers)
        .where(
          and(
            eq(cliqueMembers.cliqueId, chainInfo.cliqueId),
            eq(cliqueMembers.userId, userId)
          )
        )
        .limit(1);
      
      if (membership.length === 0) {
        console.log(`Usuário ${userId} não é membro do clique`);
        return res.status(403).json({ message: 'Você precisa ser membro do clique para reagir' });
      }
      
      // Verificar se o usuário já reagiu a este conteúdo
      const existingReaction = await db
        .select()
        .from(reactions)
        .where(
          and(
            eq(reactions.chainContentId, contentId),
            eq(reactions.userId, userId)
          )
        )
        .limit(1);
      
      if (existingReaction.length > 0) {
        // Se é a mesma reação, remover (toggle)
        if (existingReaction[0].type === type) {
          await db
            .delete(reactions)
            .where(eq(reactions.id, existingReaction[0].id));
          
          console.log(`Reação ${existingReaction[0].id} removida`);
          
          return res.json({ 
            message: 'Reação removida',
            contentId,
            type: null
          });
        }
        
        // Se é uma reação diferente, atualizar
        const [updatedReaction] = await db
          .update(reactions)
          .set({ type, updatedAt: new Date() })
          .where(eq(reactions.id, existingReaction[0].id))
          .returning();
        
        console.log(`Reação ${updatedReaction.id} atualizada para ${type}`);
        
        return res.json({
          id: updatedReaction.id,
          contentId,
          type: updatedReaction.type,
          userId
        });
      }
      
      // Adicionar nova reação
      const [newReaction] = await db
        .insert(reactions)
        .values({
          chainContentId: contentId,
          userId,
          type
        })
        .returning();
      
      console.log(`Nova reação ${newReaction.id} adicionada`);
      
      // Buscar informações do usuário
      const [userInfo] = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl
        })
        .from(users)
        .where(eq(users.id, userId));
      
      res.status(201).json({
        id: newReaction.id,
        contentId,
        type: newReaction.type,
        userId,
        user: userInfo
      });
    } catch (error) {
      console.error('Erro ao adicionar reação:', error);
      
      if (error.errors) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Erro ao adicionar reação' });
    }
  }
};