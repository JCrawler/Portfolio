import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMessage,
  isPlaceholderUrl,
  buildWebhookPayload,
  parseWebhookResponse,
} from './chat-logic.ts';

test('validateMessage rejects empty or whitespace-only strings', () => {
  assert.equal(validateMessage('').valid, false);
  assert.equal(validateMessage('   ').valid, false);
  assert.equal(validateMessage('\n\t').valid, false);
});

test('validateMessage accepts valid text and trims whitespace', () => {
  const result = validateMessage('  Hello Jholichi!  ');
  assert.equal(result.valid, true);
  assert.equal(result.cleanText, 'Hello Jholichi!');
});

test('validateMessage rejects excessively long text (> 2000 chars)', () => {
  const longText = 'a'.repeat(2005);
  const result = validateMessage(longText);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /2000/);
});

test('isPlaceholderUrl correctly identifies unset and placeholder URLs', () => {
  assert.equal(isPlaceholderUrl(''), true);
  assert.equal(isPlaceholderUrl('REPLACE_ME'), true);
  assert.equal(isPlaceholderUrl('https://example.com/webhook'), true);
  assert.equal(isPlaceholderUrl('https://n8n.your-domain.render.com/webhook/REPLACE_ME'), true);
  assert.equal(isPlaceholderUrl('https://my-n8n-instance.onrender.com/webhook/test-chat'), false);
});

test('buildWebhookPayload constructs expected payload structure', () => {
  const payload = buildWebhookPayload('Tell me about your thesis');
  assert.equal(payload.message, 'Tell me about your thesis');
  assert.equal(payload.source, 'portfolio-website');
  assert.ok(payload.timestamp);
  assert.ok(payload.sessionId);
});

test('parseWebhookResponse handles non-200 HTTP status', () => {
  const result = parseWebhookResponse(404, { error: 'Not found' });
  assert.equal(result.success, false);
  assert.equal(result.isError, true);
  assert.match(result.replyText, /HTTP 404/);
});

test('parseWebhookResponse handles plain string responses', () => {
  const result = parseWebhookResponse(200, 'Hello from n8n!');
  assert.equal(result.success, true);
  assert.equal(result.replyText, 'Hello from n8n!');
});

test('parseWebhookResponse handles common n8n object keys', () => {
  const res1 = parseWebhookResponse(200, { output: 'Response via output key' });
  assert.equal(res1.replyText, 'Response via output key');

  const res2 = parseWebhookResponse(200, { message: 'Response via message key' });
  assert.equal(res2.replyText, 'Response via message key');

  const res3 = parseWebhookResponse(200, { response: 'Response via response key' });
  assert.equal(res3.replyText, 'Response via response key');
});

test('parseWebhookResponse handles n8n array-wrapped response item', () => {
  const result = parseWebhookResponse(200, [{ output: 'Array item output' }]);
  assert.equal(result.success, true);
  assert.equal(result.replyText, 'Array item output');
});
