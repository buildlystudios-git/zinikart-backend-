import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$
   BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns 
       WHERE table_schema = 'payload' 
         AND table_name = 'users' 
         AND data_type = 'integer'
     ) THEN
       DROP SCHEMA "payload" CASCADE;
     END IF;
   END $$;
   CREATE SCHEMA IF NOT EXISTS "payload";
   CREATE TYPE "payload"."enum_users_roles" AS ENUM('admin', 'customer', 'retailer', 'delivery_partner');
  CREATE TYPE "payload"."enum_pages_hero_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum_pages_hero_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "payload"."enum_pages_blocks_cta_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_cta_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "payload"."enum_pages_blocks_content_columns_size" AS ENUM('oneThird', 'half', 'twoThirds', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_content_columns_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_content_columns_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "payload"."enum_pages_blocks_archive_populate_by" AS ENUM('collection', 'selection');
  CREATE TYPE "payload"."enum_pages_blocks_archive_relation_to" AS ENUM('products');
  CREATE TYPE "payload"."enum_pages_blocks_carousel_populate_by" AS ENUM('collection', 'selection');
  CREATE TYPE "payload"."enum_pages_blocks_carousel_relation_to" AS ENUM('products');
  CREATE TYPE "payload"."enum_pages_blocks_banner_style" AS ENUM('info', 'warning', 'error', 'success');
  CREATE TYPE "payload"."enum_pages_hero_type" AS ENUM('none', 'highImpact', 'mediumImpact', 'lowImpact');
  CREATE TYPE "payload"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__pages_v_version_hero_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum__pages_v_version_hero_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "payload"."enum__pages_v_blocks_cta_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum__pages_v_blocks_cta_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "payload"."enum__pages_v_blocks_content_columns_size" AS ENUM('oneThird', 'half', 'twoThirds', 'full');
  CREATE TYPE "payload"."enum__pages_v_blocks_content_columns_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum__pages_v_blocks_content_columns_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "payload"."enum__pages_v_blocks_archive_populate_by" AS ENUM('collection', 'selection');
  CREATE TYPE "payload"."enum__pages_v_blocks_archive_relation_to" AS ENUM('products');
  CREATE TYPE "payload"."enum__pages_v_blocks_carousel_populate_by" AS ENUM('collection', 'selection');
  CREATE TYPE "payload"."enum__pages_v_blocks_carousel_relation_to" AS ENUM('products');
  CREATE TYPE "payload"."enum__pages_v_blocks_banner_style" AS ENUM('info', 'warning', 'error', 'success');
  CREATE TYPE "payload"."enum__pages_v_version_hero_type" AS ENUM('none', 'highImpact', 'mediumImpact', 'lowImpact');
  CREATE TYPE "payload"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_categories_specification_templates_type" AS ENUM('text', 'number', 'select', 'date');
  CREATE TYPE "payload"."enum_retailers_payment_methods_method_type" AS ENUM('bank_account', 'upi');
  CREATE TYPE "payload"."enum_retailers_business_hours_week_off" AS ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
  CREATE TYPE "payload"."enum_retailers_approval_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');
  CREATE TYPE "payload"."enum_retailers_online_status" AS ENUM('online', 'offline');
  CREATE TYPE "payload"."enum_delivery_partners_payment_methods_method_type" AS ENUM('bank_account', 'upi');
  CREATE TYPE "payload"."enum_delivery_partners_gender" AS ENUM('male', 'female', 'other');
  CREATE TYPE "payload"."enum_delivery_partners_vehicle_type" AS ENUM('bike', 'scooter', 'bicycle', 'car');
  CREATE TYPE "payload"."enum_delivery_partners_approval_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');
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
  CREATE TYPE "payload"."enum_forms_confirmation_type" AS ENUM('message', 'redirect');
  CREATE TYPE "payload"."enum_addresses_country" AS ENUM('US', 'GB', 'CA', 'AU', 'AT', 'BE', 'BR', 'BG', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HK', 'HU', 'IN', 'IE', 'IT', 'JP', 'LV', 'LT', 'LU', 'MY', 'MT', 'MX', 'NL', 'NZ', 'NO', 'PL', 'PT', 'RO', 'SG', 'SK', 'SI', 'ES', 'SE', 'CH');
  CREATE TYPE "payload"."enum_variants_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__variants_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_products_blocks_cta_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum_products_blocks_cta_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "payload"."enum_products_blocks_content_columns_size" AS ENUM('oneThird', 'half', 'twoThirds', 'full');
  CREATE TYPE "payload"."enum_products_blocks_content_columns_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum_products_blocks_content_columns_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "payload"."enum_products_specifications_type" AS ENUM('text', 'number', 'select', 'date');
  CREATE TYPE "payload"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__products_v_blocks_cta_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum__products_v_blocks_cta_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "payload"."enum__products_v_blocks_content_columns_size" AS ENUM('oneThird', 'half', 'twoThirds', 'full');
  CREATE TYPE "payload"."enum__products_v_blocks_content_columns_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum__products_v_blocks_content_columns_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "payload"."enum__products_v_version_specifications_type" AS ENUM('text', 'number', 'select', 'date');
  CREATE TYPE "payload"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_carts_currency" AS ENUM('INR');
  CREATE TYPE "payload"."enum_orders_status_history_change_source" AS ENUM('retailer', 'delivery_partner', 'customer', 'admin', 'system');
  CREATE TYPE "payload"."enum_orders_currency" AS ENUM('INR');
  CREATE TYPE "payload"."enum_orders_status" AS ENUM('placed', 'order_received', 'preparing', 'packed', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'reached_location', 'delivered', 'cod_payment_received', 'cancelled');
  CREATE TYPE "payload"."enum_orders_delivery_partner_acceptance" AS ENUM('pending', 'accepted', 'rejected', 'unassignable');
  CREATE TYPE "payload"."enum_orders_cod_collection_record_status" AS ENUM('pending', 'collected');
  CREATE TYPE "payload"."enum_orders_cod_collection_record_payment_type" AS ENUM('cash', 'qr');
  CREATE TYPE "payload"."enum_transactions_payment_method" AS ENUM('stripe', 'razorpay', 'cod');
  CREATE TYPE "payload"."enum_transactions_razorpay_refund_status" AS ENUM('pending', 'processed', 'failed');
  CREATE TYPE "payload"."enum_transactions_status" AS ENUM('pending', 'succeeded', 'failed', 'cancelled', 'expired', 'refunded');
  CREATE TYPE "payload"."enum_transactions_currency" AS ENUM('INR');
  CREATE TYPE "payload"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'assignDeliveryPartner', 'checkOfferTimeout', 'retailerActionTimeout', 'processRazorpayRefund', 'processPayouts');
  CREATE TYPE "payload"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "payload"."enum_payload_jobs_workflow_slug" AS ENUM('hourlyPayoutCheck');
  CREATE TYPE "payload"."enum_payload_jobs_task_slug" AS ENUM('inline', 'assignDeliveryPartner', 'checkOfferTimeout', 'retailerActionTimeout', 'processRazorpayRefund', 'processPayouts');
  CREATE TYPE "payload"."enum_header_nav_items_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum_footer_nav_items_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "payload"."enum_agent_settings_provider" AS ENUM('openai', 'google', 'anthropic', 'vercel');
  CREATE TYPE "payload"."enum_platform_settings_delivery_fee_mode" AS ENUM('flat', 'variable');
  CREATE TYPE "payload"."enum_platform_settings_payout_delay_label" AS ENUM('immediate', 'daily', 'weekly', 'biweekly', 'monthly');
  CREATE TYPE "payload"."enum_platform_settings_payout_mode" AS ENUM('manual', 'auto');
  CREATE TABLE "payload"."users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "payload"."enum_users_roles",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "payload"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."users" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"retailer_online_status" varchar,
  	"mobile_number" varchar,
  	"mobile_verified" boolean DEFAULT false,
  	"last_otp_login_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."pages_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum_pages_hero_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "payload"."enum_pages_hero_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "payload"."pages_blocks_cta_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum_pages_blocks_cta_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "payload"."enum_pages_blocks_cta_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "payload"."pages_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rich_text" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_content_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"size" "payload"."enum_pages_blocks_content_columns_size" DEFAULT 'oneThird',
  	"rich_text" jsonb,
  	"enable_link" boolean,
  	"link_type" "payload"."enum_pages_blocks_content_columns_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "payload"."enum_pages_blocks_content_columns_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "payload"."pages_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_media_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" uuid,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_archive" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"intro_content" jsonb,
  	"populate_by" "payload"."enum_pages_blocks_archive_populate_by" DEFAULT 'collection',
  	"relation_to" "payload"."enum_pages_blocks_archive_relation_to" DEFAULT 'products',
  	"limit" numeric DEFAULT 10,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"populate_by" "payload"."enum_pages_blocks_carousel_populate_by" DEFAULT 'collection',
  	"relation_to" "payload"."enum_pages_blocks_carousel_relation_to" DEFAULT 'products',
  	"limit" numeric DEFAULT 10,
  	"populated_docs_total" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_three_item_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"style" "payload"."enum_pages_blocks_banner_style" DEFAULT 'info',
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_form_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"form_id" uuid,
  	"enable_intro" boolean,
  	"intro_content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"published_on" timestamp(3) with time zone,
  	"hero_type" "payload"."enum_pages_hero_type" DEFAULT 'lowImpact',
  	"hero_rich_text" jsonb,
  	"hero_media_id" uuid,
  	"meta_title" varchar,
  	"meta_image_id" uuid,
  	"meta_description" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "payload"."enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"categories_id" uuid,
  	"products_id" uuid
  );
  
  CREATE TABLE "payload"."_pages_v_version_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"link_type" "payload"."enum__pages_v_version_hero_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "payload"."enum__pages_v_version_hero_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_cta_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"link_type" "payload"."enum__pages_v_blocks_cta_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "payload"."enum__pages_v_blocks_cta_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"rich_text" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_content_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"size" "payload"."enum__pages_v_blocks_content_columns_size" DEFAULT 'oneThird',
  	"rich_text" jsonb,
  	"enable_link" boolean,
  	"link_type" "payload"."enum__pages_v_blocks_content_columns_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "payload"."enum__pages_v_blocks_content_columns_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_media_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"media_id" uuid,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_archive" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"intro_content" jsonb,
  	"populate_by" "payload"."enum__pages_v_blocks_archive_populate_by" DEFAULT 'collection',
  	"relation_to" "payload"."enum__pages_v_blocks_archive_relation_to" DEFAULT 'products',
  	"limit" numeric DEFAULT 10,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"populate_by" "payload"."enum__pages_v_blocks_carousel_populate_by" DEFAULT 'collection',
  	"relation_to" "payload"."enum__pages_v_blocks_carousel_relation_to" DEFAULT 'products',
  	"limit" numeric DEFAULT 10,
  	"populated_docs_total" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_three_item_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"style" "payload"."enum__pages_v_blocks_banner_style" DEFAULT 'info',
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_form_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"form_id" uuid,
  	"enable_intro" boolean,
  	"intro_content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_title" varchar,
  	"version_published_on" timestamp(3) with time zone,
  	"version_hero_type" "payload"."enum__pages_v_version_hero_type" DEFAULT 'lowImpact',
  	"version_hero_rich_text" jsonb,
  	"version_hero_media_id" uuid,
  	"version_meta_title" varchar,
  	"version_meta_image_id" uuid,
  	"version_meta_description" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "payload"."_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"categories_id" uuid,
  	"products_id" uuid
  );
  
  CREATE TABLE "payload"."categories_specification_templates_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"option" varchar
  );
  
  CREATE TABLE "payload"."categories_specification_templates" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "payload"."enum_categories_specification_templates_type" DEFAULT 'text' NOT NULL,
  	"required" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."categories" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar NOT NULL,
  	"media_id" uuid,
  	"parent_category_id" uuid,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" jsonb,
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
  
  CREATE TABLE "payload"."retailers_business_hours_week_off" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "payload"."enum_retailers_business_hours_week_off",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "payload"."retailers" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"shop_name" varchar NOT NULL,
  	"owner_name" varchar NOT NULL,
  	"mobile_number" varchar NOT NULL,
  	"email_id" varchar NOT NULL,
  	"profile_image_id" uuid,
  	"alternate_contact_number" varchar,
  	"gst_number" varchar NOT NULL,
  	"shop_address_street" varchar NOT NULL,
  	"shop_address_landmark" varchar,
  	"shop_address_city" varchar NOT NULL,
  	"shop_address_state" varchar NOT NULL,
  	"shop_address_zip_code" varchar NOT NULL,
  	"shop_address_lat" numeric,
  	"shop_address_lng" numeric,
  	"business_hours_start_time" varchar NOT NULL,
  	"business_hours_end_time" varchar NOT NULL,
  	"business_hours_open_everyday" boolean DEFAULT false,
  	"approval_status" "payload"."enum_retailers_approval_status" DEFAULT 'pending' NOT NULL,
  	"online_status" "payload"."enum_retailers_online_status" DEFAULT 'online' NOT NULL,
  	"user_id" uuid NOT NULL,
  	"average_rating" numeric DEFAULT 0,
  	"rating_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."retailers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" uuid
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
  
  CREATE TABLE "payload"."delivery_partners" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"full_name" varchar NOT NULL,
  	"mobile_number" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"profile_image_id" uuid,
  	"gender" "payload"."enum_delivery_partners_gender" NOT NULL,
  	"dob" timestamp(3) with time zone NOT NULL,
  	"driving_license_id" uuid NOT NULL,
  	"driving_license_number" varchar NOT NULL,
  	"pancard_number" varchar NOT NULL,
  	"pancard_image_id" uuid NOT NULL,
  	"vehicle_brand" varchar NOT NULL,
  	"vehicle_registration_number" varchar NOT NULL,
  	"selfie_image_id" uuid NOT NULL,
  	"vehicle_type" "payload"."enum_delivery_partners_vehicle_type" NOT NULL,
  	"approval_status" "payload"."enum_delivery_partners_approval_status" DEFAULT 'pending' NOT NULL,
  	"online_status" boolean DEFAULT false NOT NULL,
  	"lat" numeric,
  	"lng" numeric,
  	"last_location_updated_at" timestamp(3) with time zone,
  	"user_id" uuid NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."brands" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"logo_id" uuid,
  	"description" varchar,
  	"featured" boolean DEFAULT false,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
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
  
  CREATE TABLE "payload"."forms_blocks_checkbox" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"default_value" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_country" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_email" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_message" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"message" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_number" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_select_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."forms_blocks_select" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"placeholder" varchar,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_state" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_textarea" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email_to" varchar,
  	"cc" varchar,
  	"bcc" varchar,
  	"reply_to" varchar,
  	"email_from" varchar,
  	"subject" varchar DEFAULT 'You''ve received a new message.' NOT NULL,
  	"message" jsonb
  );
  
  CREATE TABLE "payload"."forms" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar NOT NULL,
  	"submit_button_label" varchar,
  	"confirmation_type" "payload"."enum_forms_confirmation_type" DEFAULT 'message',
  	"confirmation_message" jsonb,
  	"redirect_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."form_submissions_submission_data" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."form_submissions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"form_id" uuid NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."addresses" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"customer_id" uuid,
  	"title" varchar,
  	"first_name" varchar,
  	"last_name" varchar,
  	"company" varchar,
  	"address_line1" varchar,
  	"address_line2" varchar,
  	"city" varchar,
  	"state" varchar,
  	"postal_code" varchar,
  	"country" "payload"."enum_addresses_country" NOT NULL,
  	"phone" varchar,
  	"lat" numeric,
  	"lng" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."variants" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"product_id" uuid,
  	"inventory" numeric DEFAULT 0,
  	"price_in_i_n_r_enabled" boolean,
  	"price_in_i_n_r" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "payload"."enum_variants_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."variants_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"variant_options_id" uuid
  );
  
  CREATE TABLE "payload"."_variants_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_title" varchar,
  	"version_product_id" uuid,
  	"version_inventory" numeric DEFAULT 0,
  	"version_price_in_i_n_r_enabled" boolean,
  	"version_price_in_i_n_r" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__variants_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "payload"."_variants_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"variant_options_id" uuid
  );
  
  CREATE TABLE "payload"."variant_types" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."variant_options" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_variantoptions_options_order" varchar,
  	"variant_type_id" uuid NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."products_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid,
  	"variant_option_id" uuid
  );
  
  CREATE TABLE "payload"."products_blocks_cta_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum_products_blocks_cta_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "payload"."enum_products_blocks_cta_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "payload"."products_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rich_text" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."products_blocks_content_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"size" "payload"."enum_products_blocks_content_columns_size" DEFAULT 'oneThird',
  	"rich_text" jsonb,
  	"enable_link" boolean,
  	"link_type" "payload"."enum_products_blocks_content_columns_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "payload"."enum_products_blocks_content_columns_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "payload"."products_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."products_blocks_media_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" uuid,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."products_specifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" varchar,
  	"type" "payload"."enum_products_specifications_type" DEFAULT 'text'
  );
  
  CREATE TABLE "payload"."products" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"description" jsonb,
  	"inventory" numeric DEFAULT 0,
  	"enable_variants" boolean,
  	"price_in_i_n_r_enabled" boolean,
  	"price_in_i_n_r" numeric,
  	"discount_percent" numeric,
  	"discounted_price" numeric,
  	"brand_id" uuid,
  	"warranty" varchar,
  	"average_rating" numeric DEFAULT 0,
  	"rating_count" numeric DEFAULT 0,
  	"meta_title" varchar,
  	"meta_image_id" uuid,
  	"meta_description" varchar,
  	"retailer_id" uuid,
  	"is_master_template" boolean,
  	"parent_template_id" uuid,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "payload"."enum_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"variant_types_id" uuid,
  	"products_id" uuid,
  	"categories_id" uuid
  );
  
  CREATE TABLE "payload"."_products_v_version_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"image_id" uuid,
  	"variant_option_id" uuid,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_products_v_blocks_cta_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"link_type" "payload"."enum__products_v_blocks_cta_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "payload"."enum__products_v_blocks_cta_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_products_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"rich_text" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_products_v_blocks_content_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"size" "payload"."enum__products_v_blocks_content_columns_size" DEFAULT 'oneThird',
  	"rich_text" jsonb,
  	"enable_link" boolean,
  	"link_type" "payload"."enum__products_v_blocks_content_columns_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "payload"."enum__products_v_blocks_content_columns_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_products_v_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_products_v_blocks_media_block" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"_path" text NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"media_id" uuid,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_products_v_version_specifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" varchar,
  	"type" "payload"."enum__products_v_version_specifications_type" DEFAULT 'text',
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_products_v" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid,
  	"version_title" varchar,
  	"version_description" jsonb,
  	"version_inventory" numeric DEFAULT 0,
  	"version_enable_variants" boolean,
  	"version_price_in_i_n_r_enabled" boolean,
  	"version_price_in_i_n_r" numeric,
  	"version_discount_percent" numeric,
  	"version_discounted_price" numeric,
  	"version_brand_id" uuid,
  	"version_warranty" varchar,
  	"version_average_rating" numeric DEFAULT 0,
  	"version_rating_count" numeric DEFAULT 0,
  	"version_meta_title" varchar,
  	"version_meta_image_id" uuid,
  	"version_meta_description" varchar,
  	"version_retailer_id" uuid,
  	"version_is_master_template" boolean,
  	"version_parent_template_id" uuid,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "payload"."_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid,
  	"variant_types_id" uuid,
  	"products_id" uuid,
  	"categories_id" uuid
  );
  
  CREATE TABLE "payload"."carts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" uuid,
  	"variant_id" uuid,
  	"quantity" numeric DEFAULT 1 NOT NULL
  );
  
  CREATE TABLE "payload"."carts" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"secret" varchar,
  	"customer_id" uuid,
  	"purchased_at" timestamp(3) with time zone,
  	"subtotal" numeric,
  	"currency" "payload"."enum_carts_currency" DEFAULT 'INR',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" uuid,
  	"variant_id" uuid,
  	"quantity" numeric DEFAULT 1 NOT NULL
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
  
  CREATE TABLE "payload"."orders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"shipping_address_title" varchar,
  	"shipping_address_first_name" varchar,
  	"shipping_address_last_name" varchar,
  	"shipping_address_company" varchar,
  	"shipping_address_address_line1" varchar,
  	"shipping_address_address_line2" varchar,
  	"shipping_address_city" varchar,
  	"shipping_address_state" varchar,
  	"shipping_address_postal_code" varchar,
  	"shipping_address_country" varchar,
  	"shipping_address_phone" varchar,
  	"shipping_address_lat" numeric,
  	"shipping_address_lng" numeric,
  	"customer_id" uuid,
  	"customer_email" varchar,
  	"amount" numeric,
  	"currency" "payload"."enum_orders_currency" DEFAULT 'INR',
  	"status" "payload"."enum_orders_status" DEFAULT 'placed' NOT NULL,
  	"delivery_fee" numeric DEFAULT 0,
  	"retailer_id" uuid NOT NULL,
  	"access_token" varchar,
  	"delivery_partner_id" uuid,
  	"delivery_partner_acceptance" "payload"."enum_orders_delivery_partner_acceptance" DEFAULT 'pending',
  	"current_offered_partner_id" uuid,
  	"offer_expires_at" timestamp(3) with time zone,
  	"pickup_o_t_p" varchar,
  	"delivery_o_t_p" varchar,
  	"cancellation_details_cancelled_by_id" uuid,
  	"cancellation_details_cancelled_at" timestamp(3) with time zone,
  	"cancellation_details_cancellation_reason" varchar,
  	"cod_collection_record_status" "payload"."enum_orders_cod_collection_record_status" DEFAULT 'pending',
  	"cod_collection_record_collected_at" timestamp(3) with time zone,
  	"cod_collection_record_payment_type" "payload"."enum_orders_cod_collection_record_payment_type",
  	"cod_collection_record_collected_by_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."orders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"transactions_id" uuid,
  	"delivery_partners_id" uuid
  );
  
  CREATE TABLE "payload"."transactions_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" uuid,
  	"variant_id" uuid,
  	"quantity" numeric DEFAULT 1 NOT NULL
  );
  
  CREATE TABLE "payload"."transactions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"payment_method" "payload"."enum_transactions_payment_method",
  	"stripe_customer_i_d" varchar,
  	"stripe_payment_intent_i_d" varchar,
  	"razorpay_order_i_d" varchar,
  	"razorpay_payment_i_d" varchar,
  	"razorpay_signature" varchar,
  	"razorpay_refund_i_d" varchar,
  	"razorpay_refund_status" "payload"."enum_transactions_razorpay_refund_status",
  	"razorpay_refunded_amount" numeric,
  	"razorpay_refunded_at" timestamp(3) with time zone,
  	"cod_notes" varchar,
  	"billing_address_title" varchar,
  	"billing_address_first_name" varchar,
  	"billing_address_last_name" varchar,
  	"billing_address_company" varchar,
  	"billing_address_address_line1" varchar,
  	"billing_address_address_line2" varchar,
  	"billing_address_city" varchar,
  	"billing_address_state" varchar,
  	"billing_address_postal_code" varchar,
  	"billing_address_country" varchar,
  	"billing_address_phone" varchar,
  	"billing_address_lat" numeric,
  	"billing_address_lng" numeric,
  	"status" "payload"."enum_transactions_status" DEFAULT 'pending' NOT NULL,
  	"customer_id" uuid,
  	"customer_email" varchar,
  	"order_id" uuid,
  	"cart_id" uuid,
  	"amount" numeric,
  	"currency" "payload"."enum_transactions_currency" DEFAULT 'INR',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
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
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid,
  	"pages_id" uuid,
  	"categories_id" uuid,
  	"media_id" uuid,
  	"retailers_id" uuid,
  	"delivery_partners_id" uuid,
  	"brands_id" uuid,
  	"ratings_id" uuid,
  	"wishlists_id" uuid,
  	"payout_ledger_id" uuid,
  	"payout_invoices_id" uuid,
  	"support_chats_id" uuid,
  	"chat_messages_id" uuid,
  	"chat_media_id" uuid,
  	"contact_us_id" uuid,
  	"forms_id" uuid,
  	"form_submissions_id" uuid,
  	"addresses_id" uuid,
  	"variants_id" uuid,
  	"variant_types_id" uuid,
  	"variant_options_id" uuid,
  	"products_id" uuid,
  	"carts_id" uuid,
  	"orders_id" uuid,
  	"transactions_id" uuid
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."header_nav_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum_header_nav_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."header" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."header_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid
  );
  
  CREATE TABLE "payload"."footer_nav_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum_footer_nav_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."footer" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."footer_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" uuid
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
  
  ALTER TABLE "payload"."users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_hero_links" ADD CONSTRAINT "pages_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_cta_links" ADD CONSTRAINT "pages_blocks_cta_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_cta" ADD CONSTRAINT "pages_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_content_columns" ADD CONSTRAINT "pages_blocks_content_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_content" ADD CONSTRAINT "pages_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_media_block" ADD CONSTRAINT "pages_blocks_media_block_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_media_block" ADD CONSTRAINT "pages_blocks_media_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_archive" ADD CONSTRAINT "pages_blocks_archive_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_carousel" ADD CONSTRAINT "pages_blocks_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_three_item_grid" ADD CONSTRAINT "pages_blocks_three_item_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_banner" ADD CONSTRAINT "pages_blocks_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_form_block" ADD CONSTRAINT "pages_blocks_form_block_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "payload"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_form_block" ADD CONSTRAINT "pages_blocks_form_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_rels" ADD CONSTRAINT "pages_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_rels" ADD CONSTRAINT "pages_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_rels" ADD CONSTRAINT "pages_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_version_hero_links" ADD CONSTRAINT "_pages_v_version_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_cta_links" ADD CONSTRAINT "_pages_v_blocks_cta_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_cta" ADD CONSTRAINT "_pages_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_content_columns" ADD CONSTRAINT "_pages_v_blocks_content_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_content" ADD CONSTRAINT "_pages_v_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ADD CONSTRAINT "_pages_v_blocks_media_block_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_media_block" ADD CONSTRAINT "_pages_v_blocks_media_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_archive" ADD CONSTRAINT "_pages_v_blocks_archive_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_carousel" ADD CONSTRAINT "_pages_v_blocks_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_three_item_grid" ADD CONSTRAINT "_pages_v_blocks_three_item_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_banner" ADD CONSTRAINT "_pages_v_blocks_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_form_block" ADD CONSTRAINT "_pages_v_blocks_form_block_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "payload"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_form_block" ADD CONSTRAINT "_pages_v_blocks_form_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v" ADD CONSTRAINT "_pages_v_version_hero_media_id_media_id_fk" FOREIGN KEY ("version_hero_media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v" ADD CONSTRAINT "_pages_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."categories_specification_templates_options" ADD CONSTRAINT "categories_specification_templates_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."categories_specification_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."categories_specification_templates" ADD CONSTRAINT "categories_specification_templates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."categories" ADD CONSTRAINT "categories_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."categories" ADD CONSTRAINT "categories_parent_category_id_categories_id_fk" FOREIGN KEY ("parent_category_id") REFERENCES "payload"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."retailers_payment_methods" ADD CONSTRAINT "retailers_payment_methods_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."retailers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."retailers_business_hours_week_off" ADD CONSTRAINT "retailers_business_hours_week_off_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."retailers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."retailers" ADD CONSTRAINT "retailers_profile_image_id_media_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."retailers" ADD CONSTRAINT "retailers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."retailers_rels" ADD CONSTRAINT "retailers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."retailers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."retailers_rels" ADD CONSTRAINT "retailers_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."delivery_partners_payment_methods" ADD CONSTRAINT "delivery_partners_payment_methods_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."delivery_partners" ADD CONSTRAINT "delivery_partners_profile_image_id_media_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."delivery_partners" ADD CONSTRAINT "delivery_partners_driving_license_id_media_id_fk" FOREIGN KEY ("driving_license_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."delivery_partners" ADD CONSTRAINT "delivery_partners_pancard_image_id_media_id_fk" FOREIGN KEY ("pancard_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."delivery_partners" ADD CONSTRAINT "delivery_partners_selfie_image_id_media_id_fk" FOREIGN KEY ("selfie_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."delivery_partners" ADD CONSTRAINT "delivery_partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."brands" ADD CONSTRAINT "brands_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
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
  ALTER TABLE "payload"."forms_blocks_checkbox" ADD CONSTRAINT "forms_blocks_checkbox_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_country" ADD CONSTRAINT "forms_blocks_country_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_email" ADD CONSTRAINT "forms_blocks_email_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_message" ADD CONSTRAINT "forms_blocks_message_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_number" ADD CONSTRAINT "forms_blocks_number_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_select_options" ADD CONSTRAINT "forms_blocks_select_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms_blocks_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_select" ADD CONSTRAINT "forms_blocks_select_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_state" ADD CONSTRAINT "forms_blocks_state_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_text" ADD CONSTRAINT "forms_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_textarea" ADD CONSTRAINT "forms_blocks_textarea_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_emails" ADD CONSTRAINT "forms_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."form_submissions_submission_data" ADD CONSTRAINT "form_submissions_submission_data_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "payload"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."addresses" ADD CONSTRAINT "addresses_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."variants_rels" ADD CONSTRAINT "variants_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."variants_rels" ADD CONSTRAINT "variants_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "payload"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_variants_v" ADD CONSTRAINT "_variants_v_parent_id_variants_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_variants_v" ADD CONSTRAINT "_variants_v_version_product_id_products_id_fk" FOREIGN KEY ("version_product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_variants_v_rels" ADD CONSTRAINT "_variants_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."_variants_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_variants_v_rels" ADD CONSTRAINT "_variants_v_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "payload"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."variant_options" ADD CONSTRAINT "variant_options_variant_type_id_variant_types_id_fk" FOREIGN KEY ("variant_type_id") REFERENCES "payload"."variant_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_gallery" ADD CONSTRAINT "products_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_gallery" ADD CONSTRAINT "products_gallery_variant_option_id_variant_options_id_fk" FOREIGN KEY ("variant_option_id") REFERENCES "payload"."variant_options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_gallery" ADD CONSTRAINT "products_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_blocks_cta_links" ADD CONSTRAINT "products_blocks_cta_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_blocks_cta" ADD CONSTRAINT "products_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_blocks_content_columns" ADD CONSTRAINT "products_blocks_content_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_blocks_content" ADD CONSTRAINT "products_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_blocks_media_block" ADD CONSTRAINT "products_blocks_media_block_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_blocks_media_block" ADD CONSTRAINT "products_blocks_media_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_specifications" ADD CONSTRAINT "products_specifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "payload"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_retailer_id_users_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_parent_template_id_products_id_fk" FOREIGN KEY ("parent_template_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "payload"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_version_gallery" ADD CONSTRAINT "_products_v_version_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_version_gallery" ADD CONSTRAINT "_products_v_version_gallery_variant_option_id_variant_options_id_fk" FOREIGN KEY ("variant_option_id") REFERENCES "payload"."variant_options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_version_gallery" ADD CONSTRAINT "_products_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_blocks_cta_links" ADD CONSTRAINT "_products_v_blocks_cta_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_products_v_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_blocks_cta" ADD CONSTRAINT "_products_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_blocks_content_columns" ADD CONSTRAINT "_products_v_blocks_content_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_products_v_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_blocks_content" ADD CONSTRAINT "_products_v_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_blocks_media_block" ADD CONSTRAINT "_products_v_blocks_media_block_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_blocks_media_block" ADD CONSTRAINT "_products_v_blocks_media_block_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_version_specifications" ADD CONSTRAINT "_products_v_version_specifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_version_brand_id_brands_id_fk" FOREIGN KEY ("version_brand_id") REFERENCES "payload"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_version_retailer_id_users_id_fk" FOREIGN KEY ("version_retailer_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v" ADD CONSTRAINT "_products_v_version_parent_template_id_products_id_fk" FOREIGN KEY ("version_parent_template_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "payload"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."carts_items" ADD CONSTRAINT "carts_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."carts_items" ADD CONSTRAINT "carts_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."carts_items" ADD CONSTRAINT "carts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."carts" ADD CONSTRAINT "carts_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_items" ADD CONSTRAINT "orders_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_items" ADD CONSTRAINT "orders_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders_status_history" ADD CONSTRAINT "orders_status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_status_history" ADD CONSTRAINT "orders_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "payload"."retailers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_delivery_partner_id_delivery_partners_id_fk" FOREIGN KEY ("delivery_partner_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_current_offered_partner_id_delivery_partners_id_fk" FOREIGN KEY ("current_offered_partner_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_cancellation_details_cancelled_by_id_users_id_fk" FOREIGN KEY ("cancellation_details_cancelled_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_cod_collection_record_collected_by_id_delivery_partners_id_fk" FOREIGN KEY ("cod_collection_record_collected_by_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_rels" ADD CONSTRAINT "orders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders_rels" ADD CONSTRAINT "orders_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "payload"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders_rels" ADD CONSTRAINT "orders_rels_delivery_partners_fk" FOREIGN KEY ("delivery_partners_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."transactions_items" ADD CONSTRAINT "transactions_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."transactions_items" ADD CONSTRAINT "transactions_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."transactions_items" ADD CONSTRAINT "transactions_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."transactions" ADD CONSTRAINT "transactions_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "payload"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."transactions" ADD CONSTRAINT "transactions_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "payload"."carts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_retailers_fk" FOREIGN KEY ("retailers_id") REFERENCES "payload"."retailers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_delivery_partners_fk" FOREIGN KEY ("delivery_partners_id") REFERENCES "payload"."delivery_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "payload"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ratings_fk" FOREIGN KEY ("ratings_id") REFERENCES "payload"."ratings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wishlists_fk" FOREIGN KEY ("wishlists_id") REFERENCES "payload"."wishlists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payout_ledger_fk" FOREIGN KEY ("payout_ledger_id") REFERENCES "payload"."payout_ledger"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payout_invoices_fk" FOREIGN KEY ("payout_invoices_id") REFERENCES "payload"."payout_invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_support_chats_fk" FOREIGN KEY ("support_chats_id") REFERENCES "payload"."support_chats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_messages_fk" FOREIGN KEY ("chat_messages_id") REFERENCES "payload"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_media_fk" FOREIGN KEY ("chat_media_id") REFERENCES "payload"."chat_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_us_fk" FOREIGN KEY ("contact_us_id") REFERENCES "payload"."contact_us"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "payload"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_addresses_fk" FOREIGN KEY ("addresses_id") REFERENCES "payload"."addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variants_fk" FOREIGN KEY ("variants_id") REFERENCES "payload"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variant_types_fk" FOREIGN KEY ("variant_types_id") REFERENCES "payload"."variant_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variant_options_fk" FOREIGN KEY ("variant_options_id") REFERENCES "payload"."variant_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "payload"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "payload"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."header_nav_items" ADD CONSTRAINT "header_nav_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."header_rels" ADD CONSTRAINT "header_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."header_rels" ADD CONSTRAINT "header_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."footer_nav_items" ADD CONSTRAINT "footer_nav_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."footer_rels" ADD CONSTRAINT "footer_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."footer_rels" ADD CONSTRAINT "footer_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."agent_settings_rels" ADD CONSTRAINT "agent_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."agent_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."agent_settings_rels" ADD CONSTRAINT "agent_settings_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "payload"."users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "payload"."users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "payload"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload"."users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_mobile_number_idx" ON "payload"."users" USING btree ("mobile_number");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE INDEX "pages_hero_links_order_idx" ON "payload"."pages_hero_links" USING btree ("_order");
  CREATE INDEX "pages_hero_links_parent_id_idx" ON "payload"."pages_hero_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_links_order_idx" ON "payload"."pages_blocks_cta_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_links_parent_id_idx" ON "payload"."pages_blocks_cta_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_order_idx" ON "payload"."pages_blocks_cta" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_parent_id_idx" ON "payload"."pages_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_path_idx" ON "payload"."pages_blocks_cta" USING btree ("_path");
  CREATE INDEX "pages_blocks_content_columns_order_idx" ON "payload"."pages_blocks_content_columns" USING btree ("_order");
  CREATE INDEX "pages_blocks_content_columns_parent_id_idx" ON "payload"."pages_blocks_content_columns" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_content_order_idx" ON "payload"."pages_blocks_content" USING btree ("_order");
  CREATE INDEX "pages_blocks_content_parent_id_idx" ON "payload"."pages_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_content_path_idx" ON "payload"."pages_blocks_content" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_block_order_idx" ON "payload"."pages_blocks_media_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_media_block_parent_id_idx" ON "payload"."pages_blocks_media_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_media_block_path_idx" ON "payload"."pages_blocks_media_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_media_block_media_idx" ON "payload"."pages_blocks_media_block" USING btree ("media_id");
  CREATE INDEX "pages_blocks_archive_order_idx" ON "payload"."pages_blocks_archive" USING btree ("_order");
  CREATE INDEX "pages_blocks_archive_parent_id_idx" ON "payload"."pages_blocks_archive" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_archive_path_idx" ON "payload"."pages_blocks_archive" USING btree ("_path");
  CREATE INDEX "pages_blocks_carousel_order_idx" ON "payload"."pages_blocks_carousel" USING btree ("_order");
  CREATE INDEX "pages_blocks_carousel_parent_id_idx" ON "payload"."pages_blocks_carousel" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_carousel_path_idx" ON "payload"."pages_blocks_carousel" USING btree ("_path");
  CREATE INDEX "pages_blocks_three_item_grid_order_idx" ON "payload"."pages_blocks_three_item_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_three_item_grid_parent_id_idx" ON "payload"."pages_blocks_three_item_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_three_item_grid_path_idx" ON "payload"."pages_blocks_three_item_grid" USING btree ("_path");
  CREATE INDEX "pages_blocks_banner_order_idx" ON "payload"."pages_blocks_banner" USING btree ("_order");
  CREATE INDEX "pages_blocks_banner_parent_id_idx" ON "payload"."pages_blocks_banner" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_banner_path_idx" ON "payload"."pages_blocks_banner" USING btree ("_path");
  CREATE INDEX "pages_blocks_form_block_order_idx" ON "payload"."pages_blocks_form_block" USING btree ("_order");
  CREATE INDEX "pages_blocks_form_block_parent_id_idx" ON "payload"."pages_blocks_form_block" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_form_block_path_idx" ON "payload"."pages_blocks_form_block" USING btree ("_path");
  CREATE INDEX "pages_blocks_form_block_form_idx" ON "payload"."pages_blocks_form_block" USING btree ("form_id");
  CREATE INDEX "pages_hero_hero_media_idx" ON "payload"."pages" USING btree ("hero_media_id");
  CREATE INDEX "pages_meta_meta_image_idx" ON "payload"."pages" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "payload"."pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "payload"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "payload"."pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "payload"."pages" USING btree ("_status");
  CREATE INDEX "pages_rels_order_idx" ON "payload"."pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "payload"."pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "payload"."pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_pages_id_idx" ON "payload"."pages_rels" USING btree ("pages_id");
  CREATE INDEX "pages_rels_categories_id_idx" ON "payload"."pages_rels" USING btree ("categories_id");
  CREATE INDEX "pages_rels_products_id_idx" ON "payload"."pages_rels" USING btree ("products_id");
  CREATE INDEX "_pages_v_version_hero_links_order_idx" ON "payload"."_pages_v_version_hero_links" USING btree ("_order");
  CREATE INDEX "_pages_v_version_hero_links_parent_id_idx" ON "payload"."_pages_v_version_hero_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_links_order_idx" ON "payload"."_pages_v_blocks_cta_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_links_parent_id_idx" ON "payload"."_pages_v_blocks_cta_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_order_idx" ON "payload"."_pages_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_parent_id_idx" ON "payload"."_pages_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_path_idx" ON "payload"."_pages_v_blocks_cta" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_content_columns_order_idx" ON "payload"."_pages_v_blocks_content_columns" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_content_columns_parent_id_idx" ON "payload"."_pages_v_blocks_content_columns" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_content_order_idx" ON "payload"."_pages_v_blocks_content" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_content_parent_id_idx" ON "payload"."_pages_v_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_content_path_idx" ON "payload"."_pages_v_blocks_content" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_block_order_idx" ON "payload"."_pages_v_blocks_media_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_media_block_parent_id_idx" ON "payload"."_pages_v_blocks_media_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_media_block_path_idx" ON "payload"."_pages_v_blocks_media_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_media_block_media_idx" ON "payload"."_pages_v_blocks_media_block" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_archive_order_idx" ON "payload"."_pages_v_blocks_archive" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_archive_parent_id_idx" ON "payload"."_pages_v_blocks_archive" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_archive_path_idx" ON "payload"."_pages_v_blocks_archive" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_carousel_order_idx" ON "payload"."_pages_v_blocks_carousel" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_carousel_parent_id_idx" ON "payload"."_pages_v_blocks_carousel" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_carousel_path_idx" ON "payload"."_pages_v_blocks_carousel" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_three_item_grid_order_idx" ON "payload"."_pages_v_blocks_three_item_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_three_item_grid_parent_id_idx" ON "payload"."_pages_v_blocks_three_item_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_three_item_grid_path_idx" ON "payload"."_pages_v_blocks_three_item_grid" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_banner_order_idx" ON "payload"."_pages_v_blocks_banner" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_banner_parent_id_idx" ON "payload"."_pages_v_blocks_banner" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_banner_path_idx" ON "payload"."_pages_v_blocks_banner" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_form_block_order_idx" ON "payload"."_pages_v_blocks_form_block" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_form_block_parent_id_idx" ON "payload"."_pages_v_blocks_form_block" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_form_block_path_idx" ON "payload"."_pages_v_blocks_form_block" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_form_block_form_idx" ON "payload"."_pages_v_blocks_form_block" USING btree ("form_id");
  CREATE INDEX "_pages_v_parent_idx" ON "payload"."_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_hero_version_hero_media_idx" ON "payload"."_pages_v" USING btree ("version_hero_media_id");
  CREATE INDEX "_pages_v_version_meta_version_meta_image_idx" ON "payload"."_pages_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "payload"."_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "payload"."_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "payload"."_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "payload"."_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "payload"."_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "payload"."_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "payload"."_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "payload"."_pages_v" USING btree ("autosave");
  CREATE INDEX "_pages_v_rels_order_idx" ON "payload"."_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "payload"."_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "payload"."_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_pages_id_idx" ON "payload"."_pages_v_rels" USING btree ("pages_id");
  CREATE INDEX "_pages_v_rels_categories_id_idx" ON "payload"."_pages_v_rels" USING btree ("categories_id");
  CREATE INDEX "_pages_v_rels_products_id_idx" ON "payload"."_pages_v_rels" USING btree ("products_id");
  CREATE INDEX "categories_specification_templates_options_order_idx" ON "payload"."categories_specification_templates_options" USING btree ("_order");
  CREATE INDEX "categories_specification_templates_options_parent_id_idx" ON "payload"."categories_specification_templates_options" USING btree ("_parent_id");
  CREATE INDEX "categories_specification_templates_order_idx" ON "payload"."categories_specification_templates" USING btree ("_order");
  CREATE INDEX "categories_specification_templates_parent_id_idx" ON "payload"."categories_specification_templates" USING btree ("_parent_id");
  CREATE INDEX "categories_media_idx" ON "payload"."categories" USING btree ("media_id");
  CREATE INDEX "categories_parent_category_idx" ON "payload"."categories" USING btree ("parent_category_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "payload"."categories" USING btree ("slug");
  CREATE INDEX "categories_updated_at_idx" ON "payload"."categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "payload"."categories" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "retailers_payment_methods_order_idx" ON "payload"."retailers_payment_methods" USING btree ("_order");
  CREATE INDEX "retailers_payment_methods_parent_id_idx" ON "payload"."retailers_payment_methods" USING btree ("_parent_id");
  CREATE INDEX "retailers_business_hours_week_off_order_idx" ON "payload"."retailers_business_hours_week_off" USING btree ("order");
  CREATE INDEX "retailers_business_hours_week_off_parent_idx" ON "payload"."retailers_business_hours_week_off" USING btree ("parent_id");
  CREATE UNIQUE INDEX "retailers_mobile_number_idx" ON "payload"."retailers" USING btree ("mobile_number");
  CREATE INDEX "retailers_profile_image_idx" ON "payload"."retailers" USING btree ("profile_image_id");
  CREATE UNIQUE INDEX "retailers_user_idx" ON "payload"."retailers" USING btree ("user_id");
  CREATE INDEX "retailers_updated_at_idx" ON "payload"."retailers" USING btree ("updated_at");
  CREATE INDEX "retailers_created_at_idx" ON "payload"."retailers" USING btree ("created_at");
  CREATE INDEX "retailers_rels_order_idx" ON "payload"."retailers_rels" USING btree ("order");
  CREATE INDEX "retailers_rels_parent_idx" ON "payload"."retailers_rels" USING btree ("parent_id");
  CREATE INDEX "retailers_rels_path_idx" ON "payload"."retailers_rels" USING btree ("path");
  CREATE INDEX "retailers_rels_media_id_idx" ON "payload"."retailers_rels" USING btree ("media_id");
  CREATE INDEX "delivery_partners_payment_methods_order_idx" ON "payload"."delivery_partners_payment_methods" USING btree ("_order");
  CREATE INDEX "delivery_partners_payment_methods_parent_id_idx" ON "payload"."delivery_partners_payment_methods" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "delivery_partners_mobile_number_idx" ON "payload"."delivery_partners" USING btree ("mobile_number");
  CREATE INDEX "delivery_partners_profile_image_idx" ON "payload"."delivery_partners" USING btree ("profile_image_id");
  CREATE INDEX "delivery_partners_driving_license_idx" ON "payload"."delivery_partners" USING btree ("driving_license_id");
  CREATE INDEX "delivery_partners_pancard_image_idx" ON "payload"."delivery_partners" USING btree ("pancard_image_id");
  CREATE INDEX "delivery_partners_selfie_image_idx" ON "payload"."delivery_partners" USING btree ("selfie_image_id");
  CREATE UNIQUE INDEX "delivery_partners_user_idx" ON "payload"."delivery_partners" USING btree ("user_id");
  CREATE INDEX "delivery_partners_updated_at_idx" ON "payload"."delivery_partners" USING btree ("updated_at");
  CREATE INDEX "delivery_partners_created_at_idx" ON "payload"."delivery_partners" USING btree ("created_at");
  CREATE INDEX "brands_logo_idx" ON "payload"."brands" USING btree ("logo_id");
  CREATE UNIQUE INDEX "brands_slug_idx" ON "payload"."brands" USING btree ("slug");
  CREATE INDEX "brands_updated_at_idx" ON "payload"."brands" USING btree ("updated_at");
  CREATE INDEX "brands_created_at_idx" ON "payload"."brands" USING btree ("created_at");
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
  CREATE INDEX "forms_blocks_checkbox_order_idx" ON "payload"."forms_blocks_checkbox" USING btree ("_order");
  CREATE INDEX "forms_blocks_checkbox_parent_id_idx" ON "payload"."forms_blocks_checkbox" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_checkbox_path_idx" ON "payload"."forms_blocks_checkbox" USING btree ("_path");
  CREATE INDEX "forms_blocks_country_order_idx" ON "payload"."forms_blocks_country" USING btree ("_order");
  CREATE INDEX "forms_blocks_country_parent_id_idx" ON "payload"."forms_blocks_country" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_country_path_idx" ON "payload"."forms_blocks_country" USING btree ("_path");
  CREATE INDEX "forms_blocks_email_order_idx" ON "payload"."forms_blocks_email" USING btree ("_order");
  CREATE INDEX "forms_blocks_email_parent_id_idx" ON "payload"."forms_blocks_email" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_email_path_idx" ON "payload"."forms_blocks_email" USING btree ("_path");
  CREATE INDEX "forms_blocks_message_order_idx" ON "payload"."forms_blocks_message" USING btree ("_order");
  CREATE INDEX "forms_blocks_message_parent_id_idx" ON "payload"."forms_blocks_message" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_message_path_idx" ON "payload"."forms_blocks_message" USING btree ("_path");
  CREATE INDEX "forms_blocks_number_order_idx" ON "payload"."forms_blocks_number" USING btree ("_order");
  CREATE INDEX "forms_blocks_number_parent_id_idx" ON "payload"."forms_blocks_number" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_number_path_idx" ON "payload"."forms_blocks_number" USING btree ("_path");
  CREATE INDEX "forms_blocks_select_options_order_idx" ON "payload"."forms_blocks_select_options" USING btree ("_order");
  CREATE INDEX "forms_blocks_select_options_parent_id_idx" ON "payload"."forms_blocks_select_options" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_select_order_idx" ON "payload"."forms_blocks_select" USING btree ("_order");
  CREATE INDEX "forms_blocks_select_parent_id_idx" ON "payload"."forms_blocks_select" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_select_path_idx" ON "payload"."forms_blocks_select" USING btree ("_path");
  CREATE INDEX "forms_blocks_state_order_idx" ON "payload"."forms_blocks_state" USING btree ("_order");
  CREATE INDEX "forms_blocks_state_parent_id_idx" ON "payload"."forms_blocks_state" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_state_path_idx" ON "payload"."forms_blocks_state" USING btree ("_path");
  CREATE INDEX "forms_blocks_text_order_idx" ON "payload"."forms_blocks_text" USING btree ("_order");
  CREATE INDEX "forms_blocks_text_parent_id_idx" ON "payload"."forms_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_text_path_idx" ON "payload"."forms_blocks_text" USING btree ("_path");
  CREATE INDEX "forms_blocks_textarea_order_idx" ON "payload"."forms_blocks_textarea" USING btree ("_order");
  CREATE INDEX "forms_blocks_textarea_parent_id_idx" ON "payload"."forms_blocks_textarea" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_textarea_path_idx" ON "payload"."forms_blocks_textarea" USING btree ("_path");
  CREATE INDEX "forms_emails_order_idx" ON "payload"."forms_emails" USING btree ("_order");
  CREATE INDEX "forms_emails_parent_id_idx" ON "payload"."forms_emails" USING btree ("_parent_id");
  CREATE INDEX "forms_updated_at_idx" ON "payload"."forms" USING btree ("updated_at");
  CREATE INDEX "forms_created_at_idx" ON "payload"."forms" USING btree ("created_at");
  CREATE INDEX "form_submissions_submission_data_order_idx" ON "payload"."form_submissions_submission_data" USING btree ("_order");
  CREATE INDEX "form_submissions_submission_data_parent_id_idx" ON "payload"."form_submissions_submission_data" USING btree ("_parent_id");
  CREATE INDEX "form_submissions_form_idx" ON "payload"."form_submissions" USING btree ("form_id");
  CREATE INDEX "form_submissions_updated_at_idx" ON "payload"."form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "payload"."form_submissions" USING btree ("created_at");
  CREATE INDEX "addresses_customer_idx" ON "payload"."addresses" USING btree ("customer_id");
  CREATE INDEX "addresses_updated_at_idx" ON "payload"."addresses" USING btree ("updated_at");
  CREATE INDEX "addresses_created_at_idx" ON "payload"."addresses" USING btree ("created_at");
  CREATE INDEX "variants_product_idx" ON "payload"."variants" USING btree ("product_id");
  CREATE INDEX "variants_updated_at_idx" ON "payload"."variants" USING btree ("updated_at");
  CREATE INDEX "variants_created_at_idx" ON "payload"."variants" USING btree ("created_at");
  CREATE INDEX "variants_deleted_at_idx" ON "payload"."variants" USING btree ("deleted_at");
  CREATE INDEX "variants__status_idx" ON "payload"."variants" USING btree ("_status");
  CREATE INDEX "variants_rels_order_idx" ON "payload"."variants_rels" USING btree ("order");
  CREATE INDEX "variants_rels_parent_idx" ON "payload"."variants_rels" USING btree ("parent_id");
  CREATE INDEX "variants_rels_path_idx" ON "payload"."variants_rels" USING btree ("path");
  CREATE INDEX "variants_rels_variant_options_id_idx" ON "payload"."variants_rels" USING btree ("variant_options_id");
  CREATE INDEX "_variants_v_parent_idx" ON "payload"."_variants_v" USING btree ("parent_id");
  CREATE INDEX "_variants_v_version_version_product_idx" ON "payload"."_variants_v" USING btree ("version_product_id");
  CREATE INDEX "_variants_v_version_version_updated_at_idx" ON "payload"."_variants_v" USING btree ("version_updated_at");
  CREATE INDEX "_variants_v_version_version_created_at_idx" ON "payload"."_variants_v" USING btree ("version_created_at");
  CREATE INDEX "_variants_v_version_version_deleted_at_idx" ON "payload"."_variants_v" USING btree ("version_deleted_at");
  CREATE INDEX "_variants_v_version_version__status_idx" ON "payload"."_variants_v" USING btree ("version__status");
  CREATE INDEX "_variants_v_created_at_idx" ON "payload"."_variants_v" USING btree ("created_at");
  CREATE INDEX "_variants_v_updated_at_idx" ON "payload"."_variants_v" USING btree ("updated_at");
  CREATE INDEX "_variants_v_latest_idx" ON "payload"."_variants_v" USING btree ("latest");
  CREATE INDEX "_variants_v_autosave_idx" ON "payload"."_variants_v" USING btree ("autosave");
  CREATE INDEX "_variants_v_rels_order_idx" ON "payload"."_variants_v_rels" USING btree ("order");
  CREATE INDEX "_variants_v_rels_parent_idx" ON "payload"."_variants_v_rels" USING btree ("parent_id");
  CREATE INDEX "_variants_v_rels_path_idx" ON "payload"."_variants_v_rels" USING btree ("path");
  CREATE INDEX "_variants_v_rels_variant_options_id_idx" ON "payload"."_variants_v_rels" USING btree ("variant_options_id");
  CREATE INDEX "variant_types_updated_at_idx" ON "payload"."variant_types" USING btree ("updated_at");
  CREATE INDEX "variant_types_created_at_idx" ON "payload"."variant_types" USING btree ("created_at");
  CREATE INDEX "variant_types_deleted_at_idx" ON "payload"."variant_types" USING btree ("deleted_at");
  CREATE INDEX "variant_options__variantoptions_options_order_idx" ON "payload"."variant_options" USING btree ("_variantoptions_options_order");
  CREATE INDEX "variant_options_variant_type_idx" ON "payload"."variant_options" USING btree ("variant_type_id");
  CREATE INDEX "variant_options_updated_at_idx" ON "payload"."variant_options" USING btree ("updated_at");
  CREATE INDEX "variant_options_created_at_idx" ON "payload"."variant_options" USING btree ("created_at");
  CREATE INDEX "variant_options_deleted_at_idx" ON "payload"."variant_options" USING btree ("deleted_at");
  CREATE INDEX "products_gallery_order_idx" ON "payload"."products_gallery" USING btree ("_order");
  CREATE INDEX "products_gallery_parent_id_idx" ON "payload"."products_gallery" USING btree ("_parent_id");
  CREATE INDEX "products_gallery_image_idx" ON "payload"."products_gallery" USING btree ("image_id");
  CREATE INDEX "products_gallery_variant_option_idx" ON "payload"."products_gallery" USING btree ("variant_option_id");
  CREATE INDEX "products_blocks_cta_links_order_idx" ON "payload"."products_blocks_cta_links" USING btree ("_order");
  CREATE INDEX "products_blocks_cta_links_parent_id_idx" ON "payload"."products_blocks_cta_links" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_cta_order_idx" ON "payload"."products_blocks_cta" USING btree ("_order");
  CREATE INDEX "products_blocks_cta_parent_id_idx" ON "payload"."products_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_cta_path_idx" ON "payload"."products_blocks_cta" USING btree ("_path");
  CREATE INDEX "products_blocks_content_columns_order_idx" ON "payload"."products_blocks_content_columns" USING btree ("_order");
  CREATE INDEX "products_blocks_content_columns_parent_id_idx" ON "payload"."products_blocks_content_columns" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_content_order_idx" ON "payload"."products_blocks_content" USING btree ("_order");
  CREATE INDEX "products_blocks_content_parent_id_idx" ON "payload"."products_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_content_path_idx" ON "payload"."products_blocks_content" USING btree ("_path");
  CREATE INDEX "products_blocks_media_block_order_idx" ON "payload"."products_blocks_media_block" USING btree ("_order");
  CREATE INDEX "products_blocks_media_block_parent_id_idx" ON "payload"."products_blocks_media_block" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_media_block_path_idx" ON "payload"."products_blocks_media_block" USING btree ("_path");
  CREATE INDEX "products_blocks_media_block_media_idx" ON "payload"."products_blocks_media_block" USING btree ("media_id");
  CREATE INDEX "products_specifications_order_idx" ON "payload"."products_specifications" USING btree ("_order");
  CREATE INDEX "products_specifications_parent_id_idx" ON "payload"."products_specifications" USING btree ("_parent_id");
  CREATE INDEX "products_brand_idx" ON "payload"."products" USING btree ("brand_id");
  CREATE INDEX "products_meta_meta_image_idx" ON "payload"."products" USING btree ("meta_image_id");
  CREATE INDEX "products_retailer_idx" ON "payload"."products" USING btree ("retailer_id");
  CREATE INDEX "products_parent_template_idx" ON "payload"."products" USING btree ("parent_template_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "payload"."products" USING btree ("slug");
  CREATE INDEX "products_updated_at_idx" ON "payload"."products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "payload"."products" USING btree ("created_at");
  CREATE INDEX "products_deleted_at_idx" ON "payload"."products" USING btree ("deleted_at");
  CREATE INDEX "products__status_idx" ON "payload"."products" USING btree ("_status");
  CREATE INDEX "products_rels_order_idx" ON "payload"."products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "payload"."products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "payload"."products_rels" USING btree ("path");
  CREATE INDEX "products_rels_pages_id_idx" ON "payload"."products_rels" USING btree ("pages_id");
  CREATE INDEX "products_rels_variant_types_id_idx" ON "payload"."products_rels" USING btree ("variant_types_id");
  CREATE INDEX "products_rels_products_id_idx" ON "payload"."products_rels" USING btree ("products_id");
  CREATE INDEX "products_rels_categories_id_idx" ON "payload"."products_rels" USING btree ("categories_id");
  CREATE INDEX "_products_v_version_gallery_order_idx" ON "payload"."_products_v_version_gallery" USING btree ("_order");
  CREATE INDEX "_products_v_version_gallery_parent_id_idx" ON "payload"."_products_v_version_gallery" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_gallery_image_idx" ON "payload"."_products_v_version_gallery" USING btree ("image_id");
  CREATE INDEX "_products_v_version_gallery_variant_option_idx" ON "payload"."_products_v_version_gallery" USING btree ("variant_option_id");
  CREATE INDEX "_products_v_blocks_cta_links_order_idx" ON "payload"."_products_v_blocks_cta_links" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_cta_links_parent_id_idx" ON "payload"."_products_v_blocks_cta_links" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_cta_order_idx" ON "payload"."_products_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_cta_parent_id_idx" ON "payload"."_products_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_cta_path_idx" ON "payload"."_products_v_blocks_cta" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_content_columns_order_idx" ON "payload"."_products_v_blocks_content_columns" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_content_columns_parent_id_idx" ON "payload"."_products_v_blocks_content_columns" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_content_order_idx" ON "payload"."_products_v_blocks_content" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_content_parent_id_idx" ON "payload"."_products_v_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_content_path_idx" ON "payload"."_products_v_blocks_content" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_media_block_order_idx" ON "payload"."_products_v_blocks_media_block" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_media_block_parent_id_idx" ON "payload"."_products_v_blocks_media_block" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_media_block_path_idx" ON "payload"."_products_v_blocks_media_block" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_media_block_media_idx" ON "payload"."_products_v_blocks_media_block" USING btree ("media_id");
  CREATE INDEX "_products_v_version_specifications_order_idx" ON "payload"."_products_v_version_specifications" USING btree ("_order");
  CREATE INDEX "_products_v_version_specifications_parent_id_idx" ON "payload"."_products_v_version_specifications" USING btree ("_parent_id");
  CREATE INDEX "_products_v_parent_idx" ON "payload"."_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_brand_idx" ON "payload"."_products_v" USING btree ("version_brand_id");
  CREATE INDEX "_products_v_version_meta_version_meta_image_idx" ON "payload"."_products_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_products_v_version_version_retailer_idx" ON "payload"."_products_v" USING btree ("version_retailer_id");
  CREATE INDEX "_products_v_version_version_parent_template_idx" ON "payload"."_products_v" USING btree ("version_parent_template_id");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "payload"."_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "payload"."_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "payload"."_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version_deleted_at_idx" ON "payload"."_products_v" USING btree ("version_deleted_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "payload"."_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "payload"."_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "payload"."_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_latest_idx" ON "payload"."_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_autosave_idx" ON "payload"."_products_v" USING btree ("autosave");
  CREATE INDEX "_products_v_rels_order_idx" ON "payload"."_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "payload"."_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "payload"."_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_pages_id_idx" ON "payload"."_products_v_rels" USING btree ("pages_id");
  CREATE INDEX "_products_v_rels_variant_types_id_idx" ON "payload"."_products_v_rels" USING btree ("variant_types_id");
  CREATE INDEX "_products_v_rels_products_id_idx" ON "payload"."_products_v_rels" USING btree ("products_id");
  CREATE INDEX "_products_v_rels_categories_id_idx" ON "payload"."_products_v_rels" USING btree ("categories_id");
  CREATE INDEX "carts_items_order_idx" ON "payload"."carts_items" USING btree ("_order");
  CREATE INDEX "carts_items_parent_id_idx" ON "payload"."carts_items" USING btree ("_parent_id");
  CREATE INDEX "carts_items_product_idx" ON "payload"."carts_items" USING btree ("product_id");
  CREATE INDEX "carts_items_variant_idx" ON "payload"."carts_items" USING btree ("variant_id");
  CREATE INDEX "carts_secret_idx" ON "payload"."carts" USING btree ("secret");
  CREATE INDEX "carts_customer_idx" ON "payload"."carts" USING btree ("customer_id");
  CREATE INDEX "carts_updated_at_idx" ON "payload"."carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "payload"."carts" USING btree ("created_at");
  CREATE INDEX "orders_items_order_idx" ON "payload"."orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "payload"."orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_product_idx" ON "payload"."orders_items" USING btree ("product_id");
  CREATE INDEX "orders_items_variant_idx" ON "payload"."orders_items" USING btree ("variant_id");
  CREATE INDEX "orders_status_history_order_idx" ON "payload"."orders_status_history" USING btree ("_order");
  CREATE INDEX "orders_status_history_parent_id_idx" ON "payload"."orders_status_history" USING btree ("_parent_id");
  CREATE INDEX "orders_status_history_changed_by_idx" ON "payload"."orders_status_history" USING btree ("changed_by_id");
  CREATE INDEX "orders_customer_idx" ON "payload"."orders" USING btree ("customer_id");
  CREATE INDEX "orders_retailer_idx" ON "payload"."orders" USING btree ("retailer_id");
  CREATE UNIQUE INDEX "orders_access_token_idx" ON "payload"."orders" USING btree ("access_token");
  CREATE INDEX "orders_delivery_partner_idx" ON "payload"."orders" USING btree ("delivery_partner_id");
  CREATE INDEX "orders_current_offered_partner_idx" ON "payload"."orders" USING btree ("current_offered_partner_id");
  CREATE INDEX "orders_cancellation_details_cancellation_details_cancell_idx" ON "payload"."orders" USING btree ("cancellation_details_cancelled_by_id");
  CREATE INDEX "orders_cod_collection_record_cod_collection_record_colle_idx" ON "payload"."orders" USING btree ("cod_collection_record_collected_by_id");
  CREATE INDEX "orders_updated_at_idx" ON "payload"."orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "payload"."orders" USING btree ("created_at");
  CREATE INDEX "orders_rels_order_idx" ON "payload"."orders_rels" USING btree ("order");
  CREATE INDEX "orders_rels_parent_idx" ON "payload"."orders_rels" USING btree ("parent_id");
  CREATE INDEX "orders_rels_path_idx" ON "payload"."orders_rels" USING btree ("path");
  CREATE INDEX "orders_rels_transactions_id_idx" ON "payload"."orders_rels" USING btree ("transactions_id");
  CREATE INDEX "orders_rels_delivery_partners_id_idx" ON "payload"."orders_rels" USING btree ("delivery_partners_id");
  CREATE INDEX "transactions_items_order_idx" ON "payload"."transactions_items" USING btree ("_order");
  CREATE INDEX "transactions_items_parent_id_idx" ON "payload"."transactions_items" USING btree ("_parent_id");
  CREATE INDEX "transactions_items_product_idx" ON "payload"."transactions_items" USING btree ("product_id");
  CREATE INDEX "transactions_items_variant_idx" ON "payload"."transactions_items" USING btree ("variant_id");
  CREATE INDEX "transactions_customer_idx" ON "payload"."transactions" USING btree ("customer_id");
  CREATE INDEX "transactions_order_idx" ON "payload"."transactions" USING btree ("order_id");
  CREATE INDEX "transactions_cart_idx" ON "payload"."transactions" USING btree ("cart_id");
  CREATE INDEX "transactions_updated_at_idx" ON "payload"."transactions" USING btree ("updated_at");
  CREATE INDEX "transactions_created_at_idx" ON "payload"."transactions" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
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
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_retailers_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("retailers_id");
  CREATE INDEX "payload_locked_documents_rels_delivery_partners_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("delivery_partners_id");
  CREATE INDEX "payload_locked_documents_rels_brands_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("brands_id");
  CREATE INDEX "payload_locked_documents_rels_ratings_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("ratings_id");
  CREATE INDEX "payload_locked_documents_rels_wishlists_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("wishlists_id");
  CREATE INDEX "payload_locked_documents_rels_payout_ledger_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("payout_ledger_id");
  CREATE INDEX "payload_locked_documents_rels_payout_invoices_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("payout_invoices_id");
  CREATE INDEX "payload_locked_documents_rels_support_chats_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("support_chats_id");
  CREATE INDEX "payload_locked_documents_rels_chat_messages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("chat_messages_id");
  CREATE INDEX "payload_locked_documents_rels_chat_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("chat_media_id");
  CREATE INDEX "payload_locked_documents_rels_contact_us_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("contact_us_id");
  CREATE INDEX "payload_locked_documents_rels_forms_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("forms_id");
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("form_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_addresses_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("addresses_id");
  CREATE INDEX "payload_locked_documents_rels_variants_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("variants_id");
  CREATE INDEX "payload_locked_documents_rels_variant_types_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("variant_types_id");
  CREATE INDEX "payload_locked_documents_rels_variant_options_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("variant_options_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("carts_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_transactions_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("transactions_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");
  CREATE INDEX "header_nav_items_order_idx" ON "payload"."header_nav_items" USING btree ("_order");
  CREATE INDEX "header_nav_items_parent_id_idx" ON "payload"."header_nav_items" USING btree ("_parent_id");
  CREATE INDEX "header_rels_order_idx" ON "payload"."header_rels" USING btree ("order");
  CREATE INDEX "header_rels_parent_idx" ON "payload"."header_rels" USING btree ("parent_id");
  CREATE INDEX "header_rels_path_idx" ON "payload"."header_rels" USING btree ("path");
  CREATE INDEX "header_rels_pages_id_idx" ON "payload"."header_rels" USING btree ("pages_id");
  CREATE INDEX "footer_nav_items_order_idx" ON "payload"."footer_nav_items" USING btree ("_order");
  CREATE INDEX "footer_nav_items_parent_id_idx" ON "payload"."footer_nav_items" USING btree ("_parent_id");
  CREATE INDEX "footer_rels_order_idx" ON "payload"."footer_rels" USING btree ("order");
  CREATE INDEX "footer_rels_parent_idx" ON "payload"."footer_rels" USING btree ("parent_id");
  CREATE INDEX "footer_rels_path_idx" ON "payload"."footer_rels" USING btree ("path");
  CREATE INDEX "footer_rels_pages_id_idx" ON "payload"."footer_rels" USING btree ("pages_id");
  CREATE INDEX "agent_settings_rels_order_idx" ON "payload"."agent_settings_rels" USING btree ("order");
  CREATE INDEX "agent_settings_rels_parent_idx" ON "payload"."agent_settings_rels" USING btree ("parent_id");
  CREATE INDEX "agent_settings_rels_path_idx" ON "payload"."agent_settings_rels" USING btree ("path");
  CREATE INDEX "agent_settings_rels_users_id_idx" ON "payload"."agent_settings_rels" USING btree ("users_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."users_roles" CASCADE;
  DROP TABLE "payload"."users_sessions" CASCADE;
  DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."pages_hero_links" CASCADE;
  DROP TABLE "payload"."pages_blocks_cta_links" CASCADE;
  DROP TABLE "payload"."pages_blocks_cta" CASCADE;
  DROP TABLE "payload"."pages_blocks_content_columns" CASCADE;
  DROP TABLE "payload"."pages_blocks_content" CASCADE;
  DROP TABLE "payload"."pages_blocks_media_block" CASCADE;
  DROP TABLE "payload"."pages_blocks_archive" CASCADE;
  DROP TABLE "payload"."pages_blocks_carousel" CASCADE;
  DROP TABLE "payload"."pages_blocks_three_item_grid" CASCADE;
  DROP TABLE "payload"."pages_blocks_banner" CASCADE;
  DROP TABLE "payload"."pages_blocks_form_block" CASCADE;
  DROP TABLE "payload"."pages" CASCADE;
  DROP TABLE "payload"."pages_rels" CASCADE;
  DROP TABLE "payload"."_pages_v_version_hero_links" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_cta_links" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_cta" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_content_columns" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_content" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_media_block" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_archive" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_carousel" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_three_item_grid" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_banner" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_form_block" CASCADE;
  DROP TABLE "payload"."_pages_v" CASCADE;
  DROP TABLE "payload"."_pages_v_rels" CASCADE;
  DROP TABLE "payload"."categories_specification_templates_options" CASCADE;
  DROP TABLE "payload"."categories_specification_templates" CASCADE;
  DROP TABLE "payload"."categories" CASCADE;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."retailers_payment_methods" CASCADE;
  DROP TABLE "payload"."retailers_business_hours_week_off" CASCADE;
  DROP TABLE "payload"."retailers" CASCADE;
  DROP TABLE "payload"."retailers_rels" CASCADE;
  DROP TABLE "payload"."delivery_partners_payment_methods" CASCADE;
  DROP TABLE "payload"."delivery_partners" CASCADE;
  DROP TABLE "payload"."brands" CASCADE;
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
  DROP TABLE "payload"."forms_blocks_checkbox" CASCADE;
  DROP TABLE "payload"."forms_blocks_country" CASCADE;
  DROP TABLE "payload"."forms_blocks_email" CASCADE;
  DROP TABLE "payload"."forms_blocks_message" CASCADE;
  DROP TABLE "payload"."forms_blocks_number" CASCADE;
  DROP TABLE "payload"."forms_blocks_select_options" CASCADE;
  DROP TABLE "payload"."forms_blocks_select" CASCADE;
  DROP TABLE "payload"."forms_blocks_state" CASCADE;
  DROP TABLE "payload"."forms_blocks_text" CASCADE;
  DROP TABLE "payload"."forms_blocks_textarea" CASCADE;
  DROP TABLE "payload"."forms_emails" CASCADE;
  DROP TABLE "payload"."forms" CASCADE;
  DROP TABLE "payload"."form_submissions_submission_data" CASCADE;
  DROP TABLE "payload"."form_submissions" CASCADE;
  DROP TABLE "payload"."addresses" CASCADE;
  DROP TABLE "payload"."variants" CASCADE;
  DROP TABLE "payload"."variants_rels" CASCADE;
  DROP TABLE "payload"."_variants_v" CASCADE;
  DROP TABLE "payload"."_variants_v_rels" CASCADE;
  DROP TABLE "payload"."variant_types" CASCADE;
  DROP TABLE "payload"."variant_options" CASCADE;
  DROP TABLE "payload"."products_gallery" CASCADE;
  DROP TABLE "payload"."products_blocks_cta_links" CASCADE;
  DROP TABLE "payload"."products_blocks_cta" CASCADE;
  DROP TABLE "payload"."products_blocks_content_columns" CASCADE;
  DROP TABLE "payload"."products_blocks_content" CASCADE;
  DROP TABLE "payload"."products_blocks_media_block" CASCADE;
  DROP TABLE "payload"."products_specifications" CASCADE;
  DROP TABLE "payload"."products" CASCADE;
  DROP TABLE "payload"."products_rels" CASCADE;
  DROP TABLE "payload"."_products_v_version_gallery" CASCADE;
  DROP TABLE "payload"."_products_v_blocks_cta_links" CASCADE;
  DROP TABLE "payload"."_products_v_blocks_cta" CASCADE;
  DROP TABLE "payload"."_products_v_blocks_content_columns" CASCADE;
  DROP TABLE "payload"."_products_v_blocks_content" CASCADE;
  DROP TABLE "payload"."_products_v_blocks_media_block" CASCADE;
  DROP TABLE "payload"."_products_v_version_specifications" CASCADE;
  DROP TABLE "payload"."_products_v" CASCADE;
  DROP TABLE "payload"."_products_v_rels" CASCADE;
  DROP TABLE "payload"."carts_items" CASCADE;
  DROP TABLE "payload"."carts" CASCADE;
  DROP TABLE "payload"."orders_items" CASCADE;
  DROP TABLE "payload"."orders_status_history" CASCADE;
  DROP TABLE "payload"."orders" CASCADE;
  DROP TABLE "payload"."orders_rels" CASCADE;
  DROP TABLE "payload"."transactions_items" CASCADE;
  DROP TABLE "payload"."transactions" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_jobs_log" CASCADE;
  DROP TABLE "payload"."payload_jobs" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TABLE "payload"."header_nav_items" CASCADE;
  DROP TABLE "payload"."header" CASCADE;
  DROP TABLE "payload"."header_rels" CASCADE;
  DROP TABLE "payload"."footer_nav_items" CASCADE;
  DROP TABLE "payload"."footer" CASCADE;
  DROP TABLE "payload"."footer_rels" CASCADE;
  DROP TABLE "payload"."agent_settings" CASCADE;
  DROP TABLE "payload"."agent_settings_rels" CASCADE;
  DROP TABLE "payload"."platform_settings" CASCADE;
  DROP TABLE "payload"."payload_jobs_stats" CASCADE;
  DROP TYPE "payload"."enum_users_roles";
  DROP TYPE "payload"."enum_pages_hero_links_link_type";
  DROP TYPE "payload"."enum_pages_hero_links_link_appearance";
  DROP TYPE "payload"."enum_pages_blocks_cta_links_link_type";
  DROP TYPE "payload"."enum_pages_blocks_cta_links_link_appearance";
  DROP TYPE "payload"."enum_pages_blocks_content_columns_size";
  DROP TYPE "payload"."enum_pages_blocks_content_columns_link_type";
  DROP TYPE "payload"."enum_pages_blocks_content_columns_link_appearance";
  DROP TYPE "payload"."enum_pages_blocks_archive_populate_by";
  DROP TYPE "payload"."enum_pages_blocks_archive_relation_to";
  DROP TYPE "payload"."enum_pages_blocks_carousel_populate_by";
  DROP TYPE "payload"."enum_pages_blocks_carousel_relation_to";
  DROP TYPE "payload"."enum_pages_blocks_banner_style";
  DROP TYPE "payload"."enum_pages_hero_type";
  DROP TYPE "payload"."enum_pages_status";
  DROP TYPE "payload"."enum__pages_v_version_hero_links_link_type";
  DROP TYPE "payload"."enum__pages_v_version_hero_links_link_appearance";
  DROP TYPE "payload"."enum__pages_v_blocks_cta_links_link_type";
  DROP TYPE "payload"."enum__pages_v_blocks_cta_links_link_appearance";
  DROP TYPE "payload"."enum__pages_v_blocks_content_columns_size";
  DROP TYPE "payload"."enum__pages_v_blocks_content_columns_link_type";
  DROP TYPE "payload"."enum__pages_v_blocks_content_columns_link_appearance";
  DROP TYPE "payload"."enum__pages_v_blocks_archive_populate_by";
  DROP TYPE "payload"."enum__pages_v_blocks_archive_relation_to";
  DROP TYPE "payload"."enum__pages_v_blocks_carousel_populate_by";
  DROP TYPE "payload"."enum__pages_v_blocks_carousel_relation_to";
  DROP TYPE "payload"."enum__pages_v_blocks_banner_style";
  DROP TYPE "payload"."enum__pages_v_version_hero_type";
  DROP TYPE "payload"."enum__pages_v_version_status";
  DROP TYPE "payload"."enum_categories_specification_templates_type";
  DROP TYPE "payload"."enum_retailers_payment_methods_method_type";
  DROP TYPE "payload"."enum_retailers_business_hours_week_off";
  DROP TYPE "payload"."enum_retailers_approval_status";
  DROP TYPE "payload"."enum_retailers_online_status";
  DROP TYPE "payload"."enum_delivery_partners_payment_methods_method_type";
  DROP TYPE "payload"."enum_delivery_partners_gender";
  DROP TYPE "payload"."enum_delivery_partners_vehicle_type";
  DROP TYPE "payload"."enum_delivery_partners_approval_status";
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
  DROP TYPE "payload"."enum_forms_confirmation_type";
  DROP TYPE "payload"."enum_addresses_country";
  DROP TYPE "payload"."enum_variants_status";
  DROP TYPE "payload"."enum__variants_v_version_status";
  DROP TYPE "payload"."enum_products_blocks_cta_links_link_type";
  DROP TYPE "payload"."enum_products_blocks_cta_links_link_appearance";
  DROP TYPE "payload"."enum_products_blocks_content_columns_size";
  DROP TYPE "payload"."enum_products_blocks_content_columns_link_type";
  DROP TYPE "payload"."enum_products_blocks_content_columns_link_appearance";
  DROP TYPE "payload"."enum_products_specifications_type";
  DROP TYPE "payload"."enum_products_status";
  DROP TYPE "payload"."enum__products_v_blocks_cta_links_link_type";
  DROP TYPE "payload"."enum__products_v_blocks_cta_links_link_appearance";
  DROP TYPE "payload"."enum__products_v_blocks_content_columns_size";
  DROP TYPE "payload"."enum__products_v_blocks_content_columns_link_type";
  DROP TYPE "payload"."enum__products_v_blocks_content_columns_link_appearance";
  DROP TYPE "payload"."enum__products_v_version_specifications_type";
  DROP TYPE "payload"."enum__products_v_version_status";
  DROP TYPE "payload"."enum_carts_currency";
  DROP TYPE "payload"."enum_orders_status_history_change_source";
  DROP TYPE "payload"."enum_orders_currency";
  DROP TYPE "payload"."enum_orders_status";
  DROP TYPE "payload"."enum_orders_delivery_partner_acceptance";
  DROP TYPE "payload"."enum_orders_cod_collection_record_status";
  DROP TYPE "payload"."enum_orders_cod_collection_record_payment_type";
  DROP TYPE "payload"."enum_transactions_payment_method";
  DROP TYPE "payload"."enum_transactions_razorpay_refund_status";
  DROP TYPE "payload"."enum_transactions_status";
  DROP TYPE "payload"."enum_transactions_currency";
  DROP TYPE "payload"."enum_payload_jobs_log_task_slug";
  DROP TYPE "payload"."enum_payload_jobs_log_state";
  DROP TYPE "payload"."enum_payload_jobs_workflow_slug";
  DROP TYPE "payload"."enum_payload_jobs_task_slug";
  DROP TYPE "payload"."enum_header_nav_items_link_type";
  DROP TYPE "payload"."enum_footer_nav_items_link_type";
  DROP TYPE "payload"."enum_agent_settings_provider";
  DROP TYPE "payload"."enum_platform_settings_delivery_fee_mode";
  DROP TYPE "payload"."enum_platform_settings_payout_delay_label";
  DROP TYPE "payload"."enum_platform_settings_payout_mode";`)
}
