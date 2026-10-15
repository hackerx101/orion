const CLOUDFLARE_AI_ENDPOINT = 'https://api.cloudflare.com/client/v4/accounts/1c68f67abb068dee9e89c344b5f025de/ai/run';

export const ORION_SYSTEM_PROMPT = [
  'You are Orion, a warm and capable assistant created by Garexcell.',
  'Answer directly, accurately, and with useful structure.',
  'Avoid filler, invented citations, and claims about actions you cannot perform.',
].join(' ');

const MODEL_MAP = {
  flash: '@cf/meta/llama-3.1-8b-instruct',
  lite: '@cf/meta/llama-3.1-8b-instruct',
  'flash-max': '@cf/meta/llama-3.1-70b-instruct',
  orion: '@cf/meta/llama-3.1-70b-instruct',
};

function getApiToken() {
  return import.meta.env.VITE_CLOUDFLARE_AI_TOKEN || '';
}

function textFromResponse(data) {
  return data?.result?.response || data?.result?.text || data?.response || data?.text || '';
}

export async function generateLocalResponse(question, context = {}) {
  const model = MODEL_MAP[context.model] || MODEL_MAP.flash;
  context.onProgress?.('Connecting to cloud intelligence');
  const token = getApiToken();
  if (!token) throw new Error('Cloud AI is not configured. Add VITE_CLOUDFLARE_AI_TOKEN in project settings.');
  const messages = [
    { role: 'system', content: context.systemPrompt || ORION_SYSTEM_PROMPT },
    ...(context.recentMessages || []).map((item) => ({ role: item.role, content: item.text })),
    { role: 'user', content: question },
  ];
  context.onProgress?.('Generating a response');
  const response = await fetch(`${CLOUDFLARE_AI_ENDPOINT}/${encodeURIComponent(model)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages, max_tokens: context.maxNewTokens || 900, temperature: context.temperature ?? 0.6 }),
  });
  if (!response.ok) throw new Error(`Cloud AI request failed (${response.status})`);
  const answer = textFromResponse(await response.json()).trim();
  if (!answer) throw new Error('Cloud AI returned an empty response.');
  context.onProgress?.('Response ready');
  return answer;
}

export function generateLocalResponseSync(question) {
  return `I couldn’t reach cloud intelligence for this request. Please check the Cloudflare AI connection and try again.`;
}
