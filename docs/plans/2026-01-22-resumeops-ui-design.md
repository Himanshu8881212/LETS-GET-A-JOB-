# ResumeOps UI Redesign
Date: 2026-01-22
Status: Approved

## Goals
- Full layout rework for a corporate/professional product
- Unified app shell with sidebar, top bar, consistent cards
- Preserve existing data flow and behavior
- Improve readability, hierarchy, and cross-section consistency

## Branding
- Name: ResumeOps
- Tone: corporate, conservative
- Palette: ink #0f172a, slate #1f2937, steel #64748b, mist #f8fafc, accent blue #1e3a8a
- Typography: Newsreader (headings), IBM Plex Sans (body), IBM Plex Mono (data labels)

## Layout Architecture
- Single route with activeTab switching, wrapped in AppShell
- Sidebar: logo, nav items (Dashboard, Resume Builder, Cover Letter Builder, ATS Evaluator, ATS History, Job Tracker), secondary actions (Samples, Settings)
- Top bar: page title, breadcrumbs, contextual CTAs

## Screen Plans
### Dashboard
- Hero with value statement and primary actions
- Stat row (resume count, cover letter count, evaluations)
- Unified recent docs table with type badges
- Reference library cards for samples

### Resume Builder
- Left rail for section ordering/toggles with completion dots
- Main form canvas with grouped cards per section
- Right sticky actions/preview rail (preview, download, lineage, AI)

### Cover Letter Builder
- Mirror resume layout with section rail and action rail

### ATS Evaluator
- Two-pane layout: inputs left, results right
- Restyled loading overlay, score summary, charts, expandable diagnostics

### ATS History
- Split pane list/detail with search and filters

### Job Tracker
- Segmented control for Board/Analytics
- Metrics strip above board, persistent Add Application CTA

## Component System
- New primitives in components/ui: AppShell, SidebarNav, PageHeader, Card, StatCard, EmptyState, SectionTabs
- Re-skin Button/Input/Textarea/ProgressBar/Toast to brand palette and typography
- Shared modal frame for PDF preview and download modals
- Table shell styling (sticky header, zebra rows, dense spacing)

## Data Flow + Error Handling
- No changes to API shapes or state logic
- Existing error/empty/loading states preserved with new styling
- Maintain auto-save, previews, and lineage behavior

## Testing
- Manual regression: create resume, preview/download, cover letter, ATS evaluation, job add/update
- Run existing lint/test scripts if present; otherwise record manual verification
