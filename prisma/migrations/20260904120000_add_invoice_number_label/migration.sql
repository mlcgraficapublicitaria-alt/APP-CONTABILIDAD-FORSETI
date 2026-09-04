ALTER TABLE `Invoice` ADD COLUMN `numberLabel` VARCHAR(191) NULL;

UPDATE `Invoice`
SET `numberLabel` = LPAD(CAST(`number` AS CHAR), 6, '0')
WHERE `numberLabel` IS NULL OR `numberLabel` = '';

ALTER TABLE `Invoice` MODIFY `numberLabel` VARCHAR(191) NOT NULL;

DROP INDEX `Invoice_series_number_key` ON `Invoice`;
CREATE UNIQUE INDEX `Invoice_series_numberLabel_key` ON `Invoice`(`series`, `numberLabel`);
CREATE INDEX `Invoice_series_number_idx` ON `Invoice`(`series`, `number`);
