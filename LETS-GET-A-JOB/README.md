# Resume & Cover Letter Generator - Web App

Modern React web interface for creating professional resumes and cover letters.

## Features

- 🎨 **Beautiful UI** - Clean, modern interface built with Next.js and Tailwind CSS
- 📝 **Step-by-Step Builder** - Guided process for creating resumes
- 🔄 **Real-time Preview** - See changes as you type
- 📥 **PDF Generation** - Automatic LaTeX compilation to PDF
- 💾 **Auto-save** - Never lose your work
- 🎯 **Smart Forms** - Dynamic fields that adapt to your needs

## Tech Stack

- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Language**: TypeScript
- **Backend**: Next.js API Routes
- **PDF Generation**: LaTeX (via parent directory)

## Quick Start

### 1. Install Dependencies

```bash
cd web-app
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

## Project Structure

```
web-app/
├── app/
│   ├── api/
│   │   ├── generate-resume/
│   │   │   └── route.ts          # Resume generation API
│   │   └── generate-cover-letter/
│   │       └── route.ts          # Cover letter generation API
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/
│   ├── ResumeBuilder.tsx         # Resume builder component
│   └── CoverLetterBuilder.tsx    # Cover letter builder component
├── public/                       # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## How It Works

### Resume Builder

1. **Personal Info** - Enter your contact details
2. **Summary & Skills** - Add professional summary and skills
3. **Experience** - Add up to 10 work experiences with bullets
4. **Projects** - Add up to 10 projects
5. **Education** - Add educational background
6. **Generate** - Creates RESUME_DATA.tex and compiles PDF

### Cover Letter Builder

1. **Your Info** - Enter your contact details
2. **Recipient** - Company and hiring manager details
3. **Content** - Opening, body paragraphs (1-5), and closing
4. **Generate** - Creates COVER_LETTER_DATA.tex and compiles PDF

### API Endpoints

#### POST `/api/generate-resume`

Generates resume PDF from form data.

**Request Body:**
```json
{
  "personalInfo": { ... },
  "summary": "...",
  "skills": { ... },
  "experiences": [ ... ],
  "projects": [ ... ],
  "education": [ ... ]
}
```

**Response:** PDF file

#### POST `/api/generate-cover-letter`

Generates cover letter PDF from form data.

**Request Body:**
```json
{
  "personalInfo": { ... },
  "recipient": { ... },
  "content": {
    "opening": "...",
    "bodyParagraphs": [ ... ],
    "closing": "..."
  }
}
```

**Response:** PDF file

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

