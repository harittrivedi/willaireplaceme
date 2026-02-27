# Will AI Replace Me? - System Diagnostic

This application performs a rigorous, multi-agent AI vulnerability diagnostic on your career trajectory. By analyzing your Resume (PDF) or LinkedIn Profile, the AI agents determine your **AI Replacement Probability Score** (on a scale of 0-10, where 10 means Highly Vulnerable) and identify precise gaps in your skill tree.

## Features
- **Multi-Agent Orchestration**: Specialized AI Agents (Extractor, Oracle, Judge, Mentor) work sequentially to provide brutal, realistic feedback.
- **Cyber-Retro UX**: A stunning neon aesthetic with CRT scanline animations and dynamic terminal logs, fully responsive for flawless display on mobile devices.
- **Readable Outputs**: Complete `react-markdown` integration and strict LLM prompting ensure detailed reports are layman-friendly and highly legible.
- **Deterministic Caching**: Saves API bandwidth by safely hashing and caching payloads locally.
- **Vercel Native**: Employs `cheerio` for ESM-compliant Next.js Serverless processing.

---

## 🚀 How to Deploy to Vercel (Step-by-Step)

This Next.js application is 100% ready to be deployed to Vercel. I have already initialized the local Git repository for you. 

### Step 1: Push to GitHub
1. Go to [GitHub](https://github.com/new) and create a new **empty repository** (do not add a README, .gitignore, or license).
2. Open your terminal in this project folder (`C:\Users\harit\Will_Ai_Replace_me`).
3. Run the following commands to link your local code to your new GitHub repo and push it:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel
1. Log into [Vercel](https://vercel.com/) with your GitHub account.
2. Click **"Add New..." > "Project"**.
3. Import the GitHub repository you just created.
4. Open the **"Environment Variables"** section before clicking deploy, and add your API Keys:
   - `OPENAI_API_KEY` = `your_openai_key`
   - `GEMINI_API_KEY` = `your_gemini_key`
5. Click **Deploy**! Vercel will automatically detect Next.js and build the application.

---

## Local Development
To run this project locally:
1. Create a `.env` file in the root directory and add your keys.
2. Run `npm install`
3. Run `npm run dev`
4. Open `http://localhost:3000`
