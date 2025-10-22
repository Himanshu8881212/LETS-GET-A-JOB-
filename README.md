# 🎯 Professional Resume & Cover Letter Generator

A modern, production-ready web application for creating ATS-compatible resumes and cover letters with beautiful UI and LaTeX-powered PDF generation.

## ✨ Features

- 🎨 **Modern Web Interface** - Clean black/white/grey theme, responsive design
- 📝 **Smart Resume Builder** - 12+ optional sections, drag-and-drop reordering
- 💼 **Professional Cover Letters** - Guided creation with multiple paragraphs
- 🚀 **Backend PDF Generation** - All LaTeX processing on server
- 💾 **Auto-Save** - Never lose your work with LocalStorage backup
- 👁️ **Live PDF Preview** - See before you download
- ✅ **ATS-Compatible** - Clean, parseable PDFs optimized for applicant tracking systems

## 🏗️ Architecture

```
Frontend (React/Next.js) → API Routes → LaTeX Engine → PDF Output
```

All LaTeX processing happens on the backend - frontend only handles UI and data collection.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **LaTeX**: `brew install --cask mactex` (macOS) or `sudo apt-get install texlive-full` (Ubuntu)
- **Make** (usually pre-installed)

### Installation

```bash
git clone https://github.com/Himanshu8881212/LETS-GET-A-JOB-.git
cd LETS-GET-A-JOB-
cd web-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
cd web-app
npm run build
npm start
```

## 🎯 Usage

### Resume Builder
1. Click "Resume Builder"
2. Fill in personal info, summary, skills, experience, etc.
3. Toggle/reorder sections in Section Manager
4. Preview PDF
5. Download

### Cover Letter Builder
1. Click "Cover Letter Builder"
2. Fill in your info, recipient details, and content
3. Preview & Download

## 🔧 Technical Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, LaTeX (pdflatex)
- **Features**: Auto-save, Form validation, Toast notifications, PDF preview

## 📝 API Endpoints

### `POST /api/generate-resume`
Generates resume PDF from form data.

### `POST /api/generate-cover-letter`
Generates cover letter PDF.

## 🎨 Key Features

- **Section Manager**: Toggle and reorder sections
- **Auto-Save**: Saves every second to LocalStorage
- **PDF Preview**: View before downloading
- **Smart Empty State**: Only shows sections with actual data

## 🚀 Deployment

### Vercel
```bash
npm i -g vercel
cd web-app
vercel
```

Ensure LaTeX is installed on deployment server.

## 🔍 Troubleshooting

**PDF Generation Fails**: Check `pdflatex --version`  
**Port in Use**: `PORT=3001 npm run dev`  
**Build Errors**: `rm -rf .next node_modules && npm install`

## 📄 License

MIT License

---

**Made with ❤️ for job seekers everywhere**
