// retry logic
export async function retry(action, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await action();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Retry ${i + 1}/${retries}:`, err.message);
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
}