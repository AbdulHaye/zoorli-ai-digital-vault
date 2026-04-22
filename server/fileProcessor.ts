import { textExtractionService } from './textExtraction';
import { embeddingsService, TextChunk } from './embeddingsService';
import { vectorDatabase } from './vectorDatabase';
import { storage } from './storage';
import fs from 'fs';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';

export interface ProcessingResult {
  success: boolean;
  fileId: string;
  extractedTextLength?: number;
  chunkCount?: number;
  embeddingCount?: number;
  error?: string;
  metadata?: {
    extractionMethod?: string;
    confidence?: number;
    embeddingModel?: string;
    processingTime?: number;
  };
}

export interface FileProcessingStatus {
  fileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stage: 'text_extraction' | 'chunking' | 'embedding' | 'indexing' | 'complete';
  progress: number; // 0-100
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

/**
 * File processing service that handles text extraction, chunking, and embedding generation
 * for uploaded files to enable RAG functionality
 */
export class FileProcessor {
  private static instance: FileProcessor;
  private processingQueue: Map<string, FileProcessingStatus> = new Map();
  private readonly CHUNK_SIZE = 400; // Words per chunk
  private readonly CHUNK_OVERLAP = 100; // Overlap between chunks

  private constructor() {}

  public static getInstance(): FileProcessor {
    if (!FileProcessor.instance) {
      FileProcessor.instance = new FileProcessor();
    }
    return FileProcessor.instance;
  }

  /**
   * Process a file asynchronously: extract text, create chunks, generate embeddings
   */
  async processFile(fileId: string, userId: string, filePath: string, mimeType: string): Promise<void> {
    const startTime = new Date();
    console.log(`Starting file processing for ${fileId}`);
    
    // Initialize processing status
    this.processingQueue.set(fileId, {
      fileId,
      status: 'processing',
      stage: 'text_extraction',
      progress: 0,
      startTime
    });

    try {
      // Update file embedding status
      await storage.updateFile(fileId, { 
        embeddingStatus: 'processing' 
      });

      // Stage 1: Text Extraction (0-30%)
      const extractedText = await this.extractTextFromFile(fileId, filePath, mimeType);
      this.updateProgress(fileId, 'chunking', 30);

      if (!extractedText.content || extractedText.content.trim().length === 0) {
        throw new Error('No text content could be extracted from this file');
      }

      const docLabel = await this.generateDocumentLabel(extractedText.content);
      console.log(`Document labeled as: ${docLabel.documentType} - ${docLabel.label}`);

      const labeledContent = docLabel.label 
        ? extractedText.content 
        : extractedText.content;

      const textChunks = await this.createTextChunks(fileId, userId, labeledContent);
      this.updateProgress(fileId, 'chunking', 35);

      if (docLabel.label) {
        const chunkPrefix = `[${docLabel.documentType} - ${docLabel.label}] `;
        for (const chunk of textChunks) {
          chunk.content = chunkPrefix + chunk.content;
        }
      }

      const summaryChunk: TextChunk = {
        id: `${fileId}-chunk-summary`,
        content: docLabel.summary,
        fileId,
        userId,
        chunkIndex: -1,
        metadata: {
          wordCount: docLabel.summary.split(/\s+/).length,
          startPosition: 0,
          endPosition: 0
        }
      };
      textChunks.unshift(summaryChunk);

      for (let i = 0; i < textChunks.length; i++) {
        textChunks[i].chunkIndex = i;
      }
      this.updateProgress(fileId, 'embedding', 50);

      if (textChunks.length === 0) {
        throw new Error('No text chunks could be created from the extracted content');
      }

      // Stage 3: Generate Embeddings (50-80%)
      const embeddings = await this.generateEmbeddings(textChunks);
      this.updateProgress(fileId, 'indexing', 80);

      // Stage 4: Store in Vector Database (80-100%)
      await this.storeChunksAndEmbeddings(textChunks, embeddings, userId);
      
      // Final update: mark as completed
      await this.completeProcessing(fileId, extractedText, textChunks.length, embeddings.length);
      
      const endTime = new Date();
      const processingTime = endTime.getTime() - startTime.getTime();
      
      console.log(`File processing completed for ${fileId} in ${processingTime}ms`);
      console.log(`- Extracted ${extractedText.content.length} characters`);
      console.log(`- Created ${textChunks.length} text chunks`);
      console.log(`- Generated ${embeddings.length} embeddings`);

    } catch (error) {
      console.error(`File processing failed for ${fileId}:`, error);
      await this.handleProcessingError(fileId, error);
    }
  }

