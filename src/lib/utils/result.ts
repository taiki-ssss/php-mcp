export type Result<T, E = string> = 
  | { success: true; value: T }
  | { success: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { success: true, value };
}

export function err<E = string>(error: E): Result<never, E> {
  return { success: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
  return result.success === true;
}

export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw new Error(typeof result.error === 'string' ? result.error : 'Unwrap failed');
}

export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue;
}

export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.value)) as Result<U, E>;
  } else {
    return { success: false, error: result.error };
  }
}

export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return isErr(result) ? err(fn(result.error)) : result;
}

export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  } else {
    return { success: false, error: result.error };
  }
}

// flatMapのエイリアス
export const andThen = flatMap;

export function orElse<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => Result<T, F>
): Result<T, F> {
  return isErr(result) ? fn(result.error) : result;
}

export function match<T, E, R>(
  result: Result<T, E>,
  handlers: {
    ok: (value: T) => R;
    err: (error: E) => R;
  }
): R {
  return isOk(result) ? handlers.ok(result.value) : handlers.err(result.error);
}

export function toPromise<T, E>(result: Result<T, E>): Promise<T> {
  return isOk(result) 
    ? Promise.resolve(result.value)
    : Promise.reject(result.error);
}

export async function fromPromise<T, E = unknown>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return ok(value) as Result<T, E>;
  } catch (error) {
    return err(error as E) as Result<T, E>;
  }
}