/**
 * Exponential Backoff Retry Utility
 * FAANG-level error handling for transient failures
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error: any) => {
    // Retry on network/timeout errors, not on auth failures
    const message = error?.message?.toLowerCase() || "";
    const code = error?.code?.toLowerCase() || "";

    // Don't retry auth failures
    if (
      message.includes("auth") ||
      message.includes("credential") ||
      message.includes("535") ||
      code.includes("auth")
    ) {
      return false;
    }

    // Retry on network/timeout issues
    return (
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("network") ||
      message.includes("socket") ||
      code.includes("timeout") ||
      code.includes("econnreset")
    );
  },
};

/**
 * Execute a function with exponential backoff retry
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry this error
      if (!config.shouldRetry!(error)) {
        throw error;
      }

      // Don't wait on last attempt
      if (attempt < config.maxRetries - 1) {
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        );
        console.log(
          `[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with jitter (prevents thundering herd)
 */
export async function withRetryJitter<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (!config.shouldRetry!(error)) {
        throw error;
      }

      if (attempt < config.maxRetries - 1) {
        const baseDelay = config.baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * baseDelay;
        const delay = Math.min(baseDelay + jitter, config.maxDelay);
        console.log(
          `[Retry] Attempt ${attempt + 1} failed, retrying in ${Math.round(
            delay
          )}ms...`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
