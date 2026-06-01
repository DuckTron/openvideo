ALTER TABLE "api_token" ALTER COLUMN "scopes" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "api_token" ALTER COLUMN "scopes" SET DEFAULT 'all';--> statement-breakpoint
ALTER TABLE "asset_transcript" ADD CONSTRAINT "asset_transcript_asset_id_unique" UNIQUE("asset_id");--> statement-breakpoint
ALTER TABLE "asset_visual_timeline" ADD CONSTRAINT "asset_visual_timeline_asset_id_unique" UNIQUE("asset_id");