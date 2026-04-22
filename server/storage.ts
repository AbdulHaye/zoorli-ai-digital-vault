import { type User, type InsertUser, type DocumentRecord, type InsertDocument, type JobRecord, type InsertJob, type SubscriptionPlanRecord, type InsertSubscriptionPlan, type UserSubscriptionRecord, type InsertUserSubscription, type AccountCredentialRecord, type InsertAccountCredential, type SubscriptionUsageRecord, type InsertSubscriptionUsage } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { createHash } from "crypto";

// Backward compatibility types
type FileRecord = DocumentRecord;
type InsertFile = InsertDocument;

// Storage interface for Zorli AI Vault
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User>;
  updateUserProfile(id: string, updates: { username?: string; profilePictureUrl?: string }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
  
  // File operations
  getFile(id: string): Promise<FileRecord | undefined>;
  getFilesByUserId(userId: string, limit?: number, offset?: number): Promise<FileRecord[]>;
  createFile(file: InsertFile): Promise<FileRecord>;
  updateFile(id: string, updates: Partial<FileRecord>): Promise<FileRecord>;
  updateFileAIAnalysis(id: string, analysis: any): Promise<FileRecord>;
  deleteFile(id: string): Promise<void>;
  
  // Job operations
  getJob(id: string): Promise<JobRecord | undefined>;
  getJobsByUserId(userId: string, limit?: number, offset?: number): Promise<JobRecord[]>;
  createJob(job: InsertJob): Promise<JobRecord>;
  updateJobStatus(id: string, status: string, progress?: number, result?: any, error?: string): Promise<JobRecord>;
  deleteJob(id: string): Promise<void>;
  
  // Text chunk cleanup
  deleteTextChunksByFileId(fileId: string): Promise<void>;
  
  // Vector search operations for RAG
  searchSimilarDocuments(userId: string, queryEmbedding: number[], limit?: number): Promise<DocumentRecord[]>;
  searchSimilarTextChunks(userId: string, queryEmbedding: number[], limit?: number): Promise<TextChunkRecord[]>;
  updateDocumentEmbedding(id: string, embedding: number[]): Promise<DocumentRecord>;
  addTextChunks(chunks: Array<{id: string, fileId: string, userId: string, content: string, chunkIndex: number, embedding?: number[], metadata?: any}>): Promise<void>;
  getAllTextChunks(): Promise<TextChunkRecord[]>;
  createShareLink(documentId: string): Promise<string>;
  getDocumentByShareToken(shareToken: string): Promise<DocumentRecord | undefined>;
  
  // Chat message operations for persistent conversation history
  addChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessageRecord>;
  getChatMessages(userId: string, limit?: number): Promise<ChatMessageRecord[]>;
  deleteChatMessage(id: string): Promise<void>;
  clearChatHistory(userId: string): Promise<void>;
  
  // Dashboard metrics operations
  getDashboardMetrics(userId: string): Promise<{
    filesCount: number;
    aiAnalysesCount: number;
    storageUsedBytes: number;
    activeJobsCount: number;
  }>;
  
  // Auth session operations
  createAuthSession(userId: string): Promise<string>;
  validateAuthSession(token: string): Promise<User | null>;
  revokeAuthSession(token: string): Promise<void>;
  cleanExpiredSessions(): Promise<void>;
  
  // Subscription operations
  getSubscriptionPlan(id: string): Promise<SubscriptionPlanRecord | undefined>;
  getSubscriptionPlanByName(name: string): Promise<SubscriptionPlanRecord | undefined>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlanRecord[]>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlanRecord>;
  updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlanRecord>): Promise<SubscriptionPlanRecord>;
  
  getUserSubscription(userId: string): Promise<UserSubscriptionRecord | undefined>;
  getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscriptionRecord | undefined>;
  getUserSubscriptionWithLimits(userId: string): Promise<{ 
    subscription: UserSubscriptionRecord; 
    plan: SubscriptionPlanRecord; 
    usage: SubscriptionUsageRecord;
    maxFiles: number;
    maxAIPrompts: number;
  } | null>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscriptionRecord>;
  updateUserSubscription(id: string, updates: Partial<UserSubscriptionRecord>): Promise<UserSubscriptionRecord>;
  cancelUserSubscription(id: string, canceledAt: Date): Promise<UserSubscriptionRecord>;
  
  // Subscription usage operations
  getSubscriptionUsage(userId: string): Promise<SubscriptionUsageRecord | undefined>;
  createSubscriptionUsage(usage: InsertSubscriptionUsage): Promise<SubscriptionUsageRecord>;
  updateSubscriptionUsage(userId: string, updates: Partial<SubscriptionUsageRecord>): Promise<SubscriptionUsageRecord>;
  incrementFileCount(userId: string): Promise<void>;
  decrementFileCount(userId: string): Promise<void>;
  incrementPasswordCount(userId: string): Promise<void>;
  decrementPasswordCount(userId: string): Promise<void>;
  incrementAIPromptCount(userId: string): Promise<void>;
  
  // Account credentials operations
  getAccountCredential(id: string): Promise<AccountCredentialRecord | undefined>;
  getAccountCredentialsByUserId(userId: string, limit?: number, offset?: number): Promise<AccountCredentialRecord[]>;
  createAccountCredential(credential: InsertAccountCredential): Promise<AccountCredentialRecord>;
  updateAccountCredential(id: string, updates: Partial<AccountCredentialRecord>): Promise<AccountCredentialRecord>;
  deleteAccountCredential(id: string): Promise<void>;
  getAccountCredentialsCount(userId: string): Promise<number>;
  
  // Admin aggregation operations
  getSubscriptionCountsByStatus(): Promise<{ freeUsers: number; plusUsers: number; businessUsers: number; activeSubscriptions: number }>;
  getUsageTotals(): Promise<{ totalFiles: number; totalPasswords: number }>;
  
  // Password reset operations
  createPasswordReset(data: { email: string; otp: string; expiresAt: Date }): Promise<void>;
  getPasswordResetByEmailAndOtp(email: string, otp: string): Promise<{ id: string; email: string; otp: string; expiresAt: Date } | undefined>;
  deletePasswordResetByEmail(email: string): Promise<void>;
  deletePasswordResetById(id: string): Promise<void>;
  updateUserPassword(userId: string, newPassword: string): Promise<void>;
  
  // Email verification operations
  setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  markEmailAsVerified(userId: string): Promise<void>;
}

