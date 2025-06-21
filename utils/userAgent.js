import randomUseragent from 'random-useragent';

export function getUserAgent() {
  const ua = randomUseragent.getRandom();
  return ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
}
