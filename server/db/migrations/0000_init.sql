CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"secret_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_secret_hash_unique" UNIQUE("secret_hash")
);
--> statement-breakpoint
CREATE TABLE "save_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"slot" smallint NOT NULL,
	"revision" integer NOT NULL,
	"saved_at" timestamp with time zone NOT NULL,
	"data" json NOT NULL,
	"summary" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saves" (
	"player_id" uuid NOT NULL,
	"slot" smallint NOT NULL,
	"revision" integer NOT NULL,
	"format_version" integer,
	"saved_at" timestamp with time zone NOT NULL,
	"data" json,
	"name" text,
	"cls" text,
	"level" integer,
	"act" text,
	"step" text,
	"district" text,
	"ng_plus" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saves_player_id_slot_pk" PRIMARY KEY("player_id","slot"),
	CONSTRAINT "saves_slot_range" CHECK ("saves"."slot" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "save_history" ADD CONSTRAINT "save_history_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "save_history_slot_idx" ON "save_history" USING btree ("player_id","slot","revision" DESC NULLS LAST);