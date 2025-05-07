import {
  users, type User, type InsertUser,
  personas, type Persona, type InsertPersona,
  cliques, type Clique, type InsertClique,
  cliqueMembers, type CliqueMember, type InsertCliqueMember,
  chains, type Chain, type InsertChain,
  chainContents, type ChainContent, type InsertChainContent,
  reputations, type Reputation, type InsertReputation,
  reactions, type Reaction, type InsertReaction,
  type UserWithPersonas, type CliqueWithMembers, type ChainWithContents, type SuggestedClique
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Persona operations
  createPersona(persona: InsertPersona): Promise<Persona>;
  getPersonasByUserId(userId: number): Promise<Persona[]>;
  getPersona(id: number): Promise<Persona | undefined>;
  updatePersona(id: number, data: Partial<Persona>): Promise<Persona | undefined>;
  getDefaultPersona(userId: number): Promise<Persona | undefined>;
  getUserWithPersonas(userId: number): Promise<UserWithPersonas | undefined>;
  
  // Clique operations
  createClique(clique: InsertClique): Promise<Clique>;
  getClique(id: number): Promise<Clique | undefined>;
  getCliquesByUserId(userId: number): Promise<Clique[]>;
  getAllCliques(): Promise<Clique[]>;
  getSuggestedCliques(userId: number): Promise<SuggestedClique[]>;
  
  // Clique membership operations
  addUserToClique(membership: InsertCliqueMember): Promise<CliqueMember>;
  getCliqueMembers(cliqueId: number): Promise<CliqueMember[]>;
  isUserMemberOfClique(userId: number, cliqueId: number): Promise<boolean>;
  getCliqueWithMembers(cliqueId: number): Promise<CliqueWithMembers | undefined>;
  
  // Chain operations
  createChain(chain: InsertChain): Promise<Chain>;
  getChain(id: number): Promise<Chain | undefined>;
  getChainsByCliqueId(cliqueId: number): Promise<Chain[]>;
  getChainsByUserId(userId: number): Promise<Chain[]>;
  getFeedForUser(userId: number): Promise<ChainWithContents[]>;
  
  // Chain content operations
  addContentToChain(content: InsertChainContent): Promise<ChainContent>;
  getChainContents(chainId: number): Promise<ChainContent[]>;
  getChainWithContents(chainId: number): Promise<ChainWithContents | undefined>;
  
  // Reputation operations
  addReputation(reputation: InsertReputation): Promise<Reputation>;
  getUserReputations(userId: number): Promise<Reputation[]>;
  
  // Reaction operations
  addReaction(reaction: InsertReaction): Promise<Reaction>;
  removeReaction(userId: number, chainContentId: number): Promise<boolean>;
  getReactionsForContent(chainContentId: number): Promise<Reaction[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private personas: Map<number, Persona>;
  private cliques: Map<number, Clique>;
  private cliqueMembers: Map<number, CliqueMember>;
  private chains: Map<number, Chain>;
  private chainContents: Map<number, ChainContent>;
  private reputations: Map<number, Reputation>;
  private reactions: Map<number, Reaction>;
  
  private userIdCounter: number;
  private personaIdCounter: number;
  private cliqueIdCounter: number;
  private cliqueMemberIdCounter: number;
  private chainIdCounter: number;
  private chainContentIdCounter: number;
  private reputationIdCounter: number;
  private reactionIdCounter: number;
  
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.personas = new Map();
    this.cliques = new Map();
    this.cliqueMembers = new Map();
    this.chains = new Map();
    this.chainContents = new Map();
    this.reputations = new Map();
    this.reactions = new Map();
    
    this.userIdCounter = 1;
    this.personaIdCounter = 1;
    this.cliqueIdCounter = 1;
    this.cliqueMemberIdCounter = 1;
    this.chainIdCounter = 1;
    this.chainContentIdCounter = 1;
    this.reputationIdCounter = 1;
    this.reactionIdCounter = 1;
    
    // Criar MemoryStore para sessões
    const MemoryStore = require('memorystore')(require('express-session'));
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 horas
    });
    
    // Initialize with sample data for development and testing
    this.initSampleData();
  }

  private initSampleData() {
    // Create a demo user for testing
    const demoUser: InsertUser = {
      username: "demo",
      email: "demo@example.com",
      // Hash correto para 'password123'
      password: "$2b$10$Kk1giib6vurdNlHIS2MGQu33MjM1voT93oUK6bPYkGv0FczJApL5q", // password123
      displayName: "Demo User",
      bio: "Este é um usuário de demonstração para testes"
    };
    
    this.createUser(demoUser).then(user => {
      // Create a demo clique
      this.createClique({
        name: "Clique de Demonstração",
        description: "Este é um clique criado para demonstrar a funcionalidade do aplicativo",
        isPrivate: false,
        category: "Demo",
        creatorId: user.id,
        coverImageUrl: ""
      }).then(clique => {
        // Create a demo chain in the clique
        this.createChain({
          title: "Como usar o CliqueChain",
          cliqueId: clique.id,
          creatorId: user.id,
          personaId: null
        }).then(chain => {
          // Add content to the chain
          this.addContentToChain({
            chainId: chain.id,
            userId: user.id,
            personaId: null,
            content: "Bem-vindo ao CliqueChain! Esta é uma plataforma para conectar pessoas com interesses semelhantes.",
            contentType: "text",
            mediaUrl: null,
            position: 0
          });
        });
      });
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    
    // Garantir que bio e avatarUrl são null e não undefined
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now,
      bio: insertUser.bio || null,
      avatarUrl: insertUser.avatarUrl || null
    };
    
    this.users.set(id, user);
    
    // Create a default persona for the user
    const defaultPersona: InsertPersona = {
      userId: id,
      name: `${insertUser.displayName} Padrão`,
      bio: "Versão completa para todos os Cliques",
      avatarUrl: insertUser.avatarUrl || null,
      isDefault: true,
    };
    await this.createPersona(defaultPersona);
    
    return user;
  }

  // Persona operations
  async createPersona(insertPersona: InsertPersona): Promise<Persona> {
    const id = this.personaIdCounter++;
    const now = new Date();
    
    // Garantir que os campos opcionais são null e não undefined
    const persona: Persona = { 
      ...insertPersona, 
      id, 
      createdAt: now,
      bio: insertPersona.bio || null,
      avatarUrl: insertPersona.avatarUrl || null,
      isDefault: insertPersona.isDefault ?? false
    };
    
    // If this is a default persona, ensure no other persona for this user is default
    if (persona.isDefault) {
      // Usar Array.from para iterar o Map de forma segura
      Array.from(this.personas.entries()).forEach(([personaId, existingPersona]) => {
        if (existingPersona.userId === persona.userId && existingPersona.isDefault) {
          existingPersona.isDefault = false;
          this.personas.set(personaId, existingPersona);
        }
      });
    }
    
    this.personas.set(id, persona);
    return persona;
  }

  async getPersonasByUserId(userId: number): Promise<Persona[]> {
    return Array.from(this.personas.values()).filter(
      (persona) => persona.userId === userId,
    );
  }

  async getPersona(id: number): Promise<Persona | undefined> {
    return this.personas.get(id);
  }

  async updatePersona(id: number, data: Partial<Persona>): Promise<Persona | undefined> {
    const persona = this.personas.get(id);
    if (!persona) return undefined;
    
    const updatedPersona = { ...persona, ...data };
    
    // If making this persona default, update other personas
    if (data.isDefault) {
      // Usar Array.from para iterar sobre o Map de forma segura
      Array.from(this.personas.entries()).forEach(([personaId, existingPersona]) => {
        if (existingPersona.userId === persona.userId && existingPersona.id !== id && existingPersona.isDefault) {
          existingPersona.isDefault = false;
          this.personas.set(personaId, existingPersona);
        }
      });
    }
    
    this.personas.set(id, updatedPersona);
    return updatedPersona;
  }

  async getDefaultPersona(userId: number): Promise<Persona | undefined> {
    return Array.from(this.personas.values()).find(
      (persona) => persona.userId === userId && persona.isDefault,
    );
  }

  async getUserWithPersonas(userId: number): Promise<UserWithPersonas | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const personas = await this.getPersonasByUserId(userId);
    return { ...user, personas };
  }

  // Clique operations
  async createClique(insertClique: InsertClique): Promise<Clique> {
    const id = this.cliqueIdCounter++;
    const now = new Date();
    
    // Garantir que campos opcionais são null e não undefined
    const clique: Clique = { 
      ...insertClique, 
      id, 
      createdAt: now, 
      memberCount: 1,
      description: insertClique.description || null,
      coverImageUrl: insertClique.coverImageUrl || null,
      category: insertClique.category || null,
      isPrivate: insertClique.isPrivate ?? false
    };
    
    this.cliques.set(id, clique);
    
    // Add creator as a member
    const defaultPersona = await this.getDefaultPersona(insertClique.creatorId);
    await this.addUserToClique({
      cliqueId: id,
      userId: insertClique.creatorId,
      role: "admin",
      personaId: defaultPersona?.id || null,
    });
    
    return clique;
  }

  async getClique(id: number): Promise<Clique | undefined> {
    return this.cliques.get(id);
  }

  async getCliquesByUserId(userId: number): Promise<Clique[]> {
    const memberships = Array.from(this.cliqueMembers.values()).filter(
      (member) => member.userId === userId
    );
    
    return memberships.map(membership => 
      this.cliques.get(membership.cliqueId)
    ).filter((clique): clique is Clique => clique !== undefined);
  }

  async getAllCliques(): Promise<Clique[]> {
    return Array.from(this.cliques.values());
  }

  async getSuggestedCliques(userId: number): Promise<SuggestedClique[]> {
    // In a real app, we would use an algorithm to suggest cliques
    // For now, return cliques the user is not a member of
    const userCliques = await this.getCliquesByUserId(userId);
    const userCliqueIds = new Set(userCliques.map(clique => clique.id));
    
    const allCliques = await this.getAllCliques();
    const suggestedCliques = allCliques.filter(clique => !userCliqueIds.has(clique.id));
    
    // Get some members for each suggested clique
    return Promise.all(suggestedCliques.map(async (clique) => {
      const members = await this.getCliqueMembers(clique.id);
      const memberUsers = await Promise.all(members.slice(0, 3).map(async member => {
        const user = await this.getUser(member.userId);
        return user ? { 
          id: user.id, 
          username: user.username, 
          avatarUrl: user.avatarUrl || "" 
        } : null;
      }));
      
      return {
        id: clique.id,
        name: clique.name,
        description: clique.description || "",
        coverImageUrl: clique.coverImageUrl || "",
        category: clique.category || "",
        memberCount: clique.memberCount,
        members: memberUsers.filter((user): user is { id: number; username: string; avatarUrl: string } => user !== null)
      };
    }));
  }

  // Clique membership operations
  async addUserToClique(insertMember: InsertCliqueMember): Promise<CliqueMember> {
    const id = this.cliqueMemberIdCounter++;
    const now = new Date();
    
    // Garantir que os campos opcionais são null ou definidos, não undefined
    const member: CliqueMember = { 
      ...insertMember, 
      id, 
      joinedAt: now,
      personaId: insertMember.personaId || null,
      role: insertMember.role || "member"
    };
    
    this.cliqueMembers.set(id, member);
    
    // Update clique member count
    const clique = await this.getClique(insertMember.cliqueId);
    if (clique) {
      clique.memberCount += 1;
      this.cliques.set(clique.id, clique);
    }
    
    return member;
  }

  async getCliqueMembers(cliqueId: number): Promise<CliqueMember[]> {
    return Array.from(this.cliqueMembers.values()).filter(
      (member) => member.cliqueId === cliqueId
    );
  }

  async isUserMemberOfClique(userId: number, cliqueId: number): Promise<boolean> {
    return Array.from(this.cliqueMembers.values()).some(
      (member) => member.userId === userId && member.cliqueId === cliqueId
    );
  }

  async getCliqueWithMembers(cliqueId: number): Promise<CliqueWithMembers | undefined> {
    const clique = await this.getClique(cliqueId);
    if (!clique) return undefined;
    
    const members = await this.getCliqueMembers(cliqueId);
    return { ...clique, members };
  }

  // Chain operations
  async createChain(insertChain: InsertChain): Promise<Chain> {
    const id = this.chainIdCounter++;
    const now = new Date();
    
    // Garantir que campos opcionais são null e não undefined
    const chain: Chain = { 
      ...insertChain, 
      id, 
      createdAt: now, 
      updatedAt: now,
      personaId: insertChain.personaId || null,
      title: insertChain.title || null
    };
    
    this.chains.set(id, chain);
    return chain;
  }

  async getChain(id: number): Promise<Chain | undefined> {
    return this.chains.get(id);
  }

  async getChainsByCliqueId(cliqueId: number): Promise<Chain[]> {
    return Array.from(this.chains.values()).filter(
      (chain) => chain.cliqueId === cliqueId
    );
  }

  async getChainsByUserId(userId: number): Promise<Chain[]> {
    return Array.from(this.chains.values()).filter(
      (chain) => chain.creatorId === userId
    );
  }

  async getFeedForUser(userId: number): Promise<ChainWithContents[]> {
    // Get all cliques the user is a member of
    const userCliques = await this.getCliquesByUserId(userId);
    const cliqueIds = userCliques.map(clique => clique.id);
    
    // Get all chains from those cliques
    const allChains = Array.from(this.chains.values()).filter(
      (chain) => cliqueIds.includes(chain.cliqueId)
    );
    
    // Sort by most recent update
    allChains.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    // Get chain contents for each chain
    return Promise.all(allChains.map(async (chain) => {
      const chainWithContents = await this.getChainWithContents(chain.id);
      return chainWithContents!;
    }));
  }

  // Chain content operations
  async addContentToChain(insertContent: InsertChainContent): Promise<ChainContent> {
    const id = this.chainContentIdCounter++;
    const now = new Date();
    
    // Garantir que campos opcionais são null e não undefined
    const content: ChainContent = { 
      ...insertContent, 
      id, 
      createdAt: now,
      personaId: insertContent.personaId || null,
      content: insertContent.content || null,
      mediaUrl: insertContent.mediaUrl || null
    };
    
    this.chainContents.set(id, content);
    
    // Update chain's updatedAt
    const chain = await this.getChain(insertContent.chainId);
    if (chain) {
      chain.updatedAt = now;
      this.chains.set(chain.id, chain);
    }
    
    return content;
  }

  async getChainContents(chainId: number): Promise<ChainContent[]> {
    return Array.from(this.chainContents.values())
      .filter((content) => content.chainId === chainId)
      .sort((a, b) => a.position - b.position);
  }

  async getChainWithContents(chainId: number): Promise<ChainWithContents | undefined> {
    const chain = await this.getChain(chainId);
    if (!chain) return undefined;
    
    const contents = await this.getChainContents(chainId);
    
    // Get user and persona for each content
    const contentsWithUserAndPersona = await Promise.all(contents.map(async (content) => {
      const user = await this.getUser(content.userId);
      const persona = content.personaId ? await this.getPersona(content.personaId) : null;
      const reactions = await this.getReactionsForContent(content.id);
      
      return {
        ...content,
        user: user ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        } : { id: 0, username: "Unknown", displayName: "Unknown User" },
        persona: persona ? {
          id: persona.id,
          name: persona.name,
          avatarUrl: persona.avatarUrl
        } : null,
        reactions
      };
    }));
    
    return { ...chain, contents: contentsWithUserAndPersona };
  }

  // Reputation operations
  async addReputation(insertReputation: InsertReputation): Promise<Reputation> {
    const id = this.reputationIdCounter++;
    const now = new Date();
    
    // Garantir que campos opcionais são null e não undefined
    const reputation: Reputation = { 
      ...insertReputation, 
      id, 
      earnedAt: now,
      cliqueId: insertReputation.cliqueId || null,
      level: insertReputation.level || 1
    };
    
    this.reputations.set(id, reputation);
    return reputation;
  }

  async getUserReputations(userId: number): Promise<Reputation[]> {
    return Array.from(this.reputations.values()).filter(
      (reputation) => reputation.userId === userId
    );
  }

  // Reaction operations
  async addReaction(insertReaction: InsertReaction): Promise<Reaction> {
    // Check if user already reacted to this content
    const existingReaction = Array.from(this.reactions.values()).find(
      (reaction) => reaction.userId === insertReaction.userId && 
                    reaction.chainContentId === insertReaction.chainContentId
    );
    
    if (existingReaction) {
      // Update existing reaction if type is different
      if (existingReaction.type !== insertReaction.type) {
        existingReaction.type = insertReaction.type;
        existingReaction.createdAt = new Date();
        this.reactions.set(existingReaction.id, existingReaction);
      }
      return existingReaction;
    }
    
    // Create new reaction
    const id = this.reactionIdCounter++;
    const now = new Date();
    const reaction: Reaction = { ...insertReaction, id, createdAt: now };
    this.reactions.set(id, reaction);
    return reaction;
  }

  async removeReaction(userId: number, chainContentId: number): Promise<boolean> {
    const existingReaction = Array.from(this.reactions.values()).find(
      (reaction) => reaction.userId === userId && reaction.chainContentId === chainContentId
    );
    
    if (existingReaction) {
      this.reactions.delete(existingReaction.id);
      return true;
    }
    
    return false;
  }

  async getReactionsForContent(chainContentId: number): Promise<Reaction[]> {
    return Array.from(this.reactions.values()).filter(
      (reaction) => reaction.chainContentId === chainContentId
    );
  }
}

import { DatabaseStorage } from './DatabaseStorage';

export const storage = new DatabaseStorage();
