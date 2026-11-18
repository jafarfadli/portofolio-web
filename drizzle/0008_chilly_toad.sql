ALTER TABLE `projects` ADD `article` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `article_published` integer DEFAULT false NOT NULL;