import { prisma } from "@/lib/renta-fiscal/prisma";
import { badRequest, getIpAddress, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";
import { serializeTaxCase, taxCaseCreateData, upsertSummary } from "@/lib/renta-fiscal/cases";
import { writeAuditEvent } from "@/lib/renta-fiscal/audit";

type CreateTaxCaseBody = {
  title: string;
  taxpayerName: string;
  taxpayerNif?: string;
  fiscalYear: number;
};

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const cases = await prisma.taxCase.findMany({
    orderBy: { updatedAt: "desc" },
    include: { summary: true, owner: { select: { id: true, name: true, email: true, role: true } } },
  });
  return ok({ taxCases: cases.map(serializeTaxCase) });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const body = await readJson<CreateTaxCaseBody>(request);
  if (body.fiscalYear !== undefined && !Number.isInteger(Number(body.fiscalYear))) return badRequest("fiscalYear debe ser numerico.");

  const taxCase = await prisma.taxCase.create({
    data: taxCaseCreateData({
      title: body.title,
      taxpayerName: body.taxpayerName,
      taxpayerNif: body.taxpayerNif,
      fiscalYear: body.fiscalYear ? Number(body.fiscalYear) : undefined,
      ownerId: auth.user.id,
    }),
    include: { taxProfile: true, summary: true },
  });
  await upsertSummary(taxCase.id);
  await writeAuditEvent({
    userId: auth.user.id,
    taxCaseId: taxCase.id,
    action: "create",
    entity: "TaxCase",
    entityId: taxCase.id,
    ipAddress: getIpAddress(request),
  });

  return ok({ taxCase: serializeTaxCase(taxCase) }, { status: 201 });
}
