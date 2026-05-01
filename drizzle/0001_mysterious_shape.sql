CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(200) NOT NULL,
	`title` varchar(300) NOT NULL,
	`metaDescription` varchar(320) NOT NULL DEFAULT '',
	`body` text NOT NULL,
	`tldr` text,
	`category` varchar(80) NOT NULL DEFAULT 'General',
	`tags` json NOT NULL DEFAULT ('[]'),
	`author` varchar(80) NOT NULL DEFAULT 'The Oracle Lover',
	`heroUrl` varchar(500),
	`heroAlt` varchar(320),
	`wordCount` int NOT NULL DEFAULT 0,
	`readingTime` int NOT NULL DEFAULT 8,
	`asinsUsed` json NOT NULL DEFAULT ('[]'),
	`internalLinksUsed` json NOT NULL DEFAULT ('[]'),
	`status` enum('queued','published') NOT NULL DEFAULT 'queued',
	`queuedAt` timestamp DEFAULT (now()),
	`publishedAt` timestamp,
	`lastModifiedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`openerType` enum('gut-punch','question','story','counterintuitive') NOT NULL DEFAULT 'gut-punch',
	`conclusionType` enum('cta','reflection','question','challenge','benediction') NOT NULL DEFAULT 'reflection',
	CONSTRAINT `articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `articles_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `asin_cache` (
	`asin` varchar(16) NOT NULL,
	`title` varchar(320) NOT NULL DEFAULT '',
	`category` varchar(80) NOT NULL DEFAULT '',
	`tags` json NOT NULL DEFAULT ('[]'),
	`status` enum('valid','invalid','unknown') NOT NULL DEFAULT 'unknown',
	`lastChecked` timestamp,
	CONSTRAINT `asin_cache_asin` PRIMARY KEY(`asin`)
);
--> statement-breakpoint
CREATE TABLE `cron_runs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`job` varchar(80) NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	`status` enum('ok','error','skipped') NOT NULL DEFAULT 'ok',
	`detail` text,
	CONSTRAINT `cron_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`source` varchar(80) NOT NULL DEFAULT 'homepage',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscribers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `articles_status_published_at` ON `articles` (`status`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `articles_status_queued_at` ON `articles` (`status`,`queuedAt`);