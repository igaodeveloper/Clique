import { and, eq, desc, count, sql, inArray } from 'drizzle-orm';
import { db } from './db';
import {
  User, InsertUser, users,
  Persona, InsertPersona, personas,
  Clique, InsertClique, cliques,
  CliqueMember, InsertCliqueMember, cliqueMembers,
  Chain, InsertChain, chains,
  ChainContent, InsertChainContent, chainContents,
  Reaction, InsertReaction, reactions,
  Reputation, InsertReputation, reputations,
  SuggestedClique, UserWithPersonas, CliqueWithMembers, ChainWithContents
} from '@shared/schema';
import { IStorage } from './storage';
import { hash } from 'bcryptjs';
import session from 'express-session';
import { createSessionStore } from './auth/sessionStore';

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Criar store de sessão com PostgreSQL
    this.sessionStore = createSessionStore();
  }
  
  // USER OPERATIONS
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    // Criar hash de senha se ainda não foi feito
    if (!user.password.includes('.')) {
      user.password = await hash(user.password, 10);
    }
    
    const [newUser] = await db
      .insert(users)
      .values({
        ...user,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Criar persona padrão para o usuário
    await this.createPersona({
      name: newUser.displayName || newUser.username,
      userId: newUser.id,
      isDefault: true,
      bio: null,
      avatarUrl: null
    });
    
    return newUser;
  }
  
  // PERSONA OPERATIONS
  
  async createPersona(persona: InsertPersona): Promise<Persona> {
    // Se for persona padrão, desmarcar outras do mesmo usuário
    if (persona.isDefault) {
      await db
        .update(personas)
        .set({ isDefault: false })
        .where(
          and(
            eq(personas.userId, persona.userId),
            eq(personas.isDefault, true)
          )
        );
    }
    
    const [newPersona] = await db
      .insert(personas)
      .values({
        ...persona,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newPersona;
  }
  
  async getPersonasByUserId(userId: number): Promise<Persona[]> {
    return db
      .select()
      .from(personas)
      .where(eq(personas.userId, userId))
      .orderBy(desc(personas.isDefault));
  }
  
  async getPersona(id: number): Promise<Persona | undefined> {
    const [persona] = await db
      .select()
      .from(personas)
      .where(eq(personas.id, id));
    
    return persona;
  }
  
  async updatePersona(id: number, data: Partial<Persona>): Promise<Persona | undefined> {
    // Se estiver definindo como padrão, desmarcar as outras
    if (data.isDefault) {
      const [persona] = await db
        .select()
        .from(personas)
        .where(eq(personas.id, id));
      
      if (persona) {
        await db
          .update(personas)
          .set({ isDefault: false })
          .where(
            and(
              eq(personas.userId, persona.userId),
              eq(personas.isDefault, true)
            )
          );
      }
    }
    
    const [updatedPersona] = await db
      .update(personas)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(personas.id, id))
      .returning();
    
    return updatedPersona;
  }
  
  async getDefaultPersona(userId: number): Promise<Persona | undefined> {
    const [defaultPersona] = await db
      .select()
      .from(personas)
      .where(
        and(
          eq(personas.userId, userId),
          eq(personas.isDefault, true)
        )
      );
    
    return defaultPersona;
  }
  
  async getUserWithPersonas(userId: number): Promise<UserWithPersonas | undefined> {
    // Buscar usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) return undefined;
    
    // Buscar personas do usuário
    const userPersonas = await db
      .select()
      .from(personas)
      .where(eq(personas.userId, userId))
      .orderBy(desc(personas.isDefault));
    
    return {
      ...user,
      personas: userPersonas
    };
  }
  
  // CLIQUE OPERATIONS
  
  async createClique(clique: InsertClique): Promise<Clique> {
    const [newClique] = await db
      .insert(cliques)
      .values({
        ...clique,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newClique;
  }
  
  async getClique(id: number): Promise<Clique | undefined> {
    const [clique] = await db
      .select()
      .from(cliques)
      .where(eq(cliques.id, id));
    
    return clique;
  }
  
  async getCliquesByUserId(userId: number): Promise<Clique[]> {
    return db
      .select({
        clique: cliques
      })
      .from(cliqueMembers)
      .innerJoin(cliques, eq(cliqueMembers.cliqueId, cliques.id))
      .where(eq(cliqueMembers.userId, userId))
      .orderBy(desc(cliques.createdAt))
      .then(rows => rows.map(row => row.clique));
  }
  
  async getAllCliques(): Promise<Clique[]> {
    return db
      .select()
      .from(cliques)
      .orderBy(desc(cliques.createdAt));
  }
  
  async getSuggestedCliques(userId: number): Promise<SuggestedClique[]> {
    // Buscar IDs de cliques dos quais o usuário já é membro
    const userCliques = await db
      .select({ id: cliqueMembers.cliqueId })
      .from(cliqueMembers)
      .where(eq(cliqueMembers.userId, userId));
    
    const userCliqueIds = userCliques.map(c => c.id);
    
    // Buscar cliques que o usuário não é membro, com contagem de membros
    const suggestedResults = await db
      .select({
        id: cliques.id,
        name: cliques.name,
        description: cliques.description,
        category: cliques.category,
        coverImageUrl: cliques.coverImageUrl,
        memberCount: count(cliqueMembers.id).as('memberCount')
      })
      .from(cliques)
      .leftJoin(cliqueMembers, eq(cliques.id, cliqueMembers.cliqueId))
      .where(userCliqueIds.length > 0 
        ? sql`${cliques.id} NOT IN (${userCliqueIds.join(',')})` 
        : sql`1=1`
      )
      .groupBy(cliques.id)
      .orderBy(desc(sql`member_count`))
      .limit(10);
    
    // Para cada clique sugerido, buscar alguns membros
    const suggestedWithMembers = await Promise.all(
      suggestedResults.map(async clique => {
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
          .limit(5);
        
        return {
          id: clique.id,
          name: clique.name,
          description: clique.description,
          category: clique.category,
          coverImageUrl: clique.coverImageUrl,
          memberCount: Number(clique.memberCount),
          members
        };
      })
    );
    
    return suggestedWithMembers;
  }
  
  // CLIQUE MEMBERSHIP OPERATIONS
  
  async addUserToClique(membership: InsertCliqueMember): Promise<CliqueMember> {
    const [newMembership] = await db
      .insert(cliqueMembers)
      .values({
        ...membership,
        joinedAt: new Date(),
        lastActive: new Date()
      })
      .returning();
    
    return newMembership;
  }
  
  async getCliqueMembers(cliqueId: number): Promise<CliqueMember[]> {
    return db
      .select()
      .from(cliqueMembers)
      .where(eq(cliqueMembers.cliqueId, cliqueId));
  }
  
  async isUserMemberOfClique(userId: number, cliqueId: number): Promise<boolean> {
    const members = await db
      .select({ id: cliqueMembers.id })
      .from(cliqueMembers)
      .where(
        and(
          eq(cliqueMembers.userId, userId),
          eq(cliqueMembers.cliqueId, cliqueId)
        )
      )
      .limit(1);
    
    return members.length > 0;
  }
  
  async getCliqueWithMembers(cliqueId: number): Promise<CliqueWithMembers | undefined> {
    // Buscar o clique
    const [clique] = await db
      .select()
      .from(cliques)
      .where(eq(cliques.id, cliqueId));
    
    if (!clique) return undefined;
    
    // Buscar membros do clique com detalhes do usuário e persona
    const memberships = await db
      .select({
        id: cliqueMembers.id,
        userId: cliqueMembers.userId,
        cliqueId: cliqueMembers.cliqueId,
        personaId: cliqueMembers.personaId,
        role: cliqueMembers.role,
        joinedAt: cliqueMembers.joinedAt,
        lastActive: cliqueMembers.lastActive,
        username: users.username,
        displayName: users.displayName,
        userAvatarUrl: users.avatarUrl,
        personaName: personas.name,
        personaAvatarUrl: personas.avatarUrl
      })
      .from(cliqueMembers)
      .innerJoin(users, eq(cliqueMembers.userId, users.id))
      .leftJoin(personas, eq(cliqueMembers.personaId, personas.id))
      .where(eq(cliqueMembers.cliqueId, cliqueId));
    
    // Formatar resultado
    const members = memberships.map(m => ({
      id: m.id,
      userId: m.userId,
      cliqueId: m.cliqueId,
      personaId: m.personaId,
      role: m.role,
      joinedAt: m.joinedAt,
      lastActive: m.lastActive,
      user: {
        id: m.userId,
        username: m.username,
        displayName: m.displayName,
        avatarUrl: m.userAvatarUrl
      },
      persona: m.personaId ? {
        id: m.personaId,
        name: m.personaName!,
        avatarUrl: m.personaAvatarUrl
      } : null
    }));
    
    return {
      ...clique,
      members
    };
  }
  
  // CHAIN OPERATIONS
  
  async createChain(chain: InsertChain): Promise<Chain> {
    const [newChain] = await db
      .insert(chains)
      .values({
        ...chain,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newChain;
  }
  
  async getChain(id: number): Promise<Chain | undefined> {
    const [chain] = await db
      .select()
      .from(chains)
      .where(eq(chains.id, id));
    
    return chain;
  }
  
  async getChainsByCliqueId(cliqueId: number): Promise<Chain[]> {
    return db
      .select()
      .from(chains)
      .where(eq(chains.cliqueId, cliqueId))
      .orderBy(desc(chains.createdAt));
  }
  
  async getChainsByUserId(userId: number): Promise<Chain[]> {
    return db
      .select()
      .from(chains)
      .where(eq(chains.creatorId, userId))
      .orderBy(desc(chains.createdAt));
  }
  
  async getFeedForUser(userId: number): Promise<ChainWithContents[]> {
    // Obter cliques do usuário
    const userCliques = await db
      .select({ id: cliqueMembers.cliqueId })
      .from(cliqueMembers)
      .where(eq(cliqueMembers.userId, userId));
    
    const cliqueIds = userCliques.map(c => c.id);
    
    if (cliqueIds.length === 0) {
      return [];
    }
    
    // Obter chains recentes dos cliques do usuário
    const recentChains = await db
      .select()
      .from(chains)
      .where(inArray(chains.cliqueId, cliqueIds))
      .orderBy(desc(chains.updatedAt))
      .limit(20);
    
    // Para cada chain, buscar os conteúdos completos
    const chainsWithContent = await Promise.all(
      recentChains.map(async chain => 
        this.getChainWithContents(chain.id)
      )
    );
    
    // Filtrar apenas chains que possuem conteúdo
    return chainsWithContent.filter(Boolean) as ChainWithContents[];
  }
  
  // CHAIN CONTENT OPERATIONS
  
  async addContentToChain(content: InsertChainContent): Promise<ChainContent> {
    const [newContent] = await db
      .insert(chainContents)
      .values({
        ...content,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Atualizar data de atualização da chain
    await db
      .update(chains)
      .set({ updatedAt: new Date() })
      .where(eq(chains.id, content.chainId));
    
    return newContent;
  }
  
  async getChainContents(chainId: number): Promise<ChainContent[]> {
    return db
      .select()
      .from(chainContents)
      .where(eq(chainContents.chainId, chainId))
      .orderBy(chainContents.position);
  }
  
  async getChainWithContents(chainId: number): Promise<ChainWithContents | undefined> {
    // Buscar a chain
    const [chain] = await db
      .select({
        chain: chains,
        cliqueName: cliques.name,
        cliqueImageUrl: cliques.coverImageUrl
      })
      .from(chains)
      .innerJoin(cliques, eq(chains.cliqueId, cliques.id))
      .where(eq(chains.id, chainId));
    
    if (!chain) return undefined;
    
    // Buscar conteúdos da chain com detalhes do usuário e persona
    const contents = await db
      .select({
        id: chainContents.id,
        chainId: chainContents.chainId,
        content: chainContents.content,
        contentType: chainContents.contentType,
        mediaUrl: chainContents.mediaUrl,
        position: chainContents.position,
        createdAt: chainContents.createdAt,
        updatedAt: chainContents.updatedAt,
        userId: chainContents.userId,
        personaId: chainContents.personaId,
        username: users.username,
        displayName: users.displayName,
        userAvatarUrl: users.avatarUrl,
        personaName: personas.name,
        personaAvatarUrl: personas.avatarUrl,
        reactionCount: count(reactions.id).as('reactionCount')
      })
      .from(chainContents)
      .innerJoin(users, eq(chainContents.userId, users.id))
      .leftJoin(personas, eq(chainContents.personaId, personas.id))
      .leftJoin(reactions, eq(chainContents.id, reactions.chainContentId))
      .where(eq(chainContents.chainId, chainId))
      .groupBy(
        chainContents.id,
        users.id,
        personas.id
      )
      .orderBy(chainContents.position);
    
    // Para cada conteúdo, buscar as reações
    const contentsWithReactions = await Promise.all(
      contents.map(async content => {
        const contentReactions = await this.getReactionsForContent(content.id);
        
        return {
          id: content.id,
          chainId: content.chainId,
          content: content.content,
          contentType: content.contentType,
          mediaUrl: content.mediaUrl,
          position: content.position,
          createdAt: content.createdAt,
          updatedAt: content.updatedAt,
          userId: content.userId,
          personaId: content.personaId,
          user: {
            id: content.userId,
            username: content.username,
            displayName: content.displayName,
            avatarUrl: content.userAvatarUrl
          },
          persona: content.personaId ? {
            id: content.personaId,
            name: content.personaName!,
            avatarUrl: content.personaAvatarUrl
          } : null,
          reactions: contentReactions,
          reactionCount: Number(content.reactionCount)
        };
      })
    );
    
    return {
      ...chain.chain,
      contents: contentsWithReactions,
      clique: {
        id: chain.chain.cliqueId,
        name: chain.cliqueName,
        coverImageUrl: chain.cliqueImageUrl
      }
    };
  }
  
  // REPUTATION OPERATIONS
  
  async addReputation(reputation: InsertReputation): Promise<Reputation> {
    const [newReputation] = await db
      .insert(reputations)
      .values({
        ...reputation,
        awardedAt: new Date()
      })
      .returning();
    
    return newReputation;
  }
  
  async getUserReputations(userId: number): Promise<Reputation[]> {
    return db
      .select()
      .from(reputations)
      .where(eq(reputations.userId, userId))
      .orderBy(desc(reputations.awardedAt));
  }
  
  // REACTION OPERATIONS
  
  async addReaction(reaction: InsertReaction): Promise<Reaction> {
    // Verificar se já existe uma reação deste usuário neste conteúdo
    const existingReaction = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.userId, reaction.userId),
          eq(reactions.chainContentId, reaction.chainContentId)
        )
      )
      .limit(1);
    
    // Se já existir, atualizar o tipo
    if (existingReaction.length > 0) {
      const [updatedReaction] = await db
        .update(reactions)
        .set({
          type: reaction.type,
          createdAt: new Date()
        })
        .where(eq(reactions.id, existingReaction[0].id))
        .returning();
      
      return updatedReaction;
    }
    
    // Caso contrário, inserir nova reação
    const [newReaction] = await db
      .insert(reactions)
      .values({
        ...reaction,
        createdAt: new Date()
      })
      .returning();
    
    return newReaction;
  }
  
  async removeReaction(userId: number, chainContentId: number): Promise<boolean> {
    const result = await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.userId, userId),
          eq(reactions.chainContentId, chainContentId)
        )
      );
    
    return !!result;
  }
  
  async getReactionsForContent(chainContentId: number): Promise<Reaction[]> {
    return db
      .select({
        id: reactions.id,
        userId: reactions.userId,
        chainContentId: reactions.chainContentId,
        type: reactions.type,
        createdAt: reactions.createdAt,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl
      })
      .from(reactions)
      .innerJoin(users, eq(reactions.userId, users.id))
      .where(eq(reactions.chainContentId, chainContentId));
  }
}