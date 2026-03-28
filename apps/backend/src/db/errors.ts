export class DataAccessError extends Error {
  public readonly causeData?: unknown;

  constructor(message: string, causeData?: unknown) {
    super(message);
    this.name = "DataAccessError";
    this.causeData = causeData;
  }
}

type Result<T> = {
  data: T | null;
  error: unknown;
};

export function throwIfError(error: unknown, context: string): void {
  if (error) {
    throw new DataAccessError(`Supabase operation failed: ${context}`, error);
  }
}

export function unwrapResult<T>(result: Result<T>, context: string): T {
  if (result.error) {
    throw new DataAccessError(`Supabase operation failed: ${context}`, result.error);
  }

  if (result.data === null) {
    throw new DataAccessError(`Supabase returned no data: ${context}`);
  }

  return result.data;
}
