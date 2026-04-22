import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, json, vector, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role").default("user"), // user, admin
  profilePictureUrl: text("profile_picture_url"), // URL to profile picture in object storage
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // Email verification fields
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Auth sessions table for secure token management
export const authSessions = pgTable("auth_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table for Supabase RAG system
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  storagePath: text("storage_path").notNull(), // Supabase Storage path
  downloadUrl: text("download_url"), // Public download URL
  extractedText: text("extracted_text"), // Full extracted text content (PDF parsing or GPT-4-Vision description)
  embedding: vector("embedding", { dimensions: 1536 }), // OpenAI text-embedding-ada-002 produces 1536-dimensional vectors
  embeddingStatus: text("embedding_status").default("pending"), // pending, processing, completed, failed
  shareToken: text("share_token").unique(), // For shareable links
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Create HNSW index for fast vector similarity search
  index("embedding_hnsw_index").using("hnsw", table.embedding.op("vector_cosine_ops"))
]);

// Jobs table
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobType: text("job_type").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, active, completed, failed, cancelled
  data: json("data").notNull(),
  result: json("result"),
  progress: integer("progress").default(0),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Text chunks table for RAG system
export const textChunks = pgTable("text_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileId: varchar("file_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(), // The actual text chunk content
  chunkIndex: integer("chunk_index").notNull(), // Order of chunks within the file
  embedding: vector("embedding", { dimensions: 1536 }), // OpenAI text-embedding-ada-002 embeddings
  metadata: json("metadata"), // Additional metadata like word count, position, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Create HNSW index for fast vector similarity search on chunks
  index("text_chunks_embedding_hnsw_index").using("hnsw", table.embedding.op("vector_cosine_ops")),
  // Regular index for file-based queries
  index("text_chunks_file_id_index").on(table.fileId)
]);

// Chat messages for AI conversation history with database backup
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  files: json("files"), // Array of file references attached to message
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Index for user-based chat history queries
  index("chat_messages_user_id_index").on(table.userId),
  // Index for chronological ordering
  index("chat_messages_timestamp_index").on(table.timestamp)
]);

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // free, plus, business
  displayName: text("display_name").notNull(), // Free Plan, Plus, Business
  description: text("description"), // Short description of the plan
  priceMonthly: integer("price_monthly").notNull().default(0), // Monthly price in cents (0 for free, 2000 for $20, 2500 for $25)
  stripePriceId: text("stripe_price_id").unique(),
  maxFiles: integer("max_files").notNull().default(10), // -1 for unlimited
  maxAIPrompts: integer("max_ai_prompts").notNull().default(20), // -1 for unlimited
  features: json("features"), // Array of feature descriptions
});

// User subscriptions table for detailed subscription tracking
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  status: varchar("status").notNull().default("trialing"), // trialing, active, past_due, canceled, unpaid
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  canceledAt: timestamp("canceled_at"),
  endedAt: timestamp("ended_at"),
  lastPaymentFailedAt: timestamp("last_payment_failed_at"),
  gracePeriodEndAt: timestamp("grace_period_end_at"), // 7-day grace period for failed payments
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_subscriptions_user_id_index").on(table.userId),
  index("user_subscriptions_stripe_subscription_id_index").on(table.stripeSubscriptionId)
]);

// Account credentials table for storing encrypted passwords
export const accountCredentials = pgTable("account_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceName: text("service_name").notNull(), // Netflix, Google Drive, etc.
  username: text("username").notNull(),
  encryptedPassword: text("encrypted_password").notNull(), // AES encrypted password
  passwordHint: text("password_hint"), // Optional hint for user
  website: text("website"), // Service website URL
  notes: text("notes"), // Additional notes
  category: varchar("category").default("general"), // general, streaming, social, work, finance, etc.
  isFavorite: boolean("is_favorite").default(false),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("account_credentials_user_id_index").on(table.userId),
  index("account_credentials_service_name_index").on(table.serviceName)
]);

// Subscription usage tracking for enforcing limits
export const subscriptionUsage = pgTable("subscription_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: varchar("subscription_id").notNull().references(() => userSubscriptions.id, { onDelete: "cascade" }),
  filesCount: integer("files_count").default(0),
  passwordsCount: integer("passwords_count").default(0),
  aiPromptsCount: integer("ai_prompts_count").default(0),
  storageUsedBytes: integer("storage_used_bytes").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("subscription_usage_user_id_index").on(table.userId)
]);

