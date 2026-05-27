import { apiClient } from '../../../apps/shared/config';

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (params: Record<string, any>) => Promise<any>;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolResult?: any;
}

export interface AgentResult {
  response: string;
  actions?: Array<{ tool: string; params: Record<string, any>; result: any }>;
  model: string;
}

export abstract class BaseAgent {
  name: string;
  description: string;
  tools: AgentTool[];

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.tools = [];
  }

  registerTool(tool: AgentTool): void {
    this.tools.push(tool);
  }

  abstract process(input: string, context?: Record<string, any>): Promise<AgentResult>;

  protected async callAI(messages: AgentMessage[]): Promise<string> {
    try {
      const response = await apiClient<{ response: string }>('/api/ebot/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });
      return response.response;
    } catch {
      return 'AI service unavailable. Using rule-based processing.';
    }
  }
}

// --- Orchestrator Agent ---

export class OrchestratorAgent extends BaseAgent {
  private specialists: Map<string, BaseAgent> = new Map();

  constructor() {
    super('orchestrator', 'Routes user requests to specialist agents');
  }

  registerSpecialist(agent: BaseAgent): void {
    this.specialists.set(agent.name, agent);
  }

  async process(input: string, context?: Record<string, any>): Promise<AgentResult> {
    const lowerInput = input.toLowerCase();
    let specialist: BaseAgent | undefined;

    if (lowerInput.match(/\b(write|document|edit|summarize|rewrite|grammar|spell|proofread)\b/)) {
      specialist = this.specialists.get('writing');
    } else if (lowerInput.match(/\b(formula|spreadsheet|data|chart|graph|calculate|sum|average|pivot|analyze)\b/)) {
      specialist = this.specialists.get('data');
    } else if (lowerInput.match(/\b(slide|presentation|deck|design|layout)\b/)) {
      specialist = this.specialists.get('design');
    } else if (lowerInput.match(/\b(search|find|look|where|document)\b/)) {
      specialist = this.specialists.get('search');
    } else if (lowerInput.match(/\b(automate|macro|workflow|script|repeat)\b/)) {
      specialist = this.specialists.get('automation');
    }

    if (specialist) {
      return specialist.process(input, context);
    }

    const response = await this.callAI([
      { role: 'system', content: `You are eBot, the AI orchestrator for eOffice. Available specialists: ${Array.from(this.specialists.keys()).join(', ')}. Help the user directly or suggest which specialist to use.` },
      { role: 'user', content: input },
    ]);

    return { response, model: 'orchestrator', actions: [] };
  }
}

// --- Writing Agent ---

export class WritingAgent extends BaseAgent {
  constructor() {
    super('writing', 'Document editing, summarization, rewriting, grammar checking');

    this.registerTool({
      name: 'insert_text',
      description: 'Insert text at a position in the document',
      parameters: {
        doc_id: { type: 'string', description: 'Document ID', required: true },
        position: { type: 'number', description: 'Character position' },
        text: { type: 'string', description: 'Text to insert', required: true },
      },
      execute: async (params) => {
        return { success: true, message: `Inserted text at position ${params.position || 'end'}` };
      },
    });
  }

