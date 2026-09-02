// A stalled connection can leave a Supabase call or `fetch` neither resolving
// nor rejecting — e.g. the auth-gate spinner that never clears, or a button
// that spins forever with no error. Race it against a timer so a flaky
// network fails fast instead of hanging silently. Mirrors the mobile app's
// services/withTimeout.ts.
export function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
  });
}
