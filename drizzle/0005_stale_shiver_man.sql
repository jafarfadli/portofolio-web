ALTER TABLE `achievements` ADD `organizer` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `phone_shot_id` integer REFERENCES media(id);