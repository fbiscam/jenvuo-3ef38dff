INSERT INTO public.insights (title, slug, excerpt, content, category, image_url, published_at, notified_at) VALUES
('Streaming Replies with the Jenvu API', 'streaming-replies-with-the-jenvu-api',
'Turn on streaming and show each word of a model reply the moment it arrives, instead of waiting for the full answer.',
$c$Streaming lets your app show a model's reply word by word as it is written, instead of waiting for the whole answer. For chat windows, trading dashboards and alerts, this makes the experience feel fast even when the answer is long.

## How streaming works

The Jenvu API follows the familiar chat completions format. Send your request to `https://jenvu.com/api/public/v1/chat/completions` with `"stream": true` in the body. Instead of one JSON reply, the API sends a stream of small events (server-sent events). Each event carries the next piece of text, and the stream ends with a final `[DONE]` line.

```bash
curl https://jenvu.com/api/public/v1/chat/completions \
  -H "Authorization: Bearer YOUR_JENVU_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "stream": true,
    "messages": [{"role": "user", "content": "Summarise the London session for XAU/USD"}]
  }'
```

## Reading the stream in your app

Read the response body line by line. Every line that starts with `data:` holds a JSON chunk; append its text to what is already on screen. Stop when you receive `data: [DONE]`.

- Keep a single buffer per reply so partial lines are joined correctly.
- Show a small typing indicator until the first chunk arrives.
- If the connection drops, show what you already received and let the user retry.

## When to use it

Streaming is best for anything a person reads live: chat, explanations of a chart, or a written session recap. For background jobs, such as tagging many articles, a normal (non-streamed) request is simpler to handle.

## Pricing

Streamed and non-streamed requests cost the same: $3 per million tokens, on every model. You only pay for the tokens actually produced.

Model output is information, not financial advice. Always check important decisions yourself.$c$,
'API', '/api/public/insight-image/streaming-replies-with-the-jenvu-api.jpg', now(), now()),

('Build a Gold Analysis Agent', 'build-a-gold-analysis-agent',
'A simple pattern for an agent that reads market notes, checks your rules and writes a clear gold summary with the Jenvu API.',
$c$An agent is just a loop: give a model a goal, let it read some data, check the result against your rules, and repeat until the job is done. With the Jenvu API you can build a small agent that prepares a daily XAU/USD summary for you.

## 1. Define the job clearly

Write one short instruction that says exactly what the agent should produce. For example: "Read today's notes, list the key levels, the session bias and the risk events. Keep it under 150 words. Never promise a result."

## 2. Give it the data

Pass your own inputs in the messages: price levels you track, session times, a calendar of news events. The model only knows what you send it, so keep the inputs clean and dated.

## 3. Check the output

Before you show or save the summary, run simple checks in your code:

- Is every level a real number from your input?
- Is the length within your limit?
- Does it avoid words like "guaranteed" or "sure win"?

If a check fails, send the reply back to the model with a short note about what to fix.

## 4. Pick the right model per step

You can use a fast model such as `gpt-5.5` for drafting and a deeper model such as `claude-opus-5` for a final review. Every model costs the same $3 per million tokens through one Jenvu key, so you can choose by quality and speed alone.

## 5. Keep a human in the loop

An agent should prepare information, not place trades on its own. Let it alert you, then decide yourself. Gold can move fast and leverage magnifies losses as well as gains.$c$,
'API', '/api/public/insight-image/build-a-gold-analysis-agent.jpg', now() - interval '1 minute', now()),

('Choosing the Right Model per Task', 'choosing-the-right-model-per-task',
'Fast models for everyday work, deeper models for long reasoning: how to pick a Jenvu API model for each job.',
$c$The Jenvu API gives you many frontier models behind one key. Because every model is priced the same, $3 per million tokens, the choice comes down to speed, depth and the type of input.

## Quick everyday tasks

For short answers, tagging, simple rewrites and high-volume jobs, choose a fast model such as `deepseek-v4-flash-0731` or `gpt-5.5`. Replies come back quickly and are usually all you need.

## Deep reasoning and long documents

When a task needs careful thinking, such as reviewing a long strategy document or code, choose `claude-opus-5`. It is slower, but better at following long, detailed instructions.

## Charts and screenshots

If you send images, such as a chart screenshot, choose a model that understands pictures, such as `gemini-3.1-pro`.

## A simple rule of thumb

1. Start with a fast model.
2. If the answers miss details, move one step up.
3. Keep the same prompt while you compare, so the test is fair.

## See every model

The full list, with model IDs, is on the Models page. Use the exact ID in the `model` field of your request. You can switch at any time without changing anything else in your code.$c$,
'API', '/api/public/insight-image/choosing-the-right-model-per-task.jpg', now() - interval '2 minutes', now()),

('Handling API Errors and Rate Limits', 'handling-api-errors-and-rate-limits',
'What Jenvu API error codes mean, and how to retry safely when you send too many requests at once.',
$c$Every API sometimes says no. A good integration reads the error, waits when it should, and tells the user something useful. Here is how to handle Jenvu API errors.

## Read the status code

The Jenvu API returns standard HTTP status codes with a short, plain message:

- **400**: the request is not valid. Check the JSON and the model ID.
- **401**: the API key is missing or wrong. Send it as `Authorization: Bearer YOUR_JENVU_KEY`.
- **402**: your balance is too low. Top up in the dashboard.
- **429**: too many requests at once. Slow down and try again.
- **5xx**: a temporary problem on our side. Retry after a short wait.

## Retry with a growing wait

For 429 and 5xx errors, retry with exponential backoff: wait 1 second, then 2, then 4, and stop after a few attempts. Add a little random delay so many clients don't retry at the same moment.

## Don't retry what won't change

A 400 or 401 will fail again with the same request. Fix the request or the key instead of retrying.

## Keep users informed

Show a short message such as "Busy right now, trying again…" instead of a raw error. Log the status code and time on your side, so you can spot patterns later.

## Spread out heavy jobs

If you process many items, send them in small batches with a short pause between them. It is faster overall than hitting the limit and waiting.$c$,
'API', '/api/public/insight-image/handling-api-errors-and-rate-limits.jpg', now() - interval '3 minutes', now());