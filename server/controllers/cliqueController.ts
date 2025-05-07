import { Request, Response } from 'express';
import { eq, and, not, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { 
  cliques, 
  insertCliqueSchema, 
  cliqueMembers, 
  insertCliqueMemberSchema,
  users,
  personas 
} from '@shared/schema';

/**
 * Controlador para operações relacionadas a cliques (grupos)
 */
export const cliqueController = {
  /**
   * Listar todos os cliques
   */
  async getAllCliques(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      console.log('Buscando todos os cliques');
      
      // Buscar todos os cliques com contagem de membros
      const allCliques = await db.select({
        id: cliques.id,
        name: cliques.name,
        description: cliques.description,
        category: cliques.category,
        coverImageUrl: cliques.coverImageUrl,
        isPrivate: cliques.isPrivate,
        createdAt: cliques.createdAt,
        memberCount: sql`count(${cliqueMembers.id})`.mapWith(Number),
        isMember: sql`EXISTS (
          SELECT 1 
          FROM ${cliqueMembers} 
          WHERE ${cliqueMembers.cliqueId} = ${cliques.id} 
          AND ${cliqueMembers.userId} = ${userId}
        )`.mapWith(Boolean)
      })
      .from(cliques)
      .leftJoin(cliqueMembers, eq(cliques.id, cliqueMembers.cliqueId))
      .groupBy(cliques.id)
      .orderBy(sql`member_count DESC`);
      
      console.log(`${allCliques.length} cliques encontrados`);
      
      res.json(allCliques);
    } catch (error) {
      console.error('Erro ao buscar cliques:', error);
      res.status(500).json({ message: 'Erro ao buscar cliques' });
    }
  },
  
  /**
   * Buscar cliques sugeridos para o usuário
   */
  async getSuggestedCliques(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      console.log(`Buscando cliques sugeridos para o usuário ${userId}`);
      
      // Buscar IDs de cliques dos quais o usuário já é membro
      const userCliqueIds = await db
        .select({ id: cliqueMembers.cliqueId })
        .from(cliqueMembers)
        .where(eq(cliqueMembers.userId, userId));
      
      // Extrair apenas os IDs
      const userCliquesIdList = userCliqueIds.map(item => item.id);
      
      // Buscar cliques populares dos quais o usuário ainda não é membro
      const suggestedCliques = await db
        .select({
          id: cliques.id,
          name: cliques.name,
          description: cliques.description,
          category: cliques.category,
          coverImageUrl: cliques.coverImageUrl,
          memberCount: sql`count(${cliqueMembers.id})`.mapWith(Number)
        })
        .from(cliques)
        .leftJoin(cliqueMembers, eq(cliques.id, cliqueMembers.cliqueId))
        .where(userCliquesIdList.length > 0 
          ? not(inArray(cliques.id, userCliquesIdList))
          : sql`1=1`
        )
        .groupBy(cliques.id)
        .orderBy(sql`member_count DESC`)
        .limit(5);
      
      // Para cada clique sugerido, buscar alguns membros para exibição
      const result = await Promise.all(
        suggestedCliques.map(async (clique) => {
          const members = await db
            .select({
              id: users.id,
              username: users.username,
              displayName: users.displayName,
              avatarUrl: users.avatarUrl
            })
            .from(cliqueMembers)
            .innerJoin(users, eq(cliqueMembers.userId, users.id))
            .where(eq(cliqueMembers.cliqueId, clique.id))
            .limit(3);
          
          return {
            ...clique,
            members
          };
        })
      );
      
      console.log(`${result.length} cliques sugeridos encontrados`);
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar cliques sugeridos:', error);
      res.status(500).json({ message: 'Erro ao buscar cliques sugeridos' });
    }
  },
  
  /**
   * Obter cliques do usuário atual
   */
  async getUserCliques(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      console.log(`Buscando cliques do usuário ${userId}`);
      
      // Buscar todos os cliques dos quais o usuário é membro
      const userCliques = await db
        .select({
          id: cliques.id,
          name: cliques.name,
          description: cliques.description,
          category: cliques.category,
          coverImageUrl: cliques.coverImageUrl,
          isPrivate: cliques.isPrivate,
          createdAt: cliques.createdAt,
          memberCount: sql`count(distinct ${cliqueMembers.id})`.mapWith(Number),
          userRole: sql`(
            SELECT ${cliqueMembers.role} 
            FROM ${cliqueMembers} as cm
            WHERE cm.clique_id = ${cliques.id} 
            AND cm.user_id = ${userId}
            LIMIT 1
          )`
        })
        .from(cliques)
        .innerJoin(
          cliqueMembers, 
          and(
            eq(cliques.id, cliqueMembers.cliqueId),
            eq(cliqueMembers.userId, userId)
          )
        )
        .leftJoin(
          cliqueMembers.as('all_members'),
          eq(cliques.id, cliqueMembers.as('all_members').cliqueId)
        )
        .groupBy(cliques.id)
        .orderBy(cliques.createdAt);
      
      console.log(`${userCliques.length} cliques encontrados para o usuário`);
      
      res.json(userCliques);
    } catch (error) {
      console.error('Erro ao buscar cliques do usuário:', error);
      res.status(500).json({ message: 'Erro ao buscar cliques do usuário' });
    }
  },
  
  /**
   * Obter clique específico com seus membros
   */
  async getCliqueWithMembers(req: Request, res: Response) {
    try {
      const cliqueId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      console.log(`Buscando clique ${cliqueId} com seus membros`);
      
      // Verificar se o clique existe
      const [clique] = await db
        .select()
        .from(cliques)
        .where(eq(cliques.id, cliqueId));
      
      if (!clique) {
        console.log(`Clique ${cliqueId} não encontrado`);
        return res.status(404).json({ message: 'Clique não encontrado' });
      }
      
      // Verificar se o usuário é membro (se for um clique privado)
      if (clique.isPrivate) {
        const isMember = await db
          .select()
          .from(cliqueMembers)
          .where(
            and(
              eq(cliqueMembers.cliqueId, cliqueId),
              eq(cliqueMembers.userId, userId)
            )
          )
          .limit(1);
        
        if (isMember.length === 0) {
          console.log(`Usuário ${userId} não é membro do clique privado ${cliqueId}`);
          return res.status(403).json({ message: 'Acesso negado a este clique' });
        }
      }
      
      // Buscar membros do clique com seus detalhes
      const members = await db
        .select({
          id: cliqueMembers.id,
          userId: cliqueMembers.userId,
          cliqueId: cliqueMembers.cliqueId,
          personaId: cliqueMembers.personaId,
          role: cliqueMembers.role,
          joinedAt: cliqueMembers.joinedAt,
          // Informações do usuário
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          // Informações da persona
          personaName: personas.name,
          personaAvatarUrl: personas.avatarUrl
        })
        .from(cliqueMembers)
        .innerJoin(users, eq(cliqueMembers.userId, users.id))
        .leftJoin(personas, eq(cliqueMembers.personaId, personas.id))
        .where(eq(cliqueMembers.cliqueId, cliqueId));
      
      // Contar número total de membros
      const memberCount = members.length;
      
      // Construir resultado
      const result = {
        ...clique,
        memberCount,
        members: members.map(member => ({
          id: member.id,
          userId: member.userId,
          cliqueId: member.cliqueId,
          role: member.role,
          joinedAt: member.joinedAt,
          user: {
            id: member.userId,
            username: member.username,
            displayName: member.displayName,
            avatarUrl: member.avatarUrl
          },
          persona: member.personaId ? {
            id: member.personaId,
            name: member.personaName,
            avatarUrl: member.personaAvatarUrl
          } : null
        }))
      };
      
      console.log(`Clique ${cliqueId} encontrado com ${memberCount} membros`);
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar clique com membros:', error);
      res.status(500).json({ message: 'Erro ao buscar clique' });
    }
  },
  
  /**
   * Criar novo clique
   */
  async createClique(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      const personaId = req.body.personaId;
      
      console.log(`Criando novo clique pelo usuário ${userId}`);
      
      // Validar dados do clique
      const validatedData = insertCliqueSchema.parse(req.body);
      
      // Criar o clique
      const [newClique] = await db
        .insert(cliques)
        .values({
          ...validatedData,
          creatorId: userId
        })
        .returning();
      
      console.log(`Clique criado com sucesso: ${newClique.id}`);
      
      // Adicionar o criador como membro administrador
      const memberData = insertCliqueMemberSchema.parse({
        userId,
        cliqueId: newClique.id,
        personaId,
        role: 'admin'
      });
      
      const [membership] = await db
        .insert(cliqueMembers)
        .values(memberData)
        .returning();
      
      console.log(`Criador adicionado como membro administrador: ${membership.id}`);
      
      // Retornar o clique criado
      res.status(201).json({
        ...newClique,
        memberCount: 1,
        isMember: true,
        userRole: 'admin'
      });
    } catch (error) {
      console.error('Erro ao criar clique:', error);
      
      if (error.errors) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Erro ao criar clique' });
    }
  },
  
  /**
   * Atualizar clique existente
   */
  async updateClique(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      const cliqueId = parseInt(req.params.id);
      
      console.log(`Atualizando clique ${cliqueId}`);
      
      // Verificar se o usuário é administrador do clique
      const adminCheck = await db
        .select()
        .from(cliqueMembers)
        .where(
          and(
            eq(cliqueMembers.cliqueId, cliqueId),
            eq(cliqueMembers.userId, userId),
            eq(cliqueMembers.role, 'admin')
          )
        )
        .limit(1);
      
      if (adminCheck.length === 0) {
        console.log(`Usuário ${userId} não é administrador do clique ${cliqueId}`);
        return res.status(403).json({ message: 'Apenas administradores podem atualizar o clique' });
      }
      
      // Atualizar o clique
      const [updatedClique] = await db
        .update(cliques)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(cliques.id, cliqueId))
        .returning();
      
      console.log(`Clique ${cliqueId} atualizado com sucesso`);
      
      res.json(updatedClique);
    } catch (error) {
      console.error('Erro ao atualizar clique:', error);
      
      if (error.errors) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Erro ao atualizar clique' });
    }
  },
  
  /**
   * Participar de um clique
   */
  async joinClique(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      const cliqueId = parseInt(req.params.id);
      const personaId = req.body.personaId;
      
      console.log(`Usuário ${userId} tentando entrar no clique ${cliqueId}`);
      
      // Verificar se o clique existe
      const [clique] = await db
        .select()
        .from(cliques)
        .where(eq(cliques.id, cliqueId));
      
      if (!clique) {
        console.log(`Clique ${cliqueId} não encontrado`);
        return res.status(404).json({ message: 'Clique não encontrado' });
      }
      
      // Verificar se já é membro
      const existingMembership = await db
        .select()
        .from(cliqueMembers)
        .where(
          and(
            eq(cliqueMembers.cliqueId, cliqueId),
            eq(cliqueMembers.userId, userId)
          )
        )
        .limit(1);
      
      if (existingMembership.length > 0) {
        console.log(`Usuário ${userId} já é membro do clique ${cliqueId}`);
        return res.status(400).json({ message: 'Você já é membro deste clique' });
      }
      
      // Adicionar o usuário como membro
      const memberData = insertCliqueMemberSchema.parse({
        userId,
        cliqueId,
        personaId,
        role: 'member' // Papel padrão para novos membros
      });
      
      const [membership] = await db
        .insert(cliqueMembers)
        .values(memberData)
        .returning();
      
      console.log(`Usuário ${userId} entrou no clique ${cliqueId}: ${membership.id}`);
      
      res.status(201).json({
        message: 'Você entrou com sucesso no clique',
        membership
      });
    } catch (error) {
      console.error('Erro ao entrar no clique:', error);
      
      if (error.errors) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Erro ao entrar no clique' });
    }
  },
  
  /**
   * Sair de um clique
   */
  async leaveClique(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      const cliqueId = parseInt(req.params.id);
      
      console.log(`Usuário ${userId} saindo do clique ${cliqueId}`);
      
      // Verificar se é membro
      const [membership] = await db
        .select()
        .from(cliqueMembers)
        .where(
          and(
            eq(cliqueMembers.cliqueId, cliqueId),
            eq(cliqueMembers.userId, userId)
          )
        )
        .limit(1);
      
      if (!membership) {
        console.log(`Usuário ${userId} não é membro do clique ${cliqueId}`);
        return res.status(400).json({ message: 'Você não é membro deste clique' });
      }
      
      // Verificar se é o único administrador
      if (membership.role === 'admin') {
        const adminCount = await db
          .select()
          .from(cliqueMembers)
          .where(
            and(
              eq(cliqueMembers.cliqueId, cliqueId),
              eq(cliqueMembers.role, 'admin')
            )
          );
        
        if (adminCount.length === 1) {
          console.log(`Usuário ${userId} é o único administrador do clique ${cliqueId}`);
          return res.status(400).json({ 
            message: 'Você é o único administrador. Promova outro membro a administrador antes de sair.' 
          });
        }
      }
      
      // Remover membro
      await db
        .delete(cliqueMembers)
        .where(
          and(
            eq(cliqueMembers.cliqueId, cliqueId),
            eq(cliqueMembers.userId, userId)
          )
        );
      
      console.log(`Usuário ${userId} saiu do clique ${cliqueId}`);
      
      res.json({ message: 'Você saiu do clique com sucesso' });
    } catch (error) {
      console.error('Erro ao sair do clique:', error);
      res.status(500).json({ message: 'Erro ao sair do clique' });
    }
  }
};