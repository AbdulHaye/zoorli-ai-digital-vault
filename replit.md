# Zorli AI Vault - Project Documentation

## Overview
Zorli AI Vault is a full-stack TypeScript application, built with a Next.js-like architecture using React and Express. Its primary purpose is to provide secure file management, enhanced with AI-powered analysis, integrated payment processing, and efficient background job queues. The project aims to offer a robust and scalable platform for secure digital asset management and intelligent data processing, targeting individuals and businesses requiring advanced security and AI capabilities.

## User Preferences
- Prefers comprehensive, well-documented code structure
- Values security and best practices
- Wants fully functional prototypes with proper TypeScript typing
- Appreciates clean, maintainable architecture patterns

## System Architecture

### UI/UX Decisions
The project includes both web and mobile applications.
**Web Application**: Frontend uses React 18 with TypeScript, styled using TailwindCSS and Shadcn/ui. Navigation is client-side with `wouter` for a SPA experience, including role-based access control. Landing page features a Password Vault section and comprehensive pricing displaying three subscription tiers (Free $0, Basic $9.97, Plus $19.97). Admin dashboard includes a personalized greeting and displays user information appropriately for admin roles. Smart Finder is available as both a floating chatbot and a dedicated full-page interface with instant offline persistence, cross-device sync, voice recording, and AI prompt limit enforcement. Chat history syncs between floating and dedicated modes. Dashboard integrates an interactive AI search input.

**Mobile Application**: A production-ready React Native mobile app with Expo SDK 54 (React Native 0.81.5, React 19.1) and TypeScript. Provides complete feature parity with the web version, including native mobile features and forgot password functionality. Landing screen features "How It Works" and Password Vault sections, plus comprehensive pricing. Dashboard includes an interactive AI search input. Uses React Navigation for role-based tab navigation:
- **Admin Users**: 3-tab bottom navigation (Admin Dashboard, Admin Settings, Payments) with admin-specific features including user management, statistics, and transaction history.
- **Regular Users**: 5-tab bottom navigation (Dashboard, Vault, AI Assistant, Passwords, Profile) with full app features.
Authentication uses SecureStore for JWT token persistence and role detection for access control. Profile picture loading supports various URL types.

### Technical Implementations
- **Core Functionality**: Secure file uploads, AI analysis, subscription system, AES-256-GCM encrypted password vault, and Admin Dashboard.
- **Backend**: Express.js and Node.js for API routes, file handling, and integrations.
- **Frontend (Web)**: React 18, TypeScript, TailwindCSS, Shadcn/ui, and TanStack Query.
- **Frontend (Mobile)**: React Native with Expo SDK 54, TypeScript, React Navigation, Expo modules, and SecureStore.
- **Database Operations**: Supabase PostgreSQL with Drizzle ORM.
- **Background Jobs**: BullMQ, leveraging Redis for job queues.
- **Storage**: Supabase Storage for all file operations in a private `documents` bucket, with AES-256-GCM encryption at rest. All file access goes through authenticated server endpoints.
- **Security**: Zod for input validation, secure environment variables, CORS, security headers, robust error handling, cross-account data isolation, reactive authentication guards, comprehensive AES-256-GCM encryption for sensitive data, rate limiting, protected endpoints, prompt injection sanitization, and webhook idempotency.
- **Payment Processing**: Production-ready Stripe Checkout Sessions integration with server-side session creation, metadata-based user tracking, server-side price/plan validation, and synchronous webhook handling for updating user, subscription, and payment tables atomically with retry logic.
- **Feature Specifications**:
    - **Authentication**: JWT token-based login, registration, validation, and logout. Usernames generated from first name + last name. Email verification required before sign-in (admin users bypass). Signup does not create auth session — user must verify email first. Sign-in blocks unverified users with a 403 `EMAIL_NOT_VERIFIED` code and shows an inline alert with "Resend verification email" button. Signup form shows a verification card with 5-second countdown auto-redirect to sign-in.
    - **Email Verification**: `POST /api/auth/resend-verification` endpoint (rate-limited 3/15min) allows users to request a new verification email. `GET /api/auth/verify-email?token=...` verifies email and creates auth session for immediate login.
    - **Forgot Password System**: Password reset using 6-digit OTP codes with 10-minute expiry. Rate-limited 3/15min.
    - **Profile Customization**: Profile picture uploads and username changes.
    - **File Management**: Upload, retrieve, delete files with metadata and subscription limits. Supports batch deletion and image preview modal. Document filter includes PDF, DOCX, XLSX, DOC, XLS, and PPTX files.
    - **Subscription Management**: Access to plans, status, usage statistics, and Stripe integration.
    - **Password Vault**: Securely create, retrieve, update, delete encrypted credentials using AES-256-GCM. Supports batch deletion.
    - **User Dashboard**: Real-time usage statistics.
    - **Admin Dashboard**: Interface for subscription metrics, user management, and payment transactions.
    - **AI Services**: Endpoints for text analysis and image generation with usage tracking.
    - **Smart Finder (AI Chat Assistant)**: Conversational document assistant using vector search (RAG) and GPT-4o-mini. Features include intelligent document labeling, query expansion, strict-scope responses, OpenAI Vision (GPT-4o) for OCR, pdf-parse for digital PDFs, chunking, and cross-device chat history sync.
    - **Job Management**: Track user-specific background job statuses.

### Design System - Zorli Brand Kit
The application uses the **Zorli Brand Kit**, providing consistent branding and visual identity.
**Color Palette**: Includes Vault Blue (#2B6CB0) as the primary brand color, Sky Trust, Soft Cloud, Warm Stone, Deep Slate, Success Green, and Error Red, along with a Vault Blue shade scale.
**Typography**: Primary font is Inter. Heading styles are semi-bold, Vault Blue, with consistent bottom margins. Border radius for components is Small (8px) and Medium (12px). Subtle shadow variants are used for depth.
**Implementation**:
- **Web App**: TailwindCSS theme extended with Zorli colors via CSS variables; utility classes provide enhanced styling.
- **Mobile App**: React Native StyleSheet theme exports Colors, Typography, Spacing, BorderRadius, Shadows, and pre-built ComponentStyles for consistent mobile UI.

## External Dependencies
- **Database**: Supabase PostgreSQL
- **Object Storage**: Supabase Storage
- **AI Services**: OpenAI (GPT-4o, GPT-4o-mini, DALL-E 3)
- **Payment Processing**: Stripe (Stripe Elements, Webhooks, Checkout)
- **Job Queue**: BullMQ (requires Redis)
- **ORM**: Drizzle ORM
- **File Uploads**: Multer (web), Expo native pickers (mobile)
- **Mobile Framework**: Expo SDK 52 with React Native
- **Text Extraction**: pdf-parse, OpenAI Vision GPT-4o, sharp, mammoth, xlsx, pptx2json/officeparser