import { TextChunk } from './embeddingsService';
import { embeddingsService } from './embeddingsService';

export interface VectorSearchResult {
  chunk: TextChunk;
  similarity: number;
  relevanceScore: number; // Combined vector + keyword score
}

export interface SearchQuery {
  text: string;
  embedding?: number[];
  userId?: string; // Added for security: filter chunks by user
  fileIds?: string[];
  limit?: number;
  threshold?: number;
}

export interface VectorDatabaseStats {
  totalChunks: number;
  totalFiles: number;
  avgChunkSize: number;
  storageSize: number; // in bytes (estimated)
}

/**
 * In-memory vector database service for storing and searching text embeddings
 * Designed to be easily replaceable with persistent solutions like PostgreSQL with pgvector
 */
export class VectorDatabase {
  private static instance: VectorDatabase;
  private chunks: Map<string, TextChunk> = new Map(); // chunkId -> TextChunk
  private fileIndex: Map<string, Set<string>> = new Map(); // fileId -> Set of chunkIds
  private keywordIndex: Map<string, Set<string>> = new Map(); // keyword -> Set of chunkIds

  private constructor() {
    // Initialize vector database with existing chunks from persistent storage
    this.initializeFromDatabase().catch(error => {
      console.warn('Failed to initialize vector database from persistent storage:', error);
    });
  }

  public static getInstance(): VectorDatabase {
    if (!VectorDatabase.instance) {
      VectorDatabase.instance = new VectorDatabase();
    }
    return VectorDatabase.instance;
  }

  /**
   * Initialize the in-memory vector database with existing chunks from persistent storage
   */
  private async initializeFromDatabase(): Promise<void> {
    try {
      // Import storage to access persistent database
      const { storage } = await import('./storage');
      
      // Set a timeout for the database query to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database initialization timeout after 10s')), 10000);
      });
      
      // Get all text chunks from the database with timeout
      const existingChunks = await Promise.race([
        storage.getAllTextChunks(),
        timeoutPromise
      ]) as any[];
      
