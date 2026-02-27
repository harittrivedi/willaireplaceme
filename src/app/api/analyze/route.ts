import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { JSDOM } from 'jsdom';

export const maxDuration = 60; // Allow 60 seconds on Vercel for sequential multi-agent calls

export async function POST(req: NextRequest) {
    try {
        let { profileText, model } = await req.json();

        if (!profileText) {
            return NextResponse.json({ error: 'No profile text provided.' }, { status: 400 });
        }

        // --- LINKEDIN SCRAPER INJECTION ---
        if (profileText.includes('LinkedIn Profile Link:')) {
            const urlMatch = profileText.match(/https:\/\/www\.linkedin\.com\/in\/[^\s]+/);
            if (urlMatch) {
                const targetUrl = urlMatch[0];
                try {
                    // Make a simple fetch request (Warning: LinkedIn heavily rate limits headless browsers)
                    // But we will attempt to grab the public HTML DOM
                    const res = await fetch(targetUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    });
                    const html = await res.text();

                    // Parse with JSDOM
                    const dom = new JSDOM(html);
                    const document = dom.window.document;

                    // --- SECURITY: Aggressive Sanitization ---
                    // Remove all potentially malicious or noisy injection vectors
                    const dangerousElements = document.querySelectorAll('script, style, noscript, iframe, object, embed, form, input, button');
                    dangerousElements.forEach(el => el.remove());

                    let scrapedText = document.body.textContent?.replace(/\s+/g, ' ').trim() || '';

                    // --- SECURITY: Payload Truncation ---
                    // Prevent memory-exhaustion or prompt-injection attacks via massive hidden text walls
                    const MAX_SAFE_LENGTH = 15000;
                    if (scrapedText.length > MAX_SAFE_LENGTH) {
                        scrapedText = scrapedText.substring(0, MAX_SAFE_LENGTH) + "...[TRUNCATED_FOR_SAFETY]";
                    }

                    if (scrapedText && scrapedText.length > 200) {
                        profileText = `Here is the raw scraped text from the user's LinkedIn profile: ${scrapedText}`;
                    } else {
                        throw new Error("LinkedIn blocked the unauthenticated request or returned insufficient data.");
                    }
                } catch (scrapeError: any) {
                    console.error("Scraping failed:", scrapeError);
                    return NextResponse.json({
                        error: 'LinkedIn blocked the automated data extraction. Please use the PDF Resume upload method instead for guaranteed results.'
                    }, { status: 400 });
                }
            }
        }
        // ----------------------------------

        const selectedModel = model || 'gemini-2.5-flash';

        // Universal Wrapper for OpenAI vs Gemini
        const runAgent = async (systemPrompt: string, userPrompt: string, temperature = 0) => {
            if (selectedModel.startsWith('gemini')) {
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
                const response = await ai.models.generateContent({
                    model: selectedModel,
                    contents: userPrompt,
                    config: {
                        systemInstruction: systemPrompt,
                        temperature,
                        responseMimeType: 'application/json',
                    }
                });
                return response.text;
            } else {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
                const completion = await openai.chat.completions.create({
                    model: selectedModel,
                    temperature,
                    response_format: { type: 'json_object' },
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                });
                return completion.choices[0].message.content;
            }
        };

        // Agent 1: The Extractor
        const extSys = `You are a strict, highly analytical HR Extractor. Analyze the raw text of the user's resume/profile, highlighting specific tool stacks, complex system architectures, and systemic impact. Do NOT sugarcoat generic experience. Return strict JSON formatting: {"structured_profile": "detailed comprehensive summary", "vigor_score": number(1-100)}`;
        const extUser = `Analyze this profile carefully: ${profileText}`;
        const extRes = await runAgent(extSys, extUser, 0);
        const extractorResult = JSON.parse(extRes || '{}');
        const vigorScore: number = extractorResult.vigor_score || 50;

        // Agent 2: The Oracle (Domain Research)
        const oracleSys = `You are a hyper-analytical AI Capability Oracle. Research current state-of-the-art AI against the user's specific sub-domain. You must be highly rigorous and objective. Keep your insights EXTREMELY concise, crisp, and high-impact (under 2 minutes of reading time). Use punchy bullet points. Identify exactly which tasks they perform that are highly vulnerable to current LLMs and Agentic automation. Return strict JSON: {"research_insights": "concise, bulleted, objective analysis of AI's threat", "immunity_score": number(1-100)}`;
        const oracleUser = `User Profile: ${extractorResult.structured_profile}`;
        const oracleRes = await runAgent(oracleSys, oracleUser, 0);
        const oracleResult = JSON.parse(oracleRes || '{}');
        const immunityScore: number = oracleResult.immunity_score || 50;

        // Agent 3: The Judge
        const judgeSys = `You are the Architect Level Judge, evaluating the user with extreme technical rigor. Score them strictly against standard 1-100 metrics. Grade stringently for generic or easily automated skills. Reward deep, complex architectural experience and cross-disciplinary mastery. Return strict JSON: {"domain_depth": number, "knowledge_width": number, "domain_variance": number, "experience_context": number}`;
        const judgeUser = `Profile: ${extractorResult.structured_profile}\nAI Research: ${oracleResult.research_insights}`;
        const judgeRes = await runAgent(judgeSys, judgeUser, 0);
        const judgeResult = JSON.parse(judgeRes || '{}');

        // Validate scores
        const domainDepth = judgeResult.domain_depth || 50;
        const knowledgeWidth = judgeResult.knowledge_width || 50;
        const domainVariance = judgeResult.domain_variance || 50;
        const expContext = judgeResult.experience_context || 50;

        // Final Math: Sum all 6 base scores (max 600)
        const totalScore = vigorScore + immunityScore + domainDepth + knowledgeWidth + domainVariance + expContext;
        // Invert the score: high attributes (600/600) = 0/10 risk. Low attributes (0/600) = 10/10 risk.
        const base10Score = 10 - (totalScore / 60);
        const roundedFinalScore = Math.max(0, Math.min(10, Math.round(base10Score * 2) / 2));

        // Agent 4: The Mentor
        const mentorSys = `You are a futuristic, elite Cyber-Mentor. Based on the rigorous AI vulnerability analysis, provide a concrete, step-by-step roadmap to achieve 'System Architect' depth in their exact domain. 
Keep the roadmap EXTREMELY concise, punchy, and fast to read. It should be rapid-fire, high-impact advice.
You MUST provide 3 elaborately detailed, yet concisely worded 'Level-Up Quests'. These quests shouldn't just be 'learn python' - they must involve mastering specific modern architectures, advanced integrations, or deep foundational methodologies that AI cannot easily replicate (e.g. distributed systems consensus, hardware/software codesign).
Return JSON: {"cyber_roadmap": ["short crisp paragraph 1", "short crisp paragraph 2"], "level_up_quests": ["concise, complex task 1", "concise, complex task 2", "concise, complex task 3"]}`;
        const mentorUser = `The user achieved an AI Replacement Probability Score of ${roundedFinalScore}/10 (where 10 is critically vulnerable to automation, and 0 is completely indispensable). Their AI Immunity is ${immunityScore}/100. Profile context: ${extractorResult.structured_profile}. Draft their concise cyber-roadmap and 3 actionable "level-up quests".`;
        const mentorRes = await runAgent(mentorSys, mentorUser, 0.2);
        const mentorResult = JSON.parse(mentorRes || '{}');

        // Compile Final Payload
        const finalReport = {
            finalScore: roundedFinalScore,
            baseScores: {
                vigor: vigorScore,
                immunity: immunityScore,
                depth: domainDepth,
                width: knowledgeWidth,
                variance: domainVariance,
                experience: expContext
            },
            insights: oracleResult.research_insights,
            roadmap: mentorResult.cyber_roadmap || [],
            quests: mentorResult.level_up_quests || []
        };

        return NextResponse.json(finalReport);
    } catch (error: any) {
        console.error('LLM API Error:', error);
        return NextResponse.json(
            { error: 'An error occurred during multi-agent analysis', details: error.message },
            { status: 500 }
        );
    }
}
