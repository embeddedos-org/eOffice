import { ChatMessage, ChatResponse, AIProvider } from '../ai-service';

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  private baseUrl: string;
  private model: string;
  private _available: boolean | null = null;

  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  isAvailable(): boolean {
    if (this._available !== null) return this._available;
    // Optimistically return true, will be verified on first call
    return !!this.baseUrl;
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      this._available = response.ok;
      return this._available;
    } catch {
      this._available = false;
      return false;
    }
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      this._available = false;
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Ollama API error (${response.status}): ${error}`);
    }

    this._available = true;
    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model || this.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }
}
