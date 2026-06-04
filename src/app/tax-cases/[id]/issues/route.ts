import { ok, requireUser } from "@/lib/renta-fiscal/api";
import { prisma } from "@/lib/renta-fiscal/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { id } = await context.params;
  const issues = await prisma.validationIssue.findMany({ where: { taxCaseId: id }, orderBy: { createdAt: "desc" } });
  return ok({ issues });
}