  async process(input: string, context?: Record<string, any>): Promise<AgentResult> {
    const lowerInput = input.toLowerCase();
    let endpoint = '/api/ebot/chat';
    let body: Record<string, any> = { message: input };

    if (lowerInput.includes('summarize')) {
      endpoint = '/api/ebot/summarize';
      body = { text: context?.documentContent || input };
    } else if (lowerInput.includes('rewrite') || lowerInput.includes('formal') || lowerInput.includes('casual')) {
      endpoint = '/api/ebot/rewrite';
      const style = lowerInput.includes('formal') ? 'formal' : lowerInput.includes('casual') ? 'casual' : 'concise';
      body = { text: context?.documentContent || input, style };
    } else if (lowerInput.includes('grammar') || lowerInput.includes('proofread') || lowerInput.includes('spell')) {
      endpoint = '/api/ebot/grammar';
      body = { text: context?.documentContent || input };
    } else if (lowerInput.includes('translate')) {
      endpoint = '/api/ebot/translate';
      const langMatch = input.match(/to\s+(\w+)/i);
      body = { text: context?.documentContent || input, targetLanguage: langMatch?.[1] || 'Spanish' };
    }

    try {
      const response = await apiClient<{ response: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return { response: response.response, model: 'writing-agent', actions: [] };
    } catch {
      return { response: 'Writing agent: Unable to process request.', model: 'writing-agent-fallback', actions: [] };
    }
  }
}

// --- Data Agent ---

export class DataAgent extends BaseAgent {
  constructor() {
    super('data', 'Spreadsheet formulas, data analysis, chart suggestions');

    this.registerTool({
      name: 'create_chart',
      description: 'Create a chart from spreadsheet data',
      parameters: {
        sheet_id: { type: 'string', description: 'Sheet ID', required: true },
        range: { type: 'string', description: 'Data range (e.g., A1:D10)', required: true },
        type: { type: 'string', description: 'Chart type (bar, line, pie)' },
      },
      execute: async (params) => {
        return { success: true, chartType: params.type || 'bar', range: params.range };
      },
    });

    this.registerTool({
      name: 'format_range',
      description: 'Format a range of cells',
      parameters: {
        sheet_id: { type: 'string', description: 'Sheet ID', required: true },
        range: { type: 'string', description: 'Cell range', required: true },
        format: { type: 'object', description: 'Format options (bold, color, etc.)' },
      },
      execute: async (params) => {
        return { success: true, message: `Formatted range ${params.range}` };
      },
    });
  }

  async process(input: string, context?: Record<string, any>): Promise<AgentResult> {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('formula') || lowerInput.match(/\b(calculate|sum|average|count|vlookup)\b/)) {
      try {
        const response = await apiClient<{ formula: string; response: string }>('/api/ebot/formula', {
          method: 'POST',
          body: JSON.stringify({ description: input }),
        });
        return { response: `Here's the formula: ${response.formula}\n\n${response.response}`, model: 'data-agent', actions: [] };
      } catch {
        return { response: this.generateFormulaFallback(input), model: 'data-agent-fallback', actions: [] };
      }
    }

    if (lowerInput.includes('analyze') || lowerInput.includes('anomal') || lowerInput.includes('trend')) {
      try {
        const response = await apiClient<{ analysis: string }>('/api/ebot/analyze', {
          method: 'POST',
          body: JSON.stringify({ data: context?.sheetData || '', question: input }),
        });
        return { response: response.analysis, model: 'data-agent', actions: [] };
      } catch {
        return { response: 'Data analysis requires the AI service. Please check your connection.', model: 'data-agent-fallback', actions: [] };
      }
    }

    return { response: `Data Agent: I can help with formulas, data analysis, and chart suggestions. Try asking me to "create a VLOOKUP formula" or "analyze my sales data".`, model: 'data-agent', actions: [] };
  }

  private generateFormulaFallback(input: string): string {
    const lower = input.toLowerCase();
    if (lower.includes('sum')) return 'Formula: =SUM(A1:A100)\nAdjust the range to match your data.';
    if (lower.includes('average') || lower.includes('avg')) return 'Formula: =AVERAGE(A1:A100)\nAdjust the range to match your data.';
    if (lower.includes('count')) return 'Formula: =COUNT(A1:A100)\nAdjust the range to match your data.';
    if (lower.includes('vlookup') || lower.includes('look up')) return 'Formula: =VLOOKUP(A1, B:C, 2, FALSE)\nAdjust the lookup value, table range, and column index.';
    if (lower.includes('max')) return 'Formula: =MAX(A1:A100)';
    if (lower.includes('min')) return 'Formula: =MIN(A1:A100)';
    if (lower.includes('if')) return 'Formula: =IF(A1>0, "Positive", "Negative")\nAdjust the condition and values.';
    return 'Please describe what you want to calculate, and I\'ll suggest a formula.';
  }
}

// --- Design Agent ---

export class DesignAgent extends BaseAgent {
  constructor() {
    super('design', 'Slide creation, layout suggestions, presentation design');
  }

