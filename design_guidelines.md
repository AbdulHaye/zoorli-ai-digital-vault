# Zorli AI Vault - Design Guidelines

## Design Approach: Enterprise SaaS with AI Focus

**Selected Approach:** Design System (Utility-Focused)
**Primary System:** Carbon Design System with custom AI-focused adaptations
**Justification:** As a professional AI vault application handling sensitive data, files, and payments, the focus should be on trust, efficiency, and clear information hierarchy rather than flashy visuals.

## Core Design Elements

### A. Color Palette
**Dark Mode Primary (Default):**
- Primary: 220 85% 65% (AI-focused blue)
- Background: 220 15% 8% (Deep dark slate)
- Surface: 220 12% 12% (Elevated surfaces)
- Border: 220 20% 18% (Subtle borders)
- Text Primary: 220 15% 95% (High contrast white)
- Text Secondary: 220 10% 70% (Muted text)

**Light Mode:**
- Primary: 220 85% 45% (Deeper blue for contrast)
- Background: 220 15% 98% (Clean white)
- Surface: 220 10% 95% (Card surfaces)
- Success: 142 65% 45% (File upload success)
- Warning: 38 85% 55% (Payment/auth warnings)

### B. Typography
**Primary Font:** Inter (Google Fonts)
**Accent Font:** JetBrains Mono (for code/API keys)

**Hierarchy:**
- H1: 2.5rem, font-semibold (Dashboard titles)
- H2: 2rem, font-medium (Section headers)
- H3: 1.5rem, font-medium (Card titles)
- Body: 1rem, font-normal (Standard text)
- Caption: 0.875rem, font-normal (Metadata, timestamps)
- Code: 0.875rem, JetBrains Mono (API keys, file hashes)

### C. Layout System
**Spacing Units:** Tailwind 4, 6, 8, 12, 16
- Container padding: p-6
- Card spacing: p-8
- Button padding: px-6 py-3
- Section gaps: space-y-12
- Grid gaps: gap-6

### D. Component Library

**Navigation:**
- Dark sidebar with collapsible sections
- Breadcrumb navigation for file hierarchy
- Tab navigation for vault sections (Files, AI Tools, Payments, Jobs)

**Data Display:**
- File grid with large preview thumbnails
- Table views for transaction history and job queues
- Progress indicators for upload/processing status
- Status badges for file processing, payment status

**Forms:**
- Drag-and-drop file upload zones with dashed borders
- Multi-step forms for AI processing workflows
- Payment form integration with Stripe Elements
- Search bars with real-time filtering

**Core Components:**
- Dashboard cards with subtle shadows and rounded corners
- Modal overlays for file preview and AI configuration
- Toast notifications for upload progress and errors
- Loading skeletons for async operations

**AI-Specific Elements:**
- Chat-style interface for AI interactions
- Processing pipeline visualization
- Token usage meters and billing displays
- Model selection dropdowns with descriptions

### E. Layout Strategy

**Dashboard Layout:**
- Left sidebar navigation (collapsible)
- Main content area with generous whitespace
- Right panel for contextual actions/details when needed
- Full-width tables and grids for data-heavy views

**File Management:**
- Grid view with large thumbnails as default
- List view toggle for detailed metadata
- Hierarchical folder structure navigation
- Bulk action toolbar when items selected

**AI Processing Interface:**
- Split view: configuration panel | preview/results
- Progress tracking with clear status indicators
- History sidebar for previous AI operations

This design prioritizes trust, efficiency, and clear information architecture essential for a professional AI vault application handling sensitive data and financial transactions.