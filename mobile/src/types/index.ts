export interface User {
  id: string;
  email: string | null;
  username: string;
  role: string;
  profilePictureUrl?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  filename: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  downloadUrl: string | null;
  extractedText: string | null;
  embeddingStatus: string | null;
  shareToken: string | null;
  isShared: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  files?: any[];
  timestamp: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  priceMonthly: number;
  stripePriceId: string | null;
  maxFiles: number;
  maxAIPrompts: number;
  features: string[] | null;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId: string | null;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountCredential {
  id: string;
  userId: string;
  serviceName: string;
  username: string;
  password: string; // Decrypted password from API
  encryptedPassword?: string;
  passwordHint?: string | null;
  website?: string | null;
  notes?: string | null;
  category?: string | null;
  isFavorite?: boolean;
  lastUsed?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobRecord {
  id: string;
  userId: string;
  jobType: string;
  status: string;
  data: any;
  result: any | null;
  progress: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUsage {
  filesCount: number;
  aiPromptsCount: number;
  storageUsedBytes: number;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}
