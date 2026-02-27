# Project Decisions, Guidance, and Assumptions

This file records the architectural and strategic decisions made during the development of the "Will AI Replace Me" application.

## 1. Core Tech Stack
- **Decision**: Next.js (React) hosted on Vercel.
- **Reason**: Next.js provides secure serverless API routes out-of-the-box, protecting our LLM API keys from the client-side. Vercel allows seamless, instant deployments and has a generous free tier capable of handling ~1,000 users/month at $0 hosting cost.
- **Styling**: Vanilla CSS. Standard Vanilla CSS ensures we can easily hand-craft the premium, glowing Cyber-Retro aesthetic without wrestling against utility-class frameworks.

## 2. Monetization & API Key Strategy
- **Decision**: Freemium "Product-Led Growth" Model.
- **Reason**: Asking users for API keys upfront creates huge friction, especially for non-technical users. Since API costs are incredibly low (using OpenAI gpt-4o-mini or Gemini Flash), we will host the keys securely, offer the core "Score" for free, and charge a micro-transaction to unlock the highly detailed, personalized Cyber-Roadmap PDF report.

## 3. The Multi-Agent Scoring Logic
- **Decision**: 4 sequential agents outputting strictly deterministic 1-100 scores.
- **Reason**: LLMs are non-deterministic. If a user runs the app twice and gets a different score, trust is lost. We strictly enforce `temperature=0`, `top_p=0.1` and cache the exact text hash so immediate reruns instantly return the cached 1-10 scaled mathematical result.

## 4. Input Mechanisms
- **Decision**: Default to LinkedIn PDF or standard Resume PDF upload over scraping.
- **Reason**: Direct LinkedIn scraping is unreliable and frequently blocked by anti-bot measures. Accepting a PDF document export is 100% reliable, respects user data ownership, and circumvents complex scraping logic.
