-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADVISOR',
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "TaxCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taxpayerName" TEXT NOT NULL,
    "taxpayerNif" TEXT,
    "fiscalYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxCase_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "TaxProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taxCaseId" TEXT NOT NULL,
    "residencyStatus" TEXT NOT NULL DEFAULT 'pending',
    "employmentIncome" BOOLEAN NOT NULL DEFAULT false,
    "rentalIncome" BOOLEAN NOT NULL DEFAULT false,
    "investmentIncome" BOOLEAN NOT NULL DEFAULT false,
    "selfEmployment" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxProfile_taxCaseId_fkey" FOREIGN KEY ("taxCaseId") REFERENCES "TaxCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DocumentRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taxCaseId" TEXT NOT NULL,
    "requirementId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_taxCaseId_fkey" FOREIGN KEY ("taxCaseId") REFERENCES "TaxCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "DocumentRequirement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "DataPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taxCaseId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "source" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DataPoint_taxCaseId_fkey" FOREIGN KEY ("taxCaseId") REFERENCES "TaxCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ValidationIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taxCaseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "ValidationIssue_taxCaseId_fkey" FOREIGN KEY ("taxCaseId") REFERENCES "TaxCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CaseSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taxCaseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "preliminaryNotes" TEXT NOT NULL,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "issueCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaseSummary_taxCaseId_fkey" FOREIGN KEY ("taxCaseId") REFERENCES "TaxCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taxCaseId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_taxCaseId_fkey" FOREIGN KEY ("taxCaseId") REFERENCES "TaxCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "TaxCase_reference_key" ON "TaxCase"("reference");
CREATE UNIQUE INDEX "TaxProfile_taxCaseId_key" ON "TaxProfile"("taxCaseId");
CREATE UNIQUE INDEX "DocumentRequirement_code_key" ON "DocumentRequirement"("code");
CREATE UNIQUE INDEX "DataPoint_taxCaseId_key_key" ON "DataPoint"("taxCaseId", "key");
CREATE UNIQUE INDEX "CaseSummary_taxCaseId_key" ON "CaseSummary"("taxCaseId");