// Payments table for tracking all payment transactions
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: text("payment_id").notNull().unique(), // Stripe payment/subscription/invoice ID
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: varchar("plan").notNull(), // free, plus, business
  amount: integer("amount").notNull(), // Amount in dollars
  currency: varchar("currency").default("usd"),
  status: varchar("status").notNull().default("incomplete"), // active, canceled, incomplete, past_due, unpaid
  subscriptionId: text("subscription_id"), // Stripe subscription ID for recurring payments
  invoiceId: text("invoice_id"), // Stripe invoice ID
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  metadata: json("metadata"), // Additional payment metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("payments_user_id_index").on(table.userId),
  index("payments_payment_id_index").on(table.paymentId),
  index("payments_subscription_id_index").on(table.subscriptionId),
  index("payments_status_index").on(table.status)
]);

// Email verification tokens for secure email verification
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("email_verification_tokens_token_index").on(table.token),
  index("email_verification_tokens_user_id_index").on(table.userId)
]);

// Password reset table for OTP-based password recovery
export const passwordResets = pgTable("password_resets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("password_resets_email_index").on(table.email),
  index("password_resets_otp_index").on(table.otp)
]);

// Keep files table for backward compatibility but rename to documents for clarity
export const files = documents;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
  role: true,
  isEmailVerified: true,
  emailVerificationToken: true,
  emailVerificationExpires: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  userId: true,
  filename: true,
  fileSize: true,
  fileType: true,
  storagePath: true,
  downloadUrl: true,
  embeddingStatus: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  role: true,
  content: true,
  files: true,
  timestamp: true,
});

export const insertAuthSessionSchema = createInsertSchema(authSessions).pick({
  userId: true,
  token: true,
  expiresAt: true,
});

// Backward compatibility
export const insertFileSchema = insertDocumentSchema;

export const insertJobSchema = createInsertSchema(jobs).pick({
  userId: true,
  jobType: true,
  status: true,
  data: true,
});

export const insertTextChunkSchema = createInsertSchema(textChunks).pick({
  fileId: true,
  userId: true,
  content: true,
  chunkIndex: true,
  metadata: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).pick({
  name: true,
  displayName: true,
  description: true,
  priceMonthly: true,
  stripePriceId: true,
  maxFiles: true,
  maxAIPrompts: true,
  features: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).pick({
  userId: true,
  planId: true,
  stripeSubscriptionId: true,
  stripeCustomerId: true,
  status: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  trialStart: true,
  trialEnd: true,
  cancelAtPeriodEnd: true,
});

export const insertAccountCredentialSchema = createInsertSchema(accountCredentials).pick({
  userId: true,
  serviceName: true,
  username: true,
  encryptedPassword: true,
  passwordHint: true,
  website: true,
  notes: true,
  category: true,
  isFavorite: true,
});

export const insertSubscriptionUsageSchema = createInsertSchema(subscriptionUsage).pick({
  userId: true,
  subscriptionId: true,
  filesCount: true,
  passwordsCount: true,
  aiPromptsCount: true,
  storageUsedBytes: true,
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  paymentId: true,
  userId: true,
  plan: true,
  amount: true,
  currency: true,
  status: true,
  subscriptionId: true,
  invoiceId: true,
  periodStart: true,
  periodEnd: true,
  metadata: true,
});

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
});

export const insertPasswordResetSchema = createInsertSchema(passwordResets).pick({
  email: true,
  otp: true,
  expiresAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type DocumentRecord = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// Backward compatibility
export type FileRecord = DocumentRecord;
export type InsertFile = InsertDocument;

export type JobRecord = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type TextChunkRecord = typeof textChunks.$inferSelect;
export type InsertTextChunk = z.infer<typeof insertTextChunkSchema>;

export type ChatMessageRecord = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type AuthSessionRecord = typeof authSessions.$inferSelect;
export type InsertAuthSession = z.infer<typeof insertAuthSessionSchema>;

export type SubscriptionPlanRecord = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type UserSubscriptionRecord = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

export type AccountCredentialRecord = typeof accountCredentials.$inferSelect;
export type InsertAccountCredential = z.infer<typeof insertAccountCredentialSchema>;

export type SubscriptionUsageRecord = typeof subscriptionUsage.$inferSelect;
export type InsertSubscriptionUsage = z.infer<typeof insertSubscriptionUsageSchema>;

export type PaymentRecord = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type EmailVerificationTokenRecord = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;

export type PasswordResetRecord = typeof passwordResets.$inferSelect;
export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;
