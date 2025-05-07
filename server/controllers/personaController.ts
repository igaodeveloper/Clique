import { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { personas, insertPersonaSchema } from '@shared/schema';

/**
 * Controlador para operações relacionadas a personas
 */
export const personaController = {
  /**
   * Obter todas as personas do usuário atual
   */
  async getUserPersonas(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      
      console.log(`Buscando personas do usuário: ${userId}`);
      
      const userPersonas = await db
        .select()
        .from(personas)
        .where(eq(personas.userId, userId));
      
      console.log(`${userPersonas.length} personas encontradas`);
      
      res.json(userPersonas);
    } catch (error) {
      console.error('Erro ao buscar personas:', error);
      res.status(500).json({ message: 'Erro ao buscar personas' });
    }
  },
  
  /**
   * Criar nova persona
   */
  async createPersona(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      console.log(`Criando nova persona para o usuário: ${userId}`);
      
      // Validar dados
      const validatedData = insertPersonaSchema.parse({
        ...req.body,
        userId
      });
      
      // Se a persona for marcada como padrão, desmarcar outras personas padrão
      if (validatedData.isDefault) {
        await db
          .update(personas)
          .set({ isDefault: false })
          .where(
            and(
              eq(personas.userId, userId),
              eq(personas.isDefault, true)
            )
          );
        
        console.log('Persona padrão anterior desmarcada');
      }
      
      // Inserir nova persona
      const [newPersona] = await db
        .insert(personas)
        .values({
          ...validatedData,
          updatedAt: new Date()
        })
        .returning();
      
      console.log(`Persona criada com sucesso: ${newPersona.id}`);
      
      res.status(201).json(newPersona);
    } catch (error) {
      console.error('Erro ao criar persona:', error);
      
      if (error.errors) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Erro ao criar persona' });
    }
  },
  
  /**
   * Atualizar persona existente
   */
  async updatePersona(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      const personaId = parseInt(req.params.id);
      
      console.log(`Atualizando persona ${personaId} do usuário ${userId}`);
      
      // Verificar se a persona existe e pertence ao usuário
      const personaExists = await db
        .select({ id: personas.id })
        .from(personas)
        .where(
          and(
            eq(personas.id, personaId),
            eq(personas.userId, userId)
          )
        )
        .limit(1);
      
      if (personaExists.length === 0) {
        console.log(`Persona ${personaId} não encontrada ou não pertence ao usuário ${userId}`);
        return res.status(404).json({ message: 'Persona não encontrada' });
      }
      
      // Se estiver definindo como padrão, remover o padrão das outras
      if (req.body.isDefault) {
        await db
          .update(personas)
          .set({ isDefault: false })
          .where(
            and(
              eq(personas.userId, userId),
              eq(personas.isDefault, true)
            )
          );
        
        console.log('Persona padrão anterior desmarcada');
      }
      
      // Atualizar persona
      const [updatedPersona] = await db
        .update(personas)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(personas.id, personaId))
        .returning();
      
      console.log(`Persona ${personaId} atualizada com sucesso`);
      
      res.json(updatedPersona);
    } catch (error) {
      console.error('Erro ao atualizar persona:', error);
      
      if (error.errors) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Erro ao atualizar persona' });
    }
  },
  
  /**
   * Obter persona específica
   */
  async getPersona(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      const personaId = parseInt(req.params.id);
      
      console.log(`Buscando persona ${personaId}`);
      
      // Buscar persona específica do usuário
      const [persona] = await db
        .select()
        .from(personas)
        .where(
          and(
            eq(personas.id, personaId),
            eq(personas.userId, userId)
          )
        )
        .limit(1);
      
      if (!persona) {
        console.log(`Persona ${personaId} não encontrada`);
        return res.status(404).json({ message: 'Persona não encontrada' });
      }
      
      console.log(`Persona ${personaId} encontrada`);
      
      res.json(persona);
    } catch (error) {
      console.error('Erro ao buscar persona:', error);
      res.status(500).json({ message: 'Erro ao buscar persona' });
    }
  },
  
  /**
   * Excluir persona
   */
  async deletePersona(req: Request, res: Response) {
    try {
      const userId = (req.user as any).id;
      const personaId = parseInt(req.params.id);
      
      console.log(`Excluindo persona ${personaId} do usuário ${userId}`);
      
      // Verificar se a persona existe e pertence ao usuário
      const [persona] = await db
        .select()
        .from(personas)
        .where(
          and(
            eq(personas.id, personaId),
            eq(personas.userId, userId)
          )
        )
        .limit(1);
      
      if (!persona) {
        console.log(`Persona ${personaId} não encontrada ou não pertence ao usuário ${userId}`);
        return res.status(404).json({ message: 'Persona não encontrada' });
      }
      
      // Não permitir exclusão da persona padrão
      if (persona.isDefault) {
        console.log('Tentativa de excluir persona padrão');
        return res.status(400).json({ message: 'Não é possível excluir a persona padrão' });
      }
      
      // Excluir persona
      await db
        .delete(personas)
        .where(eq(personas.id, personaId));
      
      console.log(`Persona ${personaId} excluída com sucesso`);
      
      res.status(204).end();
    } catch (error) {
      console.error('Erro ao excluir persona:', error);
      res.status(500).json({ message: 'Erro ao excluir persona' });
    }
  }
};