import { prisma } from "./prisma";

type AuditInput = {
  userId?: string;
  taxCaseId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

export async function writeAuditEvent(input: AuditInput) {
  await prisma.auditEvent.create({
    data: {
      userId: input.userId,
      taxCaseId: input.taxCaseId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      ipAddress: input.ipAddress ?? undefined,
    },
  });
}
