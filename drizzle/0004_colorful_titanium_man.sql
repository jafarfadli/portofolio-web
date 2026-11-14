ALTER TABLE `achievements` ADD `photo2_id` integer REFERENCES media(id);--> statement-breakpoint
ALTER TABLE `achievements` ADD `photo3_id` integer REFERENCES media(id);--> statement-breakpoint
ALTER TABLE `achievements` ADD `photo4_id` integer REFERENCES media(id);