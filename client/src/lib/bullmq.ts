import { Queue, Worker, Job } from 'bullmq'

// Redis connection configuration
// Note: You'll need to set up Redis connection, preferably with Upstash
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  // For Upstash Redis, use:
  // host: process.env.UPSTASH_REDIS_REST_URL,
  // password: process.env.UPSTASH_REDIS_REST_TOKEN,
}

export interface JobData {
  id: string
  userId: string
  type: string
  payload: any
  createdAt: Date
}

export interface JobResult {
  success: boolean
  data?: any
  error?: string
  completedAt: Date
}

// Job types
export enum JobType {
  FILE_PROCESSING = 'file_processing',
  AI_ANALYSIS = 'ai_analysis',
  IMAGE_GENERATION = 'image_generation',
  AUDIO_TRANSCRIPTION = 'audio_transcription',
  EMAIL_NOTIFICATION = 'email_notification',
  CLEANUP_TEMP_FILES = 'cleanup_temp_files',
}

// Queue instances
export const fileProcessingQueue = new Queue('file-processing', { connection: redisConnection })
export const aiAnalysisQueue = new Queue('ai-analysis', { connection: redisConnection })
export const notificationQueue = new Queue('notification', { connection: redisConnection })

export class JobManager {
  // Add job to queue
  static async addJob(
    queueName: string,
    jobType: JobType,
    data: any,
    options?: {
      delay?: number
      attempts?: number
      priority?: number
    }
  ): Promise<Job> {
    const queue = this.getQueue(queueName)
    
    return queue.add(jobType, {
      ...data,
      createdAt: new Date(),
    }, {
      attempts: options?.attempts || 3,
      delay: options?.delay,
      priority: options?.priority,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    })
  }

  // Get queue by name
  private static getQueue(queueName: string): Queue {
    switch (queueName) {
      case 'file-processing':
        return fileProcessingQueue
      case 'ai-analysis':
        return aiAnalysisQueue
      case 'notification':
        return notificationQueue
      default:
        throw new Error(`Unknown queue: ${queueName}`)
    }
  }

  // Get job status
  static async getJobStatus(queueName: string, jobId: string): Promise<{
    status: string
    progress?: number
    data?: any
    result?: any
    error?: string
  }> {
    const queue = this.getQueue(queueName)
    const job = await queue.getJob(jobId)
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    return {
      status: await job.getState(),
      progress: typeof job.progress === 'number' ? job.progress : undefined,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
    }
  }

  // Cancel job
  static async cancelJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName)
    const job = await queue.getJob(jobId)
    
    if (job) {
      await job.remove()
    }
  }

  // Get queue stats
  static async getQueueStats(queueName: string): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
  }> {
    const queue = this.getQueue(queueName)
    
    return {
      waiting: await queue.getWaiting().then(jobs => jobs.length),
      active: await queue.getActive().then(jobs => jobs.length),
      completed: await queue.getCompleted().then(jobs => jobs.length),
      failed: await queue.getFailed().then(jobs => jobs.length),
    }
  }
}

// Worker processors (these would typically be in separate files or services)
export const createWorkers = () => {
  // File processing worker
  const fileWorker = new Worker('file-processing', async (job: Job<JobData>) => {
    const { type, payload } = job.data
    
    try {
      switch (type) {
        case JobType.FILE_PROCESSING:
          // Process file (resize images, extract metadata, etc.)
          await job.updateProgress(50)
          // Simulate processing
          await new Promise(resolve => setTimeout(resolve, 2000))
          await job.updateProgress(100)
          return { success: true, processedAt: new Date() }
          
        default:
          throw new Error(`Unknown job type: ${type}`)
      }
    } catch (error) {
      console.error('File processing job failed:', error)
      throw error
    }
  }, { connection: redisConnection })

  // AI analysis worker
  const aiWorker = new Worker('ai-analysis', async (job: Job<JobData>) => {
    const { type, payload } = job.data
    
    try {
      switch (type) {
        case JobType.AI_ANALYSIS:
          // Perform AI analysis
          await job.updateProgress(30)
          // Simulate AI processing
          await new Promise(resolve => setTimeout(resolve, 3000))
          await job.updateProgress(100)
          return { success: true, analysis: 'AI analysis complete' }
          
        default:
          throw new Error(`Unknown job type: ${type}`)
      }
    } catch (error) {
      console.error('AI analysis job failed:', error)
      throw error
    }
  }, { connection: redisConnection })

  return { fileWorker, aiWorker }
}