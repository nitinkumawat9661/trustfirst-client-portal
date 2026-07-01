export type NotificationMessage = {
  body: string;
  channel: "email" | "in_app" | "webhook";
  recipientId: string;
  subject: string;
  tenantId: string;
};

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<void>;
}

class NoopNotificationProvider implements NotificationProvider {
  async send() {
    return;
  }
}

const notificationProvider = new NoopNotificationProvider();

export function getNotificationProvider(): NotificationProvider {
  return notificationProvider;
}
