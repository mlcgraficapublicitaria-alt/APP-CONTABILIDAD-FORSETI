const { PrismaClient } = require("@prisma/client");
const crypto = require("node:crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@forseti.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? crypto.randomBytes(12).toString("base64url");

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Administrador FORSETI",
      role: "ADMIN",
      passwordHash: hashPassword(adminPassword),
    },
  });

  const requirements = [
    ["id-doc", "Documento identificativo", "DNI/NIE o identificacion fiscal vigente.", 10],
    ["fiscal-data", "Datos fiscales AEAT", "Documento de datos fiscales del ejercicio.", 20],
    ["income-certificates", "Certificados de ingresos", "Certificados de empresa, pensiones o rendimientos.", 30],
    ["deductions", "Justificantes de deducciones", "Vivienda, donativos, familia u otros justificantes aplicables.", 40],
    ["banking", "Cuenta bancaria", "IBAN para comprobaciones y resultado de declaracion.", 50],
  ];

  for (const [code, label, description, sortOrder] of requirements) {
    await prisma.documentRequirement.upsert({
      where: { code },
      update: { label, description, sortOrder, active: true },
      create: { code, label, description, sortOrder },
    });
  }

  const taxCase = await prisma.taxCase.upsert({
    where: { reference: "FORSETI-RENTA-LOCAL-001" },
    update: {},
    create: {
      reference: "FORSETI-RENTA-LOCAL-001",
      title: "Expediente demo sin datos fiscales reales",
      taxpayerName: "Contribuyente Demo",
      taxpayerNif: "00000000T",
      fiscalYear: 2026,
      ownerId: user.id,
      taxProfile: {
        create: {
          residencyStatus: "pending",
          confidence: "PENDING",
          notes: "Expediente local para validar el flujo MVP.",
        },
      },
    },
  });

  await prisma.dataPoint.upsert({
    where: { taxCaseId_key: { taxCaseId: taxCase.id, key: "taxpayer_identity" } },
    update: {},
    create: {
      taxCaseId: taxCase.id,
      key: "taxpayer_identity",
      label: "Identidad del contribuyente",
      value: "Pendiente de confirmar",
      confidence: "PENDING",
      source: "seed",
    },
  });

  await prisma.auditEvent.create({
    data: {
      taxCaseId: taxCase.id,
      userId: user.id,
      action: "seed",
      entity: "TaxCase",
      entityId: taxCase.id,
      metadata: JSON.stringify({ scope: "renta-fiscal-mvp" }),
    },
  });

  await prisma.invoiceIssuerProfile.upsert({
    where: { code: "MLC-DEFAULT" },
    update: {
      legalName: "MARIANO LUJAN CANOVAS",
      taxId: "47078608-T",
      addressLine1: "C/ Dionisio Guardiola, 55",
      postalCode: "02003",
      city: "ALBACETE",
      email: "creativo@mlcdesign.es",
      phone: "639 350 843",
      website: "www.mlcdesign.es",
      bankAccount: "GLOBAL CAJA: ES15 3190 0091 1504 0253 9910",
      invoicePrefix: "A",
      isDefault: true,
    },
    create: {
      code: "MLC-DEFAULT",
      legalName: "MARIANO LUJAN CANOVAS",
      taxId: "47078608-T",
      addressLine1: "C/ Dionisio Guardiola, 55",
      postalCode: "02003",
      city: "ALBACETE",
      email: "creativo@mlcdesign.es",
      phone: "639 350 843",
      website: "www.mlcdesign.es",
      bankAccount: "GLOBAL CAJA: ES15 3190 0091 1504 0253 9910",
      invoicePrefix: "A",
      isDefault: true,
    },
  });

  await prisma.invoiceTemplate.upsert({
    where: { code: "MLC-CLASSIC" },
    update: {
      name: "MLC Clasica",
      description: "Plantilla basada en la factura de ejemplo de Grupo Dim.",
      layoutKey: "mlc-classic",
      isDefault: true,
    },
    create: {
      code: "MLC-CLASSIC",
      name: "MLC Clasica",
      description: "Plantilla basada en la factura de ejemplo de Grupo Dim.",
      layoutKey: "mlc-classic",
      isDefault: true,
    },
  });

  console.log(`Seed listo. Login local: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
