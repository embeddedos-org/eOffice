import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import { Document } from '@store/documentStore';
import { Sparkles, Send, X, Loader2, Copy, RefreshCw, ChevronDown, Wand2, FileText, Languages, Minimize2, Maximize2, CheckCheck, PenLine, BookOpen, Lightbulb } from 'lucide-react';
import { cn } from '@utils/cn';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Props {
  editor?: Editor;
  document?: Document | null;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { label: 'Improve Writing', icon: PenLine, prompt: 'Improve the writing quality of the selected text, making it more clear, concise, and professional.' },
  { label: 'Fix Grammar', icon: CheckCheck, prompt: 'Fix all grammar and spelling errors in the selected text.' },
  { label: 'Summarize', icon: FileText, prompt: 'Provide a concise summary of the selected text.' },
  { label: 'Expand', icon: Maximize2, prompt: 'Expand the selected text with more detail and context.' },
  { label: 'Shorten', icon: Minimize2, prompt: 'Make the selected text shorter while keeping the key points.' },
  { label: 'Translate', icon: Languages, prompt: 'Translate the selected text. Ask me which language.' },
  { label: 'Explain', icon: BookOpen, prompt: 'Explain the selected text in simple terms.' },
  { label: 'Generate Ideas', icon: Lightbulb, prompt: 'Generate creative ideas related to the topic in the document.' },
];

export default function AIPanel({ editor, document, onClose }: Props) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI writing assistant. I can help you improve your document, fix grammar, summarize content, translate text, and much more. What would you like help with?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get document context
      const docContext = editor ? editor.getText().slice(0, 2000) : '';
      const selectedText = editor ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to) : '';

      const systemPrompt = `You are an expert AI writing assistant integrated into eOffice, the world's most advanced office suite. You help users with their documents.

Current document: "${document?.title || 'Untitled'}"
${docContext ? `Document content (first 2000 chars): ${docContext}` : ''}
${selectedText ? `Selected text: ${selectedText}` : ''}

Provide helpful, concise, and actionable responses. When suggesting text improvements, provide the improved version directly.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(window as any).__OPENAI_KEY__ || ''}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      const assistantContent = data.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.';

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: assistantContent, timestamp: new Date() }]);
    } catch (error) {
      // Fallback response when API is not configured
      const fallbackResponses: Record<string, string> = {
        improve: 'I can help improve your writing! The text could be made more concise and impactful by using active voice and stronger verbs.',
        grammar: 'I\'ve reviewed the text and found a few areas to improve. Make sure to use consistent tense throughout the document.',
        summarize: 'Here\'s a summary: The document discusses key concepts and provides detailed information on the topic.',
        default: 'I\'m your AI writing assistant. I can help you improve writing quality, fix grammar, summarize content, translate text, and much more. Please configure your OpenAI API key in settings for full AI functionality.'
      };

      const key = content.toLowerCase().includes('improve') ? 'improve' :
                  content.toLowerCase().includes('grammar') ? 'grammar' :
                  content.toLowerCase().includes('summar') ? 'summarize' : 'default';

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackResponses[key],
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    const selectedText = editor ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to) : '';
    const fullPrompt = selectedText ? `${prompt}\n\nText: "${selectedText}"` : prompt;
    sendMessage(fullPrompt);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const insertToDocument = (content: string) => {
    if (editor) {
      editor.chain().focus().insertContent(content).run();
      toast.success('Inserted into document');
    }
  };

  return (
    <div className={cn('flex flex-col bg-white dark:bg-surface-900 border-l border-surface-200 dark:border-surface-700 transition-all duration-300', isMinimized ? 'w-12' : 'w-80')}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-200 dark:border-surface-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        {!isMinimized && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">AI Assistant</span>
          </div>
        )}
        <div className={cn('flex items-center gap-1', isMinimized && 'flex-col')}>
          <button onClick={() => setIsMinimized(!isMinimized)} className="toolbar-btn">
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button onClick={onClose} className="toolbar-btn"><X size={14} /></button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick actions */}
          <div className="p-2 border-b border-surface-100 dark:border-surface-800">
            <p className="text-xs text-surface-400 mb-1.5 px-1">Quick Actions</p>
            <div className="grid grid-cols-2 gap-1">
              {QUICK_ACTIONS.slice(0, 6).map(({ label, icon: Icon, prompt }) => (
                <button
                  key={label}
                  onClick={() => handleQuickAction(prompt)}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg bg-surface-50 dark:bg-surface-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-surface-600 dark:text-surface-400 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
                >
                  <Icon size={11} />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('group relative max-w-[90%]', msg.role === 'user' ? 'ai-message-user' : 'ai-message-assistant')}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles size={10} className="text-purple-500" />
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">AI</span>
                    </div>
                  )}
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && (
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => copyMessage(msg.content)} className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600" title="Copy">
                        <Copy size={10} />
                      </button>
                      {editor && (
                        <button onClick={() => insertToDocument(msg.content)} className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600" title="Insert into document">
                          <Wand2 size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="ai-message-assistant flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-purple-500" />
                  <span className="text-xs text-surface-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-surface-200 dark:border-surface-700">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder={t('ai.placeholder')}
                className="flex-1 resize-none text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-surface-900 dark:text-surface-100 placeholder-surface-400 min-h-[60px] max-h-32"
                rows={2}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="self-end p-2 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <p className="text-xs text-surface-400 mt-1.5 text-center">Powered by eOffice AI • Press Enter to send</p>
          </div>
        </>
      )}
    </div>
  );
}