  async process(input: string, context?: Record<string, any>): Promise<AgentResult> {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('create') || lowerInput.includes('generate') || lowerInput.includes('make')) {
      const numMatch = input.match(/(\d+)\s*(slide|page)/i);
      const numSlides = numMatch ? parseInt(numMatch[1]) : 5;

      try {
        const response = await apiClient<{ slides: any[]; response: string }>('/api/ebot/slides', {
          method: 'POST',
          body: JSON.stringify({ topic: input, numSlides }),
        });
        return {
          response: `Created ${response.slides.length} slides!\n\n${response.slides.map((s: any, i: number) => `Slide ${i + 1}: ${s.title}`).join('\n')}`,
          model: 'design-agent',
          actions: [{ tool: 'create_slides', params: { slides: response.slides }, result: response.slides }],
        };
      } catch {
        return { response: 'Slide generation requires the AI service. Try describing the topic for your presentation.', model: 'design-agent-fallback', actions: [] };
      }
    }

    return { response: `Design Agent: I can create presentations, suggest layouts, and design slides. Try "create a 5-slide presentation about...".`, model: 'design-agent', actions: [] };
  }
}

// --- Search Agent ---

export class SearchAgent extends BaseAgent {
  constructor() {
    super('search', 'Search across all user documents using RAG');

    this.registerTool({
      name: 'search_documents',
      description: 'Semantic search across all documents',
      parameters: {
        query: { type: 'string', description: 'Search query', required: true },
      },
      execute: async (params) => {
        try {
          const response = await apiClient<{ results: any[] }>('/api/ebot/search', {
            method: 'POST',
            body: JSON.stringify({ query: params.query }),
          });
          return response.results;
        } catch {
          return [];
        }
      },
    });
  }

  async process(input: string): Promise<AgentResult> {
    const searchTool = this.tools.find(t => t.name === 'search_documents');
    if (searchTool) {
      const results = await searchTool.execute({ query: input });
      if (results.length > 0) {
        const response = results.map((r: any, i: number) => `${i + 1}. **${r.title}** (${r.appType})\n   ${r.snippet}`).join('\n\n');
        return { response: `Found ${results.length} relevant documents:\n\n${response}`, model: 'search-agent', actions: [{ tool: 'search_documents', params: { query: input }, result: results }] };
      }
    }
    return { response: 'No documents found matching your query. Try indexing your documents first or using different search terms.', model: 'search-agent', actions: [] };
  }
}

// --- Automation Agent ---

export class AutomationAgent extends BaseAgent {
  constructor() {
    super('automation', 'Macro generation, workflow automation');

    this.registerTool({
      name: 'create_task',
      description: 'Create a task in ePlanner',
      parameters: {
        board_id: { type: 'string', description: 'Board ID' },
        title: { type: 'string', description: 'Task title', required: true },
        details: { type: 'string', description: 'Task details' },
      },
      execute: async (params) => {
        return { success: true, message: `Task "${params.title}" created` };
      },
    });

    this.registerTool({
      name: 'send_email',
      description: 'Send an email',
      parameters: {
        to: { type: 'string', description: 'Recipient email', required: true },
        subject: { type: 'string', description: 'Email subject', required: true },
        body: { type: 'string', description: 'Email body', required: true },
      },
      execute: async (params) => {
        return { success: true, message: `Email to ${params.to} queued` };
      },
    });
  }

  async process(input: string): Promise<AgentResult> {
    try {
      const response = await apiClient<{ tasks: any[]; response: string }>('/api/ebot/task-extract', {
        method: 'POST',
        body: JSON.stringify({ text: input }),
      });
      return {
        response: `Identified tasks:\n${response.tasks?.map((t: any) => `• [${t.priority}] ${t.task}`).join('\n') || response.response}`,
        model: 'automation-agent',
        actions: [],
      };
    } catch {
      return { response: 'Automation Agent: I can help automate workflows, create macros, and extract tasks. Try describing what you want to automate.', model: 'automation-agent-fallback', actions: [] };
    }
  }
}

// --- Factory ---

export function createAgentOrchestrator(): OrchestratorAgent {
  const orchestrator = new OrchestratorAgent();
  orchestrator.registerSpecialist(new WritingAgent());
  orchestrator.registerSpecialist(new DataAgent());
  orchestrator.registerSpecialist(new DesignAgent());
  orchestrator.registerSpecialist(new SearchAgent());
  orchestrator.registerSpecialist(new AutomationAgent());
  return orchestrator;
}
