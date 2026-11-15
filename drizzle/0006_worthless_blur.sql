ALTER TABLE `projects` ADD `shot2_id` integer REFERENCES media(id);--> statement-breakpoint
ALTER TABLE `projects` ADD `shot3_id` integer REFERENCES media(id);--> statement-breakpoint
ALTER TABLE `projects` ADD `shot4_id` integer REFERENCES media(id);--> statement-breakpoint
ALTER TABLE `projects` ADD `features` text DEFAULT '[]' NOT NULL;