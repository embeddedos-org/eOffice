export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  readonly name: string;
  isAvailable(): boolean;
  chat(messages: ChatMessage[]): Promise<ChatResponse>;
}

// --- OpenAI Provider ---
class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }
}

// --- EAI (Local Hardware) Provider ---
class EAIProvider implements AIProvider {
  readonly name = 'eai';
  private baseUrl: string;
  private _available: boolean | null = null;

  constructor() {
    this.baseUrl = process.env.EAI_BASE_URL || 'http://localhost:8420';
  }

  isAvailable(): boolean {
    return !!this.baseUrl;
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, stream: false }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      this._available = false;
      throw new Error(`EAI error (${response.status})`);
    }

    this._available = true;
    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      model?: string;
    };

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model || 'eai-local',
    };
  }
}

// --- Rule-Based Fallback Provider ---
class RuleBasedProvider implements AIProvider {
  readonly name = 'rule-based';

  isAvailable(): boolean {
    return true; // Always available as last resort
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const response = this.generateResponse(lastUserMsg);
    return { content: response, model: 'rule-based' };
  }

  private generateResponse(input: string): string {
    const lower = input.toLowerCase();
    if (lower.includes('summarize') || lower.includes('summary')) {
      return 'I can help summarize text. Please provide the content you want summarized. (Note: Running in rule-based mode — for better results, configure an AI provider.)';
    }
    if (lower.includes('translate')) {
      return 'Translation requires an AI provider. Please configure OPENAI_API_KEY, ANTHROPIC_API_KEY, or OLLAMA_URL.';
    }
    if (lower.includes('formula') || lower.includes('=sum') || lower.includes('spreadsheet')) {
      return 'For formula suggestions, please configure an AI provider. Common formulas: =SUM(range), =AVERAGE(range), =VLOOKUP(value, range, col, false)';
    }
    if (lower.includes('help') || lower.includes('what can you')) {
      return "I'm eBot, the eOffice AI assistant. I can help with: summarizing, rewriting, grammar checking, translating text, suggesting formulas, generating slides, and more. Configure an AI provider (OpenAI, Anthropic, or Ollama) for full capabilities.";
    }
    return `I received your message but I'm running in rule-based mode with limited capabilities. Configure an AI provider for full functionality:\n- Set OPENAI_API_KEY for OpenAI\n- Set ANTHROPIC_API_KEY for Anthropic/Claude\n- Set OLLAMA_URL for local Ollama`;
  }
}

// --- Import external providers ---
import { AnthropicProvider } from './providers/anthropic';
import { OllamaProvider } from './providers/ollama';

// --- AI Service with Fallback Chain ---
class AIService {
  private providers: AIProvider[] = [];
  private maxRetries = 2;
  private retryDelayMs = 1000;

  constructor() {
    // Build provider chain: OpenAI -> Anthropic -> Ollama -> EAI -> Rule-based
    this.providers = [
      new OpenAIProvider(),
      new AnthropicProvider(),
      new OllamaProvider(),
      new EAIProvider(),
      new RuleBasedProvider(), // Always last, always available
    ];

    const available = this.providers.filter(p => p.isAvailable()).map(p => p.name);
    console.log(`AI Service initialized. Available providers: ${available.join(', ')}`);
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;

      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          const response = await provider.chat(messages);
          return response;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          errors.push(`${provider.name}(attempt ${attempt + 1}): ${errMsg}`);

          // Don't retry on client errors (4xx)
          if (errMsg.includes('(4')) break;

          // Wait before retrying (exponential backoff)
          if (attempt < this.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * Math.pow(2, attempt)));
          }
        }
      }
    }

    // Should never reach here since rule-based always works, but just in case
    throw new Error(`All AI providers failed: ${errors.join('; ')}`);
  }

  // Convenience methods that use chat internally
  async summarize(text: string): Promise<string> {
    const resp = await this.chat([
      { role: 'system', content: 'Summarize the following text concisely. Return only the summary.' },
      { role: 'user', content: text },
    ]);
    return resp.content;
  }

  async rewrite(text: string, style: string): Promise<string> {
    const resp = await this.chat([
      { role: 'system', content: `Rewrite the following text in a ${style} style. Return only the rewritten text.` },
      { role: 'user', content: text },
    ]);
    return resp.content;
  }

  async grammarCheck(text: string): Promise<string> {
    const resp = await this.chat([
      { role: 'system', content: 'Check the following text for grammar and spelling errors. List issues found and provide the corrected version.' },
      { role: 'user', content: text },
    ]);
    return resp.content;
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    const resp = await this.chat([
      { role: 'system', content: `Translate the following text to ${targetLanguage}. Return only the translation.` },
      { role: 'user', content: text },
    ]);
    return resp.content;
  }

  async generateFormula(description: string): Promise<string> {
    const resp = await this.chat([
      { role: 'system', content: 'Generate a spreadsheet formula for the given description. Return only the formula starting with =.' },
      { role: 'user', content: description },
    ]);
    return resp.content;
  }

  async generateSlides(topic: string, numSlides: number): Promise<string> {
    const resp = await this.chat([
      { role: 'system', content: `Generate ${numSlides} presentation slides about the given topic. Format as JSON array of {title, bullets: string[]}.` },
      { role: 'user', content: topic },
    ]);
    return resp.content;
  }

  async analyzeData(data: string, question: string): Promise<string> {
    const resp = await this.chat([
      { role: 'system', content: 'Analyze the following data and answer the question.' },
      { role: 'user', content: `Data:\n${data}\n\nQuestion: ${question}` },
    ]);
    return resp.content;
  }

  async smartCompose(context: string, text: string): Promise<string> {
    const resp = await this.chat([
      { role: 'system', content: 'Complete the following text based on the context. Return only the completion.' },
      { role: 'user', content: `Context: ${context}\n\nText to complete: ${text}` },
    ]);
    return resp.content;
  }

  // Get status of all providers
  getProviderStatus(): Array<{ name: string; available: boolean }> {
    return this.providers.map(p => ({
      name: p.name,
      available: p.isAvailable(),
    }));
  }

  // Get the active (first available) provider name
  getActiveProvider(): string {
    for (const p of this.providers) {
      if (p.isAvailable()) return p.name;
    }
    return 'none';
  }
}

export const aiService = new AIService();
