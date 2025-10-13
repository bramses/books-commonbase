CREATE TABLE `commonbase` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`data` text NOT NULL,
	`metadata` text DEFAULT '{}',
	`created` text DEFAULT CURRENT_TIMESTAMP,
	`updated` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`embedding` text NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `commonbase`(`id`) ON UPDATE no action ON DELETE cascade
);
