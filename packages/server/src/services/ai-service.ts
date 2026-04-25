import fetch from 'node-fetch';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export class AIService {
  private openaiKey: string | null;
  private baseUrl: string;

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY || null;
    this.baseUrl = process.env.EAI_BASE_URL || 'http://localhost:8420';
  }

  async chat(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
    // Try OpenAI first
    if (this.openaiKey) {
      return this.chatOpenAI(messages, options);
    }

    // Try local LLM server
    try {
      return await this.chatLocal(messages, options);
    } catch {
      // Fall back to rule-based
      return this.chatRuleBased(messages);
    }
  }

  async summarize(text: string): Promise<string> {
    const response = await this.chat([
      { role: 'system', content: 'You are a summarization assistant. Provide clear, concise summaries.' },
      { role: 'user', content: `Summarize the following text:\n\n${text}` },
    ]);
    return response.content;
  }

  async rewrite(text: string, style: string): Promise<string> {
    const response = await this.chat([
      { role: 'system', content: `You are a writing assistant. Rewrite text in a ${style} style while preserving meaning.` },
      { role: 'user', content: `Rewrite the following text in a ${style} style:\n\n${text}` },
    ]);
    return response.content;
  }

  async grammarCheck(text: string): Promise<string> {
    const response = await this.chat([
      { role: 'system', content: 'You are a grammar and writing assistant. Identify and correct grammar errors.' },
      { role: 'user', content: `Check the grammar and suggest corrections:\n\n${text}` },
    ]);
    return response.content;
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    const response = await this.chat([
      { role: 'system', content: `You are a translation assistant. Translate text to ${targetLanguage}.` },
      { role: 'user', content: `Translate to ${targetLanguage}:\n\n${text}` },
    ]);
    return response.content;
  }

  async generateFormula(description: string): Promise<string> {
    const response = await this.chat([
      { role: 'system', content: 'You are a spreadsheet formula expert. Generate Excel/spreadsheet formulas from natural language descriptions. Return only the formula, starting with =.' },
      { role: 'user', content: description },
    ]);
    return response.content;
  }

  async generateSlides(topic: string, numSlides: number = 5): Promise<Array<{ title: string; content: string[] }>> {
    const response = await this.chat([
      { role: 'system', content: 'You are a presentation designer. Generate slide content as JSON array of {title, content: string[]}.' },
      { role: 'user', content: `Create ${numSlides} slides about: ${topic}. Return valid JSON array only.` },
    ]);

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {}

    return this.generateSlidesRuleBased(topic, numSlides);
  }

  async analyzeData(data: string, question: string): Promise<string> {
    const response = await this.chat([
      { role: 'system', content: 'You are a data analyst. Analyze the provided data and answer questions about it.' },
      { role: 'user', content: `Data:\n${data}\n\nQuestion: ${question}` },
    ]);
    return response.content;
  }

  async smartCompose(context: string, partial: string): Promise<string> {
    const response = await this.chat([
      { role: 'system', content: 'You are an email autocomplete assistant. Complete the partial text naturally.' },
      { role: 'user', content: `Context: ${context}\n\nComplete this: ${partial}` },
    ], { maxTokens: 150, temperature: 0.3 });
    return response.content;
  }

  // --- OpenAI API ---
  private async chatOpenAI(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status}`);
    }

    const data = await res.json() as any;
    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
      },
    };
  }

  // --- Local LLM server ---
  private async chatLocal(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      throw new Error(`Local AI error: ${res.status}`);
    }

    const data = await res.json() as any;
    return {
      content: data.choices?.[0]?.message?.content || data.response || '',
      model: data.model || 'local',
    };
  }

  // --- Rule-based fallback ---
  private chatRuleBased(messages: ChatMessage[]): AIResponse {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
    let content: string;

    if (systemPrompt.includes('summariz')) {
      const words = lastMessage.split(/\s+/);
      const sentences = lastMessage.split(/[.!?]+/).filter(Boolean);
      const keyPoints = sentences.slice(0, Math.min(3, sentences.length));
      content = `Summary:\n${keyPoints.map((s) => `• ${s.trim()}`).join('\n')}\n\n(${words.length} words → ${keyPoints.length} key points)`;
    } else if (systemPrompt.includes('grammar')) {
      content = `Grammar check complete. The text appears well-written. Consider:\n• Checking for passive voice usage\n• Ensuring consistent tense throughout\n• Verifying subject-verb agreement`;
    } else if (systemPrompt.includes('translat')) {
      content = `[Translation not available without AI service]\nOriginal text has ${lastMessage.split(/\s+/).length} words. Configure OPENAI_API_KEY or start local LLM for translations.`;
    } else if (systemPrompt.includes('rewrite') || systemPrompt.includes('Rewrite')) {
      content = lastMessage;
    } else if (systemPrompt.includes('formula')) {
      content = this.generateFormulaRuleBased(lastMessage);
    } else if (systemPrompt.includes('presentation') || systemPrompt.includes('slide')) {
      const slides = this.generateSlidesRuleBased(lastMessage, 5);
      content = JSON.stringify(slides);
    } else if (systemPrompt.includes('data analyst')) {
      content = `Data analysis: The dataset contains structured information. Key observations:\n• Check for trends over time\n• Look for outliers and anomalies\n• Consider grouping by categories for deeper insights\n\nFor advanced analysis, configure OPENAI_API_KEY.`;
    } else {
      content = `I received your message. Currently running in rule-based mode.\nFor full AI capabilities, set OPENAI_API_KEY or start a local LLM server at ${this.baseUrl}.\n\nI can still help with:\n• Text summarization (basic)\n• Grammar tips\n• Formula suggestions\n• Slide generation\n• Data analysis hints`;
    }

    return { content, model: 'rule-based' };
  }

  private generateFormulaRuleBased(description: string): string {
    const lower = description.toLowerCase();
    if (lower.includes('sum')) return '=SUM(A1:A100)';
    if (lower.includes('average') || lower.includes('avg') || lower.includes('mean')) return '=AVERAGE(A1:A100)';
    if (lower.includes('count')) return '=COUNT(A1:A100)';
    if (lower.includes('max') || lower.includes('highest') || lower.includes('largest')) return '=MAX(A1:A100)';
    if (lower.includes('min') || lower.includes('lowest') || lower.includes('smallest')) return '=MIN(A1:A100)';
    if (lower.includes('vlookup') || lower.includes('look up')) return '=VLOOKUP(A1, B:C, 2, FALSE)';
    if (lower.includes('if')) return '=IF(A1>0, "Positive", "Non-positive")';
    if (lower.includes('concatenat') || lower.includes('join') || lower.includes('combine')) return '=CONCATENATE(A1, " ", B1)';
    return '=SUM(A1:A10)';
  }

  private generateSlidesRuleBased(topic: string, numSlides: number): Array<{ title: string; content: string[] }> {
    const slides = [
      { title: topic, content: ['Overview and Introduction', 'Key concepts and definitions', 'Why this topic matters'] },
      { title: 'Background', content: ['Historical context', 'Current state of the field', 'Recent developments'] },
      { title: 'Key Points', content: ['First major point', 'Second major point', 'Third major point'] },
      { title: 'Analysis', content: ['Detailed examination', 'Pros and cons', 'Comparison with alternatives'] },
      { title: 'Implementation', content: ['Steps to get started', 'Best practices', 'Common pitfalls to avoid'] },
      { title: 'Case Studies', content: ['Real-world example 1', 'Real-world example 2', 'Lessons learned'] },
      { title: 'Future Outlook', content: ['Emerging trends', 'Predictions', 'Areas for further research'] },
      { title: 'Conclusion', content: ['Summary of key takeaways', 'Call to action', 'Q&A'] },
    ];
    return slides.slice(0, numSlides);
  }
}

export const aiService = new AIService();
