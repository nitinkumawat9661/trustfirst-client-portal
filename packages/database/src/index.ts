import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }

  return globalForPrisma.prisma;
}

export type { Prisma, PrismaClient } from "@prisma/client";
export {
  AuditAction,
  AuthTokenType,
  ClientActivityVerb,
  ClientLifecycleStage,
  ClientStatus,
  CommercialDocumentStatus,
  CommercialDocumentTimelineVerb,
  CommercialDocumentType,
  ContactInvitationStatus,
  DeliverableReviewStatus,
  BillingTimelineVerb,
  HardwareInventoryMovementType,
  HardwareTradeDocumentStatus,
  HardwareTradeDocumentType,
  HardwareTradeTimelineVerb,
  HardwareTimelineVerb,
  InvoiceStatus,
  PaymentMode,
  PaymentProvider,
  ProjectLifecycleStatus,
  ProjectPriority,
  ProjectTaskStatus,
  ProjectTimelineVerb,
  RequirementPriority,
  RequirementStatus,
  RequirementTimelineVerb,
  TenantInvitationStatus,
  TenantMemberStatus,
  TenantStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
