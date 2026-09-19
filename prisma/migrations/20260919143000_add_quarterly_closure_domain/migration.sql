-- CreateTable
CREATE TABLE `QuarterlyClosure` (
    `id` VARCHAR(191) NOT NULL,
    `taxCaseId` VARCHAR(191) NOT NULL,
    `fiscalYear` INTEGER NOT NULL,
    `quarter` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'NEEDS_REVIEW', 'READY_FOR_REVIEW') NOT NULL DEFAULT 'DRAFT',
    `declared303ResultCents` BIGINT NULL,
    `calculated303ResultCents` BIGINT NULL,
    `difference303Cents` BIGINT NULL,
    `payment303Status` ENUM('UNKNOWN', 'PENDING_DEFERRAL', 'PAID', 'DEBITED') NOT NULL DEFAULT 'UNKNOWN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `QuarterlyClosure_fiscalYear_quarter_status_idx`(`fiscalYear`, `quarter`, `status`),
    UNIQUE INDEX `QuarterlyClosure_taxCaseId_fiscalYear_quarter_key`(`taxCaseId`, `fiscalYear`, `quarter`),
    CONSTRAINT `QuarterlyClosure_quarter_chk` CHECK (`quarter` BETWEEN 1 AND 4),
    CONSTRAINT `QuarterlyClosure_declared303_nonnegative_chk` CHECK (`declared303ResultCents` IS NULL OR `declared303ResultCents` >= 0),
    CONSTRAINT `QuarterlyClosure_calculated303_nonnegative_chk` CHECK (`calculated303ResultCents` IS NULL OR `calculated303ResultCents` >= 0),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quarterly349Operation` (
    `id` VARCHAR(191) NOT NULL,
    `closureId` VARCHAR(191) NOT NULL,
    `anonymousCounterpartyId` VARCHAR(191) NOT NULL,
    `operationType` ENUM('INTRA_EU_ACQUISITION', 'INTRA_EU_SUPPLY') NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Quarterly349Operation_closureId_anonymousCounterpartyId_idx`(`closureId`, `anonymousCounterpartyId`),
    CONSTRAINT `Quarterly349Operation_amount_nonnegative_chk` CHECK (`amountCents` >= 0),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuarterlyLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `closureId` VARCHAR(191) NOT NULL,
    `anonymousEntryId` VARCHAR(191) NOT NULL,
    `anonymousCounterpartyId` VARCHAR(191) NULL,
    `operationDate` DATETIME(3) NOT NULL,
    `direction` ENUM('PURCHASE', 'SALE') NOT NULL,
    `documentType` ENUM('INVOICE', 'CREDIT_NOTE', 'OTHER') NOT NULL,
    `taxKind` ENUM('DOMESTIC', 'INTRA_EU', 'INTRA_EU_GOODS', 'INTRA_EU_SERVICES', 'REVERSE_CHARGE', 'EXEMPT', 'NOT_SUBJECT_LOCATION', 'OTHER') NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'EUR',
    `baseCents` BIGINT NOT NULL,
    `vatCents` BIGINT NOT NULL,
    `totalCents` BIGINT NOT NULL,
    `vatRateBasisPoints` INTEGER NULL,
    `includedIn303` BOOLEAN NOT NULL DEFAULT false,
    `includedIn349` BOOLEAN NOT NULL DEFAULT false,
    `reviewStatus` ENUM('OK', 'REVIEW') NOT NULL DEFAULT 'REVIEW',
    `sourceFileId` VARCHAR(191) NULL,
    `sourceSheet` VARCHAR(191) NULL,
    `sourceRow` INTEGER NULL,
    `importBatchId` VARCHAR(191) NULL,
    `importRowId` VARCHAR(191) NULL,
    `deduplicationKey` CHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `QuarterlyLedgerEntry_closureId_anonymousEntryId_key`(`closureId`, `anonymousEntryId`),
    UNIQUE INDEX `QuarterlyLedgerEntry_importRowId_key`(`importRowId`),
    UNIQUE INDEX `QuarterlyLedgerEntry_closureId_deduplicationKey_key`(`closureId`, `deduplicationKey`),
    INDEX `QuarterlyLedgerEntry_closureId_operationDate_idx`(`closureId`, `operationDate`),
    INDEX `QuarterlyLedgerEntry_closureId_anonymousCounterpartyId_idx`(`closureId`, `anonymousCounterpartyId`),
    INDEX `QuarterlyLedgerEntry_importBatchId_idx`(`importBatchId`),
    CONSTRAINT `QuarterlyLedgerEntry_currency_chk` CHECK (`currency` = 'EUR'),
    CONSTRAINT `QuarterlyLedgerEntry_money_nonnegative_chk` CHECK (`baseCents` >= 0 AND `vatCents` >= 0 AND `totalCents` >= 0),
    CONSTRAINT `QuarterlyLedgerEntry_total_chk` CHECK (`totalCents` = `baseCents` + `vatCents`),
    CONSTRAINT `QuarterlyLedgerEntry_vat_rate_chk` CHECK (`vatRateBasisPoints` IS NULL OR `vatRateBasisPoints` BETWEEN 0 AND 10000),
    CONSTRAINT `QuarterlyLedgerEntry_source_row_chk` CHECK (`sourceRow` IS NULL OR `sourceRow` >= 1),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuarterlySourceDocument` (
    `id` VARCHAR(191) NOT NULL,
    `closureId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `storageKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `QuarterlySourceDocument_closureId_sha256_key`(`closureId`, `sha256`),
    UNIQUE INDEX `QuarterlySourceDocument_id_closureId_key`(`id`, `closureId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuarterlyImportBatch` (
    `id` VARCHAR(191) NOT NULL,
    `closureId` VARCHAR(191) NOT NULL,
    `sourceDocumentId` VARCHAR(191) NOT NULL,
    `importerKey` VARCHAR(191) NOT NULL,
    `importerVersion` VARCHAR(191) NOT NULL,
    `mappingHash` CHAR(64) NOT NULL,
    `status` ENUM('PREVIEW', 'CONFIRMED', 'FAILED') NOT NULL DEFAULT 'PREVIEW',
    `mappingJson` JSON NOT NULL,
    `validRowCount` INTEGER NOT NULL DEFAULT 0,
    `invalidRowCount` INTEGER NOT NULL DEFAULT 0,
    `duplicateCount` INTEGER NOT NULL DEFAULT 0,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `QuarterlyImportBatch_identity_key`(`closureId`, `sourceDocumentId`, `importerKey`, `importerVersion`, `mappingHash`),
    INDEX `QuarterlyImportBatch_closureId_status_idx`(`closureId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuarterlyImportRow` (
    `id` VARCHAR(191) NOT NULL,
    `importBatchId` VARCHAR(191) NOT NULL,
    `sourceRow` INTEGER NOT NULL,
    `fingerprint` CHAR(64) NOT NULL,
    `status` ENUM('VALID', 'INVALID', 'DUPLICATE', 'IMPORTED') NOT NULL,
    `originalJson` JSON NOT NULL,
    `normalizedJson` JSON NULL,
    `errorsJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `QuarterlyImportRow_importBatchId_sourceRow_key`(`importBatchId`, `sourceRow`),
    INDEX `QuarterlyImportRow_importBatchId_fingerprint_idx`(`importBatchId`, `fingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuarterlyIssue` (
    `id` VARCHAR(191) NOT NULL,
    `closureId` VARCHAR(191) NOT NULL,
    `code` ENUM('DOMESTIC_PURCHASE_EXCLUDED_FROM_303', 'EXEMPT_OPERATION_REVIEW', 'DEFERRAL_PENDING', 'FORM_LEDGER_MISMATCH') NOT NULL,
    `severity` ENUM('INFO', 'WARNING', 'BLOCKER') NOT NULL,
    `relatedAnonymousEntryIds` JSON NOT NULL,
    `amountCents` BIGINT NULL,
    `baseCents` BIGINT NULL,
    `vatCents` BIGINT NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `QuarterlyIssue_closureId_code_idx`(`closureId`, `code`),
    INDEX `QuarterlyIssue_closureId_severity_idx`(`closureId`, `severity`),
    CONSTRAINT `QuarterlyIssue_money_nonnegative_chk` CHECK ((`amountCents` IS NULL OR `amountCents` >= 0) AND (`baseCents` IS NULL OR `baseCents` >= 0) AND (`vatCents` IS NULL OR `vatCents` >= 0)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuarterlyClosure` ADD CONSTRAINT `QuarterlyClosure_taxCaseId_fkey` FOREIGN KEY (`taxCaseId`) REFERENCES `TaxCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `QuarterlySourceDocument` ADD CONSTRAINT `QuarterlySourceDocument_closureId_fkey` FOREIGN KEY (`closureId`) REFERENCES `QuarterlyClosure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `QuarterlyImportBatch` ADD CONSTRAINT `QuarterlyImportBatch_closureId_fkey` FOREIGN KEY (`closureId`) REFERENCES `QuarterlyClosure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `QuarterlyImportBatch` ADD CONSTRAINT `QuarterlyImportBatch_sourceDocumentId_closureId_fkey` FOREIGN KEY (`sourceDocumentId`, `closureId`) REFERENCES `QuarterlySourceDocument`(`id`, `closureId`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `QuarterlyImportRow` ADD CONSTRAINT `QuarterlyImportRow_importBatchId_fkey` FOREIGN KEY (`importBatchId`) REFERENCES `QuarterlyImportBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quarterly349Operation` ADD CONSTRAINT `Quarterly349Operation_closureId_fkey` FOREIGN KEY (`closureId`) REFERENCES `QuarterlyClosure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuarterlyLedgerEntry` ADD CONSTRAINT `QuarterlyLedgerEntry_closureId_fkey` FOREIGN KEY (`closureId`) REFERENCES `QuarterlyClosure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `QuarterlyLedgerEntry` ADD CONSTRAINT `QuarterlyLedgerEntry_importBatchId_fkey` FOREIGN KEY (`importBatchId`) REFERENCES `QuarterlyImportBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `QuarterlyLedgerEntry` ADD CONSTRAINT `QuarterlyLedgerEntry_importRowId_fkey` FOREIGN KEY (`importRowId`) REFERENCES `QuarterlyImportRow`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuarterlyIssue` ADD CONSTRAINT `QuarterlyIssue_closureId_fkey` FOREIGN KEY (`closureId`) REFERENCES `QuarterlyClosure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
