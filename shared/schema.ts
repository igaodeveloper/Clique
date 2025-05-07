import { sql } from "drizzle-orm";
import { pgTable, serial, text, boolean, varchar, timestamp, integer, index, unique, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  bio: text("bio"),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    usernameIdx: index("username_idx").on(table.username),
    emailIdx: index("email_idx").on(table.email)
  };
});

export const userRelations = relations(users, ({ many }) => ({
  personas: many(personas),
  cliquesMembership: many(cliqueMembers),
  createdCliques: many(cliques, { relationName: "creator" }),
  chains: many(chains, { relationName: "creator" }),
  chainContents: many(chainContents),
  reactions: many(reactions),
  reputations: many(reputations)
}));

export const userSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Personas (different identities for users in different contexts)
export const personas = pgTable("personas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  bio: text("bio"),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index("persona_user_id_idx").on(table.userId),
    uniqueDefault: unique("unique_default_persona").on(table.userId, table.isDefault)
  };
});

export const personaRelations = relations(personas, ({ one, many }) => ({
  user: one(users, {
    fields: [personas.userId],
    references: [users.id]
  }),
  cliquesMembership: many(cliqueMembers),
  chains: many(chains),
  chainContents: many(chainContents)
}));

export const personaSchema = createSelectSchema(personas);
export const insertPersonaSchema = createInsertSchema(personas).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type Persona = typeof personas.$inferSelect;
export type InsertPersona = z.infer<typeof insertPersonaSchema>;

// Cliques (micro-communities)
export const cliques = pgTable("cliques", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  coverImageUrl: varchar("cover_image_url", { length: 255 }),
  category: varchar("category", { length: 50 }).notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  memberCount: integer("member_count").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    nameIdx: index("clique_name_idx").on(table.name),
    categoryIdx: index("clique_category_idx").on(table.category),
    creatorIdx: index("clique_creator_idx").on(table.creatorId)
  };
});

export const cliqueRelations = relations(cliques, ({ one, many }) => ({
  creator: one(users, {
    fields: [cliques.creatorId],
    references: [users.id],
    relationName: "creator"
  }),
  members: many(cliqueMembers),
  chains: many(chains)
}));

export const cliqueSchema = createSelectSchema(cliques);
export const insertCliqueSchema = createInsertSchema(cliques).omit({
  id: true,
  memberCount: true,
  createdAt: true,
  updatedAt: true
});

export type Clique = typeof cliques.$inferSelect;
export type InsertClique = z.infer<typeof insertCliqueSchema>;

// Clique members
export const cliqueMembers = pgTable("clique_members", {
  id: serial("id").primaryKey(),
  cliqueId: integer("clique_id").notNull().references(() => cliques.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: integer("persona_id").notNull().references(() => personas.id),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull()
}, (table) => {
  return {
    cliqueUserUnique: unique("clique_user_unique").on(table.cliqueId, table.userId),
    cliqueIdIdx: index("member_clique_id_idx").on(table.cliqueId),
    userIdIdx: index("member_user_id_idx").on(table.userId),
    personaIdIdx: index("member_persona_id_idx").on(table.personaId)
  };
});

export const cliqueMemberRelations = relations(cliqueMembers, ({ one }) => ({
  clique: one(cliques, {
    fields: [cliqueMembers.cliqueId],
    references: [cliques.id]
  }),
  user: one(users, {
    fields: [cliqueMembers.userId],
    references: [users.id]
  }),
  persona: one(personas, {
    fields: [cliqueMembers.personaId],
    references: [personas.id]
  })
}));

export const cliqueMemberSchema = createSelectSchema(cliqueMembers);
export const insertCliqueMemberSchema = createInsertSchema(cliqueMembers).omit({
  id: true,
  joinedAt: true,
  lastActive: true
});

export type CliqueMember = typeof cliqueMembers.$inferSelect;
export type InsertCliqueMember = z.infer<typeof insertCliqueMemberSchema>;

// Chains (collaborative content threads)
export const chains = pgTable("chains", {
  id: serial("id").primaryKey(),
  cliqueId: integer("clique_id").notNull().references(() => cliques.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  personaId: integer("persona_id").notNull().references(() => personas.id),
  tags: text("tags").array(),
  contentCount: integer("content_count").default(0).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    cliqueIdIdx: index("chain_clique_id_idx").on(table.cliqueId),
    creatorIdIdx: index("chain_creator_id_idx").on(table.creatorId),
    lastActivityIdx: index("chain_last_activity_idx").on(table.lastActivityAt)
  };
});

export const chainRelations = relations(chains, ({ one, many }) => ({
  clique: one(cliques, {
    fields: [chains.cliqueId],
    references: [cliques.id]
  }),
  creator: one(users, {
    fields: [chains.creatorId],
    references: [users.id],
    relationName: "creator"
  }),
  persona: one(personas, {
    fields: [chains.personaId],
    references: [personas.id]
  }),
  contents: many(chainContents)
}));

export const chainSchema = createSelectSchema(chains);
export const insertChainSchema = createInsertSchema(chains).omit({
  id: true,
  contentCount: true,
  lastActivityAt: true,
  createdAt: true,
  updatedAt: true
});

export type Chain = typeof chains.$inferSelect;
export type InsertChain = z.infer<typeof insertChainSchema>;

// Chain content entries
export const chainContents = pgTable("chain_contents", {
  id: serial("id").primaryKey(),
  chainId: integer("chain_id").notNull().references(() => chains.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  personaId: integer("persona_id").references(() => personas.id),
  content: text("content").notNull(),
  contentType: varchar("content_type", { length: 50 }).default("text").notNull(),
  mediaUrl: varchar("media_url", { length: 255 }),
  position: integer("position").notNull(),
  reactionCount: integer("reaction_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    chainIdIdx: index("content_chain_id_idx").on(table.chainId),
    userIdIdx: index("content_user_id_idx").on(table.userId),
    positionIdx: index("content_position_idx").on(table.chainId, table.position)
  };
});

export const chainContentRelations = relations(chainContents, ({ one, many }) => ({
  chain: one(chains, {
    fields: [chainContents.chainId],
    references: [chains.id]
  }),
  user: one(users, {
    fields: [chainContents.userId],
    references: [users.id]
  }),
  persona: one(personas, {
    fields: [chainContents.personaId],
    references: [personas.id],
    nullable: true
  }),
  reactions: many(reactions)
}));

export const chainContentSchema = createSelectSchema(chainContents);
export const insertChainContentSchema = createInsertSchema(chainContents).omit({
  id: true,
  reactionCount: true,
  createdAt: true,
  updatedAt: true
});

export type ChainContent = typeof chainContents.$inferSelect;
export type InsertChainContent = z.infer<typeof insertChainContentSchema>;

// Reactions to chain content
export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  chainContentId: integer("chain_content_id").notNull().references(() => chainContents.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    contentIdIdx: index("reaction_content_id_idx").on(table.chainContentId),
    userIdIdx: index("reaction_user_id_idx").on(table.userId),
    uniqueUserReaction: unique("unique_user_reaction").on(table.chainContentId, table.userId)
  };
});

