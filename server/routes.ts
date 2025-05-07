import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertPersonaSchema, 
  insertCliqueSchema, 
  insertCliqueMemberSchema,
  insertChainSchema,
  insertChainContentSchema,
  insertReactionSchema,
  insertReputationSchema,
  User,
  Chain,
  ChainContent,
  userSchema
} from "@shared/schema";
import bcrypt from "bcryptjs";
import expressSession from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import z from "zod";
import MemoryStore from "memorystore";

// Estender a interface do Express para incluir o usuário na requisição
declare global {
  namespace Express {
    // Esta interface precisa corresponder exatamente ao tipo User definido em shared/schema.ts
    interface User {
      id: number;
      username: string;
      email: string;
      password: string;
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
      createdAt: Date;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session and authentication
  const MemoryStoreSession = MemoryStore(expressSession);
  app.use(expressSession({
    secret: process.env.SESSION_SECRET || "cliquechain-secret-key",
    resave: false,
    saveUninitialized: true, // Salvar sessões não inicializadas para suportar o login
    rolling: true, // Renovar cookie a cada request
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax', // Permite que cookies sejam enviados em navegação entre sites
      httpOnly: true,
      path: '/'
    },
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    })
  }));
  
  // Logging para sessões para facilitar depuração
  app.use((req, res, next) => {
    console.log("Session middleware:", { 
      sessionID: req.sessionID,
      hasSession: !!req.session,
      cookie: req.session?.cookie
    });
    next();
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // Authentication setup
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) return done(null, false, { message: "Incorrect username" });
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: "Incorrect password" });
      
      // Validate e garante que os valores são do tipo correto
      const validUser = userSchema.parse(user);
      return done(null, validUser);
    } catch (err) {
      console.error("Authentication error:", err);
      return done(err);
    }
  }));

  passport.serializeUser((user: User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      
      // Validar usuário através do schema Zod
      const validUser = userSchema.parse(user);
      done(null, validUser);
    } catch (err) {
      console.error("Deserialize error:", err);
      done(err, null);
    }
  });

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    console.log("Auth check:", {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      hasSession: !!req.session,
      sessionID: req.sessionID,
      cookies: req.headers.cookie
    });
    
    if (req.isAuthenticated()) {
      return next();
    }
    
    res.status(401).json({ message: "Unauthorized" });
  };

  // ======================= AUTH ROUTES =======================
  
  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userInput = insertUserSchema.parse(req.body);
      
      // Check if username or email exists
      const existingUsername = await storage.getUserByUsername(userInput.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userInput.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userInput.password, salt);
      
      // Create user
      const user = await storage.createUser({
        ...userInput,
        password: hashedPassword
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    console.log("Login attempt:", {
      username: req.body.username,
      hasPassword: !!req.body.password,
      session: !!req.session,
      sessionID: req.sessionID,
      cookies: req.headers.cookie
    });
    
    passport.authenticate("local", (err: Error, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Authentication failed:", info.message);
        return res.status(401).json({ message: info.message });
      }
      
      console.log("Authentication successful for user:", user.username);
      
      req.logIn(user, async (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }
        
        console.log("Login successful, session:", {
          sessionID: req.sessionID,
          user: req.user?.username,
          isAuthenticated: req.isAuthenticated()
        });
        
        // Get user with personas
        const userWithPersonas = await storage.getUserWithPersonas(user.id);
        if (!userWithPersonas) {
          console.error("User with personas not found:", user.id);
          return res.status(500).json({ message: "User not found" });
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = userWithPersonas;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      console.log("Destroying session for logout");
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ message: "Error logging out" });
        }
        
        // Clear cookie on client
        res.clearCookie('connect.sid');
        res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      // Se não tiver sessão, só responde com sucesso
      res.status(200).json({ message: "No active session" });
    }
  });

  // Get current user
  app.get("/api/auth/me", isAuthenticated, async (req, res) => {
    const userWithPersonas = await storage.getUserWithPersonas(req.user!.id);
    if (!userWithPersonas) return res.status(500).json({ message: "User not found" });
    
    // Remove password from response
    const { password, ...userWithoutPassword } = userWithPersonas;
    res.json(userWithoutPassword);
  });

  // ======================= PERSONA ROUTES =======================
  
  // Create persona
  app.post("/api/personas", isAuthenticated, async (req, res) => {
    try {
      const data = insertPersonaSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const persona = await storage.createPersona(data);
      res.status(201).json(persona);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get user personas
  app.get("/api/personas", isAuthenticated, async (req, res) => {
    const personas = await storage.getPersonasByUserId(req.user!.id);
    res.json(personas);
  });

  // Update persona
  app.patch("/api/personas/:id", isAuthenticated, async (req, res) => {
    const personaId = parseInt(req.params.id);
    const persona = await storage.getPersona(personaId);
    
    if (!persona) {
      return res.status(404).json({ message: "Persona not found" });
    }
    
    if (persona.userId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const updatedPersona = await storage.updatePersona(personaId, req.body);
      res.json(updatedPersona);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ======================= CLIQUE ROUTES =======================
  
  // Create clique
  app.post("/api/cliques", isAuthenticated, async (req, res) => {
    try {
      const data = insertCliqueSchema.parse({
        ...req.body,
        creatorId: req.user!.id
      });
      
      const clique = await storage.createClique(data);
      res.status(201).json(clique);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get user cliques
  app.get("/api/cliques", isAuthenticated, async (req, res) => {
    const cliques = await storage.getCliquesByUserId(req.user!.id);
    res.json(cliques);
  });

  // Get suggested cliques
  app.get("/api/cliques/suggested", isAuthenticated, async (req, res) => {
    const suggestedCliques = await storage.getSuggestedCliques(req.user!.id);
    res.json(suggestedCliques);
  });

  // Get specific clique
  app.get("/api/cliques/:id", isAuthenticated, async (req, res) => {
    const cliqueId = parseInt(req.params.id);
    const clique = await storage.getClique(cliqueId);
    
    if (!clique) {
      return res.status(404).json({ message: "Clique not found" });
    }
    
    // Check if user is a member if clique is private
    if (clique.isPrivate) {
      const isMember = await storage.isUserMemberOfClique(req.user!.id, cliqueId);
      if (!isMember) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }
    
    const cliqueWithMembers = await storage.getCliqueWithMembers(cliqueId);
    res.json(cliqueWithMembers);
  });

  // Join clique
  app.post("/api/cliques/:id/join", isAuthenticated, async (req, res) => {
    const cliqueId = parseInt(req.params.id);
    const clique = await storage.getClique(cliqueId);
    
    if (!clique) {
      return res.status(404).json({ message: "Clique not found" });
    }
    
    // Check if user is already a member
    const isMember = await storage.isUserMemberOfClique(req.user!.id, cliqueId);
    if (isMember) {
      return res.status(400).json({ message: "Already a member" });
    }
    
    try {
      const data = insertCliqueMemberSchema.parse({
        cliqueId,
        userId: req.user!.id,
        personaId: req.body.personaId || (await storage.getDefaultPersona(req.user!.id))?.id,
        role: "member"
      });
      
      const membership = await storage.addUserToClique(data);
      res.status(201).json(membership);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // ======================= CHAIN ROUTES =======================
  
  // Create chain
  app.post("/api/chains", isAuthenticated, async (req, res) => {
    try {
      // Check if user is member of the clique
      const isMember = await storage.isUserMemberOfClique(req.user!.id, req.body.cliqueId);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of this clique" });
      }
      
      const chainData = insertChainSchema.parse({
        ...req.body,
        creatorId: req.user!.id
      });
      
      const chain = await storage.createChain(chainData);
      
      // Add initial content
      if (req.body.initialContent) {
        const contentData = insertChainContentSchema.parse({
          chainId: chain.id,
          userId: req.user!.id,
          personaId: chainData.personaId,
          content: req.body.initialContent.content,
          contentType: req.body.initialContent.contentType,
          mediaUrl: req.body.initialContent.mediaUrl,
          position: 0
        });
        
        await storage.addContentToChain(contentData);
      }
      
      const chainWithContents = await storage.getChainWithContents(chain.id);
      res.status(201).json(chainWithContents);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get user feed
  app.get("/api/feed", isAuthenticated, async (req, res) => {
    const feed = await storage.getFeedForUser(req.user!.id);
    res.json(feed);
  });

  // Get chains for clique
  app.get("/api/cliques/:id/chains", isAuthenticated, async (req, res) => {
    const cliqueId = parseInt(req.params.id);
    
    // Check if user is member of the clique if it's private
    const clique = await storage.getClique(cliqueId);
    if (clique?.isPrivate) {
      const isMember = await storage.isUserMemberOfClique(req.user!.id, cliqueId);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of this clique" });
      }
    }
    
    const chains = await storage.getChainsByCliqueId(cliqueId);
    const chainsWithContents = await Promise.all(
      chains.map(chain => storage.getChainWithContents(chain.id))
    );
    
    res.json(chainsWithContents.filter(Boolean));
  });

  // Add content to chain
  app.post("/api/chains/:id/content", isAuthenticated, async (req, res) => {
    const chainId = parseInt(req.params.id);
    const chain = await storage.getChain(chainId);
    
    if (!chain) {
      return res.status(404).json({ message: "Chain not found" });
    }
    
    // Check if user is member of the clique
    const isMember = await storage.isUserMemberOfClique(req.user!.id, chain.cliqueId);
    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this clique" });
    }
    
    try {
      // Get highest position
      const contents = await storage.getChainContents(chainId);
      const nextPosition = contents.length > 0 
        ? Math.max(...contents.map(c => c.position)) + 1 
        : 0;
      
      const contentData = insertChainContentSchema.parse({
        ...req.body,
        chainId,
        userId: req.user!.id,
        position: nextPosition
      });
      
      const content = await storage.addContentToChain(contentData);
      
      // Add reputation if this is a continuation
      if (nextPosition > 0) {
        await storage.addReputation({
          userId: req.user!.id,
          badgeType: "contribution",
          badgeName: "Chain Contributor",
          cliqueId: chain.cliqueId,
          level: 1
        });
      }
      
      const updatedChain = await storage.getChainWithContents(chainId);
      res.status(201).json(updatedChain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get single chain with contents
  app.get("/api/chains/:id", isAuthenticated, async (req, res) => {
    const chainId = parseInt(req.params.id);
    const chain = await storage.getChain(chainId);
    
    if (!chain) {
      return res.status(404).json({ message: "Chain not found" });
    }
    
    // Check if user is member of the clique if it's private
    const clique = await storage.getClique(chain.cliqueId);
    if (clique?.isPrivate) {
      const isMember = await storage.isUserMemberOfClique(req.user!.id, chain.cliqueId);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of this clique" });
      }
    }
    
    const chainWithContents = await storage.getChainWithContents(chainId);
    res.json(chainWithContents);
  });

  // ======================= REACTION ROUTES =======================
  
  // Add reaction
  app.post("/api/content/:id/react", isAuthenticated, async (req, res) => {
    const contentId = parseInt(req.params.id);
    
    try {
      const data = insertReactionSchema.parse({
        chainContentId: contentId,
        userId: req.user!.id,
        type: req.body.type
      });
      
      const reaction = await storage.addReaction(data);
      
      // If the user hasn't reacted before, add reputation to the content creator
      const contentReactions = await storage.getReactionsForContent(contentId);
      const isFirstReaction = contentReactions.length === 1;
      
      if (isFirstReaction) {
        // Get the content to find its creator
        const contents = await storage.getChainContents(contentId);
        const content = contents.find(c => c.id === contentId);
        
        if (content && content.userId !== req.user!.id) {
          await storage.addReputation({
            userId: content.userId,
            badgeType: "engagement",
            badgeName: "Content Appreciated",
            level: 1
          });
        }
      }
      
      res.status(201).json(reaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Remove reaction
  app.delete("/api/content/:id/react", isAuthenticated, async (req, res) => {
    const contentId = parseInt(req.params.id);
    const success = await storage.removeReaction(req.user!.id, contentId);
    
    if (success) {
      res.json({ message: "Reaction removed" });
    } else {
      res.status(404).json({ message: "Reaction not found" });
    }
  });

  // ======================= REPUTATION ROUTES =======================
  
  // Get user reputations
  app.get("/api/reputations", isAuthenticated, async (req, res) => {
    const reputations = await storage.getUserReputations(req.user!.id);
    res.json(reputations);
  });

  // Set up HTTP server
  const httpServer = createServer(app);
  
  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Track active connections by user and clique
  const clientsByUser = new Map<number, WebSocket[]>();
  const clientsByClique = new Map<number, WebSocket[]>();
  
  wss.on('connection', (ws) => {
    // Handle connections
    let userId: number | null = null;
    let cliqueId: number | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'authenticate') {
          // Authenticate the websocket connection
          userId = data.userId;
          
          // Add to user clients
          if (userId !== null) {
            if (!clientsByUser.has(userId)) {
              clientsByUser.set(userId, []);
            }
            clientsByUser.get(userId)!.push(ws);
          }
          
          // Send confirmation
          ws.send(JSON.stringify({ 
            type: 'authenticated', 
            userId 
          }));
        }
        else if (data.type === 'joinClique') {
          // Join a clique's real-time updates
          if (userId === null) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Not authenticated' 
            }));
            return;
          }
          
          cliqueId = data.cliqueId;
          
          // Verify user is member of clique
          if (cliqueId !== null) {
            const isMember = await storage.isUserMemberOfClique(userId, cliqueId);
            if (!isMember) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Not a member of this clique' 
              }));
              return;
            }
            
            // Add to clique clients
            if (!clientsByClique.has(cliqueId)) {
              clientsByClique.set(cliqueId, []);
            }
            clientsByClique.get(cliqueId)!.push(ws);
            
            // Send confirmation
            ws.send(JSON.stringify({ 
              type: 'joinedClique', 
              cliqueId 
            }));
            
            // Notify clique members that user is online
            const user = await storage.getUser(userId);
            if (user) {
              broadcastToClique(cliqueId, {
                type: 'userOnline',
                user: { 
                  id: user.id,
                  username: user.username,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl
                }
              }, ws);
            }
          }
        }
        else if (data.type === 'typing') {
          // User is typing in a chain
          if (userId === null || cliqueId === null) return;
          
          // Broadcast typing status to clique
          broadcastToClique(cliqueId, {
            type: 'userTyping',
            userId,
            chainId: data.chainId,
            isTyping: data.isTyping
          }, ws);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove from user clients
      if (userId !== null) {
        const userClients = clientsByUser.get(userId);
        if (userClients) {
          const index = userClients.indexOf(ws);
          if (index !== -1) {
            userClients.splice(index, 1);
          }
          if (userClients.length === 0) {
            clientsByUser.delete(userId);
          }
        }
      }
      
      // Remove from clique clients
      if (cliqueId !== null) {
        const cliqueClients = clientsByClique.get(cliqueId);
        if (cliqueClients) {
          const index = cliqueClients.indexOf(ws);
          if (index !== -1) {
            cliqueClients.splice(index, 1);
          }
          if (cliqueClients.length === 0) {
            clientsByClique.delete(cliqueId);
          }
          
          // Notify other clique members that user is offline
          if (userId !== null) {
            broadcastToClique(cliqueId, {
              type: 'userOffline',
              userId
            });
          }
        }
      }
    });
  });
  
  // Importar constantes do WebSocket
  console.log("WebSocket status code reference:", {
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED
  });
  
  const WebSocketOpenState = WebSocket.OPEN;

  // Helper function to broadcast to users
  const broadcastToUsers = (userIds: number[], data: any) => {
    userIds.forEach(userId => {
      const clients = clientsByUser.get(userId);
      if (clients) {
        clients.forEach(client => {
          if (client.readyState === WebSocketOpenState) {
            try {
              client.send(JSON.stringify(data));
            } catch (error) {
              console.error('Error sending message to user:', error);
            }
          }
        });
      }
    });
  };
  
  // Helper function to broadcast to a clique
  const broadcastToClique = (cliqueId: number, data: any, excludeClient?: WebSocket) => {
    const clients = clientsByClique.get(cliqueId);
    if (clients) {
      clients.forEach(client => {
        if (client !== excludeClient && client.readyState === WebSocketOpenState) {
          try {
            client.send(JSON.stringify(data));
          } catch (error) {
            console.error('Error broadcasting to clique:', error);
          }
        }
      });
    }
  };
  
  // After successfully adding content to chain, broadcast to clique members
  const originalAddContentToChain = app._router.stack.find(
    (layer: any) => layer.route?.path === '/api/chains/:id/content' && layer.route?.methods.post
  ).handle;
  
  app.post("/api/chains/:id/content", isAuthenticated, async (req, res, next) => {
    const chainId = parseInt(req.params.id);
    const origRes = res.json;
    
    // Override res.json to intercept successful responses
    res.json = function(body) {
      // Execute original handler
      origRes.call(this, body);
      
      // If successful, broadcast to clique
      if (res.statusCode >= 200 && res.statusCode < 300 && body) {
        try {
          // Get the chain details to find the clique
          storage.getChain(chainId).then(chain => {
            if (chain) {
              // Broadcast to clique members
              broadcastToClique(chain.cliqueId, {
                type: 'newContent',
                chainId,
                content: body
              });
            }
          });
        } catch (error) {
          console.error('WebSocket broadcast error:', error);
        }
      }
      
      return this;
    };
    
    // Call the original handler
    originalAddContentToChain(req, res, next);
  });
  
  // After adding a reaction, broadcast to related users
  const originalAddReaction = app._router.stack.find(
    (layer: any) => layer.route?.path === '/api/content/:id/react' && layer.route?.methods.post
  ).handle;
  
  app.post("/api/content/:id/react", isAuthenticated, async (req, res, next) => {
    const contentId = parseInt(req.params.id);
    const origRes = res.json;
    
    // Override res.json to intercept successful responses
    res.json = function(body) {
      // Execute original handler
      origRes.call(this, body);
      
      // If successful, broadcast to relevant users
      if (res.statusCode >= 200 && res.statusCode < 300 && body) {
        // Get content to find chain and user
        storage.getChainContents(contentId).then(contents => {
          const content = contents.find(c => c.id === contentId);
          if (content) {
            // Get chain to find clique
            storage.getChain(content.chainId).then(chain => {
              if (chain) {
                // Broadcast to clique members
                broadcastToClique(chain.cliqueId, {
                  type: 'newReaction',
                  contentId,
                  reaction: body
                });
                
                // Notify content creator if different from user who reacted
                if (content.userId !== req.user!.id) {
                  broadcastToUsers([content.userId], {
                    type: 'notification',
                    message: `${req.user!.displayName || req.user!.username} reagiu ao seu conteúdo`,
                    data: {
                      type: 'reaction',
                      chainId: content.chainId,
                      contentId
                    }
                  });
                }
              }
            });
          }
        });
      }
      
      return this;
    };
    
    // Call the original handler
    originalAddReaction(req, res, next);
  });
  
  return httpServer;
}
