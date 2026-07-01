CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `role` ENUM('ADMIN', 'ADVISOR', 'VIEWER') NOT NULL DEFAULT 'ADVISOR',
  `passwordHash` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `User_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TaxCase` (
  `id` VARCHAR(191) NOT NULL,
  `reference` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `taxpayerName` VARCHAR(191) NOT NULL,
  `taxpayerNif` VARCHAR(191) NULL,
  `fiscalYear` INTEGER NOT NULL,
  `status` ENUM('DRAFT', 'IN_REVIEW', 'READY', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
  `ownerId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TaxCase_reference_key`(`reference`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TaxProfile` (
  `id` VARCHAR(191) NOT NULL,
  `taxCaseId` VARCHAR(191) NOT NULL,
  `residencyStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `employmentIncome` BOOLEAN NOT NULL DEFAULT false,
  `rentalIncome` BOOLEAN NOT NULL DEFAULT false,
  `investmentIncome` BOOLEAN NOT NULL DEFAULT false,
  `selfEmployment` BOOLEAN NOT NULL DEFAULT false,
  `notes` TEXT NULL,
  `confidence` ENUM('CONFIRMED', 'ESTIMATED', 'PENDING') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TaxProfile_taxCaseId_key`(`taxCaseId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DocumentRequirement` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `required` BOOLEAN NOT NULL DEFAULT true,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  UNIQUE INDEX `DocumentRequirement_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Document` (
  `id` VARCHAR(191) NOT NULL,
  `taxCaseId` VARCHAR(191) NOT NULL,
  `requirementId` VARCHAR(191) NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `sizeBytes` INTEGER NOT NULL,
  `storageKey` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'RECEIVED', 'REVIEWED', 'REJECTED') NOT NULL DEFAULT 'RECEIVED',
  `notes` TEXT NULL,
  `uploadedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DataPoint` (
  `id` VARCHAR(191) NOT NULL,
  `taxCaseId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `value` TEXT NULL,
  `source` VARCHAR(191) NULL,
  `confidence` ENUM('CONFIRMED', 'ESTIMATED', 'PENDING') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `DataPoint_taxCaseId_key_key`(`taxCaseId`, `key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ValidationIssue` (
  `id` VARCHAR(191) NOT NULL,
  `taxCaseId` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `severity` ENUM('INFO', 'WARNING', 'ERROR') NOT NULL DEFAULT 'WARNING',
  `status` ENUM('OPEN', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolvedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CaseSummary` (
  `id` VARCHAR(191) NOT NULL,
  `taxCaseId` VARCHAR(191) NOT NULL,
  `status` ENUM('CONFIRMED', 'ESTIMATED', 'PENDING') NOT NULL DEFAULT 'PENDING',
  `preliminaryNotes` TEXT NOT NULL,
  `missingCount` INTEGER NOT NULL DEFAULT 0,
  `issueCount` INTEGER NOT NULL DEFAULT 0,
  `confirmedCount` INTEGER NOT NULL DEFAULT 0,
  `estimatedCount` INTEGER NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CaseSummary_taxCaseId_key`(`taxCaseId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuditEvent` (
  `id` VARCHAR(191) NOT NULL,
  `taxCaseId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `entity` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NULL,
  `metadata` TEXT NULL,
  `ipAddress` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InvoiceIssuerProfile` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `legalName` VARCHAR(191) NOT NULL,
  `taxId` VARCHAR(191) NULL,
  `addressLine1` VARCHAR(191) NULL,
  `addressLine2` VARCHAR(191) NULL,
  `postalCode` VARCHAR(191) NULL,
  `city` VARCHAR(191) NULL,
  `province` VARCHAR(191) NULL,
  `country` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `website` VARCHAR(191) NULL,
  `bankAccount` VARCHAR(191) NULL,
  `invoicePrefix` VARCHAR(191) NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `InvoiceIssuerProfile_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InvoiceClient` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NULL,
  `legalName` VARCHAR(191) NOT NULL,
  `taxId` VARCHAR(191) NULL,
  `addressLine1` VARCHAR(191) NULL,
  `addressLine2` VARCHAR(191) NULL,
  `postalCode` VARCHAR(191) NULL,
  `city` VARCHAR(191) NULL,
  `province` VARCHAR(191) NULL,
  `country` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `InvoiceClient_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InvoiceTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `layoutKey` VARCHAR(191) NOT NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `InvoiceTemplate_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Invoice` (
  `id` VARCHAR(191) NOT NULL,
  `issuerProfileId` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NULL,
  `status` ENUM('DRAFT', 'ISSUED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `documentName` VARCHAR(191) NOT NULL,
  `series` VARCHAR(191) NULL,
  `number` INTEGER NOT NULL,
  `issueDate` DATETIME(3) NOT NULL,
  `articleCode` VARCHAR(191) NULL,
  `serviceDescription` TEXT NOT NULL,
  `subtotalAmount` DECIMAL(10, 2) NOT NULL,
  `vatRate` DECIMAL(5, 2) NOT NULL,
  `vatAmount` DECIMAL(10, 2) NOT NULL,
  `irpfRate` DECIMAL(5, 2) NOT NULL,
  `irpfAmount` DECIMAL(10, 2) NOT NULL,
  `totalAmount` DECIMAL(10, 2) NOT NULL,
  `notes` TEXT NULL,
  `renderedHtml` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Invoice_series_number_key`(`series`, `number`),
  INDEX `Invoice_clientId_issueDate_idx`(`clientId`, `issueDate`),
  INDEX `Invoice_issuerProfileId_issueDate_idx`(`issuerProfileId`, `issueDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InvoiceLine` (
  `id` VARCHAR(191) NOT NULL,
  `invoiceId` VARCHAR(191) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `articleCode` VARCHAR(191) NULL,
  `description` TEXT NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  `unitPrice` DECIMAL(10, 2) NOT NULL,
  `discountAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `lineTotalAmount` DECIMAL(10, 2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `InvoiceLine_invoiceId_sortOrder_idx`(`invoiceId`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TaxCase`
  ADD CONSTRAINT `TaxCase_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `TaxProfile`
  ADD CONSTRAINT `TaxProfile_taxCaseId_fkey` FOREIGN KEY (`taxCaseId`) REFERENCES `TaxCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Document`
  ADD CONSTRAINT `Document_taxCaseId_fkey` FOREIGN KEY (`taxCaseId`) REFERENCES `TaxCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Document_requirementId_fkey` FOREIGN KEY (`requirementId`) REFERENCES `DocumentRequirement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Document_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `DataPoint`
  ADD CONSTRAINT `DataPoint_taxCaseId_fkey` FOREIGN KEY (`taxCaseId`) REFERENCES `TaxCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ValidationIssue`
  ADD CONSTRAINT `ValidationIssue_taxCaseId_fkey` FOREIGN KEY (`taxCaseId`) REFERENCES `TaxCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CaseSummary`
  ADD CONSTRAINT `CaseSummary_taxCaseId_fkey` FOREIGN KEY (`taxCaseId`) REFERENCES `TaxCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AuditEvent`
  ADD CONSTRAINT `AuditEvent_taxCaseId_fkey` FOREIGN KEY (`taxCaseId`) REFERENCES `TaxCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `AuditEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Invoice`
  ADD CONSTRAINT `Invoice_issuerProfileId_fkey` FOREIGN KEY (`issuerProfileId`) REFERENCES `InvoiceIssuerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `Invoice_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `InvoiceClient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `Invoice_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `InvoiceTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Invoice_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `InvoiceLine`
  ADD CONSTRAINT `InvoiceLine_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
