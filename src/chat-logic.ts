/**
 * Pure helper functions for the portfolio n8n chat widget.
 * Decoupled from DOM/UI for unit testing and reliability.
 */

export interface MessageValidationResult {
  valid: boolean;
  error?: string;
  cleanText: string;
}

export interface ParsedWebhookResult {
  success: boolean;
  replyText: string;
  isError: boolean;
}

/**
 * Validates a user message before sending.
 */
export function validateMessage(raw: string): MessageValidationResult {
  if (typeof raw !== 'string') {
    return { valid: false, error: 'Message must be text', cleanText: '' };
  }
  const clean = raw.trim();
  if (clean.length === 0) {
    return { valid: false, error: 'Message cannot be empty', cleanText: '' };
  }
  if (clean.length > 2000) {
    return { valid: false, error: 'Message cannot exceed 2000 characters', cleanText: clean };
  }
  return { valid: true, cleanText: clean };
}

/**
 * Checks whether the webhook URL is still an unconfigured placeholder.
 */
export function isPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  return (
    trimmed === '' ||
    trimmed === 'REPLACE_ME' ||
    trimmed.includes('REPLACE_ME') ||
    trimmed.includes('your-n8n-webhook-url') ||
    trimmed.includes('example.com')
  );
}

/**
 * Builds the standard JSON payload expected by n8n webhook nodes.
 */
export function buildWebhookPayload(message: string, sessionId?: string) {
  return {
    message: message.trim(),
    sessionId: sessionId || 'default-session',
    timestamp: new Date().toISOString(),
    source: 'portfolio-website',
  };
}

/**
 * Parses diverse response formats that n8n webhook nodes might return.
 */
export function parseWebhookResponse(status: number, data: unknown): ParsedWebhookResult {
  if (status < 200 || status >= 300) {
    return {
      success: false,
      replyText: `Error from server (HTTP ${status}). Please verify the webhook endpoint.`,
      isError: true,
    };
  }

  if (data === null || data === undefined) {
    return {
      success: false,
      replyText: 'Received empty response from the server.',
      isError: true,
    };
  }

  // If response is a direct string
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) {
      return { success: false, replyText: 'Received empty response text.', isError: true };
    }
    return { success: true, replyText: trimmed, isError: false };
  }

  // If response is an array (n8n item list output e.g. [{ "output": "Hello" }])
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { success: false, replyText: 'Received empty item list from webhook.', isError: true };
    }
    return parseWebhookResponse(status, data[0]);
  }

  // If response is an object
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const candidateKeys = ['output', 'message', 'response', 'reply', 'text', 'content', 'data'];
    for (const key of candidateKeys) {
      if (typeof obj[key] === 'string' && (obj[key] as string).trim().length > 0) {
        return { success: true, replyText: (obj[key] as string).trim(), isError: false };
      }
    }

    // Try nested response structure e.g. { response: { text: "..." } }
    if (obj.response && typeof obj.response === 'object') {
      const nested = obj.response as Record<string, unknown>;
      for (const key of ['text', 'message', 'output', 'content']) {
        if (typeof nested[key] === 'string' && (nested[key] as string).trim().length > 0) {
          return { success: true, replyText: (nested[key] as string).trim(), isError: false };
        }
      }
    }

    // Fallback JSON stringification if readable
    try {
      return { success: true, replyText: JSON.stringify(obj), isError: false };
    } catch {
      return { success: false, replyText: 'Could not parse response structure.', isError: true };
    }
  }

  return {
    success: false,
    replyText: 'Unrecognized response format.',
    isError: true,
  };
}
