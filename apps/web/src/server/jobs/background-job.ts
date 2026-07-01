export type JobPayload = Record<string, unknown>;

export type BackgroundJob<TPayload extends JobPayload = JobPayload> = {
  id: string;
  name: string;
  payload: TPayload;
  runAt?: Date;
};

export interface BackgroundJobQueue {
  enqueue<TPayload extends JobPayload>(job: BackgroundJob<TPayload>): Promise<void>;
}

class NoopBackgroundJobQueue implements BackgroundJobQueue {
  async enqueue() {
    return;
  }
}

const queue = new NoopBackgroundJobQueue();

export function getBackgroundJobQueue(): BackgroundJobQueue {
  return queue;
}
