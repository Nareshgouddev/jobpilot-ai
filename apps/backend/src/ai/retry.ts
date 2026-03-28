export type RetryOptions = {
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry: (error: unknown) => boolean;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoff(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exp = baseDelayMs * 2 ** attempt;
  return Math.min(exp, maxDelayMs);
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= options.retries || !options.shouldRetry(error)) {
        throw error;
      }

      const delay = computeBackoff(attempt, options.baseDelayMs, options.maxDelayMs);
      attempt += 1;
      await wait(delay);
    }
  }
}
