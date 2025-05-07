import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Persona Model
export const personas = pgTable("personas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPersonaSchema = createInsertSchema(personas).pick({
  userId: true,
  name: true,
  bio: true,
  avatarUrl: true,
  isDefault: true,
});

export type InsertPersona = z.infer<typeof insertPersonaSchema>;
export type Persona = typeof personas.$inferSelect;

// Clique Model (Groups)
export const cliques = pgTable("cliques", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  coverImageUrl: text("cover_image_url"),
  category: text("category"),
  isPrivate: boolean("is_private").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  memberCount: integer("member_count").default(1).notNull(),
});

export const insertCliqueSchema = createInsertSchema(cliques).pick({
  name: true,
  description: true,
  creatorId: true,
  coverImageUrl: true,
  category: true,
  isPrivate: true,
});

export type InsertClique = z.infer<typeof insertCliqueSchema>;
export type Clique = typeof cliques.$inferSelect;

// Clique Membership
export const cliqueMembers = pgTable("clique_members", {
  id: serial("id").primaryKey(),
  cliqueId: integer("clique_id").notNull().references(() => cliques.id),
  userId: integer("user_id").notNull().references(() => users.id),
  personaId: integer("persona_id").references(() => personas.id),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertCliqueMemberSchema = createInsertSchema(cliqueMembers).pick({
  cliqueId: true,
  userId: true,
  personaId: true,
  role: true,
});

export type InsertCliqueMember = z.infer<typeof insertCliqueMemberSchema>;
export type CliqueMember = typeof cliqueMembers.$inferSelect;

// Chain Model (Content Threads)
export const chains = pgTable("chains", {
  id: serial("id").primaryKey(),
  cliqueId: integer("clique_id").notNull().references(() => cliques.id),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  personaId: integer("persona_id").references(() => personas.id),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChainSchema = createInsertSchema(chains).pick({
  cliqueId: true,
  creatorId: true,
  personaId: true,
  title: true,
});

export type InsertChain = z.infer<typeof insertChainSchema>;
export type Chain = typeof chains.$inferSelect;

// Chain Content Model
export const chainContents = pgTable("chain_contents", {
  id: serial("id").primaryKey(),
  chainId: integer("chain_id").notNull().references(() => chains.id),
  userId: integer("user_id").notNull().references(() => users.id),
  personaId: integer("persona_id").references(() => personas.id),
  content: text("content"),
  contentType: text("content_type").notNull(), // text, image, video, audio
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  position: integer("position").notNull(), // for ordering content in the chain
});

export const insertChainContentSchema = createInsertSchema(chainContents).pick({
  chainId: true,
  userId: true,
  personaId: true,
  content: true,
  contentType: true,
  mediaUrl: true,
  position: true,
});

export type InsertChainContent = z.infer<typeof insertChainContentSchema>;
export type ChainContent = typeof chainContents.$inferSelect;

// Reputation Model
export const reputations = pgTable("reputations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  badgeType: text("badge_type").notNull(),
  badgeName: text("badge_name").notNull(),
  cliqueId: integer("clique_id").references(() => cliques.id),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  level: integer("level").default(1).notNull(),
});

export const insertReputationSchema = createInsertSchema(reputations).pick({
  userId: true,
  badgeType: true,
  badgeName: true,
  cliqueId: true,
  level: true,
});

export type InsertReputation = z.infer<typeof insertReputationSchema>;
export type Reputation = typeof reputations.$inferSelect;

// Reaction Model (likes, etc.)
export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  chainContentId: integer("chain_content_id").notNull().references(() => chainContents.id),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // like, love, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReactionSchema = createInsertSchema(reactions).pick({
  chainContentId: true,
  userId: true,
  type: true,
});

export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type Reaction = typeof reactions.$inferSelect;

// For API responses
export type UserWithPersonas = User & {
  personas: Persona[];
};

export type CliqueWithMembers = Clique & {
  members: CliqueMember[];
};

export type ChainWithContents = Chain & {
  contents: (ChainContent & {
    user: Partial<User>;
    persona: Partial<Persona> | null;
    reactions: Reaction[];
  })[];
};

export type SuggestedClique = {
  id: number;
  name: string;
  description: string;
  coverImageUrl: string;
  category: string;
  memberCount: number;
  members: Array<{ id: number; username: string; avatarUrl: string }>;
};
