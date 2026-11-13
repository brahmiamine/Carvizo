-- Additive migration; apply once before deploying recovery-code endpoints.
ALTER TABLE `User` ADD COLUMN `recoveryCodeHash` VARCHAR(64) NULL;
