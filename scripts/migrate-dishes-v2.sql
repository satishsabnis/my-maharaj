-- migrate-dishes-v2.sql
-- Drops the old dishes table and creates a new schema with slot-based architecture.

-- 1. Drop existing table
DROP TABLE IF EXISTS dishes CASCADE;

-- 2. Create new dishes table
CREATE TABLE dishes (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name              text NOT NULL,
  name_hindi        text,
  name_regional     text,
  description       text,
  cuisine           text[] NOT NULL,
  region            text NOT NULL,
  slot              text[] NOT NULL,
  is_veg            boolean NOT NULL DEFAULT true,
  is_vegan          boolean DEFAULT false,
  is_jain           boolean DEFAULT false,
  is_fasting        boolean DEFAULT false,
  is_street         boolean DEFAULT false,
  is_non_veg_type   text,
  allowed_days      text[] DEFAULT '{}',
  occasion          text[] DEFAULT '{everyday}',
  health_tags       text[] DEFAULT '{}',
  is_verified       boolean DEFAULT false,
  is_banned         boolean DEFAULT false,
  chef_id           uuid,
  chef_verified     boolean DEFAULT false,
  created_at        timestamp DEFAULT now(),
  updated_at        timestamp DEFAULT now()
);

-- 3. Create indexes
CREATE INDEX idx_dishes_cuisine    ON dishes USING GIN(cuisine);
CREATE INDEX idx_dishes_slot       ON dishes USING GIN(slot);
CREATE INDEX idx_dishes_is_veg     ON dishes(is_veg);
CREATE INDEX idx_dishes_is_jain    ON dishes(is_jain);
CREATE INDEX idx_dishes_is_fasting ON dishes(is_fasting);
CREATE INDEX idx_dishes_is_banned  ON dishes(is_banned);
