import mammoth from 'mammoth';
import { parse as parseHtml } from 'node-html-parser';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import * as officeParser from 'officeparser';
import PptxParser from 'node-pptx-parser';
import pptx2json from 'pptx2json';
import OpenAI from 'openai';

export interface ExtractedText {
  content: string;
  metadata?: {
    pages?: number;
    wordCount?: number;
    language?: string;
    extractionMethod?: string;
    confidence?: number;
    includesNotes?: boolean;
  };
}

export class TextExtractionService {
  private static instance: TextExtractionService;
  private openai: OpenAI | null;

  private constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null;
  }

  public static getInstance(): TextExtractionService {
    if (!TextExtractionService.instance) {
      TextExtractionService.instance = new TextExtractionService();
    }
    return TextExtractionService.instance;
  }

  async extractText(filePath: string, mimeType: string): Promise<ExtractedText> {
    try {
      console.log(`Extracting text from file: ${path.basename(filePath)} (${mimeType})`);

      switch (mimeType) {
        case 'application/pdf':
          return await this.extractFromPDF(filePath);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractFromDocx(filePath);
        
        case 'text/html':
          return await this.extractFromHTML(filePath);
        
        case 'text/plain':
        case 'application/json':
        case 'text/xml':
          return await this.extractFromText(filePath);
          
        case 'text/csv':
          return await this.extractFromCSV(filePath);
          
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
          return await this.extractFromExcel(filePath);
          
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
          return await this.extractFromPPTX(filePath);
        
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
        case 'image/webp':
        case 'image/bmp':
        case 'image/tiff':
          return await this.extractFromImage(filePath);
        
        case 'application/vnd.ms-powerpoint':
          return await this.extractFromPPTX(filePath);
          
        case 'application/vnd.ms-word':
          return await this.extractFromDocx(filePath);
          
        case 'text/markdown':
          return await this.extractFromText(filePath);
          
        default:
          if (mimeType.startsWith('text/')) {
            console.log(`Attempting text extraction fallback for MIME type: ${mimeType}`);
            return await this.extractFromText(filePath);
          }
          
          console.warn(`Unknown MIME type ${mimeType}, attempting text extraction fallback`);
          try {
            return await this.extractFromText(filePath);
          } catch (fallbackError) {
            throw new Error(`Unsupported file type: ${mimeType}. Text extraction fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
          }
      }
    } catch (error) {
      console.error(`Text extraction failed for ${filePath}:`, error);
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractFromPDF(filePath: string): Promise<ExtractedText> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      const dataBuffer = fs.readFileSync(filePath);
      console.log(`Processing PDF file: ${filePath}, buffer size: ${dataBuffer.length} bytes`);

      const pdfParse = (await import('pdf-parse')).default;
      let pdfData: any;
      try {
        pdfData = await pdfParse(dataBuffer);
      } catch (parseError) {
        console.warn('pdf-parse failed, treating as scanned PDF:', parseError);
        pdfData = { text: '', numpages: 1 };
      }

      const totalPages = pdfData.numpages || 1;
      const digitalText = (pdfData.text || '').trim();
      const wordsPerPage = totalPages > 0 ? digitalText.split(/\s+/).length / totalPages : 0;

      console.log(`PDF has ${totalPages} pages, extracted ${digitalText.length} chars via pdf-parse (${wordsPerPage.toFixed(0)} words/page avg)`);

      if (wordsPerPage >= 20) {
        console.log('PDF has sufficient embedded text — using pdf-parse extraction');
        return {
          content: digitalText,
          metadata: {
            pages: totalPages,
            wordCount: digitalText.split(/\s+/).length,
            extractionMethod: 'pdf-parse',
            confidence: 95
          }
        };
      }

      console.log('PDF appears to be scanned or has minimal text — using OpenAI Vision');

      if (!this.openai) {
        if (digitalText.length > 0) {
          console.warn('OpenAI not available, returning partial pdf-parse text');
          return {
            content: digitalText,
            metadata: {
              pages: totalPages,
              wordCount: digitalText.split(/\s+/).length,
              extractionMethod: 'pdf-parse-partial',
              confidence: 30
            }
          };
        }
        throw new Error('Scanned PDF detected but OpenAI Vision is not available for OCR');
      }

      const allText: string[] = [];
      if (digitalText.length > 50) {
        allText.push(digitalText);
      }

      const pdfBase64 = dataBuffer.toString('base64');
      const maxPages = Math.min(totalPages, 20);

      for (let page = 0; page < maxPages; page++) {
        try {
          console.log(`Processing scanned PDF page ${page + 1}/${maxPages} with Vision...`);
          
          const visionText = await this.callOpenAIVision(
            pdfBase64, 
            `Extract ALL text from page ${page + 1} of this PDF document. Preserve the original structure, formatting, and language. Include every piece of text visible — headers, body text, tables, captions, handwritten notes, stamps, and watermarks. Output only the extracted text, nothing else.`,
            'application/pdf',
            'auto'
          );
          
          if (visionText && visionText.trim().length > 10) {
            allText.push(`--- Page ${page + 1} ---\n${visionText.trim()}`);
          }
          
          if (totalPages <= 1) break;
        } catch (pageError) {
          console.warn(`Vision failed for page ${page + 1}, skipping:`, pageError);
          continue;
        }
        
        if (totalPages <= 1) break;
      }

      if (allText.length === 0) {
        throw new Error('No text could be extracted from PDF (both pdf-parse and Vision failed)');
      }

      const combinedText = allText.join('\n\n');
      console.log(`Successfully extracted ${combinedText.length} chars from ${allText.length} sections of PDF`);

      return {
        content: combinedText,
        metadata: {
          pages: totalPages,
          wordCount: combinedText.split(/\s+/).length,
          extractionMethod: digitalText.length > 50 ? 'pdf-parse+vision' : 'vision',
          confidence: 85
        }
      };

    } catch (error) {
      console.error(`PDF extraction failed for ${filePath}:`, error);
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async isImageLikelyToContainText(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (width === 0 || height === 0) return false;

      const aspectRatio = width / height;
      const isDocumentLike = (aspectRatio >= 0.6 && aspectRatio <= 0.85) || (aspectRatio >= 1.2 && aspectRatio <= 1.7);

      const channelStats = await sharp(buffer)
        .resize(100, 100, { fit: 'cover' })
        .greyscale()
        .stats();

      const stdDev = channelStats.channels[0]?.stdev || 0;
      const hasHighContrast = stdDev > 40;

      if (isDocumentLike) return true;
      if (hasHighContrast && (width > 500 || height > 500)) return true;

      const isSmallImage = width < 200 && height < 200;
      if (isSmallImage) return false;

      return hasHighContrast;
    } catch (error) {
      console.warn('Image text detection heuristic failed, defaulting to Vision call:', error);
      return true;
    }
  }

  private async extractFromImage(filePath: string): Promise<ExtractedText> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI Vision is required for image text extraction but is not configured');
      }

      const imageBuffer = fs.readFileSync(filePath);

      const likelyHasText = await this.isImageLikelyToContainText(imageBuffer);
      if (!likelyHasText) {
        console.log('Image does not appear to contain text — skipping expensive Vision OCR call');
        return {
          content: '[Image without extractable text content]',
          metadata: {
            wordCount: 0,
            extractionMethod: 'skipped-no-text-detected',
            confidence: 70
          }
        };
      }

      const imageBase64 = await this.preprocessImageForVision(imageBuffer, 'image');

      const extractedText = await this.callOpenAIVision(imageBase64, 'Extract ALL text from this image. Preserve the original structure, formatting, and language. Include every piece of text visible — headers, body text, tables, captions, handwritten notes, stamps, labels, and watermarks. If the image contains an ID card, passport, or official document, extract every field including names, numbers, dates, and addresses. Output only the extracted text, nothing else.');

      if (!extractedText || extractedText.trim().length === 0) {
        console.log('Vision found no text in image — returning placeholder instead of retrying');
        return {
          content: '[Image without extractable text content]',
          metadata: {
            wordCount: 0,
            extractionMethod: 'vision-no-text',
            confidence: 85
          }
        };
      }

      return {
        content: extractedText.trim(),
        metadata: {
          wordCount: extractedText.trim().split(/\s+/).length,
          extractionMethod: 'vision',
          confidence: 90
        }
      };
    } catch (error) {
      console.error('Image extraction failed:', error);
      throw new Error(`Image text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async preprocessImageForVision(buffer: Buffer, sourceType: string): Promise<string> {
    try {
      const processed = await sharp(buffer)
        .rotate()
        .resize(2048, 2048, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .normalize()
        .sharpen({ sigma: 1.0 })
        .jpeg({ quality: 85 })
        .toBuffer();

      return processed.toString('base64');
    } catch (error) {
      console.warn('Image preprocessing failed, using raw buffer:', error);
      return buffer.toString('base64');
    }
  }

  private async enhanceImageForRetry(buffer: Buffer): Promise<string> {
    try {
      const enhanced = await sharp(buffer)
        .rotate()
        .resize(3000, 3000, { 
          fit: 'inside',
          withoutEnlargement: false 
        })
        .normalize()
        .sharpen({ sigma: 2.0 })
        .modulate({ brightness: 1.1 })
        .jpeg({ quality: 95 })
        .toBuffer();

      return enhanced.toString('base64');
    } catch (error) {
      console.warn('Image enhancement failed, using basic preprocessing:', error);
      return this.preprocessImageForVision(buffer, 'image');
    }
  }

  private async callOpenAIVision(imageBase64: string, prompt: string, mimeType: string = 'image/jpeg', detail: 'high' | 'low' | 'auto' = 'high'): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI Vision API call failed:', error);
      throw error;
    }
  }

  private async extractFromDocx(filePath: string): Promise<ExtractedText> {
    const result = await mammoth.extractRawText({ path: filePath });
    
    return {
      content: result.value,
      metadata: {
        wordCount: result.value.split(/\s+/).length,
        extractionMethod: 'mammoth'
      }
    };
  }

  private async extractFromHTML(filePath: string): Promise<ExtractedText> {
    const htmlContent = fs.readFileSync(filePath, 'utf-8');
    const root = parseHtml(htmlContent);
    
    root.querySelectorAll('script, style').forEach(el => el.remove());
    
    const textContent = root.text;
    
    return {
      content: textContent,
      metadata: {
        wordCount: textContent.split(/\s+/).length,
        extractionMethod: 'html-parser'
      }
    };
  }

  private async extractFromText(filePath: string): Promise<ExtractedText> {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
        extractionMethod: 'direct-read'
      }
    };
  }

  splitIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
      
      if (i + chunkSize >= words.length) break;
    }
    
    return chunks.length > 0 ? chunks : [text];
  }

  private async extractFromCSV(filePath: string): Promise<ExtractedText> {
    return new Promise((resolve, reject) => {
      const rows: string[] = [];
      let headerRow: string[] = [];
      let isFirstRow = true;
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headers) => {
          headerRow = headers;
        })
        .on('data', (row) => {
          if (isFirstRow) {
            rows.push(`Headers: ${headerRow.join(', ')}`);
            isFirstRow = false;
          }
          
          const rowText = Object.entries(row)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          rows.push(rowText);
        })
        .on('end', () => {
          const content = rows.join('\n');
          resolve({
            content,
            metadata: {
              wordCount: content.split(/\s+/).length,
              extractionMethod: 'csv-parser'
            }
          });
        })
        .on('error', reject);
    });
  }

  private async extractFromExcel(filePath: string): Promise<ExtractedText> {
    const workbook = XLSX.readFile(filePath);
    const allText: string[] = [];
    
    workbook.SheetNames.forEach(sheetName => {
      allText.push(`--- Sheet: ${sheetName} ---`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      jsonData.forEach((row: any, index: number) => {
        if (Array.isArray(row) && row.length > 0) {
          const cleanRow = row.filter(cell => cell !== null && cell !== undefined && cell !== '');
          if (cleanRow.length > 0) {
            if (index === 0) {
              allText.push(`Headers: ${cleanRow.join(', ')}`);
            } else {
              allText.push(`Row ${index}: ${cleanRow.join(', ')}`);
            }
          }
        }
      });
    });
    
    const content = allText.join('\n');
    
    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
        extractionMethod: 'xlsx',
        pages: workbook.SheetNames.length
      }
    };
  }

  private async extractFromPPTXWithPptx2json(filePath: string): Promise<ExtractedText> {
    console.log(`Trying pptx2json extraction for: ${filePath}`);
    
    const result: any = await pptx2json(filePath);
    
    const allText: string[] = [];
    
    if (result && result.slides && Array.isArray(result.slides)) {
      console.log(`pptx2json found ${result.slides.length} slides`);
      
      result.slides.forEach((slide: any, index: number) => {
        const slideTexts: string[] = [];
        
        const extractTextRecursive = (obj: any) => {
          if (!obj) return;
          
          if (typeof obj === 'string') {
            const trimmed = obj.trim();
            if (trimmed) {
              slideTexts.push(trimmed);
            }
            return;
          }
          
          if (obj.text && typeof obj.text === 'string' && obj.text.trim()) {
            slideTexts.push(obj.text.trim());
          }
          
          if (obj.value && typeof obj.value === 'string' && obj.value.trim()) {
            slideTexts.push(obj.value.trim());
          }
          
          if (Array.isArray(obj)) {
            obj.forEach(item => extractTextRecursive(item));
          }
          else if (typeof obj === 'object') {
            Object.values(obj).forEach(value => extractTextRecursive(value));
          }
        };
        
        extractTextRecursive(slide);
        
        if (slideTexts.length > 0) {
          allText.push(`--- Slide ${index + 1} ---`);
          allText.push(slideTexts.join('\n'));
          console.log(`pptx2json extracted ${slideTexts.length} text elements from slide ${index + 1}`);
        }
      });
    }
    
    const content = allText.join('\n\n');
    
    if (!content || content.trim().length < 10) {
      throw new Error('pptx2json extracted insufficient text');
    }
    
    console.log(`Successfully extracted ${content.length} characters using pptx2json`);
    
    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
        extractionMethod: 'pptx2json',
        pages: result?.slides?.length || 0
      }
    };
  }

  private async extractFromPPTX(filePath: string): Promise<ExtractedText> {
    try {
      return await this.extractFromPPTXWithPptx2json(filePath);
    } catch (pptx2jsonError) {
      console.log('pptx2json failed, trying fallback methods:', pptx2jsonError);
    }
    
    try {
      console.log(`Extracting text from PPTX file using fallback methods: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`PPTX file does not exist: ${filePath}`);
      }
      
      const stats = fs.statSync(filePath);
      console.log(`PPTX file stats: size=${stats.size} bytes, modified=${stats.mtime}`);
      
      const fileBuffer = fs.readFileSync(filePath);
      const isZip = fileBuffer.length > 4 && 
                    fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B && 
                    (fileBuffer[2] === 0x03 || fileBuffer[2] === 0x05 || fileBuffer[2] === 0x07);
      
      console.log(`PPTX file validation: isZip=${isZip}, firstBytes=[${fileBuffer.slice(0, 8).toString('hex')}]`);
      
      if (!isZip) {
        throw new Error(`File ${filePath} is not a valid ZIP/PPTX file (missing ZIP signature)`);
      }
      
      try {
        const config = {
          ignoreNotes: false,
          newlineDelimiter: '\n',
          outputErrorToConsole: false
        };
        
        console.log(`Attempting officeparser extraction on file: ${filePath} (${stats.size} bytes)`);
        
        const extractedText = await officeParser.parseOfficeAsync(filePath, config);
        
        if (extractedText && extractedText.trim().length > 10) {
          console.log(`Successfully extracted ${extractedText.length} characters from PPTX using officeparser`);
          
          return {
            content: extractedText.trim(),
            metadata: {
              wordCount: extractedText.trim().split(/\s+/).length,
              extractionMethod: 'officeparser',
              includesNotes: !config.ignoreNotes
            }
          };
        } else {
          console.log(`Officeparser extracted only ${extractedText?.trim().length || 0} characters, trying fallback method...`);
        }
      } catch (officeParserError) {
        console.log(`Officeparser failed, trying fallback method:`, officeParserError);
      }
      
      console.log(`Using node-pptx-parser as fallback for: ${filePath}`);
      
      const parser = new PptxParser(filePath);
      const parsedData: any = await parser.parse();
      
      if (!parsedData) {
        throw new Error('Parser returned null/undefined');
      }
      
      let slides: any[] = [];
      
      if (parsedData.slides && Array.isArray(parsedData.slides)) {
        slides = parsedData.slides;
      } else if (Array.isArray(parsedData)) {
        slides = parsedData;
      } else if (parsedData.presentation && parsedData.presentation.slides) {
        slides = parsedData.presentation.slides;
      }
      
      if (slides.length === 0) {
        throw new Error('No slides could be extracted from PPTX file');
      }
      
      const allText: string[] = [];
      slides.forEach((slide: any, index: number) => {
        const slideText: string[] = [];
        
        if (slide.xml) {
          const textMatches = slide.xml.match(/<a:t[^>]*>([\s\S]+?)<\/a:t>/g);
          
          if (textMatches && textMatches.length > 0) {
            textMatches.forEach((match: string) => {
              const innerTextMatch = match.match(/<a:t[^>]*>([\s\S]+?)<\/a:t>/);
              if (innerTextMatch && innerTextMatch[1]) {
                const cleanText = innerTextMatch[1].trim();
                if (cleanText.length > 0) {
                  slideText.push(cleanText);
                }
              }
            });
          }
        }
        
        if (slideText.length > 0) {
          allText.push(`--- Slide ${index + 1} ---`);
          allText.push(slideText.join(' '));
        }
      });
      
      const content = allText.join('\n\n');
      
      if (!content || content.trim().length < 10) {
        throw new Error('Insufficient text extracted from PPTX file');
      }
      
      return {
        content: content.trim(),
        metadata: {
          wordCount: content.trim().split(/\s+/).length,
          extractionMethod: 'node-pptx-parser',
          pages: slides.length
        }
      };
    } catch (error) {
      console.error(`PPTX extraction failed for ${filePath}:`, error);
      throw new Error(`PPTX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const textExtractionService = TextExtractionService.getInstance();
