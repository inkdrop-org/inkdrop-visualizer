const MAX_RETRIES_DEFAULT = 3;

export async function promiseRetry<T>(
    fn: () => Promise<T>,
    retries = MAX_RETRIES_DEFAULT,
    retryIntervalMillis = 1000,
    previousError?: Error
): Promise<T> {
    return !retries ?
        Promise.reject(previousError) :
        fn().catch(async (error) => {
            await new Promise((resolve) =>
                setTimeout(resolve, retryIntervalMillis));
            return promiseRetry(fn, retries - 1, retryIntervalMillis, error);
        });
}