import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_categories_specification_templates_type" AS ENUM('text', 'number', 'select', 'date');
  CREATE TYPE "payload"."enum_products_specifications_type" AS ENUM('text', 'number', 'select', 'date');
  CREATE TYPE "payload"."enum__products_v_version_specifications_type" AS ENUM('text', 'number', 'select', 'date');
  CREATE TABLE "payload"."categories_specification_templates_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"option" varchar
  );
  
  CREATE TABLE "payload"."categories_specification_templates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "payload"."enum_categories_specification_templates_type" DEFAULT 'text' NOT NULL,
  	"required" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."products_specifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" varchar,
  	"type" "payload"."enum_products_specifications_type" DEFAULT 'text'
  );
  
  CREATE TABLE "payload"."_products_v_version_specifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" varchar,
  	"type" "payload"."enum__products_v_version_specifications_type" DEFAULT 'text',
  	"_uuid" varchar
  );
  
  ALTER TABLE "payload"."categories_specification_templates_options" ADD CONSTRAINT "categories_specification_templates_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."categories_specification_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."categories_specification_templates" ADD CONSTRAINT "categories_specification_templates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_specifications" ADD CONSTRAINT "products_specifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_products_v_version_specifications" ADD CONSTRAINT "_products_v_version_specifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "categories_specification_templates_options_order_idx" ON "payload"."categories_specification_templates_options" USING btree ("_order");
  CREATE INDEX "categories_specification_templates_options_parent_id_idx" ON "payload"."categories_specification_templates_options" USING btree ("_parent_id");
  CREATE INDEX "categories_specification_templates_order_idx" ON "payload"."categories_specification_templates" USING btree ("_order");
  CREATE INDEX "categories_specification_templates_parent_id_idx" ON "payload"."categories_specification_templates" USING btree ("_parent_id");
  CREATE INDEX "products_specifications_order_idx" ON "payload"."products_specifications" USING btree ("_order");
  CREATE INDEX "products_specifications_parent_id_idx" ON "payload"."products_specifications" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_specifications_order_idx" ON "payload"."_products_v_version_specifications" USING btree ("_order");
  CREATE INDEX "_products_v_version_specifications_parent_id_idx" ON "payload"."_products_v_version_specifications" USING btree ("_parent_id");
  ALTER TABLE "payload"."products" DROP COLUMN "specifications_ram";
  ALTER TABLE "payload"."products" DROP COLUMN "specifications_storage";
  ALTER TABLE "payload"."products" DROP COLUMN "specifications_battery";
  ALTER TABLE "payload"."products" DROP COLUMN "specifications_screen_size";
  ALTER TABLE "payload"."products" DROP COLUMN "specifications_processor";
  ALTER TABLE "payload"."products" DROP COLUMN "specifications_camera";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_specifications_ram";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_specifications_storage";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_specifications_battery";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_specifications_screen_size";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_specifications_processor";
  ALTER TABLE "payload"."_products_v" DROP COLUMN "version_specifications_camera";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."categories_specification_templates_options" CASCADE;
  DROP TABLE "payload"."categories_specification_templates" CASCADE;
  DROP TABLE "payload"."products_specifications" CASCADE;
  DROP TABLE "payload"."_products_v_version_specifications" CASCADE;
  ALTER TABLE "payload"."products" ADD COLUMN "specifications_ram" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "specifications_storage" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "specifications_battery" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "specifications_screen_size" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "specifications_processor" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "specifications_camera" varchar;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_specifications_ram" varchar;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_specifications_storage" varchar;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_specifications_battery" varchar;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_specifications_screen_size" varchar;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_specifications_processor" varchar;
  ALTER TABLE "payload"."_products_v" ADD COLUMN "version_specifications_camera" varchar;
  DROP TYPE "payload"."enum_categories_specification_templates_type";
  DROP TYPE "payload"."enum_products_specifications_type";
  DROP TYPE "payload"."enum__products_v_version_specifications_type";`)
}
