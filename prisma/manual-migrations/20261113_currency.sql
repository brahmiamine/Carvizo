-- Additive and idempotent on MariaDB (deployment database).
-- Existing records remain EUR. Changing preference never converts history.
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `currency` VARCHAR(3) NOT NULL DEFAULT 'EUR';
ALTER TABLE `VehicleEvent` ADD COLUMN IF NOT EXISTS `currency` VARCHAR(3) NOT NULL DEFAULT 'EUR';
