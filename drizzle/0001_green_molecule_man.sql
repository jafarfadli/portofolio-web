CREATE TABLE `admin_user` (
	`id` integer PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` integer NOT NULL,
	`ok` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_attempts_at` ON `login_attempts` (`at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE `media` ADD `variants` text DEFAULT '[]' NOT NULL;