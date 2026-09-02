// A stalled connection can leave a Supabase call or `fetch` neither resolving
// nor rejecting — the exact failure mode that once left the walk-confirm
// "Starting…" button and the reroute control stuck forever. Race it against
// a timer so a flaky network fails fast instead of hanging silently.
export function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
  });
}
