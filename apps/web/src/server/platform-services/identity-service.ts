import type { PlatformActor, PlatformServiceContext } from "./common";

export type IdentityLookup = {
  email?: string;
  externalId?: string;
  userId?: string;
};

export type IdentitySessionDescriptor = {
  expiresAt?: Date;
  sessionId: string;
  userId: string;
};

export interface IdentityService {
  resolveActor(
    context: PlatformServiceContext,
    lookup: IdentityLookup,
  ): Promise<PlatformActor | null>;
  describeSession(
    context: PlatformServiceContext,
    sessionId: string,
  ): Promise<IdentitySessionDescriptor | null>;
}