// Database storage implementation using Drizzle ORM
import { db } from "./db";
import { users as usersTable, documents as documentsTable, jobs as jobsTable, textChunks as textChunksTable, chatMessages as chatMessagesTable, authSessions as authSessionsTable, subscriptionPlans as subscriptionPlansTable, userSubscriptions as userSubscriptionsTable, accountCredentials as accountCredentialsTable, subscriptionUsage as subscriptionUsageTable, passwordResets as passwordResetsTable, type TextChunkRecord, type InsertTextChunk, type ChatMessageRecord, type InsertChatMessage, type AuthSessionRecord, type InsertAuthSession } from "@shared/schema";
import { randomBytes } from "crypto";

// Backward compatibility alias
const filesTable = documentsTable;
import { eq, sql, cosineDistance, desc as descOrder, isNotNull, and, or } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log('📧 getUserByEmail called with:', email);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    console.log('📧 Query result:', user ? `Found user: ${user.email}` : 'No user found');
    return user || undefined;
  }

  async getUserByToken(token: string): Promise<User | undefined> {
    // This method is deprecated and should not be used for security reasons
    // Use proper authentication middleware instead
    throw new Error('getUserByToken is deprecated - use authentication middleware');
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before storing
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(insertUser.password, saltRounds);
    
    const userWithHashedPassword = {
      ...insertUser,
      password: hashedPassword
    };
    
    const [user] = await db
      .insert(usersTable)
      .values(userWithHashedPassword)
      .returning();
    
    // Initialize subscription tracking for new user
    // Get or use free plan as default
    let freePlan = await this.getSubscriptionPlanByName('free');
    
    // Create user_subscription for free plan
    if (freePlan) {
      const [userSubscription] = await db
        .insert(userSubscriptionsTable)
        .values({
          userId: user.id,
          planId: freePlan.id,
          status: 'active',
        })
        .returning();
      
      // Create subscription_usage row to track limits
      await db
        .insert(subscriptionUsageTable)
        .values({
          userId: user.id,
          subscriptionId: userSubscription.id,
          filesCount: 0,
          passwordsCount: 0,
          aiPromptsCount: 0,
          storageUsedBytes: 0,
        });
    }
    
    return user;
  }
  
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  
  async createAuthSession(userId: string): Promise<string> {
    // Generate a secure random token
    const token = randomBytes(32).toString('hex');
    
    // Hash the token before storing (SHA-256)
    const hashedToken = createHash('sha256').update(token).digest('hex');
    
    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Store the hashed session
    await db.insert(authSessionsTable).values({
      userId,
      token: hashedToken,
      expiresAt
    });
    
    return token; // Return the original token to the client
  }
  
  async validateAuthSession(token: string): Promise<User | null> {
    // Hash the provided token to compare with stored hash
    const hashedToken = createHash('sha256').update(token).digest('hex');
    
    const [session] = await db
      .select()
      .from(authSessionsTable)
      .where(eq(authSessionsTable.token, hashedToken));
    
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await this.revokeAuthSession(token);
      return null;
    }
    
    // Get the user
    const user = await this.getUser(session.userId);
    return user || null;
  }
  
  async revokeAuthSession(token: string): Promise<void> {
    // Hash the token to match stored hash
    const hashedToken = createHash('sha256').update(token).digest('hex');
    await db.delete(authSessionsTable).where(eq(authSessionsTable.token, hashedToken));
  }
  
  async cleanExpiredSessions(): Promise<void> {
    await db
      .delete(authSessionsTable)
      .where(sql`expires_at < NOW()`);
  }

  async updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(usersTable)
      .set({
        stripeCustomerId,
        stripeSubscriptionId: stripeSubscriptionId || undefined,
        updatedAt: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning();
      
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateUserProfile(id: string, updates: { username?: string; profilePictureUrl?: string }): Promise<User> {
    const [user] = await db
      .update(usersTable)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning();
      
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const users = await db.select().from(usersTable);
    return users;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(usersTable).where(eq(usersTable.id, id));
  }

  // File operations
  async getFile(id: string): Promise<FileRecord | undefined> {
    const [file] = await db.select().from(filesTable).where(eq(filesTable.id, id));
    return file || undefined;
  }

  async getFilesByUserId(userId: string, limit = 50, offset = 0): Promise<FileRecord[]> {
    const userFiles = await db
      .select()
      .from(filesTable)
      .where(eq(filesTable.userId, userId))
      .limit(limit)
      .offset(offset);
    
    return userFiles;
  }

  async getDashboardMetrics(userId: string): Promise<{
    filesCount: number;
    aiAnalysesCount: number;
    storageUsedBytes: number;
    activeJobsCount: number;
  }> {
    try {
      // Get usage data from subscription_usage table
      const usageResult = await db
        .select()
        .from(subscriptionUsageTable)
        .where(eq(subscriptionUsageTable.userId, userId))
        .limit(1);
      
      const usage = usageResult[0];
      const filesCount = usage?.filesCount || 0;
      const aiPromptsCount = usage?.aiPromptsCount || 0;

      // Get total storage used (sum of file sizes) from files table
      const storageResult = await db
        .select({ totalSize: sql<number>`coalesce(sum(${filesTable.fileSize}), 0)` })
        .from(filesTable)
        .where(eq(filesTable.userId, userId));
      
      const storageUsedBytes = storageResult[0]?.totalSize || 0;

      // Get active jobs count (status: waiting, active, processing)
      const activeJobsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(jobsTable)
        .where(and(
          eq(jobsTable.userId, userId),
          or(
            eq(jobsTable.status, 'waiting'),
            eq(jobsTable.status, 'active'),
            eq(jobsTable.status, 'processing'),
            eq(jobsTable.status, 'pending')
          )
        ));
      
      const activeJobsCount = activeJobsResult[0]?.count || 0;

      return {
        filesCount: Number(filesCount),
        aiAnalysesCount: Number(aiPromptsCount),
        storageUsedBytes: Number(storageUsedBytes),
        activeJobsCount: Number(activeJobsCount)
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return {
        filesCount: 0,
        aiAnalysesCount: 0,
        storageUsedBytes: 0,
        activeJobsCount: 0
      };
    }
  }

  async createFile(insertFile: InsertFile): Promise<FileRecord> {
    const [file] = await db
      .insert(filesTable)
      .values(insertFile)
      .returning();
    return file;
  }

  async updateFile(id: string, updates: Partial<FileRecord>): Promise<FileRecord> {
    const [file] = await db
      .update(filesTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(filesTable.id, id))
      .returning();
      
    if (!file) {
      throw new Error('File not found');
    }
    return file;
  }

  async updateFileAIAnalysis(id: string, analysis: any): Promise<FileRecord> {
    const [file] = await db
      .update(filesTable)
      .set({ 
        extractedText: '',
        embeddingStatus: 'pending',
        updatedAt: new Date() 
      })
      .where(eq(filesTable.id, id))
      .returning();
      
    if (!file) {
      throw new Error('File not found');
    }
    return file;
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(filesTable).where(eq(filesTable.id, id));
  }

  // Job operations
  async getJob(id: string): Promise<JobRecord | undefined> {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
    return job || undefined;
  }

  async getJobsByUserId(userId: string, limit = 50, offset = 0): Promise<JobRecord[]> {
    const userJobs = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.userId, userId))
      .limit(limit)
      .offset(offset);
    
    return userJobs;
  }

  async createJob(insertJob: InsertJob): Promise<JobRecord> {
    const [job] = await db
      .insert(jobsTable)
      .values(insertJob)
      .returning();
    return job;
  }

  async updateJobStatus(id: string, status: string, progress?: number, result?: any, error?: string): Promise<JobRecord> {
    const [job] = await db
      .update(jobsTable)
      .set({
        status,
        progress: progress || undefined,
        result: result || undefined,
        error: error || undefined,
        updatedAt: new Date()
      })
      .where(eq(jobsTable.id, id))
      .returning();
      
    if (!job) {
      throw new Error('Job not found');
    }
    return job;
  }

  async deleteJob(id: string): Promise<void> {
    await db.delete(jobsTable).where(eq(jobsTable.id, id));
  }

  async deleteTextChunksByFileId(fileId: string): Promise<void> {
    try {
      await db.delete(textChunksTable).where(eq(textChunksTable.fileId, fileId));
      console.log(`Deleted text chunks for file ${fileId} from database`);
    } catch (error) {
      console.error(`Failed to delete text chunks for file ${fileId}:`, error);
      throw error;
    }
  }

  // Vector search operations for RAG using real pgvector SQL operations
  async searchSimilarDocuments(userId: string, queryEmbedding: number[], limit = 5): Promise<DocumentRecord[]> {
    try {
      // Use real pgvector cosine distance SQL operation for similarity search
      const documents = await db
        .select()
        .from(documentsTable)
        .where(eq(documentsTable.userId, userId))
        .orderBy(cosineDistance(documentsTable.embedding, queryEmbedding))
        .limit(limit);
      
      return documents;
    } catch (error) {
      console.error('pgvector similarity search failed:', error);
      // Fallback to regular document search
      return this.getFilesByUserId(userId, limit);
    }
  }

  // NEW: Search text chunks for semantic content retrieval (the core RAG functionality)
  async searchSimilarTextChunks(userId: string, queryEmbedding: number[], limit = 10): Promise<TextChunkRecord[]> {
    try {
      // Search text chunks using pgvector cosine distance for semantic similarity
      // Filter out NULL embeddings at the database level to prevent errors
      const chunks = await db
        .select()
        .from(textChunksTable)
        .where(
          sql`${textChunksTable.userId} = ${userId} AND ${textChunksTable.embedding} IS NOT NULL`
        )
        .orderBy(cosineDistance(textChunksTable.embedding, queryEmbedding))
        .limit(limit);
      
      const { decryptChunk, isEncryptedChunk } = await import('./encryption');
      
      const decryptedChunks = chunks.map(chunk => {
        if (chunk.content && isEncryptedChunk(chunk.content)) {
          try {
            return { ...chunk, content: decryptChunk(chunk.content) };
          } catch (e) {
            console.warn(`Failed to decrypt chunk ${chunk.id}, returning as-is`);
            return chunk;
          }
        }
        return chunk;
      });
      
      console.log(`Found ${decryptedChunks.length} similar text chunks for user ${userId}`);
      return decryptedChunks;
    } catch (error) {
      console.error('pgvector text chunk similarity search failed:', error);
      throw new Error(`Text chunk search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateDocumentEmbedding(id: string, embedding: number[]): Promise<DocumentRecord> {
    try {
      // Store embedding as vector array (direct pgvector support)
      const [document] = await db
        .update(documentsTable)
        .set({ 
          embedding: embedding,
          embeddingStatus: 'completed',
          updatedAt: new Date() 
        })
        .where(eq(documentsTable.id, id))
        .returning();
        
      if (!document) {
        throw new Error('Document not found');
      }
      return document;
    } catch (error) {
      console.error('Failed to update document embedding:', error);
      throw error;
    }
  }

  async addTextChunks(chunks: Array<{id: string, fileId: string, userId: string, content: string, chunkIndex: number, embedding?: number[], metadata?: any}>): Promise<void> {
    try {
      if (chunks.length === 0) {
        console.log('No chunks to add');
        return;
      }

      const { encryptChunk } = await import('./encryption');
      
      const chunkRecords = chunks.map(chunk => ({
        id: chunk.id,
        fileId: chunk.fileId,
        userId: chunk.userId,
        content: encryptChunk(chunk.content),
        chunkIndex: chunk.chunkIndex,
        embedding: chunk.embedding || null,
        metadata: chunk.metadata || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Insert all chunks in a single transaction
      await db.insert(textChunksTable).values(chunkRecords);
      
      console.log(`Successfully added ${chunks.length} text chunks to database`);
    } catch (error) {
      console.error('Failed to add text chunks to database:', error);
      throw error;
    }
  }

  async getAllTextChunks(userId?: string): Promise<TextChunkRecord[]> {
    try {
      const conditions = [isNotNull(textChunksTable.embedding)];
      
      // Filter by userId if provided for security
      if (userId) {
        conditions.push(eq(textChunksTable.userId, userId));
      }
      
      const chunks = await db
        .select()
        .from(textChunksTable)
        .where(and(...conditions))
        .orderBy(textChunksTable.createdAt);
      
      const { decryptChunk, isEncryptedChunk } = await import('./encryption');
      
      return chunks.map(chunk => {
        if (chunk.content && isEncryptedChunk(chunk.content)) {
          try {
            return { ...chunk, content: decryptChunk(chunk.content) };
          } catch (e) {
            console.warn(`Failed to decrypt chunk ${chunk.id}, returning as-is`);
            return chunk;
          }
        }
        return chunk;
      });
    } catch (error) {
      console.error('Failed to get all text chunks:', error);
      throw error;
    }
  }

  async createShareLink(documentId: string): Promise<string> {
    const shareToken = randomUUID();
    
    await db
      .update(documentsTable)
      .set({ 
        shareToken,
        isShared: true,
        updatedAt: new Date() 
      })
      .where(eq(documentsTable.id, documentId));
    
    return shareToken;
  }

  async getDocumentByShareToken(shareToken: string): Promise<DocumentRecord | undefined> {
    const [document] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.shareToken, shareToken));
    
    return document || undefined;
  }

  // Chat message operations for persistent conversation history
  async addChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessageRecord> {
    const { encryptChunk } = await import('./encryption');
    const encryptedMessage = {
      ...chatMessage,
      content: encryptChunk(chatMessage.content),
    };
    const [savedMessage] = await db
      .insert(chatMessagesTable)
      .values(encryptedMessage)
      .returning();
    
    return { ...savedMessage, content: chatMessage.content };
  }

  async getChatMessages(userId: string, limit: number = 50): Promise<ChatMessageRecord[]> {
    const { decryptChunk, isEncryptedChunk } = await import('./encryption');
    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.userId, userId))
      .orderBy(descOrder(chatMessagesTable.timestamp))
      .limit(limit);
    
    const decryptedMessages = messages.map(msg => {
      if (msg.content && isEncryptedChunk(msg.content)) {
        try {
          return { ...msg, content: decryptChunk(msg.content) };
        } catch (e) {
          console.error(`Failed to decrypt chat message ${msg.id}:`, e);
          return msg;
        }
      }
      return msg;
    });

    return decryptedMessages.reverse();
  }

  async deleteChatMessage(id: string): Promise<void> {
    await db
      .delete(chatMessagesTable)
      .where(eq(chatMessagesTable.id, id));
  }

  async clearChatHistory(userId: string): Promise<void> {
    await db
      .delete(chatMessagesTable)
      .where(eq(chatMessagesTable.userId, userId));
  }

  // Subscription plan operations
  async getSubscriptionPlan(id: string): Promise<SubscriptionPlanRecord | undefined> {
    const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
    return plan || undefined;
  }

  async getSubscriptionPlanByName(name: string): Promise<SubscriptionPlanRecord | undefined> {
    const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.name, name));
    return plan || undefined;
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlanRecord[]> {
    return await db.select().from(subscriptionPlansTable);
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlanRecord> {
    const [newPlan] = await db.insert(subscriptionPlansTable).values(plan).returning();
    return newPlan;
  }

  async updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlanRecord>): Promise<SubscriptionPlanRecord> {
    const [updated] = await db
      .update(subscriptionPlansTable)
      .set(updates)
      .where(eq(subscriptionPlansTable.id, id))
      .returning();
    if (!updated) throw new Error('Subscription plan not found');
    return updated;
  }

  // User subscription operations
  async getUserSubscription(userId: string): Promise<UserSubscriptionRecord | undefined> {
    const [subscription] = await db
      .select()
      .from(userSubscriptionsTable)
      .where(eq(userSubscriptionsTable.userId, userId))
      .orderBy(descOrder(userSubscriptionsTable.createdAt))
      .limit(1);
    return subscription || undefined;
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscriptionRecord | undefined> {
    const [subscription] = await db
      .select()
      .from(userSubscriptionsTable)
      .where(eq(userSubscriptionsTable.stripeSubscriptionId, stripeSubscriptionId));
    return subscription || undefined;
  }
  
  async getUserSubscriptionWithLimits(userId: string): Promise<{ 
    subscription: UserSubscriptionRecord; 
    plan: SubscriptionPlanRecord; 
    usage: SubscriptionUsageRecord;
    maxFiles: number;
    maxAIPrompts: number;
  } | null> {
    // Get user's subscription
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      // Try to get/create free plan if no subscription
      const freePlan = await this.getSubscriptionPlanByName('free');
      if (!freePlan) return null;
      
      // Create free subscription for the user
      const [newSubscription] = await db
        .insert(userSubscriptionsTable)
        .values({
          userId,
          planId: freePlan.id,
          status: 'active',
        })
        .returning();
      
      // Get or create usage record
      let usage = await this.getSubscriptionUsage(userId);
      if (!usage) {
        [usage] = await db
          .insert(subscriptionUsageTable)
          .values({
            userId,
            subscriptionId: newSubscription.id,
            filesCount: 0,
            passwordsCount: 0,
            aiPromptsCount: 0,
            storageUsedBytes: 0,
          })
          .returning();
      }
      
      return {
        subscription: newSubscription,
        plan: freePlan,
        usage,
        maxFiles: freePlan.maxFiles,
        maxAIPrompts: freePlan.maxAIPrompts,
      };
    }
    
    // Get plan details
    const plan = await this.getSubscriptionPlan(subscription.planId);
    if (!plan) return null;
    
    // Get usage record
    let usage = await this.getSubscriptionUsage(userId);
    if (!usage) {
      // Create usage record if missing
      [usage] = await db
        .insert(subscriptionUsageTable)
        .values({
          userId,
          subscriptionId: subscription.id,
          filesCount: 0,
          passwordsCount: 0,
          aiPromptsCount: 0,
          storageUsedBytes: 0,
        })
        .returning();
    }
    
    return {
      subscription,
      plan,
      usage,
      maxFiles: plan.maxFiles,
      maxAIPrompts: plan.maxAIPrompts,
    };
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscriptionRecord> {
    const [newSubscription] = await db
      .insert(userSubscriptionsTable)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscriptionRecord>): Promise<UserSubscriptionRecord> {
    const [updated] = await db
      .update(userSubscriptionsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSubscriptionsTable.id, id))
      .returning();
    if (!updated) throw new Error('User subscription not found');
    return updated;
  }

  async cancelUserSubscription(id: string, canceledAt: Date): Promise<UserSubscriptionRecord> {
    const [updated] = await db
      .update(userSubscriptionsTable)
      .set({ 
        cancelAtPeriodEnd: true,
        canceledAt,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptionsTable.id, id))
      .returning();
    if (!updated) throw new Error('User subscription not found');
    return updated;
  }

  // Subscription usage operations
  async getSubscriptionUsage(userId: string): Promise<SubscriptionUsageRecord | undefined> {
    const [usage] = await db
      .select()
      .from(subscriptionUsageTable)
      .where(eq(subscriptionUsageTable.userId, userId))
      .orderBy(descOrder(subscriptionUsageTable.createdAt))
      .limit(1);
    return usage || undefined;
  }

  async createSubscriptionUsage(usage: InsertSubscriptionUsage): Promise<SubscriptionUsageRecord> {
    const [newUsage] = await db
      .insert(subscriptionUsageTable)
      .values(usage)
      .returning();
    return newUsage;
  }

  async updateSubscriptionUsage(userId: string, updates: Partial<SubscriptionUsageRecord>): Promise<SubscriptionUsageRecord> {
    const [updated] = await db
      .update(subscriptionUsageTable)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(subscriptionUsageTable.userId, userId))
      .returning();
    if (!updated) throw new Error('Subscription usage not found');
    return updated;
  }

  async incrementFileCount(userId: string, fileSize: number = 0): Promise<void> {
    // Get or create user's subscription
    let userSubscription = await this.getUserSubscription(userId);
    
    // If no subscription exists, create a free subscription for the user
    if (!userSubscription) {
      const freePlan = await this.getSubscriptionPlanByName('free');
      if (!freePlan) {
        console.error(`No free plan found - cannot create subscription for user ${userId}`);
        return;
      }
      
      [userSubscription] = await db
        .insert(userSubscriptionsTable)
        .values({
          userId,
          planId: freePlan.id,
          status: 'active',
        })
        .returning();
    }
    
    // Upsert: create row if missing, increment if exists
    await db
      .insert(subscriptionUsageTable)
      .values({
        userId,
        subscriptionId: userSubscription.id,
        filesCount: 1,
        passwordsCount: 0,
        aiPromptsCount: 0,
        storageUsedBytes: fileSize,
      })
      .onConflictDoUpdate({
        target: subscriptionUsageTable.userId,
        set: {
          filesCount: sql`${subscriptionUsageTable.filesCount} + 1`,
          storageUsedBytes: sql`${subscriptionUsageTable.storageUsedBytes} + ${fileSize}`,
          lastUpdated: new Date()
        }
      });
  }

  async decrementFileCount(userId: string, fileSize: number = 0): Promise<void> {
    await db
      .update(subscriptionUsageTable)
      .set({ 
        filesCount: sql`GREATEST(${subscriptionUsageTable.filesCount} - 1, 0)`,
        storageUsedBytes: sql`GREATEST(${subscriptionUsageTable.storageUsedBytes} - ${fileSize}, 0)`,
        lastUpdated: new Date()
      })
      .where(eq(subscriptionUsageTable.userId, userId));
  }

  async incrementPasswordCount(userId: string): Promise<void> {
    // Get or create user's subscription
    let userSubscription = await this.getUserSubscription(userId);
    
    // If no subscription exists, create a free subscription for the user
    if (!userSubscription) {
      const freePlan = await this.getSubscriptionPlanByName('free');
      if (!freePlan) {
        console.error(`No free plan found - cannot create subscription for user ${userId}`);
        return;
      }
      
      [userSubscription] = await db
        .insert(userSubscriptionsTable)
        .values({
          userId,
          planId: freePlan.id,
          status: 'active',
        })
        .returning();
    }
    
    // Upsert: create row if missing, increment if exists
    await db
      .insert(subscriptionUsageTable)
      .values({
        userId,
        subscriptionId: userSubscription.id,
        filesCount: 0,
        passwordsCount: 1,
        aiPromptsCount: 0,
        storageUsedBytes: 0,
      })
      .onConflictDoUpdate({
        target: subscriptionUsageTable.userId,
        set: {
          passwordsCount: sql`${subscriptionUsageTable.passwordsCount} + 1`,
          lastUpdated: new Date()
        }
      });
  }

  async decrementPasswordCount(userId: string): Promise<void> {
    await db
      .update(subscriptionUsageTable)
      .set({ 
        passwordsCount: sql`GREATEST(${subscriptionUsageTable.passwordsCount} - 1, 0)`,
        lastUpdated: new Date()
      })
      .where(eq(subscriptionUsageTable.userId, userId));
  }

  async incrementAIPromptCount(userId: string): Promise<void> {
    // Get or create user's subscription
    let userSubscription = await this.getUserSubscription(userId);
    
    // If no subscription exists, create a free subscription for the user
    if (!userSubscription) {
      const freePlan = await this.getSubscriptionPlanByName('free');
      if (!freePlan) {
        console.error(`No free plan found - cannot create subscription for user ${userId}`);
        return;
      }
      
      [userSubscription] = await db
        .insert(userSubscriptionsTable)
        .values({
          userId,
          planId: freePlan.id,
          status: 'active',
        })
        .returning();
    }
    
    // Upsert: create row if missing, increment if exists
    await db
      .insert(subscriptionUsageTable)
      .values({
        userId,
        subscriptionId: userSubscription.id,
        filesCount: 0,
        passwordsCount: 0,
        aiPromptsCount: 1,
        storageUsedBytes: 0,
      })
      .onConflictDoUpdate({
        target: subscriptionUsageTable.userId,
        set: {
          aiPromptsCount: sql`${subscriptionUsageTable.aiPromptsCount} + 1`,
          lastUpdated: new Date()
        }
      });
  }

  // Account credentials operations
  async getAccountCredential(id: string): Promise<AccountCredentialRecord | undefined> {
    const [credential] = await db
      .select()
      .from(accountCredentialsTable)
      .where(eq(accountCredentialsTable.id, id));
    return credential || undefined;
  }

  async getAccountCredentialsByUserId(userId: string, limit = 100, offset = 0): Promise<AccountCredentialRecord[]> {
    return await db
      .select()
      .from(accountCredentialsTable)
      .where(eq(accountCredentialsTable.userId, userId))
      .orderBy(descOrder(accountCredentialsTable.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  async createAccountCredential(credential: InsertAccountCredential): Promise<AccountCredentialRecord> {
    const [newCredential] = await db
      .insert(accountCredentialsTable)
      .values(credential)
      .returning();
    return newCredential;
  }

  async updateAccountCredential(id: string, updates: Partial<AccountCredentialRecord>): Promise<AccountCredentialRecord> {
    const [updated] = await db
      .update(accountCredentialsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(accountCredentialsTable.id, id))
      .returning();
    if (!updated) throw new Error('Account credential not found');
    return updated;
  }

  async deleteAccountCredential(id: string): Promise<void> {
    await db.delete(accountCredentialsTable).where(eq(accountCredentialsTable.id, id));
  }

  async getAccountCredentialsCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(accountCredentialsTable)
      .where(eq(accountCredentialsTable.userId, userId));
    return result[0]?.count || 0;
  }

  // Admin aggregation operations
  async getSubscriptionCountsByStatus(): Promise<{ freeUsers: number; plusUsers: number; businessUsers: number; activeSubscriptions: number }> {
    const [users, subscriptions, plans] = await Promise.all([
      db.select().from(usersTable),
      db.select().from(userSubscriptionsTable),
      db.select().from(subscriptionPlansTable)
    ]);
    
    // Create maps for quick lookup
    const subscriptionMap = new Map(subscriptions.map(s => [s.userId, s]));
    const planMap = new Map(plans.map(p => [p.id, p.name.toLowerCase()]));
    
    let freeUsers = 0;
    let plusUsers = 0;
    let businessUsers = 0;
    let activeSubscriptions = 0;
    
    for (const user of users) {
      const subscription = subscriptionMap.get(user.id);
      
      // Check if user has an active subscription
      if (!subscription || !subscription.planId || (subscription.status !== 'active' && subscription.status !== 'trialing')) {
        freeUsers++;
        continue;
      }
      
      // Count active subscriptions
      activeSubscriptions++;
      
      // Get plan name
      const planName = planMap.get(subscription.planId) || '';
      
      if (planName.includes('business')) {
        businessUsers++;
      } else if (planName.includes('plus')) {
        plusUsers++;
      } else {
        freeUsers++;
      }
    }
    
    return { freeUsers, plusUsers, businessUsers, activeSubscriptions };
  }

  async getUsageTotals(): Promise<{ totalFiles: number; totalPasswords: number }> {
    const [filesResult, passwordsResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(documentsTable),
      db.select({ count: sql<number>`count(*)` }).from(accountCredentialsTable)
    ]);
    
    return {
      totalFiles: filesResult[0]?.count || 0,
      totalPasswords: passwordsResult[0]?.count || 0
    };
  }

  // Password reset operations
  async createPasswordReset(data: { email: string; otp: string; expiresAt: Date }): Promise<void> {
    await db.insert(passwordResetsTable).values(data);
  }

  async getPasswordResetByEmailAndOtp(email: string, otp: string): Promise<{ id: string; email: string; otp: string; expiresAt: Date } | undefined> {
    const [reset] = await db.select()
      .from(passwordResetsTable)
      .where(and(
        eq(passwordResetsTable.email, email),
        eq(passwordResetsTable.otp, otp)
      ));
    
    return reset ? {
      id: reset.id,
      email: reset.email,
      otp: reset.otp,
      expiresAt: reset.expiresAt
    } : undefined;
  }

  async deletePasswordResetByEmail(email: string): Promise<void> {
    await db.delete(passwordResetsTable).where(eq(passwordResetsTable.email, email));
  }

  async deletePasswordResetById(id: string): Promise<void> {
    await db.delete(passwordResetsTable).where(eq(passwordResetsTable.id, id));
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    await db.update(usersTable)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(usersTable.id, userId));
  }
  
  // Email verification operations
  async setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.update(usersTable)
      .set({ 
        emailVerificationToken: token,
        emailVerificationExpires: expiresAt,
        updatedAt: new Date()
      })
      .where(eq(usersTable.id, userId));
  }
  
  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(
      and(
        eq(usersTable.emailVerificationToken, token),
        sql`${usersTable.emailVerificationExpires} > NOW()`
      )
    );
    return user || undefined;
  }
  
  async markEmailAsVerified(userId: string): Promise<void> {
    await db.update(usersTable)
      .set({ 
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: new Date()
      })
      .where(eq(usersTable.id, userId));
  }
}

export const storage = new DatabaseStorage();