      if (existingChunks && existingChunks.length > 0) {
        console.log(`Initializing vector database with ${existingChunks.length} existing chunks`);
        
        // Convert database chunks to the format expected by vector database
        const vectorChunks = existingChunks.map((chunk: any) => ({
          id: chunk.id,
          fileId: chunk.fileId,
          userId: chunk.userId, // Include userId for security filtering
          content: chunk.content,
          chunkIndex: chunk.chunkIndex || 0,
          tokens: chunk.content.split(' ').length, // Approximate token count
          embedding: chunk.embedding
        }));
        
        // Add chunks to in-memory storage without logging (to avoid spam during init)
        for (const chunk of vectorChunks) {
          this.chunks.set(chunk.id, chunk);
          
          // Update file index
          if (!this.fileIndex.has(chunk.fileId)) {
            this.fileIndex.set(chunk.fileId, new Set());
          }
          this.fileIndex.get(chunk.fileId)!.add(chunk.id);
          
          // Update keyword index for better hybrid search
          this.indexKeywords(chunk);
        }
        
        console.log(`Vector database initialized with ${this.chunks.size} chunks from ${this.fileIndex.size} files`);
      } else {
        console.log('No existing chunks found in database, starting with empty vector database');
      }
    } catch (error) {
      // Don't crash the server if vector database fails to initialize
      console.warn('Failed to initialize vector database from persistent storage:', error);
      console.log('Vector database will start empty - chunks will be loaded on demand');
    }
  }

  /**
   * Add text chunks with embeddings to the database
   */
  async addChunks(chunks: TextChunk[]): Promise<void> {
    console.log(`Adding ${chunks.length} chunks to vector database`);
    
    for (const chunk of chunks) {
      // Store the chunk
      this.chunks.set(chunk.id, chunk);
      
      // Update file index
      if (!this.fileIndex.has(chunk.fileId)) {
        this.fileIndex.set(chunk.fileId, new Set());
      }
      this.fileIndex.get(chunk.fileId)!.add(chunk.id);
      
      // Update keyword index for better hybrid search
      this.indexKeywords(chunk);
    }
    
    console.log(`Vector database now contains ${this.chunks.size} chunks from ${this.fileIndex.size} files`);
  }

  /**
   * Remove all chunks for a specific file
   */
  async removeFileChunks(fileId: string): Promise<void> {
    const chunkIds = this.fileIndex.get(fileId);
    if (!chunkIds) {
      console.warn(`No chunks found for file ${fileId}`);
      return;
    }

    console.log(`Removing ${chunkIds.size} chunks for file ${fileId}`);
    
    // Remove from main chunk storage
    chunkIds.forEach(chunkId => {
      const chunk = this.chunks.get(chunkId);
      if (chunk) {
        this.removeFromKeywordIndex(chunk);
        this.chunks.delete(chunkId);
      }
    });
    
    // Remove from file index
    this.fileIndex.delete(fileId);
    
    console.log(`Removed chunks for file ${fileId}. Database now contains ${this.chunks.size} chunks`);
  }

  /**
   * Search for similar chunks using vector similarity and keyword matching
   */
  async search(query: SearchQuery): Promise<VectorSearchResult[]> {
    const { text, embedding, userId, fileIds, limit = 10, threshold = 0.7 } = query;
    
    if (!embedding && !text) {
      throw new Error('Either embedding or text must be provided for search');
    }

    let queryEmbedding = embedding;
    
    // Generate embedding if not provided
    if (!queryEmbedding && text && embeddingsService.isAvailable()) {
      try {
        queryEmbedding = await embeddingsService.generateQueryEmbedding(text);
      } catch (error) {
        console.warn('Failed to generate query embedding, falling back to keyword search:', error);
      }
    }

    // Get candidate chunks (filter by userId and file if specified)
    let candidateChunks = Array.from(this.chunks.values());
    
    // CRITICAL SECURITY: Always filter by userId if provided
    if (userId) {
      candidateChunks = candidateChunks.filter(chunk => chunk.userId === userId);
    }
    
    if (fileIds && fileIds.length > 0) {
      candidateChunks = candidateChunks.filter(chunk => fileIds.includes(chunk.fileId));
    }

    console.log(`Searching through ${candidateChunks.length} candidate chunks for user ${userId || 'any'}`);

    // Perform vector similarity search if embedding is available
    let vectorResults: Array<{ chunk: TextChunk; similarity: number }> = [];
    
    if (queryEmbedding && candidateChunks.some(chunk => chunk.embedding)) {
      vectorResults = embeddingsService.findSimilarChunks(
        queryEmbedding, 
        candidateChunks.filter(chunk => chunk.embedding),
        Math.min(limit * 2, 50), // Get more candidates for reranking
        threshold * 0.8 // Slightly lower threshold for more candidates
      );
    }

    // Perform keyword search
    const keywordResults = this.performKeywordSearch(text || '', candidateChunks, limit * 2);

    // Combine and rerank results
    const combinedResults = this.combineAndRerankResults(
      vectorResults,
      keywordResults,
      text || '',
      limit
    );

    console.log(`Found ${combinedResults.length} relevant chunks`);
    return combinedResults;
  }

  /**
   * Get chunks for specific files
   */
  getChunksForFiles(fileIds: string[]): TextChunk[] {
    const chunks: TextChunk[] = [];
    
    for (const fileId of fileIds) {
      const chunkIds = this.fileIndex.get(fileId);
      if (chunkIds) {
        chunkIds.forEach(chunkId => {
          const chunk = this.chunks.get(chunkId);
          if (chunk) {
            chunks.push(chunk);
          }
        });
      }
    }
    
    return chunks;
  }

  /**
   * Get database statistics
   */
  getStats(): VectorDatabaseStats {
    const chunks = Array.from(this.chunks.values());
    const totalSize = chunks.reduce((size, chunk) => {
      return size + chunk.content.length + (chunk.embedding ? chunk.embedding.length * 4 : 0); // 4 bytes per float
    }, 0);

    const avgChunkSize = chunks.length > 0 
      ? chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length 
      : 0;

    return {
      totalChunks: this.chunks.size,
      totalFiles: this.fileIndex.size,
      avgChunkSize: Math.round(avgChunkSize),
      storageSize: totalSize
    };
  }

  /**
   * Clear all data from the database
   */
  clear(): void {
    console.log('Clearing vector database');
    this.chunks.clear();
    this.fileIndex.clear();
    this.keywordIndex.clear();
  }

  /**
   * Build keyword index for a chunk
   */
  private indexKeywords(chunk: TextChunk): void {
    const keywords = this.extractKeywords(chunk.content);
    
    keywords.forEach(keyword => {
      if (!this.keywordIndex.has(keyword)) {
        this.keywordIndex.set(keyword, new Set());
      }
      this.keywordIndex.get(keyword)!.add(chunk.id);
    });
  }

  /**
   * Remove chunk from keyword index
   */
  private removeFromKeywordIndex(chunk: TextChunk): void {
    const keywords = this.extractKeywords(chunk.content);
    
    keywords.forEach(keyword => {
      const chunkIds = this.keywordIndex.get(keyword);
      if (chunkIds) {
        chunkIds.delete(chunk.id);
        if (chunkIds.size === 0) {
          this.keywordIndex.delete(keyword);
        }
      }
    });
  }

  /**
   * Extract keywords from text for indexing
   */
  private extractKeywords(text: string): Set<string> {
    const keywords = new Set<string>();
    
    // Convert to lowercase and split into words
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3); // Minimum word length
    
    // Add individual words
    words.forEach(word => {
      keywords.add(word);
    });
    
    // Add 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (phrase.length >= 6) { // Minimum phrase length
        keywords.add(phrase);
      }
    }
    
    return keywords;
  }

  /**
   * Perform keyword-based search
   * Only returns results that match a significant portion of query keywords
   */
  private performKeywordSearch(
    query: string, 
    candidateChunks: TextChunk[], 
    limit: number
  ): Array<{ chunk: TextChunk; score: number }> {
    const queryKeywords = this.extractKeywords(query);
    const chunkScores = new Map<string, number>();
    
    // Extract significant words (non-common words) from the query for stricter matching
    const significantWords = Array.from(queryKeywords).filter(kw => 
      !['the', 'what', 'how', 'where', 'when', 'why', 'who', 'which', 'can', 'you', 
        'tell', 'about', 'please', 'help', 'find', 'show', 'get', 'give', 'know',
        'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might',
        'some', 'any', 'all', 'more', 'most', 'other', 'such', 'into', 'from'].includes(kw)
    );
    
    const minRequiredMatches = Math.max(1, Math.ceil(significantWords.length * 0.3)); // Require 30% of significant words
    
    // Find chunks that match query keywords
    queryKeywords.forEach(keyword => {
      const matchingChunkIds = this.keywordIndex.get(keyword);
      if (matchingChunkIds) {
        matchingChunkIds.forEach(chunkId => {
          const currentScore = chunkScores.get(chunkId) || 0;
          chunkScores.set(chunkId, currentScore + 1);
        });
      }
    });
    
    // Convert to results array and sort by score
    const results: Array<{ chunk: TextChunk; score: number }> = [];
    
    chunkScores.forEach((score, chunkId) => {
      const chunk = this.chunks.get(chunkId);
      if (chunk && candidateChunks.includes(chunk)) {
        const normalizedScore = score / queryKeywords.size;
        
        // Only include results that match enough keywords (at least 60% of significant words)
        // This prevents "Lahore weather" from matching content that only has "weather"
        if (score >= minRequiredMatches || normalizedScore >= 0.2) {
          results.push({ chunk, score: normalizedScore });
        }
      }
    });
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Combine vector and keyword search results with reranking
   */
  private combineAndRerankResults(
    vectorResults: Array<{ chunk: TextChunk; similarity: number }>,
    keywordResults: Array<{ chunk: TextChunk; score: number }>,
    query: string,
    limit: number
  ): VectorSearchResult[] {
    const resultMap = new Map<string, VectorSearchResult>();
    
    // Add vector results
    for (const result of vectorResults) {
      resultMap.set(result.chunk.id, {
        chunk: result.chunk,
        similarity: result.similarity,
        relevanceScore: result.similarity * 0.8 // Weight vector similarity
      });
    }
    
    // Add or enhance with keyword results
    for (const result of keywordResults) {
      const existing = resultMap.get(result.chunk.id);
      if (existing) {
        // Boost relevance score for chunks that match both vector and keyword search
        existing.relevanceScore += result.score * 0.2;
      } else {
        resultMap.set(result.chunk.id, {
          chunk: result.chunk,
          similarity: 0, // No vector similarity available
          relevanceScore: result.score * 0.5 // Lower weight for keyword-only matches
        });
      }
    }
    
    // Sort by combined relevance score and return top results
    return Array.from(resultMap.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }
}

// Export singleton instance
export const vectorDatabase = VectorDatabase.getInstance();