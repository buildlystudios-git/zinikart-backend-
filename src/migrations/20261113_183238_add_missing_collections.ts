import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE SCHEMA IF NOT EXISTS "payload";
   CREATE TYPE "payload"."enum_retailers_payment_methods_method_type" AS ENUM('bank_account', 'upi');
  CREATE TYPE "payload"."enum_retailers_online_status" AS ENUM('online', 'offline');
  CREATE TYPE "payload"."enum_delivery_partners_payment_methods_method_type" AS ENUM('bank_account', 'upi');
  CREATE TYPE "payload"."enum_delivery_partners_gender" AS ENUM('male', 'female', 'other');
  CREATE TYPE "payload"."enum_payout_ledger_recipient_type" AS ENUM('retailer', 'delivery_partner');
  CREATE TYPE "payload"."enum_payout_ledger_status" AS ENUM('pending', 'eligible', 'processing', 'paid', 'failed', 'on_hold', 'cancelled');
  CREATE TYPE "payload"."enum_payout_invoices_invoice_type" AS ENUM('retailer', 'delivery_partner');
  CREATE TYPE "payload"."enum_payout_invoices_payout_destination_method_type" AS ENUM('bank_account', 'upi');
  CREATE TYPE "payload"."enum_payout_invoices_status" AS ENUM('draft', 'issued', 'paid');
  CREATE TYPE "payload"."enum_support_chats_participants_role" AS ENUM('admin');
  CREATE TYPE "payload"."enum_support_chats_type" AS ENUM('order_issue', 'general_query', 'delivery_issue', 'payment_issue', 'other');
  CREATE TYPE "payload"."enum_support_chats_status" AS ENUM('open', 'pending', 'resolved', 'closed');
  CREATE TYPE "payload"."enum_support_chats_initiator_type" AS ENUM('customer', 'retailer', 'delivery_partner', 'admin');
  CREATE TYPE "payload"."enum_chat_messages_sender_role" AS ENUM('customer', 'retailer', 'delivery_partner', 'admin');
  CREATE TYPE "payload"."enum_chat_messages_message_type" AS ENUM('text', 'image', 'file', 'system');
  CREATE TYPE "payload"."enum_contact_us_status" AS ENUM('new', 'in_progress', 'resolved');
  CREATE TYPE "payload"."enum_orders_status_history_change_source" AS ENUM('retailer', 'delivery_partner', 'customer', 'admin', 'system');
  CREATE TYPE "payload"."enum_orders_delivery_partner_acceptance" AS ENUM('pending', 'accepted', 'rejected', 'unassignable');
  CREATE TYPE "payload"."enum_orders_cod_collection_record_status" AS ENUM('pending', 'collected');
  CREATE TYPE "payload"."enum_orders_cod_collection_record_payment_type" AS ENUM('cash', 'qr');
  CREATE TYPE "payload"."enum_transactions_razorpay_refund_status" AS ENUM('pending', 'processed', 'failed');
  CREATE TYPE "payload"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'assignDeliveryPartner', 'checkOfferTimeout', 'retailerActionTimeout', 'processRazorpayRefund', 'processPayouts');
  CREATE TYPE "payload"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "payload"."enum_payload_jobs_workflow_slug" AS ENUM('hourlyPayoutCheck');
  CREATE TYPE "payload"."enum_payload_jobs_task_slug" AS ENUM('inline', 'assignDeliveryPartner', 'checkOfferTimeout', 'retailerActionTimeout', 'processRazorpayRefund', 'processPayouts');
  CREATE TYPE "payload"."enum_agent_settings_provider" AS ENUM('openai', 'google', 'anthropic', 'vercel');
  CREATE TYPE "payload"."enum_platform_settings_delivery_fee_mode" AS ENUM('flat', 'variable');
  CREATE TYPE "payload"."enum_platform_settings_payout_delay_label" AS ENUM('immediate', 'daily', 'weekly', 'biweekly', 'monthly');
  CREATE TYPE "payload"."enum_platform_settings_payout_mode" AS ENUM('manual', 'auto');
  ALTER TYPE "payload"."enum_transactions_payment_method" ADD VALUE 'razorpay';
  ALTER TYPE "payload"."enum_transactions_payment_method" ADD VALUE 'cod';
  CREATE TABLE "payload"."retailers_payment_methods" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"method_type" "payload"."enum_retailers_payment_methods_method_type" NOT NULL,
  	"is_default" boolean DEFAULT false,
  	"account_holder_name" varchar,
  	"account_number" varchar,
  	"ifsc_code" varchar,
  	"bank_name" varchar,
  	"upi_id" varchar
  );
  
  CREATE TABLE "payload"."delivery_partners_payment_methods" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"method_type" "payload"."enum_delivery_partners_payment_methods_method_type" NOT NULL,
  	"is_default" boolean DEFAULT false,
  	"account_holder_name" varchar,
  	"account_number" varchar,
  	"ifsc_code" varchar,
  	"bank_name" varchar,
  	"upi_id" varchar
  );
  
  CREATE TABLE "payload"."brands_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" uuid
  );
  
  CREATE TABLE "payload"."ratings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"rating" numeric NOT NULL,
  	"review_text" varchar,
  	"product_id" uuid NOT NULL,
  	"retailer_id" uuid NOT NULL,
  	"customer_id" uuid NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."wishlists" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"product_id" uuid NOT NULL,
  	"customer_id" uuid NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payout_ledger" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_id" uuid NOT NULL,
  	"recipient_id" uuid NOT NULL,
  	"recipient_type" "payload"."enum_payout_ledger_recipient_type" NOT NULL,
  	"retailer_profile_id" uuid,
  	"delivery_partner_profile_id" uuid,
  	"gross_amount" numeric NOT NULL,
  	"platform_fee_percent" numeric NOT NULL,
  	"platform_fee_amount" numeric NOT NULL,
  	"net_amount" numeric NOT NULL,
  	"delivered_at" timestamp(3) with time zone NOT NULL,
  	"eligible_at" timestamp(3) with time zone NOT NULL,
  	"paid_at" timestamp(3) with time zone,
  	"status" "payload"."enum_payout_ledger_status" DEFAULT 'pending' NOT NULL,
  	"payout_ref" varchar,
  	"payout_invoice_id" uuid,
  	"admin_notes" varchar,
  	"failure_reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payout_invoices_line_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"order_ref_id" uuid NOT NULL,
  	"order_number" varchar,
  	"gross_amount" numeric NOT NULL,
  	"platform_fee_percent" numeric NOT NULL,
  	"platform_fee_amount" numeric NOT NULL,
  	"net_amount" numeric NOT NULL,
  	"delivered_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."payout_invoices" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"invoice_number" varchar NOT NULL,
  	"invoice_type" "payload"."enum_payout_invoices_invoice_type" NOT NULL,
  	"recipient_id" uuid NOT NULL,
  	"retailer_profile_id" uuid,
  	"delivery_partner_profile_id" uuid,
  	"period_from" timestamp(3) with time zone NOT NULL,
  	"period_to" timestamp(3) with time zone NOT NULL,
  	"total_gross" numeric NOT NULL,
  	"total_fees" numeric NOT NULL,
  	"total_net" numeric NOT NULL,
  	"payout_destination_method_type" "payload"."enum_payout_invoices_payout_destination_method_type",
  	"payout_destination_account_holder_name" varchar,
  	"payout_destination_account_number" varchar,
  	"payout_destination_ifsc_code" varchar,
  	"payout_destination_upi_id" varchar,
  	"status" "payload"."enum_payout_invoices_status" DEFAULT 'draft' NOT NULL,
  	"issued_at" timestamp(3) with time zone,
  	"paid_at" timestamp(3) with time zone,
  	"payout_ref" varchar,
  	"admin_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."support_chats_participants" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"user_id" uuid NOT NULL,
  	"role" "payload"."enum_support_chats_participants_role" DEFAULT 'admin'
  );
  
  CREATE TABLE "payload"."support_chats" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"heading" varchar NOT NULL,
  	"type" "payload"."enum_support_chats_type" DEFAULT 'general_query' NOT NULL,
  	"status" "payload"."enum_support_chats_status" DEFAULT 'open' NOT NULL,
  	"initiator_id" uuid NOT NULL,
  	"initiator_type" "payload"."enum_support_chats_initiator_type" NOT NULL,
  	"order_id" uuid,
  	"last_message_at" timestamp(3) with time zone,
  	"last_message_preview" varchar,
  	"admin_notes" varchar,
  	"rating_score" numeric,
  	"rating_comment" varchar,
  	"rating_rated_by_id" uuid,
  	"rating_rated_at" timestamp(3) with time zone,
  	"resolved_at" timestamp(3) with time zone,
  	"resolved_by_id" uuid,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."chat_messages_read_by" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"user_id" uuid NOT NULL,
  	"read_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."chat_messages" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"chat_id" uuid NOT NULL,
  	"sender_id" uuid NOT NULL,
  	"sender_role" "payload"."enum_chat_messages_sender_role" NOT NULL,
  	"content" varchar,
  	"message_type" "payload"."enum_chat_messages_message_type" DEFAULT 'text',
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."chat_messages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"chat_media_id" uuid
  );
  
  CREATE TABLE "payload"."chat_media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"alt" varchar,
  	"prefix" varchar DEFAULT '',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload"."contact_us" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"full_name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"subject" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"status" "payload"."enum_contact_us_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."orders_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"status" varchar NOT NULL,
  	"timestamp" timestamp(3) with time zone NOT NULL,
  	"changed_by_id" uuid,
  	"change_source" "payload"."enum_orders_status_history_change_source" NOT NULL
  );
  
  CREATE TABLE "payload"."payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "payload"."enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "payload"."enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload"."payload_jobs" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"workflow_slug" "payload"."enum_payload_jobs_workflow_slug",
  	"task_slug" "payload"."enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"concurrency_key" varchar,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."agent_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"provider" "payload"."enum_agent_settings_provider" DEFAULT 'openai' NOT NULL,
  	"api_key" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."agent_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid
  );
  
  CREATE TABLE "payload"."platform_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"delivery_fee_mode" "payload"."enum_platform_settings_delivery_fee_mode" DEFAULT 'flat' NOT NULL,
  	"default_delivery_fee" numeric DEFAULT 50 NOT NULL,
  	"platform_fee_retailer" numeric DEFAULT 10 NOT NULL,
  	"platform_fee_d_p" numeric DEFAULT 5 NOT NULL,
  	"payout_delay_days" numeric DEFAULT 7 NOT NULL,
  	"payout_delay_label" "payload"."enum_platform_settings_payout_delay_label" DEFAULT 'weekly' NOT NULL,
  	"min_payout_amount_i_n_r" numeric DEFAULT 100 NOT NULL,
  	"payout_mode" "payload"."enum_platform_settings_payout_mode" DEFAULT 'manual' NOT NULL,
  	"razorpay_x_group_razorpay_x_account_number" varchar,
  	"razorpay_x_group_razorpay_x_key_id" varchar,
  	"razorpay_x_group_razorpay_x_key_secret" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."payload_jobs_stats" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DEFAULT 'INR'::text;
  DROP TYPE "payload"."enum_carts_currency";
  CREATE TYPE "payload"."enum_carts_currency" AS ENUM('INR');
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DEFAULT 'INR'::"payload"."enum_carts_currency";
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_carts_currency" USING "currency"::"payload"."enum_carts_currency";
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DEFAULT 'placed'::text;
  DROP TYPE "payload"."enum_orders_status";
  CREATE TYPE "payload"."enum_orders_status" AS ENUM('placed', 'order_received', 'preparing', 'packed', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'reached_location', 'delivered', 'cod_payment_received', 'cancelled');
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DEFAULT 'placed'::"payload"."enum_orders_status";
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DATA TYPE "payload"."enum_orders_status" USING "status"::"payload"."enum_orders_status";
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DEFAULT 'INR'::text;
  DROP TYPE "payload"."enum_orders_currency";
  CREATE TYPE "payload"."enum_orders_currency" AS ENUM('INR');
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DEFAULT 'INR'::"payload"."enum_orders_currency";
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_orders_currency" USING "currency"::"payload"."enum_orders_currency";
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DEFAULT 'INR'::text;
  DROP TYPE "payload"."enum_transactions_currency";
  CREATE TYPE "payload"."enum_transactions_currency" AS ENUM('INR');
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DEFAULT 'INR'::"payload"."enum_transactions_currency";
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_transactions_currency" USING "currency"::"payload"."enum_transactions_currency";
  ALTER TABLE "payload"."users_roles" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."users_roles" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."users_roles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."users_sessions" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."users" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."pages_hero_links" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_blocks_cta" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_blocks_content" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_blocks_media_block" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_blocks_media_block" ALTER COLUMN "media_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_blocks_archive" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_blocks_carousel" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_blocks_three_item_grid" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_blocks_form_block" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_blocks_form_block" ALTER COLUMN "form_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."pages" ALTER COLUMN "hero_media_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages" ALTER COLUMN "meta_image_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_rels" ALTER COLUMN "pages_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_rels" ALTER COLUMN "categories_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."pages_rels" ALTER COLUMN "products_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_version_hero_links" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_version_hero_links" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_version_hero_links" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v_blocks_cta_links" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_cta_links" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_cta_links" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v_blocks_cta" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_cta" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_cta" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v_blocks_content_columns" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_content_columns" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_content_columns" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v_blocks_content" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_content" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_content" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ALTER COLUMN "media_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_archive" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_archive" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_archive" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v_blocks_carousel" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_carousel" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_carousel" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v_blocks_three_item_grid" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_three_item_grid" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_three_item_grid" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v_blocks_banner" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_banner" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_banner" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v_blocks_form_block" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_form_block" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_blocks_form_block" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v_blocks_form_block" ALTER COLUMN "form_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_pages_v" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v" ALTER COLUMN "version_hero_media_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v" ALTER COLUMN "version_meta_image_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_rels" ALTER COLUMN "pages_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_rels" ALTER COLUMN "categories_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_pages_v_rels" ALTER COLUMN "products_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."categories_specification_templates" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."categories" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."categories" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."categories" ALTER COLUMN "parent_category_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."media" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."media" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."retailers_business_hours_week_off" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."retailers_business_hours_week_off" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."retailers_business_hours_week_off" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."retailers" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."retailers" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."retailers" ALTER COLUMN "user_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."retailers_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."retailers_rels" ALTER COLUMN "media_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."delivery_partners" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."delivery_partners" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."delivery_partners" ALTER COLUMN "driving_license_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."delivery_partners" ALTER COLUMN "user_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."brands" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."brands" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."brands" ALTER COLUMN "logo_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms_blocks_checkbox" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms_blocks_country" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms_blocks_email" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms_blocks_message" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms_blocks_number" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms_blocks_select" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms_blocks_state" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms_blocks_text" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms_blocks_textarea" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms_emails" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."forms" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."form_submissions_submission_data" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."form_submissions" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."form_submissions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."form_submissions" ALTER COLUMN "form_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."addresses" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."addresses" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."addresses" ALTER COLUMN "customer_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."variants" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."variants" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."variants" ALTER COLUMN "product_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."variants_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."variants_rels" ALTER COLUMN "variant_options_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_variants_v" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_variants_v" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_variants_v" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_variants_v" ALTER COLUMN "version_product_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_variants_v_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_variants_v_rels" ALTER COLUMN "variant_options_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."variant_types" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."variant_types" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."variant_options" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."variant_options" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."variant_options" ALTER COLUMN "variant_type_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_gallery" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_gallery" ALTER COLUMN "image_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_gallery" ALTER COLUMN "variant_option_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_blocks_cta" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_blocks_content" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_blocks_media_block" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_blocks_media_block" ALTER COLUMN "media_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_specifications" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."products" ALTER COLUMN "brand_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products" ALTER COLUMN "meta_image_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_rels" ALTER COLUMN "pages_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_rels" ALTER COLUMN "variant_types_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_rels" ALTER COLUMN "products_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."products_rels" ALTER COLUMN "categories_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_version_gallery" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_version_gallery" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_version_gallery" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_products_v_version_gallery" ALTER COLUMN "image_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_version_gallery" ALTER COLUMN "variant_option_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_blocks_cta_links" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_blocks_cta_links" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_blocks_cta_links" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_products_v_blocks_cta" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_blocks_cta" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_blocks_cta" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_products_v_blocks_content_columns" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_blocks_content_columns" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_blocks_content_columns" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_products_v_blocks_content" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_blocks_content" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_blocks_content" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_products_v_blocks_media_block" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_blocks_media_block" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_blocks_media_block" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_products_v_blocks_media_block" ALTER COLUMN "media_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_version_specifications" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_version_specifications" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_version_specifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_products_v" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."_products_v" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v" ALTER COLUMN "version_brand_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v" ALTER COLUMN "version_meta_image_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_rels" ALTER COLUMN "pages_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_rels" ALTER COLUMN "variant_types_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_rels" ALTER COLUMN "products_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."_products_v_rels" ALTER COLUMN "categories_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."carts_items" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."carts_items" ALTER COLUMN "product_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."carts_items" ALTER COLUMN "variant_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."carts" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."carts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."carts" ALTER COLUMN "customer_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."orders_items" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."orders_items" ALTER COLUMN "product_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."orders_items" ALTER COLUMN "variant_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."orders" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."orders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."orders" ALTER COLUMN "customer_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET NOT NULL;
  ALTER TABLE "payload"."orders_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."orders_rels" ALTER COLUMN "transactions_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."transactions_items" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."transactions_items" ALTER COLUMN "product_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."transactions_items" ALTER COLUMN "variant_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."transactions" ALTER COLUMN "customer_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "order_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "cart_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_kv" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_kv" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."payload_locked_documents" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "users_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "pages_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "categories_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "media_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "retailers_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "delivery_partners_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "brands_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "forms_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "form_submissions_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "addresses_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "variants_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "variant_types_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "variant_options_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "products_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "carts_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "orders_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "transactions_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_preferences" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_preferences" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."payload_preferences_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_preferences_rels" ALTER COLUMN "users_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_migrations" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."payload_migrations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."header_nav_items" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."header" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."header" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."header_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."header_rels" ALTER COLUMN "pages_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."footer_nav_items" ALTER COLUMN "_parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."footer" ALTER COLUMN "id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."footer" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  ALTER TABLE "payload"."footer_rels" ALTER COLUMN "parent_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."footer_rels" ALTER COLUMN "pages_id" SET DATA TYPE uuid;
  ALTER TABLE "payload"."users" ADD COLUMN "retailer_online_status" varchar;
  ALTER TABLE "payload"."categories" ADD COLUMN "media_id" uuid;
  ALTER TABLE "payload"."media" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "payload"."retailers" ADD COLUMN "profile_image_id" uuid;
  ALTER TABLE "payload"."retailers" ADD COLUMN "online_status" "payload"."enum_retailers_online_status" DEFAULT 'online' NOT NULL;
  ALTER TABLE "payload"."retailers" ADD COLUMN "average_rating" numeric DEFAULT 0;
  ALTER TABLE "payload"."retailers" ADD COLUMN "rating_count" numeric DEFAULT 0;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "profile_image_id" uuid;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "gender" "payload"."enum_delivery_partners_gender" NOT NULL;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "dob" timestamp(3) with time zone NOT NULL;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "driving_license_number" varchar NOT NULL;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "pancard_number" varchar NOT NULL;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "pancard_image_id" uuid NOT NULL;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "vehicle_brand" varchar NOT NULL;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "vehicle_registration_number" varchar NOT NULL;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "selfie_image_id" uuid NOT NULL;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "lat" numeric;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "lng" numeric;
  ALTER TABLE "payload"."delivery_partners" ADD COLUMN "last_location_updated_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."addresses" ADD COLUMN "lat" numeric;
  ALTER TABLE "payload"."addresses" ADD COLUMN "lng" numeric;
  ALTER TABLE "payload"."variants" ADD COLUMN "price_in_i_n_r_enabled" boolean;
  ALTER TABLE "payload"."variants" ADD COLUMN "price_in_i_n_r" numeric;
  ALTER TABLE "payload"."_variants_v" ADD COLUMN "version_price_in_i_n_r_enabled" boolean;
  ALTER TABLE "payload"."_variants_v" ADD COLUMN "version_price_in_i_n_r" numeric;
  ALTER TABLE "payload"."products" ADD COLUMN "price_in_i_n_r_enabled" boolean;
  ALTER TABLE "payload"."products" ADD COLUMN "price_in_i_n_r" numeric;
  ALTER TABLE "payload"."products" ADD COLUMN "discount_percent" numeric;
  ALTER TABLE "payload"."products" ADD COLUMN "discounted_price" numeric;
  ALTER TABLE "payload"."products" ADD COLUMN "average_rating" numeric DEFAULT 0;
  ALTER TABLE "payload"."products" ADD COLUMN "rating_count" numeric DEFAULT 0;
  ALTER TABLE "payload"."products" ADD COLUMN "retailer_id" uuid;
  ALTER TABLE "payload"."products" ADD COLUMN "is_master_template" boolean;
  ALTER TABLE "payload"."products" ADD COLUMN "parent_template_id" uuid;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_price_in_i_n_r_enabled" boolean;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_price_in_i_n_r" numeric;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_discount_percent" numeric;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_discounted_price" numeric;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_average_rating" numeric DEFAULT 0;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_rating_count" numeric DEFAULT 0;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_retailer_id" uuid;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_is_master_template" boolean;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_parent_template_id" uuid;
  ALTER TABLE "payload"."orders" ADD COLUMN "shipping_address_lat" numeric;
  ALTER TABLE "payload"."orders" ADD COLUMN "shipping_address_lng" numeric;
  ALTER TABLE "payload"."orders" ADD COLUMN "delivery_fee" numeric DEFAULT 0;
  ALTER TABLE "payload"."orders" ADD COLUMN "retailer_id" uuid NOT NULL;
  ALTER TABLE "payload"."orders" ADD COLUMN "delivery_partner_id" uuid;
  ALTER TABLE "payload"."orders" ADD COLUMN "delivery_partner_acceptance" "payload"."enum_orders_delivery_partner_acceptance" DEFAULT 'pending';
  ALTER TABLE "payload"."orders" ADD COLUMN "current_offered_partner_id" uuid;
  ALTER TABLE "payload"."orders" ADD COLUMN "offer_expires_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."orders" ADD COLUMN "pickup_o_t_p" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "delivery_o_t_p" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "cancellation_details_cancelled_by_id" uuid;
  ALTER TABLE "payload"."orders" ADD COLUMN "cancellation_details_cancelled_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."orders" ADD COLUMN "cancellation_details_cancellation_reason" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "cod_collection_record_status" "payload"."enum_orders_cod_collection_record_status" DEFAULT 'pending';
  ALTER TABLE "payload"."orders" ADD COLUMN "cod_collection_record_collected_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."orders" ADD COLUMN "cod_collection_record_payment_type" "payload"."enum_orders_cod_collection_record_payment_type";
  ALTER TABLE "payload"."orders" ADD COLUMN "cod_collection_record_collected_by_id" uuid;
  ALTER TABLE "payload"."orders_rels" ADD COLUMN "delivery_partners_id" uuid;
  ALTER TABLE "payload"."transactions" ADD COLUMN "razorpay_order_i_d" varchar;
  ALTER TABLE "payload"."transactions" ADD COLUMN "razorpay_payment_i_d" varchar;
  ALTER TABLE "payload"."transactions" ADD COLUMN "razorpay_signature" varchar;
  ALTER TABLE "payload"."transactions" ADD COLUMN "razorpay_refund_i_d" varchar;
  ALTER TABLE "payload"."transactions" ADD COLUMN "razorpay_refund_status" "payload"."enum_transactions_razorpay_refund_status";
  ALTER TABLE "payload"."transactions" ADD COLUMN "razorpay_refunded_amount" numeric;
  ALTER TABLE "payload"."transactions" ADD COLUMN "razorpay_refunded_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."transactions" ADD COLUMN "cod_notes" varchar;
  ALTER TABLE "payload"."transactions" ADD COLUMN "billing_address_lat" numeric;
  ALTER TABLE "payload"."transactions" ADD COLUMN "billing_address_lng" numeric;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "ratings_id" uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "wishlists_id" uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "payout_ledger_id" uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "payout_invoices_id" uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "support_chats_id" uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "chat_messages_id" uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "chat_media_id" uuid;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "contact_us_id" uuid;
  ALTER TABLE "payload"."retailers_payment_methods" ADD CONSTRAINT "retailers_payment_methods_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."retailers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."delivery_partners_payment_methods" ADD CONSTRAINT "delivery_partners_payment_methods_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."brands_rels" ADD CONSTRAINT "brands_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."brands_rels" ADD CONSTRAINT "brands_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."ratings" ADD CONSTRAINT "ratings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."ratings" ADD CONSTRAINT "ratings_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "payload"."retailers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."ratings" ADD CONSTRAINT "ratings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."wishlists" ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."wishlists" ADD CONSTRAINT "wishlists_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payout_ledger" ADD CONSTRAINT "payout_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "payload"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payout_ledger" ADD CONSTRAINT "payout_ledger_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payout_ledger" ADD CONSTRAINT "payout_ledger_retailer_profile_id_retailers_id_fk" FOREIGN KEY ("retailer_profile_id") REFERENCES "payload"."retailers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payout_ledger" ADD CONSTRAINT "payout_ledger_delivery_partner_profile_id_delivery_partners_id_fk" FOREIGN KEY ("delivery_partner_profile_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payout_ledger" ADD CONSTRAINT "payout_ledger_payout_invoice_id_payout_invoices_id_fk" FOREIGN KEY ("payout_invoice_id") REFERENCES "payload"."payout_invoices"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payout_invoices_line_items" ADD CONSTRAINT "payout_invoices_line_items_order_ref_id_orders_id_fk" FOREIGN KEY ("order_ref_id") REFERENCES "payload"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payout_invoices_line_items" ADD CONSTRAINT "payout_invoices_line_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."payout_invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payout_invoices" ADD CONSTRAINT "payout_invoices_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payout_invoices" ADD CONSTRAINT "payout_invoices_retailer_profile_id_retailers_id_fk" FOREIGN KEY ("retailer_profile_id") REFERENCES "payload"."retailers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payout_invoices" ADD CONSTRAINT "payout_invoices_delivery_partner_profile_id_delivery_partners_id_fk" FOREIGN KEY ("delivery_partner_profile_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."support_chats_participants" ADD CONSTRAINT "support_chats_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."support_chats_participants" ADD CONSTRAINT "support_chats_participants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."support_chats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."support_chats" ADD CONSTRAINT "support_chats_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."support_chats" ADD CONSTRAINT "support_chats_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "payload"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."support_chats" ADD CONSTRAINT "support_chats_rating_rated_by_id_users_id_fk" FOREIGN KEY ("rating_rated_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."support_chats" ADD CONSTRAINT "support_chats_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."chat_messages_read_by" ADD CONSTRAINT "chat_messages_read_by_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."chat_messages_read_by" ADD CONSTRAINT "chat_messages_read_by_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."chat_messages" ADD CONSTRAINT "chat_messages_chat_id_support_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "payload"."support_chats"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."chat_messages_rels" ADD CONSTRAINT "chat_messages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."chat_messages_rels" ADD CONSTRAINT "chat_messages_rels_chat_media_fk" FOREIGN KEY ("chat_media_id") REFERENCES "payload"."chat_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders_status_history" ADD CONSTRAINT "orders_status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_status_history" ADD CONSTRAINT "orders_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."agent_settings_rels" ADD CONSTRAINT "agent_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."agent_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."agent_settings_rels" ADD CONSTRAINT "agent_settings_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "retailers_payment_methods_order_idx" ON "payload"."retailers_payment_methods" USING btree ("_order");
  CREATE INDEX "retailers_payment_methods_parent_id_idx" ON "payload"."retailers_payment_methods" USING btree ("_parent_id");
  CREATE INDEX "delivery_partners_payment_methods_order_idx" ON "payload"."delivery_partners_payment_methods" USING btree ("_order");
  CREATE INDEX "delivery_partners_payment_methods_parent_id_idx" ON "payload"."delivery_partners_payment_methods" USING btree ("_parent_id");
  CREATE INDEX "brands_rels_order_idx" ON "payload"."brands_rels" USING btree ("order");
  CREATE INDEX "brands_rels_parent_idx" ON "payload"."brands_rels" USING btree ("parent_id");
  CREATE INDEX "brands_rels_path_idx" ON "payload"."brands_rels" USING btree ("path");
  CREATE INDEX "brands_rels_categories_id_idx" ON "payload"."brands_rels" USING btree ("categories_id");
  CREATE INDEX "ratings_product_idx" ON "payload"."ratings" USING btree ("product_id");
  CREATE INDEX "ratings_retailer_idx" ON "payload"."ratings" USING btree ("retailer_id");
  CREATE INDEX "ratings_customer_idx" ON "payload"."ratings" USING btree ("customer_id");
  CREATE INDEX "ratings_updated_at_idx" ON "payload"."ratings" USING btree ("updated_at");
  CREATE INDEX "ratings_created_at_idx" ON "payload"."ratings" USING btree ("created_at");
  CREATE INDEX "wishlists_product_idx" ON "payload"."wishlists" USING btree ("product_id");
  CREATE INDEX "wishlists_customer_idx" ON "payload"."wishlists" USING btree ("customer_id");
  CREATE INDEX "wishlists_updated_at_idx" ON "payload"."wishlists" USING btree ("updated_at");
  CREATE INDEX "wishlists_created_at_idx" ON "payload"."wishlists" USING btree ("created_at");
  CREATE INDEX "payout_ledger_order_idx" ON "payload"."payout_ledger" USING btree ("order_id");
  CREATE INDEX "payout_ledger_recipient_idx" ON "payload"."payout_ledger" USING btree ("recipient_id");
  CREATE INDEX "payout_ledger_retailer_profile_idx" ON "payload"."payout_ledger" USING btree ("retailer_profile_id");
  CREATE INDEX "payout_ledger_delivery_partner_profile_idx" ON "payload"."payout_ledger" USING btree ("delivery_partner_profile_id");
  CREATE INDEX "payout_ledger_payout_invoice_idx" ON "payload"."payout_ledger" USING btree ("payout_invoice_id");
  CREATE INDEX "payout_ledger_updated_at_idx" ON "payload"."payout_ledger" USING btree ("updated_at");
  CREATE INDEX "payout_ledger_created_at_idx" ON "payload"."payout_ledger" USING btree ("created_at");
  CREATE INDEX "payout_invoices_line_items_order_idx" ON "payload"."payout_invoices_line_items" USING btree ("_order");
  CREATE INDEX "payout_invoices_line_items_parent_id_idx" ON "payload"."payout_invoices_line_items" USING btree ("_parent_id");
  CREATE INDEX "payout_invoices_line_items_order_ref_idx" ON "payload"."payout_invoices_line_items" USING btree ("order_ref_id");
  CREATE UNIQUE INDEX "payout_invoices_invoice_number_idx" ON "payload"."payout_invoices" USING btree ("invoice_number");
  CREATE INDEX "payout_invoices_recipient_idx" ON "payload"."payout_invoices" USING btree ("recipient_id");
  CREATE INDEX "payout_invoices_retailer_profile_idx" ON "payload"."payout_invoices" USING btree ("retailer_profile_id");
  CREATE INDEX "payout_invoices_delivery_partner_profile_idx" ON "payload"."payout_invoices" USING btree ("delivery_partner_profile_id");
  CREATE INDEX "payout_invoices_updated_at_idx" ON "payload"."payout_invoices" USING btree ("updated_at");
  CREATE INDEX "payout_invoices_created_at_idx" ON "payload"."payout_invoices" USING btree ("created_at");
  CREATE INDEX "support_chats_participants_order_idx" ON "payload"."support_chats_participants" USING btree ("_order");
  CREATE INDEX "support_chats_participants_parent_id_idx" ON "payload"."support_chats_participants" USING btree ("_parent_id");
  CREATE INDEX "support_chats_participants_user_idx" ON "payload"."support_chats_participants" USING btree ("user_id");
  CREATE INDEX "support_chats_initiator_idx" ON "payload"."support_chats" USING btree ("initiator_id");
  CREATE INDEX "support_chats_order_idx" ON "payload"."support_chats" USING btree ("order_id");
  CREATE INDEX "support_chats_rating_rating_rated_by_idx" ON "payload"."support_chats" USING btree ("rating_rated_by_id");
  CREATE INDEX "support_chats_resolved_by_idx" ON "payload"."support_chats" USING btree ("resolved_by_id");
  CREATE INDEX "support_chats_updated_at_idx" ON "payload"."support_chats" USING btree ("updated_at");
  CREATE INDEX "support_chats_created_at_idx" ON "payload"."support_chats" USING btree ("created_at");
  CREATE INDEX "chat_messages_read_by_order_idx" ON "payload"."chat_messages_read_by" USING btree ("_order");
  CREATE INDEX "chat_messages_read_by_parent_id_idx" ON "payload"."chat_messages_read_by" USING btree ("_parent_id");
  CREATE INDEX "chat_messages_read_by_user_idx" ON "payload"."chat_messages_read_by" USING btree ("user_id");
  CREATE INDEX "chat_messages_chat_idx" ON "payload"."chat_messages" USING btree ("chat_id");
  CREATE INDEX "chat_messages_sender_idx" ON "payload"."chat_messages" USING btree ("sender_id");
  CREATE INDEX "chat_messages_updated_at_idx" ON "payload"."chat_messages" USING btree ("updated_at");
  CREATE INDEX "chat_messages_created_at_idx" ON "payload"."chat_messages" USING btree ("created_at");
  CREATE INDEX "chat_messages_rels_order_idx" ON "payload"."chat_messages_rels" USING btree ("order");
  CREATE INDEX "chat_messages_rels_parent_idx" ON "payload"."chat_messages_rels" USING btree ("parent_id");
  CREATE INDEX "chat_messages_rels_path_idx" ON "payload"."chat_messages_rels" USING btree ("path");
  CREATE INDEX "chat_messages_rels_chat_media_id_idx" ON "payload"."chat_messages_rels" USING btree ("chat_media_id");
  CREATE INDEX "chat_media_updated_at_idx" ON "payload"."chat_media" USING btree ("updated_at");
  CREATE INDEX "chat_media_created_at_idx" ON "payload"."chat_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "chat_media_filename_idx" ON "payload"."chat_media" USING btree ("filename");
  CREATE INDEX "contact_us_updated_at_idx" ON "payload"."contact_us" USING btree ("updated_at");
  CREATE INDEX "contact_us_created_at_idx" ON "payload"."contact_us" USING btree ("created_at");
  CREATE INDEX "orders_status_history_order_idx" ON "payload"."orders_status_history" USING btree ("_order");
  CREATE INDEX "orders_status_history_parent_id_idx" ON "payload"."orders_status_history" USING btree ("_parent_id");
  CREATE INDEX "orders_status_history_changed_by_idx" ON "payload"."orders_status_history" USING btree ("changed_by_id");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload"."payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload"."payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload"."payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload"."payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload"."payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_workflow_slug_idx" ON "payload"."payload_jobs" USING btree ("workflow_slug");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload"."payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload"."payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload"."payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload"."payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_concurrency_key_idx" ON "payload"."payload_jobs" USING btree ("concurrency_key");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload"."payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload"."payload_jobs" USING btree ("created_at");
  CREATE INDEX "agent_settings_rels_order_idx" ON "payload"."agent_settings_rels" USING btree ("order");
  CREATE INDEX "agent_settings_rels_parent_idx" ON "payload"."agent_settings_rels" USING btree ("parent_id");
  CREATE INDEX "agent_settings_rels_path_idx" ON "payload"."agent_settings_rels" USING btree ("path");
  CREATE INDEX "agent_settings_rels_users_id_idx" ON "payload"."agent_settings_rels" USING btree ("users_id");
  ALTER TABLE "payload"."categories" ADD CONSTRAINT "categories_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."retailers" ADD CONSTRAINT "retailers_profile_image_id_media_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."delivery_partners" ADD CONSTRAINT "delivery_partners_profile_image_id_media_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."delivery_partners" ADD CONSTRAINT "delivery_partners_pancard_image_id_media_id_fk" FOREIGN KEY ("pancard_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."delivery_partners" ADD CONSTRAINT "delivery_partners_selfie_image_id_media_id_fk" FOREIGN KEY ("selfie_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_retailer_id_users_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_parent_template_id_products_id_fk" FOREIGN KEY ("parent_template_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_version_retailer_id_users_id_fk" FOREIGN KEY ("version_retailer_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_version_parent_template_id_products_id_fk" FOREIGN KEY ("version_parent_template_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "payload"."retailers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_delivery_partner_id_delivery_partners_id_fk" FOREIGN KEY ("delivery_partner_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_current_offered_partner_id_delivery_partners_id_fk" FOREIGN KEY ("current_offered_partner_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_cancellation_details_cancelled_by_id_users_id_fk" FOREIGN KEY ("cancellation_details_cancelled_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_cod_collection_record_collected_by_id_delivery_partners_id_fk" FOREIGN KEY ("cod_collection_record_collected_by_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_rels" ADD CONSTRAINT "orders_rels_delivery_partners_fk" FOREIGN KEY ("delivery_partners_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ratings_fk" FOREIGN KEY ("ratings_id") REFERENCES "payload"."ratings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wishlists_fk" FOREIGN KEY ("wishlists_id") REFERENCES "payload"."wishlists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payout_ledger_fk" FOREIGN KEY ("payout_ledger_id") REFERENCES "payload"."payout_ledger"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payout_invoices_fk" FOREIGN KEY ("payout_invoices_id") REFERENCES "payload"."payout_invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_support_chats_fk" FOREIGN KEY ("support_chats_id") REFERENCES "payload"."support_chats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_messages_fk" FOREIGN KEY ("chat_messages_id") REFERENCES "payload"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_media_fk" FOREIGN KEY ("chat_media_id") REFERENCES "payload"."chat_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_us_fk" FOREIGN KEY ("contact_us_id") REFERENCES "payload"."contact_us"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "categories_media_idx" ON "payload"."categories" USING btree ("media_id");
  CREATE INDEX "retailers_profile_image_idx" ON "payload"."retailers" USING btree ("profile_image_id");
  CREATE INDEX "delivery_partners_profile_image_idx" ON "payload"."delivery_partners" USING btree ("profile_image_id");
  CREATE INDEX "delivery_partners_pancard_image_idx" ON "payload"."delivery_partners" USING btree ("pancard_image_id");
  CREATE INDEX "delivery_partners_selfie_image_idx" ON "payload"."delivery_partners" USING btree ("selfie_image_id");
  CREATE INDEX "products_retailer_idx" ON "payload"."products" USING btree ("retailer_id");
  CREATE INDEX "products_parent_template_idx" ON "payload"."products" USING btree ("parent_template_id");
  CREATE INDEX "_products_v_version_version_retailer_idx" ON "payload"."_products_v" USING btree ("version_retailer_id");
  CREATE INDEX "_products_v_version_version_parent_template_idx" ON "payload"."_products_v" USING btree ("version_parent_template_id");
  CREATE INDEX "orders_retailer_idx" ON "payload"."orders" USING btree ("retailer_id");
  CREATE INDEX "orders_delivery_partner_idx" ON "payload"."orders" USING btree ("delivery_partner_id");
  CREATE INDEX "orders_current_offered_partner_idx" ON "payload"."orders" USING btree ("current_offered_partner_id");
  CREATE INDEX "orders_cancellation_details_cancellation_details_cancell_idx" ON "payload"."orders" USING btree ("cancellation_details_cancelled_by_id");
  CREATE INDEX "orders_cod_collection_record_cod_collection_record_colle_idx" ON "payload"."orders" USING btree ("cod_collection_record_collected_by_id");
  CREATE INDEX "orders_rels_delivery_partners_id_idx" ON "payload"."orders_rels" USING btree ("delivery_partners_id");
  CREATE INDEX "payload_locked_documents_rels_ratings_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("ratings_id");
  CREATE INDEX "payload_locked_documents_rels_wishlists_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("wishlists_id");
  CREATE INDEX "payload_locked_documents_rels_payout_ledger_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("payout_ledger_id");
  CREATE INDEX "payload_locked_documents_rels_payout_invoices_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("payout_invoices_id");
  CREATE INDEX "payload_locked_documents_rels_support_chats_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("support_chats_id");
  CREATE INDEX "payload_locked_documents_rels_chat_messages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("chat_messages_id");
  CREATE INDEX "payload_locked_documents_rels_chat_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("chat_media_id");
  CREATE INDEX "payload_locked_documents_rels_contact_us_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("contact_us_id");
  ALTER TABLE "payload"."retailers" DROP COLUMN "bank_details_account_holder_name";
  ALTER TABLE "payload"."retailers" DROP COLUMN "bank_details_account_number";
  ALTER TABLE "payload"."retailers" DROP COLUMN "bank_details_ifsc_code";
  ALTER TABLE "payload"."retailers" DROP COLUMN "bank_details_bank_name";
  ALTER TABLE "payload"."retailers" DROP COLUMN "bank_details_upi_id";
  ALTER TABLE "payload"."variants" DROP COLUMN "price_in_u_s_d_enabled";
  ALTER TABLE "payload"."variants" DROP COLUMN "price_in_u_s_d";
  ALTER TABLE "payload"."_variants_v" DROP COLUMN "version_price_in_u_s_d_enabled";
  ALTER TABLE "payload"."_variants_v" DROP COLUMN "version_price_in_u_s_d";
  ALTER TABLE "payload"."products" DROP COLUMN "price_in_u_s_d_enabled";
  ALTER TABLE "payload"."products" DROP COLUMN "price_in_u_s_d";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_price_in_u_s_d_enabled";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_price_in_u_s_d";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."retailers_payment_methods" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."delivery_partners_payment_methods" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."brands_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."ratings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."wishlists" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."payout_ledger" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."payout_invoices_line_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."payout_invoices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."support_chats_participants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."support_chats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."chat_messages_read_by" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."chat_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."chat_messages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."chat_media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."contact_us" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."orders_status_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."payload_jobs_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."payload_jobs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."agent_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."agent_settings_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."platform_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."payload_jobs_stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."retailers_payment_methods" CASCADE;
  DROP TABLE "payload"."delivery_partners_payment_methods" CASCADE;
  DROP TABLE "payload"."brands_rels" CASCADE;
  DROP TABLE "payload"."ratings" CASCADE;
  DROP TABLE "payload"."wishlists" CASCADE;
  DROP TABLE "payload"."payout_ledger" CASCADE;
  DROP TABLE "payload"."payout_invoices_line_items" CASCADE;
  DROP TABLE "payload"."payout_invoices" CASCADE;
  DROP TABLE "payload"."support_chats_participants" CASCADE;
  DROP TABLE "payload"."support_chats" CASCADE;
  DROP TABLE "payload"."chat_messages_read_by" CASCADE;
  DROP TABLE "payload"."chat_messages" CASCADE;
  DROP TABLE "payload"."chat_messages_rels" CASCADE;
  DROP TABLE "payload"."chat_media" CASCADE;
  DROP TABLE "payload"."contact_us" CASCADE;
  DROP TABLE "payload"."orders_status_history" CASCADE;
  DROP TABLE "payload"."payload_jobs_log" CASCADE;
  DROP TABLE "payload"."payload_jobs" CASCADE;
  DROP TABLE "payload"."agent_settings" CASCADE;
  DROP TABLE "payload"."agent_settings_rels" CASCADE;
  DROP TABLE "payload"."platform_settings" CASCADE;
  DROP TABLE "payload"."payload_jobs_stats" CASCADE;
  ALTER TABLE "payload"."categories" DROP CONSTRAINT "categories_media_id_media_id_fk";
  
  ALTER TABLE "payload"."retailers" DROP CONSTRAINT "retailers_profile_image_id_media_id_fk";
  
  ALTER TABLE "payload"."delivery_partners" DROP CONSTRAINT "delivery_partners_profile_image_id_media_id_fk";
  
  ALTER TABLE "payload"."delivery_partners" DROP CONSTRAINT "delivery_partners_pancard_image_id_media_id_fk";
  
  ALTER TABLE "payload"."delivery_partners" DROP CONSTRAINT "delivery_partners_selfie_image_id_media_id_fk";
  
  ALTER TABLE "payload"."products" DROP CONSTRAINT "products_retailer_id_users_id_fk";
  
  ALTER TABLE "payload"."products" DROP CONSTRAINT "products_parent_template_id_products_id_fk";
  
  ALTER TABLE "payload"."_products_v" DROP CONSTRAINT "_products_v_version_retailer_id_users_id_fk";
  
  ALTER TABLE "payload"."_products_v" DROP CONSTRAINT "_products_v_version_parent_template_id_products_id_fk";
  
  ALTER TABLE "payload"."orders" DROP CONSTRAINT "orders_retailer_id_retailers_id_fk";
  
  ALTER TABLE "payload"."orders" DROP CONSTRAINT "orders_delivery_partner_id_delivery_partners_id_fk";
  
  ALTER TABLE "payload"."orders" DROP CONSTRAINT "orders_current_offered_partner_id_delivery_partners_id_fk";
  
  ALTER TABLE "payload"."orders" DROP CONSTRAINT "orders_cancellation_details_cancelled_by_id_users_id_fk";
  
  ALTER TABLE "payload"."orders" DROP CONSTRAINT "orders_cod_collection_record_collected_by_id_delivery_partners_id_fk";
  
  ALTER TABLE "payload"."orders_rels" DROP CONSTRAINT "orders_rels_delivery_partners_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ratings_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_wishlists_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payout_ledger_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payout_invoices_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_support_chats_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_chat_messages_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_chat_media_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contact_us_fk";
  
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DEFAULT 'USD'::text;
  DROP TYPE "payload"."enum_carts_currency";
  CREATE TYPE "payload"."enum_carts_currency" AS ENUM('USD');
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DEFAULT 'USD'::"payload"."enum_carts_currency";
  ALTER TABLE "payload"."carts" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_carts_currency" USING "currency"::"payload"."enum_carts_currency";
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DEFAULT 'USD'::text;
  DROP TYPE "payload"."enum_orders_currency";
  CREATE TYPE "payload"."enum_orders_currency" AS ENUM('USD');
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DEFAULT 'USD'::"payload"."enum_orders_currency";
  ALTER TABLE "payload"."orders" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_orders_currency" USING "currency"::"payload"."enum_orders_currency";
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DEFAULT 'processing'::text;
  DROP TYPE "payload"."enum_orders_status";
  CREATE TYPE "payload"."enum_orders_status" AS ENUM('processing', 'completed', 'cancelled', 'refunded');
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DEFAULT 'processing'::"payload"."enum_orders_status";
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DATA TYPE "payload"."enum_orders_status" USING "status"::"payload"."enum_orders_status";
  ALTER TABLE "payload"."transactions" ALTER COLUMN "payment_method" SET DATA TYPE text;
  DROP TYPE "payload"."enum_transactions_payment_method";
  CREATE TYPE "payload"."enum_transactions_payment_method" AS ENUM('stripe');
  ALTER TABLE "payload"."transactions" ALTER COLUMN "payment_method" SET DATA TYPE "payload"."enum_transactions_payment_method" USING "payment_method"::"payload"."enum_transactions_payment_method";
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DEFAULT 'USD'::text;
  DROP TYPE "payload"."enum_transactions_currency";
  CREATE TYPE "payload"."enum_transactions_currency" AS ENUM('USD');
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DEFAULT 'USD'::"payload"."enum_transactions_currency";
  ALTER TABLE "payload"."transactions" ALTER COLUMN "currency" SET DATA TYPE "payload"."enum_transactions_currency" USING "currency"::"payload"."enum_transactions_currency";
  DROP INDEX "payload"."categories_media_idx";
  DROP INDEX "payload"."retailers_profile_image_idx";
  DROP INDEX "payload"."delivery_partners_profile_image_idx";
  DROP INDEX "payload"."delivery_partners_pancard_image_idx";
  DROP INDEX "payload"."delivery_partners_selfie_image_idx";
  DROP INDEX "payload"."products_retailer_idx";
  DROP INDEX "payload"."products_parent_template_idx";
  DROP INDEX "payload"."_products_v_version_version_retailer_idx";
  DROP INDEX "payload"."_products_v_version_version_parent_template_idx";
  DROP INDEX "payload"."orders_retailer_idx";
  DROP INDEX "payload"."orders_delivery_partner_idx";
  DROP INDEX "payload"."orders_current_offered_partner_idx";
  DROP INDEX "payload"."orders_cancellation_details_cancellation_details_cancell_idx";
  DROP INDEX "payload"."orders_cod_collection_record_cod_collection_record_colle_idx";
  DROP INDEX "payload"."orders_rels_delivery_partners_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_ratings_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_wishlists_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_payout_ledger_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_payout_invoices_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_support_chats_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_chat_messages_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_chat_media_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_contact_us_id_idx";
  ALTER TABLE "payload"."users_roles" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."users_roles" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."users_roles" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."users_sessions" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."users" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."users" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."pages_hero_links" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_blocks_cta" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_blocks_content" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_blocks_media_block" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_blocks_media_block" ALTER COLUMN "media_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_blocks_archive" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_blocks_carousel" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_blocks_three_item_grid" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_blocks_form_block" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_blocks_form_block" ALTER COLUMN "form_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."pages" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."pages" ALTER COLUMN "hero_media_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages" ALTER COLUMN "meta_image_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_rels" ALTER COLUMN "pages_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_rels" ALTER COLUMN "categories_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."pages_rels" ALTER COLUMN "products_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_version_hero_links" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_version_hero_links" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v_version_hero_links" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v_blocks_cta_links" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_blocks_cta_links" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v_blocks_cta_links" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v_blocks_cta" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_blocks_cta" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v_blocks_cta" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v_blocks_content_columns" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_blocks_content_columns" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v_blocks_content_columns" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v_blocks_content" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_blocks_content" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v_blocks_content" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ALTER COLUMN "media_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_blocks_archive" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_blocks_archive" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v_blocks_archive" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v_blocks_carousel" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_blocks_carousel" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v_blocks_carousel" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v_blocks_three_item_grid" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_blocks_three_item_grid" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v_blocks_three_item_grid" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v_blocks_banner" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_blocks_banner" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v_blocks_banner" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v_blocks_form_block" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_blocks_form_block" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v_blocks_form_block" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v_blocks_form_block" ALTER COLUMN "form_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_pages_v" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_pages_v" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v" ALTER COLUMN "version_hero_media_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v" ALTER COLUMN "version_meta_image_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_rels" ALTER COLUMN "pages_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_rels" ALTER COLUMN "categories_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_pages_v_rels" ALTER COLUMN "products_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."categories_specification_templates" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."categories" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."categories" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."categories" ALTER COLUMN "parent_category_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."media" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."media" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."retailers_business_hours_week_off" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."retailers_business_hours_week_off" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."retailers_business_hours_week_off" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."retailers" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."retailers" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."retailers" ALTER COLUMN "user_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."retailers_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."retailers_rels" ALTER COLUMN "media_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."delivery_partners" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."delivery_partners" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."delivery_partners" ALTER COLUMN "driving_license_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."delivery_partners" ALTER COLUMN "user_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."brands" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."brands" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."brands" ALTER COLUMN "logo_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."forms_blocks_checkbox" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."forms_blocks_country" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."forms_blocks_email" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."forms_blocks_message" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."forms_blocks_number" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."forms_blocks_select" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."forms_blocks_state" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."forms_blocks_text" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."forms_blocks_textarea" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."forms_emails" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."forms" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."forms" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."form_submissions_submission_data" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."form_submissions" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."form_submissions" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."form_submissions" ALTER COLUMN "form_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."addresses" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."addresses" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."addresses" ALTER COLUMN "customer_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."variants" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."variants" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."variants" ALTER COLUMN "product_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."variants_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."variants_rels" ALTER COLUMN "variant_options_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_variants_v" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_variants_v" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_variants_v" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_variants_v" ALTER COLUMN "version_product_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_variants_v_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_variants_v_rels" ALTER COLUMN "variant_options_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."variant_types" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."variant_types" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."variant_options" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."variant_options" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."variant_options" ALTER COLUMN "variant_type_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_gallery" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_gallery" ALTER COLUMN "image_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_gallery" ALTER COLUMN "variant_option_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_blocks_cta" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_blocks_content" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_blocks_media_block" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_blocks_media_block" ALTER COLUMN "media_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_specifications" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."products" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."products" ALTER COLUMN "brand_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products" ALTER COLUMN "meta_image_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_rels" ALTER COLUMN "pages_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_rels" ALTER COLUMN "variant_types_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_rels" ALTER COLUMN "products_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."products_rels" ALTER COLUMN "categories_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_version_gallery" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_version_gallery" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_products_v_version_gallery" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_products_v_version_gallery" ALTER COLUMN "image_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_version_gallery" ALTER COLUMN "variant_option_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_blocks_cta_links" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_blocks_cta_links" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_products_v_blocks_cta_links" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_products_v_blocks_cta" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_blocks_cta" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_products_v_blocks_cta" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_products_v_blocks_content_columns" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_blocks_content_columns" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_products_v_blocks_content_columns" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_products_v_blocks_content" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_blocks_content" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_products_v_blocks_content" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_products_v_blocks_media_block" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_blocks_media_block" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_products_v_blocks_media_block" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_products_v_blocks_media_block" ALTER COLUMN "media_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_version_specifications" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_version_specifications" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_products_v_version_specifications" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_products_v" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."_products_v" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."_products_v" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v" ALTER COLUMN "version_brand_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v" ALTER COLUMN "version_meta_image_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_rels" ALTER COLUMN "pages_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_rels" ALTER COLUMN "variant_types_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_rels" ALTER COLUMN "products_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."_products_v_rels" ALTER COLUMN "categories_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."carts_items" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."carts_items" ALTER COLUMN "product_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."carts_items" ALTER COLUMN "variant_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."carts" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."carts" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."carts" ALTER COLUMN "customer_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."orders_items" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."orders_items" ALTER COLUMN "product_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."orders_items" ALTER COLUMN "variant_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."orders" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."orders" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."orders" ALTER COLUMN "customer_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" DROP NOT NULL;
  ALTER TABLE "payload"."orders_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."orders_rels" ALTER COLUMN "transactions_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."transactions_items" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."transactions_items" ALTER COLUMN "product_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."transactions_items" ALTER COLUMN "variant_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "customer_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "order_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."transactions" ALTER COLUMN "cart_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_kv" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."payload_kv" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."payload_locked_documents" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."payload_locked_documents" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "users_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "pages_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "categories_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "media_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "retailers_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "delivery_partners_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "brands_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "forms_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "form_submissions_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "addresses_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "variants_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "variant_types_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "variant_options_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "products_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "carts_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "orders_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ALTER COLUMN "transactions_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_preferences" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."payload_preferences" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."payload_preferences_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_preferences_rels" ALTER COLUMN "users_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."payload_migrations" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."payload_migrations" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."header_nav_items" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."header" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."header" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."header_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."header_rels" ALTER COLUMN "pages_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."footer_nav_items" ALTER COLUMN "_parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."footer" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."footer" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "payload"."footer_rels" ALTER COLUMN "parent_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."footer_rels" ALTER COLUMN "pages_id" SET DATA TYPE integer;
  ALTER TABLE "payload"."retailers" ADD COLUMN "bank_details_account_holder_name" varchar NOT NULL;
  ALTER TABLE "payload"."retailers" ADD COLUMN "bank_details_account_number" varchar NOT NULL;
  ALTER TABLE "payload"."retailers" ADD COLUMN "bank_details_ifsc_code" varchar NOT NULL;
  ALTER TABLE "payload"."retailers" ADD COLUMN "bank_details_bank_name" varchar NOT NULL;
  ALTER TABLE "payload"."retailers" ADD COLUMN "bank_details_upi_id" varchar;
  ALTER TABLE "payload"."variants" ADD COLUMN "price_in_u_s_d_enabled" boolean;
  ALTER TABLE "payload"."variants" ADD COLUMN "price_in_u_s_d" numeric;
  ALTER TABLE "payload"."_variants_v" ADD COLUMN "version_price_in_u_s_d_enabled" boolean;
  ALTER TABLE "payload"."_variants_v" ADD COLUMN "version_price_in_u_s_d" numeric;
  ALTER TABLE "payload"."products" ADD COLUMN "price_in_u_s_d_enabled" boolean;
  ALTER TABLE "payload"."products" ADD COLUMN "price_in_u_s_d" numeric;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_price_in_u_s_d_enabled" boolean;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_price_in_u_s_d" numeric;
  ALTER TABLE "payload"."users" DROP COLUMN "retailer_online_status";
  ALTER TABLE "payload"."categories" DROP COLUMN "media_id";
  ALTER TABLE "payload"."media" DROP COLUMN "prefix";
  ALTER TABLE "payload"."retailers" DROP COLUMN "profile_image_id";
  ALTER TABLE "payload"."retailers" DROP COLUMN "online_status";
  ALTER TABLE "payload"."retailers" DROP COLUMN "average_rating";
  ALTER TABLE "payload"."retailers" DROP COLUMN "rating_count";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "profile_image_id";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "gender";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "dob";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "driving_license_number";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "pancard_number";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "pancard_image_id";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "vehicle_brand";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "vehicle_registration_number";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "selfie_image_id";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "lat";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "lng";
  ALTER TABLE "payload"."delivery_partners" DROP COLUMN "last_location_updated_at";
  ALTER TABLE "payload"."addresses" DROP COLUMN "lat";
  ALTER TABLE "payload"."addresses" DROP COLUMN "lng";
  ALTER TABLE "payload"."variants" DROP COLUMN "price_in_i_n_r_enabled";
  ALTER TABLE "payload"."variants" DROP COLUMN "price_in_i_n_r";
  ALTER TABLE "payload"."_variants_v" DROP COLUMN "version_price_in_i_n_r_enabled";
  ALTER TABLE "payload"."_variants_v" DROP COLUMN "version_price_in_i_n_r";
  ALTER TABLE "payload"."products" DROP COLUMN "price_in_i_n_r_enabled";
  ALTER TABLE "payload"."products" DROP COLUMN "price_in_i_n_r";
  ALTER TABLE "payload"."products" DROP COLUMN "discount_percent";
  ALTER TABLE "payload"."products" DROP COLUMN "discounted_price";
  ALTER TABLE "payload"."products" DROP COLUMN "average_rating";
  ALTER TABLE "payload"."products" DROP COLUMN "rating_count";
  ALTER TABLE "payload"."products" DROP COLUMN "retailer_id";
  ALTER TABLE "payload"."products" DROP COLUMN "is_master_template";
  ALTER TABLE "payload"."products" DROP COLUMN "parent_template_id";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_price_in_i_n_r_enabled";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_price_in_i_n_r";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_discount_percent";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_discounted_price";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_average_rating";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_rating_count";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_retailer_id";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_is_master_template";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_parent_template_id";
  ALTER TABLE "payload"."orders" DROP COLUMN "shipping_address_lat";
  ALTER TABLE "payload"."orders" DROP COLUMN "shipping_address_lng";
  ALTER TABLE "payload"."orders" DROP COLUMN "delivery_fee";
  ALTER TABLE "payload"."orders" DROP COLUMN "retailer_id";
  ALTER TABLE "payload"."orders" DROP COLUMN "delivery_partner_id";
  ALTER TABLE "payload"."orders" DROP COLUMN "delivery_partner_acceptance";
  ALTER TABLE "payload"."orders" DROP COLUMN "current_offered_partner_id";
  ALTER TABLE "payload"."orders" DROP COLUMN "offer_expires_at";
  ALTER TABLE "payload"."orders" DROP COLUMN "pickup_o_t_p";
  ALTER TABLE "payload"."orders" DROP COLUMN "delivery_o_t_p";
  ALTER TABLE "payload"."orders" DROP COLUMN "cancellation_details_cancelled_by_id";
  ALTER TABLE "payload"."orders" DROP COLUMN "cancellation_details_cancelled_at";
  ALTER TABLE "payload"."orders" DROP COLUMN "cancellation_details_cancellation_reason";
  ALTER TABLE "payload"."orders" DROP COLUMN "cod_collection_record_status";
  ALTER TABLE "payload"."orders" DROP COLUMN "cod_collection_record_collected_at";
  ALTER TABLE "payload"."orders" DROP COLUMN "cod_collection_record_payment_type";
  ALTER TABLE "payload"."orders" DROP COLUMN "cod_collection_record_collected_by_id";
  ALTER TABLE "payload"."orders_rels" DROP COLUMN "delivery_partners_id";
  ALTER TABLE "payload"."transactions" DROP COLUMN "razorpay_order_i_d";
  ALTER TABLE "payload"."transactions" DROP COLUMN "razorpay_payment_i_d";
  ALTER TABLE "payload"."transactions" DROP COLUMN "razorpay_signature";
  ALTER TABLE "payload"."transactions" DROP COLUMN "razorpay_refund_i_d";
  ALTER TABLE "payload"."transactions" DROP COLUMN "razorpay_refund_status";
  ALTER TABLE "payload"."transactions" DROP COLUMN "razorpay_refunded_amount";
  ALTER TABLE "payload"."transactions" DROP COLUMN "razorpay_refunded_at";
  ALTER TABLE "payload"."transactions" DROP COLUMN "cod_notes";
  ALTER TABLE "payload"."transactions" DROP COLUMN "billing_address_lat";
  ALTER TABLE "payload"."transactions" DROP COLUMN "billing_address_lng";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "ratings_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "wishlists_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "payout_ledger_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "payout_invoices_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "support_chats_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "chat_messages_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "chat_media_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "contact_us_id";
  DROP TYPE "payload"."enum_retailers_payment_methods_method_type";
  DROP TYPE "payload"."enum_retailers_online_status";
  DROP TYPE "payload"."enum_delivery_partners_payment_methods_method_type";
  DROP TYPE "payload"."enum_delivery_partners_gender";
  DROP TYPE "payload"."enum_payout_ledger_recipient_type";
  DROP TYPE "payload"."enum_payout_ledger_status";
  DROP TYPE "payload"."enum_payout_invoices_invoice_type";
  DROP TYPE "payload"."enum_payout_invoices_payout_destination_method_type";
  DROP TYPE "payload"."enum_payout_invoices_status";
  DROP TYPE "payload"."enum_support_chats_participants_role";
  DROP TYPE "payload"."enum_support_chats_type";
  DROP TYPE "payload"."enum_support_chats_status";
  DROP TYPE "payload"."enum_support_chats_initiator_type";
  DROP TYPE "payload"."enum_chat_messages_sender_role";
  DROP TYPE "payload"."enum_chat_messages_message_type";
  DROP TYPE "payload"."enum_contact_us_status";
  DROP TYPE "payload"."enum_orders_status_history_change_source";
  DROP TYPE "payload"."enum_orders_delivery_partner_acceptance";
  DROP TYPE "payload"."enum_orders_cod_collection_record_status";
  DROP TYPE "payload"."enum_orders_cod_collection_record_payment_type";
  DROP TYPE "payload"."enum_transactions_razorpay_refund_status";
  DROP TYPE "payload"."enum_payload_jobs_log_task_slug";
  DROP TYPE "payload"."enum_payload_jobs_log_state";
  DROP TYPE "payload"."enum_payload_jobs_workflow_slug";
  DROP TYPE "payload"."enum_payload_jobs_task_slug";
  DROP TYPE "payload"."enum_agent_settings_provider";
  DROP TYPE "payload"."enum_platform_settings_delivery_fee_mode";
  DROP TYPE "payload"."enum_platform_settings_payout_delay_label";
  DROP TYPE "payload"."enum_platform_settings_payout_mode";`)
}
