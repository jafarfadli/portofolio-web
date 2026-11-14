CREATE TABLE `achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`show_on_site` integer DEFAULT true NOT NULL,
	`show_in_cv` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`title` text NOT NULL,
	`rank` text NOT NULL,
	`rank_label` text NOT NULL,
	`description` text NOT NULL,
	`year` text NOT NULL,
	`seal_text` text,
	`seal_caption` text,
	`caption` text NOT NULL,
	`story` text NOT NULL,
	`cv_line` text NOT NULL,
	`cv_year` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`show_on_site` integer DEFAULT true NOT NULL,
	`show_in_cv` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`title` text NOT NULL,
	`subtitle` text NOT NULL,
	`role` text NOT NULL,
	`role_label` text NOT NULL,
	`year` text NOT NULL,
	`photo_id` integer,
	`url` text,
	`cv_line` text NOT NULL,
	FOREIGN KEY (`photo_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cv_profile_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`item_type` text NOT NULL,
	`item_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `cv_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cv_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`summary_override` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cv_profiles_slug_unique` ON `cv_profiles` (`slug`);--> statement-breakpoint
CREATE TABLE `education` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`show_on_site` integer DEFAULT true NOT NULL,
	`show_in_cv` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`degree` text NOT NULL,
	`institution` text NOT NULL,
	`period` text NOT NULL,
	`note` text NOT NULL,
	`cv_note` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `experiences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`show_on_site` integer DEFAULT true NOT NULL,
	`show_in_cv` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`role` text NOT NULL,
	`org` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`period` text NOT NULL,
	`cv_period` text NOT NULL,
	`summary` text NOT NULL,
	`cv_bullets` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`path` text NOT NULL,
	`kind` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`alt` text NOT NULL,
	`provenance` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`role` text NOT NULL,
	`stack_line` text NOT NULL,
	`location` text NOT NULL,
	`availability_note` text NOT NULL,
	`open_to_work` integer DEFAULT true NOT NULL,
	`open_to_work_label` text NOT NULL,
	`email` text NOT NULL,
	`site_url` text NOT NULL,
	`github_url` text NOT NULL,
	`linkedin_url` text NOT NULL,
	`statement_line1` text NOT NULL,
	`statement_line2` text NOT NULL,
	`about_text` text NOT NULL,
	`closing_line` text NOT NULL,
	`cv_summary` text NOT NULL,
	`cv_location_line` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`show_on_site` integer DEFAULT true NOT NULL,
	`show_in_cv` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`headline` text NOT NULL,
	`period` text NOT NULL,
	`role_line` text NOT NULL,
	`tags` text NOT NULL,
	`field_color` text NOT NULL,
	`screenshot_id` integer,
	`sticker_caption` text NOT NULL,
	`card_art` text NOT NULL,
	`layout` text NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`metric_value` text NOT NULL,
	`metric_label` text NOT NULL,
	`metric_is_sample` integer DEFAULT false NOT NULL,
	`live_url` text,
	`code_url` text,
	`case_study_md` text DEFAULT '' NOT NULL,
	`cv_title` text NOT NULL,
	`cv_line` text NOT NULL,
	FOREIGN KEY (`screenshot_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE TABLE `skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`show_on_site` integer DEFAULT true NOT NULL,
	`show_in_cv` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`group_name` text NOT NULL,
	`name` text NOT NULL,
	`rot` real DEFAULT 0 NOT NULL
);
