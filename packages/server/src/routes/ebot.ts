import { Router, Request, Response } from 'express';
import { aiService } from '../services/ai-service';
import { ragService } from '../services/rag';
import { AuthRequest } from '../middleware/auth';


export const ebotRouter = Router();

// POST /api/ebot/chat — Main chat endpoint
ebotRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, messages, context } = req.body;
    const user = (req as AuthRequest).user;

    const chatMessages = messages || [
      { role: 'system' as const, content: `You are eBot, an AI assistant for the eOffice productivity suite. You help with documents, spreadsheets, presentations, email, and more. The current user is ${user?.username || 'unknown'}.` },
      ...(context ? [{ role: 'system' as const, content: `Context: ${context}` }] : []),
      { role: 'user' as const, content: message },
    ];

    const response = await aiService.chat(chatMessages);
    res.json({
      response: response.content,
      model: response.model,
      usage: response.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('eBot chat error:', message);
    res.status(500).json({ error: 'Chat failed', details: message });
  }
});

// POST /api/ebot/complete — Text completion/autocomplete
ebotRouter.post('/complete', async (req: Request, res: Response) => {
  try {
    const { text, context } = req.body;
    const result = await aiService.smartCompose(context || '', text);
    res.json({ completion: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Completion failed', details: message });
  }
});

// POST /api/ebot/summarize — Summarize text
ebotRouter.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) { res.status(400).json({ error: 'text is required' }); return; }
    const summary = await aiService.summarize(text);
    res.json({ summary, response: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Summarization failed', details: message });
  }
});

// POST /api/ebot/rewrite — Rewrite text in different styles
ebotRouter.post('/rewrite', async (req: Request, res: Response) => {
  try {
    const { text, style } = req.body;
    if (!text) { res.status(400).json({ error: 'text is required' }); return; }
    const result = await aiService.rewrite(text, style || 'professional');
    res.json({ result, response: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Rewrite failed', details: message });
  }
});

// POST /api/ebot/grammar — Grammar check
ebotRouter.post('/grammar', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) { res.status(400).json({ error: 'text is required' }); return; }
    const result = await aiService.grammarCheck(text);
    res.json({ corrections: result, response: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Grammar check failed', details: message });
  }
});

// POST /api/ebot/translate — Translate text
ebotRouter.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text) { res.status(400).json({ error: 'text is required' }); return; }
    const result = await aiService.translate(text, targetLanguage || 'Spanish');
    res.json({ translation: result, response: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Translation failed', details: message });
  }
});

// POST /api/ebot/formula — Generate spreadsheet formulas from natural language
ebotRouter.post('/formula', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    if (!description) { res.status(400).json({ error: 'description is required' }); return; }
    const formula = await aiService.generateFormula(description);
    res.json({ formula, response: formula });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Formula generation failed', details: message });
  }
});

// POST /api/ebot/slides — Generate presentation slides from topic
ebotRouter.post('/slides', async (req: Request, res: Response) => {
  try {
    const { topic, numSlides } = req.body;
    if (!topic) { res.status(400).json({ error: 'topic is required' }); return; }
    const slides = await aiService.generateSlides(topic, numSlides || 5);
    res.json({ slides, response: JSON.stringify(slides) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Slide generation failed', details: message });
  }
});

// POST /api/ebot/analyze — Analyze spreadsheet data
ebotRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { data, question } = req.body;
    if (!data || !question) { res.status(400).json({ error: 'data and question are required' }); return; }
    const analysis = await aiService.analyzeData(data, question);
    res.json({ analysis, response: analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Analysis failed', details: message });
  }
});

// POST /api/ebot/task-extract — Extract tasks from text
ebotRouter.post('/task-extract', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) { res.status(400).json({ error: 'text is required' }); return; }

    const response = await aiService.chat([
      { role: 'system', content: 'Extract actionable tasks from the following text. List each task with its priority (high/medium/low). Format as JSON array of {task, priority}.' },
      { role: 'user', content: text },
    ]);

    let tasks: Array<{ task: string; priority: string }> = [];
    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) tasks = JSON.parse(jsonMatch[0]);
    } catch {
      tasks = [{ task: response.content, priority: 'medium' }];
    }

    res.json({ tasks, response: response.content });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Task extraction failed', details: message });
  }
});

// POST /api/ebot/search — Semantic search across documents (RAG)
ebotRouter.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, appType, limit } = req.body;
    if (!query) { res.status(400).json({ error: 'query is required' }); return; }
    const results = ragService.search(query, limit || 10, appType);
    const stats = ragService.getStats();
    res.json({
      results,
      stats,
      response: results.length > 0
        ? `Found ${results.length} results for "${query}"`
        : `No results found for "${query}". ${stats.documentCount} documents indexed.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Search failed', details: message });
  }
});

// POST /api/ebot/index — Index a document for RAG search
ebotRouter.post('/index', async (req: Request, res: Response) => {
  try {
    const { docId, appType, title, content } = req.body;
    if (!docId || !appType || !title) {
      res.status(400).json({ error: 'docId, appType, and title are required' });
      return;
    }
    ragService.indexDocument(docId, appType, title, content || '');
    res.json({ status: 'indexed', docId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Indexing failed', details: message });
  }
});

// GET /api/ebot/status — AI service status
ebotRouter.get('/status', async (_req: Request, res: Response) => {
  const providers = aiService.getProviderStatus();
  res.json({
    status: 'ok',
    providers,
    activeProvider: aiService.getActiveProvider(),
    features: [
      'chat', 'summarize', 'rewrite', 'grammar', 'translate',
      'formula', 'slides', 'analyze', 'task-extract', 'complete', 'search',
    ],
    rag: ragService.getStats(),
  });
});

// GET /api/ebot/models — Available models
ebotRouter.get('/models', (_req: Request, res: Response) => {
  const providers = aiService.getProviderStatus();
  const models = providers
    .filter(p => p.available)
    .map(p => p.name);
  res.json({ models, activeProvider: aiService.getActiveProvider() });
});

// POST /api/ebot/reset — Reset conversation context
ebotRouter.post('/reset', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Conversation reset' });
});
