CREATE TABLE "chain_contents" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"persona_id" integer,
	"content" text NOT NULL,
	"content_type" varchar(50) DEFAULT 'text' NOT NULL,
	"media_url" varchar(255),
	"position" integer NOT NULL,
	"reaction_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chains" (
	"id" serial PRIMARY KEY NOT NULL,
	"clique_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"creator_id" integer NOT NULL,
	"persona_id" integer NOT NULL,
	"tags" text[],
	"content_count" integer DEFAULT 0 NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clique_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"clique_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"persona_id" integer NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_active" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clique_user_unique" UNIQUE("clique_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "cliques" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"cover_image_url" varchar(255),
	"category" varchar(50) NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"creator_id" integer NOT NULL,
	"member_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(100) NOT NULL,
	"message" text NOT NULL,
	"link" varchar(255),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"bio" text,
	"avatar_url" varchar(255),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_default_persona" UNIQUE("user_id","is_default")
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain_content_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_reaction" UNIQUE("chain_content_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "reputations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge_type" varchar(50) NOT NULL,
	"badge_name" varchar(100) NOT NULL,
	"clique_id" integer,
	"level" integer DEFAULT 1 NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"awarded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password" varchar(255) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"bio" text,
	"avatar_url" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chain_contents" ADD CONSTRAINT "chain_contents_chain_id_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."chains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_contents" ADD CONSTRAINT "chain_contents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_contents" ADD CONSTRAINT "chain_contents_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chains" ADD CONSTRAINT "chains_clique_id_cliques_id_fk" FOREIGN KEY ("clique_id") REFERENCES "public"."cliques"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chains" ADD CONSTRAINT "chains_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chains" ADD CONSTRAINT "chains_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clique_members" ADD CONSTRAINT "clique_members_clique_id_cliques_id_fk" FOREIGN KEY ("clique_id") REFERENCES "public"."cliques"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clique_members" ADD CONSTRAINT "clique_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clique_members" ADD CONSTRAINT "clique_members_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliques" ADD CONSTRAINT "cliques_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_chain_content_id_chain_contents_id_fk" FOREIGN KEY ("chain_content_id") REFERENCES "public"."chain_contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputations" ADD CONSTRAINT "reputations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputations" ADD CONSTRAINT "reputations_clique_id_cliques_id_fk" FOREIGN KEY ("clique_id") REFERENCES "public"."cliques"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_chain_id_idx" ON "chain_contents" USING btree ("chain_id");--> statement-breakpoint
CREATE INDEX "content_user_id_idx" ON "chain_contents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_position_idx" ON "chain_contents" USING btree ("chain_id","position");--> statement-breakpoint
CREATE INDEX "chain_clique_id_idx" ON "chains" USING btree ("clique_id");--> statement-breakpoint
CREATE INDEX "chain_creator_id_idx" ON "chains" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "chain_last_activity_idx" ON "chains" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "member_clique_id_idx" ON "clique_members" USING btree ("clique_id");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "clique_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_persona_id_idx" ON "clique_members" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "clique_name_idx" ON "cliques" USING btree ("name");--> statement-breakpoint
CREATE INDEX "clique_category_idx" ON "cliques" USING btree ("category");--> statement-breakpoint
CREATE INDEX "clique_creator_idx" ON "cliques" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "notification_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notification_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "persona_user_id_idx" ON "personas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reaction_content_id_idx" ON "reactions" USING btree ("chain_content_id");--> statement-breakpoint
CREATE INDEX "reaction_user_id_idx" ON "reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reputation_user_id_idx" ON "reputations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reputation_clique_id_idx" ON "reputations" USING btree ("clique_id");--> statement-breakpoint
CREATE INDEX "reputation_badge_type_idx" ON "reputations" USING btree ("badge_type");--> statement-breakpoint
CREATE INDEX "username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "email_idx" ON "users" USING btree ("email");