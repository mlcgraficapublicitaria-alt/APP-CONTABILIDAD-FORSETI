import { prisma } from "@/lib/renta-fiscal/prisma";
import { badRequest, getIpAddress, notFound, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";
import { getCaseOrNull, serializeTaxCase, upsertSummary } from "@/lib/renta-fiscal/cases";
import { writeAuditEvent } from "@/lib/renta-fiscal/audit";

type Params = { params: Promise<{ id: string }> };
type PatchTaxCaseBody = {
  title?: string;
  taxpayerName?: string;
  taxpayerNif?: string | null;
  fiscalYear?: number;
  status?: "DRAFT" | "IN_REVIEW" | "READY" | "CLOSED";
  taxProfile?: {
    residencyStatus?: string;
    employmentIncome?: boolean;
    rentalIncome?: boolean;
    investmentIncome?: boolean;
    selfEmployment?: boolean;
    notes?: string;
    confidence?: "CONFIRMED" | "ESTIMATED" | "PENDING";
  };
};

export async function GET(_request: Request, context: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const { id } = await context.params;
  const taxCase = await getCaseOrNull(id);
  if (!taxCase) return notFound("Expediente no encontrado.");
  return ok({ taxCase: serializeTaxCase(taxCase) });
}

export async function PATCH(request: Request, context: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const { id } = await context.params;
  const body = await readJson<PatchTaxCaseBody>(request);
  const exists = await prisma.taxCase.findUnique({ where: { id } });
  if (!exists) return notFound("Expediente no encontrado.");

  if (body.status && !["DRAFT", "IN_REVIEW", "READY", "CLOSED"].includes(body.status)) return badRequest("Estado de expediente invalido.");

  await prisma.taxCase.update({
    where: { id },
    data: {
      title: body.title,
      taxpayerName: body.taxpayerName,
      taxpayerNif: body.taxpayerNif,
      fiscalYear: body.fiscalYear ? Number(body.fiscalYear) : undefined,
      status: body.status,
      taxProfile: body.taxProfile
        ? {
            upsert: {
              create: body.taxProfile,
              update: body.taxProfile,
            },
          }
        : undefined,
    },
  });
  await upsertSummary(id);
  await writeAuditEvent({ userId: auth.user.id, taxCaseId: id, action: "update", entity: "TaxCase", entityId: id, ipAddress: getIpAddress(request) });

  const taxCase = await getCaseOrNull(id);
  return ok({ taxCase: taxCase ? serializeTaxCase(taxCase) : null });
}
