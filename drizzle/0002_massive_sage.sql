ALTER TABLE `profile` ADD `full_name` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `photo_id` integer REFERENCES media(id);--> statement-breakpoint
ALTER TABLE `profile` ADD `cv_photo_id` integer REFERENCES media(id);