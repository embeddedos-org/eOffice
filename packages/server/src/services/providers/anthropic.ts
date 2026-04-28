import { ChatMessage, ChatResponse, AIProvider } from '../ai-service';

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    // Convert messages to Anthropic format (system message separate)
    const systemMessages = messages.filter(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages: chatMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };

    if (systemMessages.length > 0) {
      body.system = systemMessages.map(m => m.content).join('\n');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
      model: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    const content = data.content
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('');

    return {
      content,
      model: data.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }
}
