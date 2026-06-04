import { getCurrentUser } from "@/lib/renta-fiscal/auth";
import { ok } from "@/lib/renta-fiscal/api";

export async function GET() {
  const user = await getCurrentUser();
  return ok({ user });
}
