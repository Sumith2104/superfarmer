-- ============================================================
-- SuperFarmer Migration: Extend farmer_profile table
-- Run this ONCE in your Fluxbase SQL console
-- ============================================================

ALTER TABLE farmer_profile
  ADD COLUMN phone            VARCHAR(20),
  ADD COLUMN village          VARCHAR(100),
  ADD COLUMN district         VARCHAR(100),
  ADD COLUMN state            VARCHAR(100),
  ADD COLUMN land_acres       DECIMAL(8,2),
  ADD COLUMN soil_type        VARCHAR(50),
  ADD COLUMN irrigation       VARCHAR(50),
  ADD COLUMN primary_crops    TEXT,
  ADD COLUMN economic_class   VARCHAR(50),
  ADD COLUMN preferred_lang   VARCHAR(10) DEFAULT 'en',
  ADD COLUMN profile_pct      INT DEFAULT 0,


-- Also create agent_memory table if it doesn't exist
CREATE TABLE IF NOT EXISTS agent_memory (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id  INT,
  agent      VARCHAR(50),
  action     VARCHAR(100),
  output_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES farmer_profile(farmer_id)
);
