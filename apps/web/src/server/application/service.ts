import type { TenantContext } from "../tenant/tenant-resolver";

export type ServiceContext = {
  requestId: string;
  tenant: TenantContext;
  actor?: {
    id: string;
    role: string;
  };
};

export abstract class ApplicationService {
  protected readonly context: ServiceContext;

  protected constructor(context: ServiceContext) {
    this.context = context;
  }
}
