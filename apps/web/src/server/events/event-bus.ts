import type { DomainEvent } from "../domain/entity";

export type EventHandler<TPayload = Record<string, unknown>> = (
  event: DomainEvent<TPayload>,
) => Promise<void> | void;

export interface EventBus {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
  subscribe<TPayload>(eventName: string, handler: EventHandler<TPayload>): void;
}

class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  async publish<TPayload>(event: DomainEvent<TPayload>) {
    const handlers = this.handlers.get(event.name) ?? [];

    await Promise.all(
      handlers.map((handler) => handler(event as DomainEvent<Record<string, unknown>>)),
    );
  }

  subscribe<TPayload>(eventName: string, handler: EventHandler<TPayload>) {
    const handlers = this.handlers.get(eventName) ?? [];
    handlers.push(handler as EventHandler);
    this.handlers.set(eventName, handlers);
  }
}

const eventBus = new InMemoryEventBus();

export function getEventBus(): EventBus {
  return eventBus;
}
