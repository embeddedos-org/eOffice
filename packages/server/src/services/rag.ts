import os from 'os';
import path from 'path';
import fs from 'fs';
import { FileStore } from '../storage/store';

interface DocumentIndex {
  id: string;
  docId: string;
  appType: string;
  title: string;
  content: string;
  tokens: string[];
  tfidf: Map<string, number>;
  updatedAt: number;
}

interface SearchResult {
  docId: string;
  appType: string;
  title: string;
  snippet: string;
  score: number;
}

const INDEX_DIR = path.join(os.homedir(), '.eoffice', 'data', 'embeddings');
const store = new FileStore<Omit<DocumentIndex, 'tfidf'> & { tfidf: Record<string, number> }>(INDEX_DIR);

// Stopwords for TF-IDF
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'this', 'that', 'these', 'those', 'it', 'its', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'he', 'she', 'him', 'her', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how',
  'not', 'no', 'nor', 'if', 'then', 'else', 'so', 'as', 'just', 'about',
]);

export class RAGService {
  private documentCount = 0;

  constructor() {
    fs.mkdirSync(INDEX_DIR, { recursive: true });
    this.documentCount = store.list().length;
  }

  // Tokenize and normalize text
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/<[^>]*>/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOPWORDS.has(word));
  }

  // Compute term frequency
  private computeTF(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    // Normalize by document length
    for (const [term, count] of tf) {
      tf.set(term, count / tokens.length);
    }
    return tf;
  }

  // Index a document
  indexDocument(docId: string, appType: string, title: string, content: string): void {
    const tokens = this.tokenize(`${title} ${content}`);
    const tfidf = this.computeTF(tokens);

    store.set(docId, {
      id: docId,
      docId,
      appType,
      title,
      content: content.substring(0, 5000),
      tokens,
      tfidf: Object.fromEntries(tfidf),
      updatedAt: Date.now(),
    });

    this.documentCount = store.list().length;
  }

  // Remove document from index
  removeDocument(docId: string): void {
    store.delete(docId);
    this.documentCount = store.list().length;
  }

  // Search documents using TF-IDF similarity
  search(query: string, limit: number = 10, appType?: string): SearchResult[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const allDocs = store.list();
    const results: SearchResult[] = [];

    for (const doc of allDocs) {
      if (appType && doc.appType !== appType) continue;

      let score = 0;
      const docTfidf = new Map(Object.entries(doc.tfidf));

      for (const qToken of queryTokens) {
        // Exact match
        if (docTfidf.has(qToken)) {
          score += docTfidf.get(qToken)! * 10;
        }
        // Partial match
        for (const [docToken, docScore] of docTfidf) {
          if (docToken.includes(qToken) || qToken.includes(docToken)) {
            score += docScore * 3;
          }
        }
      }

      // Boost for title matches
      const titleLower = doc.title.toLowerCase();
      for (const qToken of queryTokens) {
        if (titleLower.includes(qToken)) {
          score *= 2;
        }
      }

      if (score > 0) {
        // Generate snippet around first match
        const contentLower = doc.content.toLowerCase();
        let snippetStart = 0;
        for (const qToken of queryTokens) {
          const idx = contentLower.indexOf(qToken);
          if (idx > 0) {
            snippetStart = Math.max(0, idx - 50);
            break;
          }
        }
        const snippet = doc.content.substring(snippetStart, snippetStart + 200).replace(/<[^>]*>/g, '').trim();

        results.push({
          docId: doc.docId,
          appType: doc.appType,
          title: doc.title,
          snippet: snippet + (snippet.length < doc.content.length ? '...' : ''),
          score,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  // Get document count
  getStats(): { documentCount: number; indexSizeKB: number } {
    return {
      documentCount: this.documentCount,
      indexSizeKB: Math.round(store.list().reduce((acc, d) => acc + JSON.stringify(d).length, 0) / 1024),
    };
  }

  // Bulk index all documents from a specific store
  async indexFromStore(appType: string, documents: Array<{ id: string; title: string; content: string }>): Promise<number> {
    let indexed = 0;
    for (const doc of documents) {
      this.indexDocument(doc.id, appType, doc.title, doc.content);
      indexed++;
    }
    return indexed;
  }
}

export const ragService = new RAGService();
