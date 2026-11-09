CREATE TABLE `InvoicePdfExport` (
  `id` VARCHAR(191) NOT NULL,
  `invoiceId` VARCHAR(191) NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  `rendererKey` VARCHAR(191) NOT NULL,
  `pdfBytes` LONGBLOB NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `InvoicePdfExport_invoiceId_key`(`invoiceId`),
  INDEX `InvoicePdfExport_sha256_idx`(`sha256`),
  PRIMARY KEY (`id`),
  CONSTRAINT `InvoicePdfExport_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
