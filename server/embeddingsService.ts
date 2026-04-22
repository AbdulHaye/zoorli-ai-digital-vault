import OpenAI from 'openai';

export interface TextChunk {
  id: string;
  content: string;
  fileId: string;
  userId: string; // Added for security: track which user owns this chunk
  chunkIndex: number;
  embedding?: number[];
  metadata?: {
    startPosition?: number;
    endPosition?: number;
    wordCount?: number;
  };
}

export interface EmbeddingResult {
  chunkId: string;
  embedding: number[];
  tokens: number;
}

export class EmbeddingsService {
  private static instance: EmbeddingsService;
  private openai: OpenAI | null;
  private readonly EMBEDDING_MODEL = 'text-embedding-3-small'; // Updated to use latest model as requested
  private readonly MAX_TOKENS_PER_REQUEST = 8191; // Maximum context length for text-embedding-3-small
  private readonly EMBEDDING_DIMENSION = 1536; // Dimension for text-embedding-3-small

  private constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null;
  }

  public static getInstance(): EmbeddingsService {
    if (!EmbeddingsService.instance) {
      EmbeddingsService.instance = new EmbeddingsService();
    }
    return EmbeddingsService.instance;
  }

  /**
   * Check if embeddings service is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Generate embeddings for text chunks
   */
  async generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingResult[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured - embeddings service unavailable');
    }

    if (chunks.length === 0) {
      return [];
    }

    try {
      console.log(`Generating embeddings for ${chunks.length} text chunks`);
      
      // Filter out empty chunks and prepare text for embedding
      const validChunks = chunks.filter(chunk => chunk.content.trim().length > 0);
      const texts = validChunks.map(chunk => chunk.content.trim());

      if (texts.length === 0) {
        console.warn('No valid chunks found for embedding generation');
        return [];
      }

      // Process in batches to avoid API limits
      const results: EmbeddingResult[] = [];
      const batchSize = 100; // OpenAI allows up to 2048 inputs, but we'll be conservative
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchChunks = validChunks.slice(i, i + batchSize);
        
        console.log(`Processing embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
        
        const response = await this.openai.embeddings.create({
          model: this.EMBEDDING_MODEL,
          input: batch,
          encoding_format: 'float'
        });

        // Process results
        response.data.forEach((embedding, index) => {
          const chunk = batchChunks[index];
          results.push({
            chunkId: chunk.id,
            embedding: embedding.embedding,
            tokens: response.usage?.total_tokens || 0
          });
        });

        // Add small delay between batches to be API-friendly
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`Successfully generated ${results.length} embeddings`);
      return results;

    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embedding for a single query text
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured - embeddings service unavailable');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: query.trim(),
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Query embedding generation failed:', error);
      throw new Error(`Failed to generate query embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vector dimensions must match for cosine similarity calculation');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    // Handle zero vectors
    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar chunks to a query
   */
  findSimilarChunks(
    queryEmbedding: number[], 
    chunks: TextChunk[], 
    topK: number = 10,
    threshold: number = 0.7
  ): Array<{ chunk: TextChunk; similarity: number }> {
    const similarities = chunks
      .filter(chunk => chunk.embedding && chunk.embedding.length > 0)
      .map(chunk => ({
        chunk,
        similarity: this.calculateCosineSimilarity(queryEmbedding, chunk.embedding!)
      }))
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    console.log(`Found ${similarities.length} similar chunks above threshold ${threshold}`);
    return similarities;
  }

  /**
   * Create text chunks from extracted content
   */
  createTextChunks(
    content: string, 
    fileId: string, 
    userId: string, // Added userId for security
    maxTokens: number = 500, 
    overlapTokens: number = 100
  ): TextChunk[] {
    // Convert tokens to approximate word count (1 token ≈ 0.75 words)
    const maxWords = Math.floor(maxTokens * 0.75); // ~375 words for 500 tokens
    const overlapWords = Math.floor(overlapTokens * 0.75); // ~75 words for 100 tokens
    
    const words = content.split(/\s+/).filter(word => word.trim().length > 0);
    const chunks: TextChunk[] = [];
    let chunkIndex = 0;

    for (let i = 0; i < words.length; i += maxWords - overlapWords) {
      const chunkWords = words.slice(i, i + maxWords);
      const chunkContent = chunkWords.join(' ');
      
      if (chunkContent.trim().length > 0) {
        chunks.push({
          id: `${fileId}-chunk-${chunkIndex}`,
          content: chunkContent,
          fileId,
          userId, // Include userId for security filtering
          chunkIndex,
          metadata: {
            startPosition: i,
            endPosition: i + chunkWords.length,
            wordCount: chunkWords.length
          }
        });
        chunkIndex++;
      }
      
      // Break if we've reached the end
      if (i + maxWords >= words.length) break;
    }

    console.log(`Created ${chunks.length} text chunks for file ${fileId} (~${maxTokens} tokens each)`);
    return chunks;
  }

  /**
   * Get embedding model information
   */
  getModelInfo() {
    return {
      model: this.EMBEDDING_MODEL,
      dimension: this.EMBEDDING_DIMENSION,
      maxTokens: this.MAX_TOKENS_PER_REQUEST
    };
  }
}

// Export singleton instance
export const embeddingsService = EmbeddingsService.getInstance();