export const reactionRelations = relations(reactions, ({ one }) => ({
  chainContent: one(chainContents, {
    fields: [reactions.chainContentId],
    references: [chainContents.id]
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id]
  })
}));

export const reactionSchema = createSelectSchema(reactions);
export const insertReactionSchema = createInsertSchema(reactions).omit({
  id: true,
  createdAt: true
});

export type Reaction = typeof reactions.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;

// Reputation system
export const reputations = pgTable("reputations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeType: varchar("badge_type", { length: 50 }).notNull(),
  badgeName: varchar("badge_name", { length: 100 }).notNull(),
  cliqueId: integer("clique_id").references(() => cliques.id),
  level: integer("level").default(1).notNull(),
  points: integer("points").default(10).notNull(),
  awardedAt: timestamp("awarded_at").defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index("reputation_user_id_idx").on(table.userId),
    cliqueIdIdx: index("reputation_clique_id_idx").on(table.cliqueId),
    badgeTypeIdx: index("reputation_badge_type_idx").on(table.badgeType)
  };
});

export const reputationRelations = relations(reputations, ({ one }) => ({
  user: one(users, {
    fields: [reputations.userId],
    references: [users.id]
  }),
  clique: one(cliques, {
    fields: [reputations.cliqueId],
    references: [cliques.id],
    nullable: true
  })
}));

export const reputationSchema = createSelectSchema(reputations);
export const insertReputationSchema = createInsertSchema(reputations).omit({
  id: true,
  points: true,
  awardedAt: true
});

export type Reputation = typeof reputations.$inferSelect;
export type InsertReputation = z.infer<typeof insertReputationSchema>;

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 100 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 255 }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index("notification_user_id_idx").on(table.userId),
    isReadIdx: index("notification_is_read_idx").on(table.isRead),
    createdAtIdx: index("notification_created_at_idx").on(table.createdAt)
  };
});

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const notificationSchema = createSelectSchema(notifications);
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Type with relationships
export type UserWithPersonas = User & {
  personas: Persona[];
};

export type CliqueWithMembers = Clique & {
  members: (CliqueMember & {
    user: Partial<User>;
    persona: Partial<Persona>;
  })[];
};

export type ChainWithContents = Chain & {
  contents: (ChainContent & {
    user: Partial<User>;
    persona: Partial<Persona> | null;
    reactions: Reaction[];
  })[];
  clique: Partial<Clique>;
};

export type SuggestedClique = {
  id: number;
  name: string;
  description: string;
  coverImageUrl: string | null;
  category: string;
  memberCount: number;
  members: Array<{ 
    id: number; 
    username: string; 
    displayName: string;
    avatarUrl: string | null;
  }>;
};
