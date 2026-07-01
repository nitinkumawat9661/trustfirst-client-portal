import type { PlatformReference, PlatformServiceContext } from "./common";

export type NotificationChannel = "email" | "in_app" | "webhook";

export type NotificationIntent = {
  body: string;
  channels: NotificationChannel[];
  recipientId: string;
  subject: string;
  target?: PlatformReference;
};

export type NotificationDispatchPlan = {
  channels: NotificationChannel[];
  recipientId: string;
  suppressReason?: string;
};

export interface NotificationService {
  plan(
    context: PlatformServiceContext,
    intent: NotificationIntent,
  ): Promise<NotificationDispatchPlan>;
  dispatch(context: PlatformServiceContext, intent: NotificationIntent): Promise<void>;
}
