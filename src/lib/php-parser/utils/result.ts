/**
 * Result Type Utilities
 * 
 * Implements a Result monad for error handling without exceptions.
 * This provides a type-safe way to handle operations that may fail.
 * 
 * @module result
 */

/**
 * Result type representing either success or failure.
 * 
 * @template T - The type of the success value
 * @template E - The type of the error value (defaults to string)
 */
export type Result<T, E = string> = 
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Creates a successful Result.
 * 
 * @template T - The type of the value
 * @param value - The success value
 * @returns A successful Result containing the value
 * 
 * @example
 * ```typescript
 * const result = ok(42);
 * // { success: true, value: 42 }
 * ```
 */
export function ok<T>(value: T): Result<T> {
  return { success: true, value };
}

/**
 * Creates a failed Result.
 * 
 * @template E - The type of the error
 * @param error - The error value
 * @returns A failed Result containing the error
 * 
 * @example
 * ```typescript
 * const result = err("Something went wrong");
 * // { success: false, error: "Something went wrong" }
 * ```
 */
export function err<E = string>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type guard to check if a Result is successful.
 * 
 * @param result - The Result to check
 * @returns True if the Result is successful
 * 
 * @example
 * ```typescript
 * if (isOk(result)) {
 *   console.log(result.value); // TypeScript knows result has value
 * }
 * ```
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
  return result.success === true;
}

/**
 * Type guard to check if a Result is failed.
 * 
 * @param result - The Result to check
 * @returns True if the Result is failed
 * 
 * @example
 * ```typescript
 * if (isErr(result)) {
 *   console.error(result.error); // TypeScript knows result has error
 * }
 * ```
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Unwraps a Result, returning the value if successful or throwing if failed.
 * 
 * @param result - The Result to unwrap
 * @returns The success value
 * @throws Error if the Result is failed
 * 
 * @example
 * ```typescript
 * const value = unwrap(ok(42)); // 42
 * const value = unwrap(err("Error")); // throws Error
 * ```
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw new Error(typeof result.error === 'string' ? result.error : 'Unwrap failed');
}

/**
 * Unwraps a Result, returning the value if successful or a default value if failed.
 * 
 * @param result - The Result to unwrap
 * @param defaultValue - The default value to return if failed
 * @returns The success value or default value
 * 
 * @example
 * ```typescript
 * const value = unwrapOr(ok(42), 0); // 42
 * const value = unwrapOr(err("Error"), 0); // 0
 * ```
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue;
}

/**
 * Maps a function over the success value of a Result.
 * 
 * @param result - The Result to map over
 * @param fn - The function to apply to the success value
 * @returns A new Result with the mapped value
 * 
 * @example
 * ```typescript
 * const doubled = map(ok(21), x => x * 2); // ok(42)
 * const failed = map(err("Error"), x => x * 2); // err("Error")
 * ```
 */
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

/**
 * Maps a function over the error value of a Result.
 * 
 * @param result - The Result to map over
 * @param fn - The function to apply to the error value
 * @returns A new Result with the mapped error
 * 
 * @example
 * ```typescript
 * const result = mapErr(err("error"), e => e.toUpperCase()); // err("ERROR")
 * const result = mapErr(ok(42), e => e.toUpperCase()); // ok(42)
 * ```
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return isErr(result) ? err(fn(result.error)) : result;
}

/**
 * Chains Result-returning functions together.
 * 
 * @param result - The Result to chain from
 * @param fn - The function to chain, must return a Result
 * @returns The Result from the chained function
 * 
 * @example
 * ```typescript
 * const parseNumber = (s: string): Result<number> =>
 *   isNaN(+s) ? err("Not a number") : ok(+s);
 * 
 * const doubled = flatMap(parseNumber("21"), x => ok(x * 2)); // ok(42)
 * ```
 */
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

/**
 * Alias for flatMap.
 * 
 * @see flatMap
 */
export const andThen = flatMap;

/**
 * Provides a fallback Result if the original is failed.
 * 
 * @param result - The Result to check
 * @param fn - Function to create fallback Result from error
 * @returns The original Result if successful, or the fallback Result
 * 
 * @example
 * ```typescript
 * const fallback = orElse(err("Error"), () => ok(42)); // ok(42)
 * const success = orElse(ok(21), () => ok(42)); // ok(21)
 * ```
 */
export function orElse<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => Result<T, F>
): Result<T, F> {
  return isErr(result) ? fn(result.error) : result;
}

/**
 * Pattern matches on a Result.
 * 
 * @param result - The Result to match on
 * @param handlers - Object with ok and err handler functions
 * @returns The return value of the matching handler
 * 
 * @example
 * ```typescript
 * const message = match(result, {
 *   ok: value => `Success: ${value}`,
 *   err: error => `Failed: ${error}`
 * });
 * ```
 */
export function match<T, E, R>(
  result: Result<T, E>,
  handlers: {
    ok: (value: T) => R;
    err: (error: E) => R;
  }
): R {
  return isOk(result) ? handlers.ok(result.value) : handlers.err(result.error);
}

/**
 * Converts a Result to a Promise.
 * 
 * @param result - The Result to convert
 * @returns A Promise that resolves with the value or rejects with the error
 * 
 * @example
 * ```typescript
 * await toPromise(ok(42)); // 42
 * await toPromise(err("Error")); // throws "Error"
 * ```
 */
export function toPromise<T, E>(result: Result<T, E>): Promise<T> {
  return isOk(result) 
    ? Promise.resolve(result.value)
    : Promise.reject(result.error);
}

/**
 * Converts a Promise to a Result.
 * 
 * @param promise - The Promise to convert
 * @returns A Promise that resolves to a Result
 * 
 * @example
 * ```typescript
 * const result = await fromPromise(Promise.resolve(42)); // ok(42)
 * const result = await fromPromise(Promise.reject("Error")); // err("Error")
 * ```
 */
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