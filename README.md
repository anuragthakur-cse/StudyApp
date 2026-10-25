# StudyVault AI — My Semester Notebook

> **AI-Powered Semester Study Notebook & Exam Preparation System for B.Tech Computer Science Students (RGPV University, Madhya Pradesh)**

StudyVault AI is a full-featured, responsive web application engineered to organize semester-wise subjects, unit-wise syllabus topics, important questions, AI-generated exam-oriented answers, and personally edited study notes in a single unified dashboard.

---

## ✨ Features Overview

### 1. 🎓 Semester & Subject Management
- Manage multiple semesters with academic years and progress tracking.
- Add, edit, or delete subjects with custom university codes (e.g., CS-501, CS-502), colors, and full syllabus topics.
- Pre-loaded with editable **RGPV B.Tech CSE 5th Semester** subjects:
  - **Theory of Computation (TOC)** — CS-501
  - **Analysis and Design of Algorithms (ADA)** — CS-502
  - **Operating Systems (OS)** — CS-503
  - **Computer Organization & Architecture (COA)** — CS-504
  - **Software Engineering (SE)** — CS-505
- Multi-unit management per subject with unit titles, topics, and question counts.

### 2. 📝 Unit-Wise Question Organization & CRUD
- Add, edit, delete, and organize questions categorized by semester, subject, and unit.
- **Fields tracked**: Marks (2, 3, 5, 7, 10), Priority (High, Medium, Low), Question Type (Definition, Short Answer, Long Answer, Comparison, Diagram-Based, Numerical), Status (Not Started, Learning, Answer Saved, Revised), Personal remarks, and Favorites.
- Filter questions by subject, unit, priority, preparation status, and favorites.
- Accidental deletion protection with confirmation dialogs.

### 3. 🤖 Exam-Oriented AI Answer Generator
- Built-in secure backend endpoint connecting to Google Gemini API (`gemini-3.8-flash` via `@google/genai`).
- **Tailored for RGPV Exams**:
  - **Languages**: Hindi explanation with English technical terms (default), English, Simple Hindi, Hinglish.
  - **Marks Formats**: Short Answer, 3-Mark, 5-Mark, 7-Mark RGPV format (default), 10-Mark detailed answer.
  - **Structure**: Formal definitions, step-by-step numbered points, ASCII/Mermaid diagrams, real-world examples, comparison tables, and conclusion summaries.
- **AI Action Tools**:
  - *Make Simpler*
  - *Convert to 7-Mark Format*
  - *Add ASCII/Mermaid Diagram*
  - *Add Real-World Example*
  - *Convert to Bullet Points*
  - *Check Technical Accuracy*
  - *Translate / Reformat*
- **Draft vs. Final Version Separation**: Keep the original AI draft safe while editing your final study answer.
- **Diff Comparison View**: Compare the original AI response against your personal edits side-by-side.

### 4. 💬 Integrated AI Study Assistant
- Context-aware chat assistant that automatically inherits the currently active semester, subject, unit, question, and syllabus.
- Supports multi-turn conversational follow-ups.
- Quick action prompts for instant RGPV exam preparation.

### 5. ✍️ TipTap Rich-Text Notes Editor
- Note-taking workspace supporting headings, lists, tables, code blocks with syntax highlighting, and blockquotes.
- Link notes to semesters, subjects, units, or specific questions.
- One-click export to Markdown (`.md`).
- Automatic background autosave with visual save status.

### 6. 📊 Real-Time Analytics & Dashboard
- Calculated from live local IndexedDB storage (not hardcoded dummy percentages).
- Active semester overview: total subjects, total questions, answered questions, pending questions, and overall preparation percentage.
- Subject-wise progress bars and quick-access shortcuts.
- "Continue Studying" shortcut to jump back to your last visited study item.

### 7. 🃏 Revision & Flashcard Modes
- **List View**: Filter by Favorites, Revised, or Unanswered questions.
- **Flashcard Mode**: Flip through questions with shuffle and reset support.
- **Practice Mode (Hidden Answer)**: Test your memory by hiding the answer until you click "Reveal Answer".
- **One-click "Mark as Revised"** with timestamp tracking.

### 8. 💾 Backup, Export & Import
- **Full Backup**: Export all database tables (semesters, subjects, units, questions, notes) to a single JSON file.
- **Full Restore**: Restore and merge notebook data from previously exported JSON backups.
- **CSV Question Import**: Batch import question banks using CSV (`question,subject,marks,priority,topic`).

### 9. 🎨 Modern UI & Dark Mode
- Dark navy/indigo sidebar (`#1e2a4a`) with light main workspace.
- One-click toggle between light and dark themes.
- Fully responsive layout for desktop, tablet, and mobile with animated drawers.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, React Router v6
- **Rich Text Editor**: TipTap (`@tiptap/react`, `@tiptap/starter-kit`, tables, code blocks)
- **Database**: Dexie.js (IndexedDB for client-side persistence)
- **Backend**: Node.js, Express, TypeScript (`tsx`), CORS, Zod
- **AI Integration**: Google Gemini API via official `@google/genai` SDK (`gemini-3.8-flash`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation

1. **Clone or navigate into the repository**:
   ```bash
   cd StudyApp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure the AI Backend**:
   Copy the example environment file inside `server/`:
   ```bash
   cp server/.env.example server/.env
   ```
   Open `server/.env` and add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   ```
   > 💡 **No API Key? No Problem!**
   > If `GEMINI_API_KEY` is not provided, the backend automatically runs in **Mock Mode**, returning helpful demo structured answers so you can test and explore all UI features without billing.

---

## 🏃 Running the Application

### Option A: Run Both Frontend & Backend Concurrently (Recommended)
```bash
npm run dev:all
```
This starts:
- Frontend on **http://localhost:5173**
- Backend on **http://localhost:3001**

### Option B: Run Frontend & Backend in Separate Terminals

**Terminal 1 (Backend Server):**
```bash
npm run server
```

**Terminal 2 (Frontend Client):**
```bash
npm run dev
```

Visit **http://localhost:5173** in your browser to start studying!

## ☁️ Production Deployment

The frontend and AI backend are deployed separately:

### 1. Deploy the backend

This repository includes a `render.yaml` blueprint for Render. Create a new Render Blueprint from the repository, then set:

```env
GEMINI_API_KEY=your_actual_gemini_api_key
FRONTEND_URL=https://your-app.vercel.app
```

After deployment, verify:

```text
https://your-backend.onrender.com/api/health
```

### 2. Deploy the frontend to Vercel

Import the repository into Vercel with these settings:

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Add this Vercel environment variable:

```env
VITE_API_URL=https://your-backend.onrender.com
```

Redeploy after adding the variable. The AI assistant will then call the deployed backend instead of the local Vite proxy.

> Never add `GEMINI_API_KEY` to Vercel or any `VITE_*` variable. Vite variables are visible in the browser. Keep the Gemini key only in the backend environment.

---

## 🏗️ Production Build

To build the client for production:
```bash
npm run build
```
The optimized assets will be generated in `dist/`.

To preview the production build locally:
```bash
npm run preview
```

---

## 🔒 Security Best Practices

- **Zero Client-Side Secrets**: Gemini API keys are **never** bundled or exposed in frontend code or `localStorage`. All AI calls are routed through the secure Node/Express backend (`/api/ai/answer`).
- **Input Validation**: Backend endpoints validate request bodies using Zod schemas.
- **In-Memory Rate Limiting**: Backend includes IP-based rate limiting to prevent API abuse.
