import { ok, requireUser } from "@/lib/renta-fiscal/api";
import { upsertSummary } from "@/lib/renta-fiscal/cases";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { id } = await context.params;
  return ok({ summary: await upsertSummary(id) });
}
