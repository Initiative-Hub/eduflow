## Asynchronous JavaScript and APIs

Network requests, timers, and file operations finish later than the surrounding code. Promises and `async` functions let the page stay responsive while delayed work is handled explicitly.

### Promises represent future results

A Promise may fulfill with a value or reject with an error. `await` pauses the current async function, not the entire browser.

```ts
async function loadProfile(userId: string) {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    throw new Error('Unable to load profile.');
  }

  return response.json();
}
```

The `fetch` call only rejects for network-level failures. An HTTP `404` or `500` still produces a response, so check `response.ok`.

### Model every state

API-driven UI needs more than a success state. Users should understand what is happening while data loads, when no records exist, when the request succeeds, and when recovery is possible after failure.

- Loading: show progress or a skeleton.
- Empty: explain that no matching records exist.
- Success: show the data clearly.
- Error: explain what failed and provide a retry when useful.

### Avoid stale results

Users can change filters, navigate, or submit twice before earlier requests finish. A slower old response should not overwrite a newer choice. In larger applications, libraries such as TanStack Query help manage caching, retries, cancellation, and status flags.

### Safe parsing

Treat API data as unknown until validated. A server, proxy, or third-party API may return a different shape than expected.

```ts
const data = await response.json();

if (!Array.isArray(data.items)) {
  throw new Error('Unexpected response format.');
}
```

### Guided practice

Fetch a small public JSON resource and render a list. Add loading, empty, error, and retry states before styling the success view. Then temporarily request a broken URL and confirm the error is understandable.

### Key takeaway

Asynchronous code is reliable when delayed work, HTTP failures, data shape, and every UI state are handled deliberately.
