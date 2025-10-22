# LETS GET A JOB - Resume & Cover Letter Generator

Professional resume and cover letter generator with ATS-friendly LaTeX templates and comprehensive job application tracking.

## Features

### 📝 Resume Builder
- Comprehensive form with drag-and-drop section ordering
- Dynamic sections - enable/disable as needed
- Real-time PDF preview
- ATS-optimized formatting

### 📄 Cover Letter Generator
- Professional cover letter creation
- Customizable content sections
- Recipient information management
- PDF preview before download

### 📊 Job Application Tracker
- Kanban board with drag-and-drop status updates
- Track applications across multiple stages (Applied, Interview, Offer, Rejected)
- Detailed job information with notes
- Status history tracking
- Analytics dashboard
- SQLite database for persistent storage

### 🎨 Modern UI
- Clean, professional black/white/grey theme
- Responsive design
- Intuitive navigation
- Form validation

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: SQLite (better-sqlite3)
- **Validation**: Zod
- **Drag & Drop**: @dnd-kit
- **PDF Generation**: LaTeX (pdflatex)
- **Session Management**: Cookie-based sessions

## Quick Start

### Prerequisites

- Node.js 18+
- LaTeX distribution (TeX Live, MacTeX, or MiKTeX)
- pdflatex command available in PATH

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

```bash
npm run build
npm start
```

## Usage

### Resume Builder
1. Navigate to `/resume` or click "Resume" from home
2. Fill in your personal information, experience, education, skills, and projects
3. Drag and drop to reorder sections
4. Toggle sections on/off as needed
5. Click "Preview PDF" to see the result
6. Click "Download PDF" to save

### Cover Letter Builder
1. Navigate to `/cover-letter` or click "Cover Letter" from home
2. Enter your information and recipient details
3. Write your cover letter content
4. Click "Preview PDF" to review
5. Click "Download PDF" to save

### Job Tracker
1. Navigate to `/tracker` or click "Job Tracker" from home
2. Click "Add Application" to create a new job entry
3. Fill in job details (company, position, date, etc.)
4. Drag cards between columns to update status
5. Click on a card to view/edit details or delete
6. Switch to "Analytics" tab to view statistics

## Project Structure

```
LETS-GET-A-JOB/
├── app/
│   ├── api/
│   │   ├── generate-resume/      # Resume PDF generation
│   │   ├── generate-cover-letter/ # Cover letter PDF generation
│   │   ├── jobs/                 # Job tracker CRUD operations
│   │   ├── resumes/              # Resume version management
│   │   └── cover-letters/        # Cover letter version management
│   ├── resume/                   # Resume builder page
│   ├── cover-letter/             # Cover letter builder page
│   ├── tracker/                  # Job tracker page
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── EnhancedResumeBuilder.tsx
│   ├── ImprovedCoverLetterBuilder.tsx
│   ├── JobTrackerBoard.tsx
│   ├── JobCard.tsx
│   ├── JobDetailsModal.tsx
│   ├── AddJobModal.tsx
│   ├── JobAnalytics.tsx
│   └── PDFPreviewModal.tsx
├── lib/
│   ├── db/                       # Database setup and schema
│   ├── services/                 # Business logic services
│   └── validation/               # Zod schemas
├── types/                        # TypeScript type definitions
├── common/                       # Shared LaTeX files
├── resume/                       # Resume LaTeX templates
├── cover_letter/                 # Cover letter LaTeX templates
└── data/                         # SQLite database (gitignored)
```

## API Endpoints

### Resume & Cover Letter
- `POST /api/generate-resume` - Generate resume PDF
- `POST /api/generate-cover-letter` - Generate cover letter PDF

### Job Tracker
- `GET /api/jobs` - List all job applications
- `POST /api/jobs` - Create new job application
- `GET /api/jobs/[id]` - Get job details
- `PATCH /api/jobs/[id]` - Update job application
- `DELETE /api/jobs/[id]` - Delete job application

### Document Versions (Future)
- `GET /api/resumes` - List saved resume versions
- `POST /api/resumes` - Save resume version
- `GET /api/cover-letters` - List saved cover letter versions
- `POST /api/cover-letters` - Save cover letter version

## Development

### Adding New Features

1. **New Form Fields**: Edit `ResumeBuilder.tsx` or `CoverLetterBuilder.tsx`
2. **New API Endpoints**: Add to `app/api/`
3. **Styling Changes**: Modify Tailwind classes or `globals.css`

### Environment Variables

Create `.env.local` if needed:

```env
# Add any environment variables here
```

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### PDF Generation Fails

- Ensure LaTeX is installed on the system
- Check that parent directory has `common/`, `resume/`, `cover_letter/` folders
- Verify `Makefile` exists in parent directory

### Port Already in Use

```bash
# Use different port
PORT=3001 npm run dev
```

### Build Errors

```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

## Future Enhancements

- [ ] Real-time PDF preview
- [ ] Template selection
- [ ] Save/load drafts
- [ ] Export to different formats
- [ ] AI-powered content suggestions
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Mobile responsive improvements

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - See parent directory for details

## Support

For issues or questions, please open an issue in the repository.

---

**Built with ❤️ using Next.js and Tailwind CSS**