  /**
   * Extract text content from file
   */
  private async extractTextFromFile(fileId: string, filePath: string, mimeType: string) {
    let tempFilePath: string | null = null;
    
    try {
      console.log(`Extracting text from ${filePath} (${mimeType})`);
      
      // Check if this is an object storage path and needs to be downloaded locally
      // Relative paths like "users/userId/filename" need to be downloaded from object storage
      // Absolute local paths like "/tmp/filename" can be read directly
      if (filePath.startsWith('/objects/') || 
          filePath.includes('googleapis.com') || 
          filePath.includes('storage') ||
          filePath.startsWith('users/') ||
          (!filePath.startsWith('/') && !filePath.startsWith('\\') && !filePath.match(/^[A-Za-z]:/))) {
        // This is an object storage path - we need to download it to a temp file
        tempFilePath = await this.downloadToTempFile(filePath, fileId, mimeType);
        console.log(`Downloaded file from object storage to temp path: ${tempFilePath}`);
      } else {
        // Assume it's already a local file path (absolute path)
        tempFilePath = filePath;
      }
      
      const extractedText = await textExtractionService.extractText(tempFilePath, mimeType);
      
      await storage.updateFile(fileId, {
        extractedText: ''
      });

      return extractedText;
    } catch (error) {
      console.error(`Text extraction failed for ${fileId}:`, error);
      throw new Error(`Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up temp file if we created one
      if (tempFilePath && tempFilePath !== filePath) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`Cleaned up temp file: ${tempFilePath}`);
        } catch (cleanupError) {
          console.warn(`Failed to clean up temp file ${tempFilePath}:`, cleanupError);
        }
      }
    }
  }

  /**
   * Get file extension from MIME type for proper file type detection
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExtension: Record<string, string> = {
      // PowerPoint files (the main focus of this fix)
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'application/vnd.ms-powerpoint': '.ppt',
      
      // Other Office documents
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-word': '.doc',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-excel': '.xls',
      
      // PDF and text
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'text/csv': '.csv',
      'text/html': '.html',
      'text/markdown': '.md',
      'application/json': '.json',
      'text/xml': '.xml',
      
      // Images
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff'
    };
    
    return mimeToExtension[mimeType] || '';
  }

  /**
   * Download object storage file to local temp file for processing
   */
  private async downloadToTempFile(storagePath: string, fileId: string, mimeType: string): Promise<string> {
    const { SupabaseStorageService } = await import('./supabaseService');
    const supabaseStorage = new SupabaseStorageService();
    
    try {
      console.log(`Downloading file from Supabase Storage path: ${storagePath}`);
      
      // Get file extension from MIME type for proper file type detection
      const extension = this.getExtensionFromMimeType(mimeType);
      console.log(`Using extension '${extension}' for MIME type: ${mimeType}`);
      
      // Create temp file path with correct extension (use os.tmpdir() for cross-platform support)
      const tempDir = os.tmpdir();
      const tempFileName = `file_${fileId}_${Date.now()}${extension}`;
      const tempFilePath = path.join(tempDir, tempFileName);
      
      const encryptedBuffer = await supabaseStorage.downloadFile(storagePath);
      console.log(`Downloaded encrypted file buffer of size: ${encryptedBuffer.length} bytes`);
      
      const { decryptBuffer } = await import('./encryption');
      const fileBuffer = decryptBuffer(encryptedBuffer);
      console.log(`Decrypted file buffer to size: ${fileBuffer.length} bytes`);
      
      fs.writeFileSync(tempFilePath, fileBuffer);
      console.log(`Written file to temp path: ${tempFilePath}`);
      
      // Verify the written file for debugging
      const writtenSize = fs.statSync(tempFilePath).size;
      console.log(`File verification: downloaded=${fileBuffer.length} bytes, written=${writtenSize} bytes, match=${fileBuffer.length === writtenSize}`);
      
      return tempFilePath;
    } catch (error) {
      console.error(`Failed to download file from Supabase Storage ${storagePath}:`, error);
      throw new Error(`Failed to download file for processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create text chunks from extracted content
   */
  private async createTextChunks(fileId: string, userId: string, content: string): Promise<TextChunk[]> {
    if (!content || content.trim().length === 0) {
      console.warn(`No content to chunk for file ${fileId}`);
      return [];
    }

    try {
      const chunks = embeddingsService.createTextChunks(content, fileId, userId, this.CHUNK_SIZE, this.CHUNK_OVERLAP);

      console.log(`Created ${chunks.length} chunks for file ${fileId}`);
      return chunks;
    } catch (error) {
      console.error(`Chunking failed for ${fileId}:`, error);
      throw new Error(`Text chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for text chunks
   */
  private async generateEmbeddings(chunks: TextChunk[]) {
    if (!embeddingsService.isAvailable()) {
      throw new Error('Embeddings service not available - OpenAI API key not configured');
    }

    if (chunks.length === 0) {
      console.warn('No chunks to embed');
      return [];
    }

    try {
      const embeddings = await embeddingsService.generateEmbeddings(chunks);
      console.log(`Generated ${embeddings.length} embeddings`);
      
      // Validate that we got embeddings for all chunks
      if (embeddings.length !== chunks.length) {
        throw new Error(`Embedding generation incomplete: Expected ${chunks.length} embeddings, got ${embeddings.length}`);
      }
      
      return embeddings;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store text chunks and embeddings in database and vector store
   */
  private async storeChunksAndEmbeddings(chunks: TextChunk[], embeddings: any[], userId: string) {
    try {
      // Merge embeddings back into chunks and add required userId
      const chunksWithEmbeddings = chunks.map(chunk => {
        const embedding = embeddings.find(e => e.chunkId === chunk.id);
        return {
          ...chunk,
          userId: userId, // Add required userId field
          embedding: embedding?.embedding || null
        };
      });

      // Store chunks in database (via storage interface)
      await storage.addTextChunks(chunksWithEmbeddings);

      // Store in vector database for fast search
      await vectorDatabase.addChunks(chunksWithEmbeddings);

      console.log(`Stored ${chunksWithEmbeddings.length} chunks in database and vector store`);
    } catch (error) {
      console.error('Failed to store chunks and embeddings:', error);
      throw new Error(`Storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Complete processing and update file status
   */
  private async completeProcessing(
    fileId: string, 
    extractedText: any, 
    chunkCount: number, 
    embeddingCount: number
  ) {
    const modelInfo = embeddingsService.getModelInfo();
    
    const embeddingMetadata = {
      model: modelInfo.model,
      dimension: modelInfo.dimension,
      chunkCount,
      embeddingCount,
      chunkSize: this.CHUNK_SIZE,
      chunkOverlap: this.CHUNK_OVERLAP,
      extractionMethod: extractedText.metadata?.extractionMethod || 'unknown'
    };

    // Update file status
    await storage.updateFile(fileId, {
      embeddingStatus: 'completed'
    });

    // Update processing queue
    this.processingQueue.set(fileId, {
      fileId,
      status: 'completed',
      stage: 'complete',
      progress: 100,
      endTime: new Date()
    });
  }

  /**
   * Handle processing errors
   */
  private async handleProcessingError(fileId: string, error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    
    try {
      await storage.updateFile(fileId, {
        embeddingStatus: 'failed'
      });
    } catch (updateError) {
      console.error(`Failed to update file status for ${fileId}:`, updateError);
    }

    this.processingQueue.set(fileId, {
      fileId,
      status: 'failed',
      stage: 'text_extraction',
      progress: 0,
      error: errorMessage,
      endTime: new Date()
    });
  }

  /**
   * Update processing progress
   */
  private updateProgress(fileId: string, stage: FileProcessingStatus['stage'], progress: number) {
    const current = this.processingQueue.get(fileId);
    if (current) {
      this.processingQueue.set(fileId, {
        ...current,
        stage,
        progress
      });
    }
  }

  /**
   * Get processing status for a file
   */
  getProcessingStatus(fileId: string): FileProcessingStatus | null {
    return this.processingQueue.get(fileId) || null;
  }

  /**
   * Remove file from processing and clean up its chunks
   */
  async removeFileProcessing(fileId: string): Promise<void> {
    console.log(`Removing processing data for file ${fileId}`);
    
    try {
      // Remove from vector database
      await vectorDatabase.removeFileChunks(fileId);
      
      // Remove chunks from storage (TODO: implement this method in storage)
      // await storage.removeTextChunksByFileId(fileId);
      
      // Remove from processing queue
      this.processingQueue.delete(fileId);
      
      console.log(`Successfully removed processing data for file ${fileId}`);
    } catch (error) {
      console.error(`Failed to remove processing data for ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Reprocess a file (useful for failed processing or when changing processing parameters)
   */
  async reprocessFile(fileId: string, userId: string): Promise<void> {
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }

    if (file.userId !== userId) {
      throw new Error(`Access denied for file ${fileId}`);
    }

    console.log(`Reprocessing file ${fileId}: ${file.filename}`);
    
    // Clean up existing processing data
    await this.removeFileProcessing(fileId);
    
    // Start fresh processing
    // Note: In a real implementation, we'd need to get the actual file path
    // For now, we'll use the storage path from the file record
    const filePath = file.storagePath;
    await this.processFile(fileId, userId, filePath, file.fileType);
  }

  private async generateDocumentLabel(content: string): Promise<{ documentType: string; label: string; summary: string }> {
    try {
      const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
      
      if (!openai) {
        console.warn('OpenAI not available for document labeling');
        const preview = content.substring(0, 500).trim();
        return {
          documentType: 'Document',
          label: '',
          summary: `[Document] ${preview}`
        };
      }

      const sampleText = content.split(/\s+/).slice(0, 2000).join(' ');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a document classifier. Analyze the document text and output a JSON object with exactly these fields:
- "documentType": one of: CV, Resume, ID Card, Passport, Invoice, Receipt, Contract, Agreement, Bank Statement, Medical Report, Letter, Report, Spreadsheet, Presentation, Certificate, License, Form, General Document
- "label": the primary subject/person/entity (e.g., "John Doe", "ABC Company", "Invoice #12345"). Keep it short (1-5 words).
- "summary": a structured summary with key information extracted. Format: "[Document Type: X | Subject: Y | Key Info: field1=value1, field2=value2, ...]". Include ALL extractable personal info: names, emails, phones, addresses, dates, numbers, amounts, skills, etc.

Output ONLY the JSON object, no markdown formatting.`
          },
          {
            role: 'user',
            content: sampleText
          }
        ],
        max_tokens: 500,
        temperature: 0
      });

      const responseText = response.choices[0]?.message?.content || '';
      
      try {
        const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
          documentType: parsed.documentType || 'Document',
          label: parsed.label || '',
          summary: parsed.summary || `[${parsed.documentType || 'Document'}] ${sampleText.substring(0, 300)}`
        };
      } catch (parseError) {
        console.warn('Failed to parse document label response:', responseText);
        return {
          documentType: 'Document',
          label: '',
          summary: `[Document] ${sampleText.substring(0, 300)}`
        };
      }
    } catch (error) {
      console.warn('Document labeling failed, continuing without label:', error);
      const preview = content.substring(0, 500).trim();
      return {
        documentType: 'Document',
        label: '',
        summary: `[Document] ${preview}`
      };
    }
  }

  getProcessingStats() {
    const statuses = Array.from(this.processingQueue.values());
    return {
      total: statuses.length,
      processing: statuses.filter(s => s.status === 'processing').length,
      completed: statuses.filter(s => s.status === 'completed').length,
      failed: statuses.filter(s => s.status === 'failed').length,
      pending: statuses.filter(s => s.status === 'pending').length
    };
  }

  /**
   * Check if a file type is supported for text extraction
   */
  isFileTypeSupported(mimeType: string): boolean {
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel (.xlsx)
      'application/vnd.ms-excel', // Excel (.xls)
      'application/vnd.ms-powerpoint', // PowerPoint (.ppt)
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PowerPoint (.pptx)
      'text/html',
      'text/plain',
      'text/csv',
      'application/json',
      'text/xml',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ];
    
    return supportedTypes.includes(mimeType) || mimeType.startsWith('text/');
  }
}

// Export singleton instance
export const fileProcessor = FileProcessor.getInstance();