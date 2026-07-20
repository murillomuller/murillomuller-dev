CREATE TABLE `about` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`locale` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`status` text DEFAULT 'discovered' NOT NULL,
	`match_score` integer,
	`match_reasons` text,
	`adapted_cv_path` text,
	`cover_letter` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_error_id` integer,
	`pending_error` text,
	`pending_fields_json` text,
	`updated_at` integer DEFAULT 1784579512961 NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `apply_flow_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flow_id` integer,
	`application_id` integer NOT NULL,
	`job_id` integer NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`meta_json` text,
	`created_at` integer DEFAULT 1784579512962 NOT NULL,
	`updated_at` integer DEFAULT 1784579512962 NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `apply_flows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `apply_flows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain` text NOT NULL,
	`ats_hint` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`success_count` integer DEFAULT 0 NOT NULL,
	`fail_count` integer DEFAULT 0 NOT NULL,
	`last_success_at` integer,
	`steps_json` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT 1784579512961 NOT NULL,
	`updated_at` integer DEFAULT 1784579512961 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `apply_flows_domain_unique` ON `apply_flows` (`domain`);--> statement-breakpoint
CREATE TABLE `apply_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`step` text NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`screenshot_path` text,
	`html_snapshot_path` text,
	`stack` text,
	`meta_json` text,
	`created_at` integer DEFAULT 1784579512961 NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `education` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`institution` text NOT NULL,
	`degree` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`locale` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `experience` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`description` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`locale` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_search_prefs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keywords` text DEFAULT '' NOT NULL,
	`titles` text DEFAULT '' NOT NULL,
	`locations` text DEFAULT '' NOT NULL,
	`workplaces` text DEFAULT 'remote,hybrid,onsite' NOT NULL,
	`seniority` text DEFAULT '' NOT NULL,
	`salary_min` integer,
	`excluded_companies` text DEFAULT '' NOT NULL,
	`languages` text DEFAULT '' NOT NULL,
	`enabled_sources` text DEFAULT '["linkedin"]' NOT NULL,
	`auto_apply_enabled` integer DEFAULT false NOT NULL,
	`min_match_score` integer DEFAULT 70 NOT NULL,
	`max_applies_per_day` integer DEFAULT 10 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`location` text NOT NULL,
	`salary_text` text,
	`salary_min` integer,
	`salary_max` integer,
	`benefits_json` text,
	`description_full` text NOT NULL,
	`description_summary` text,
	`posted_at` text,
	`raw_json` text,
	`created_at` integer DEFAULT 1784579512961 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_external_id_unique` ON `jobs` (`external_id`);--> statement-breakpoint
CREATE TABLE `languages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`level` text NOT NULL,
	`locale` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `linkedin_session` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`encrypted_state_path` text NOT NULL,
	`last_validated_at` integer
);
--> statement-breakpoint
CREATE TABLE `portfolio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`image_path` text,
	`link` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`locale` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`avatar_path` text,
	`github_url` text,
	`linkedin_url` text,
	`locale` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `screening_memory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_key` text NOT NULL,
	`label_sample` text NOT NULL,
	`kind` text DEFAULT 'text' NOT NULL,
	`answer` text NOT NULL,
	`options_json` text,
	`source` text DEFAULT 'user' NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT 1784579512961 NOT NULL,
	`updated_at` integer DEFAULT 1784579512961 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `screening_memory_question_key_unique` ON `screening_memory` (`question_key`);--> statement-breakpoint
CREATE TABLE `skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`level` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ui_strings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`locale` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worker_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`searched` integer DEFAULT 0 NOT NULL,
	`scored` integer DEFAULT 0 NOT NULL,
	`applied` integer DEFAULT 0 NOT NULL,
	`needs_review` integer DEFAULT 0 NOT NULL,
	`failed` integer DEFAULT 0 NOT NULL,
	`skipped` integer DEFAULT 0 NOT NULL,
	`message` text,
	`meta_json` text
);
