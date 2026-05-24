/* eslint-disable no-console */
// Tiny mock of the OpenAI Chat Completions API used by load tests.
// It returns deterministic JSON in the shape AnalyzeService/VisionService expect,
// after a configurable delay so we can simulate model latency without burning credits.

const http = require('http');

const PORT = parseInt(process.env.MOCK_PORT || '8787', 10);
const DELAY_MS = parseInt(process.env.MOCK_DELAY_MS || '2500', 10);

const VISION_PAYLOAD = JSON.stringify({
  dish: {
    dish_name: 'Mock dish',
    dish_name_confidence: 0.9,
  },
  visible_items: [
    {
      name: 'rice',
      display_name: 'Rice',
      portion_g: 180,
      cooking_state: 'boiled',
      quality: 'good',
      estimated_nutrients: { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
    },
    {
      name: 'chicken_breast',
      display_name: 'Chicken breast',
      portion_g: 120,
      cooking_state: 'grilled',
      quality: 'good',
      estimated_nutrients: { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
    },
  ],
  components: [],
});

const HEALTH_FEEDBACK_PAYLOAD = JSON.stringify({
  summary: 'Balanced meal — solid protein and complex carbs.',
  positives: ['High protein', 'Lean cooking method'],
  negatives: [],
  suggestions: ['Add greens for fiber and micronutrients'],
});

function buildResponse(req) {
  // Decide which payload to return based on a heuristic in the request body.
  // Vision calls have model 'gpt-4o-mini' and image content; health-feedback is text-only.
  const isVision = /image_url|imageUrl/.test(req.body || '');
  const content = isVision ? VISION_PAYLOAD : HEALTH_FEEDBACK_PAYLOAD;

  return {
    id: 'chatcmpl-mock-' + Date.now(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4o-mini',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 200, completion_tokens: 300, total_tokens: 500 },
  };
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    if (req.method === 'POST' && req.url.startsWith('/v1/chat/completions')) {
      setTimeout(() => {
        const response = buildResponse({ body });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      }, DELAY_MS);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-openai] listening on http://127.0.0.1:${PORT} (delay ${DELAY_MS}ms)`);
});
