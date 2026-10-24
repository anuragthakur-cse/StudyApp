import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting (simple in-memory)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, limit = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Input validation schema
const AIRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  previousInteractionId: z.string().optional(),
});

// Mock response for when no API key is configured
function getMockResponse(prompt: string): string {
  return `[🎭 MOCK MODE — No AI API key configured]

यह एक demo response है। Real AI response के लिए:
1. Backend server में GEMINI_API_KEY set करें
2. server/.env file में API key add करें

---

Question detected: "${prompt.slice(0, 100)}..."

Sample Answer Structure (Hindi + English Terms):

**Introduction:**
यह concept Computer Science में बहुत important है।

**Main Points:**
1. **Definition:** यह एक mathematical model है
2. **Working:** Step-by-step process होता है
3. **Example:** Real-world example से समझते हैं
4. **Advantages:** इसके कई फायदे हैं
5. **Disadvantages:** कुछ limitations भी हैं

**Diagram:**
\`\`\`
Input → [Process] → Output
           ↓
        States/Memory
\`\`\`

**Conclusion:**
RGPV exam के लिए यह topic बहुत important है।

---
⚙️ Setup AI: Add GEMINI_API_KEY to server/.env`;
}

// AI Answer endpoint
app.post('/api/ai/answer', async (req, res) => {
  const ip = req.ip || 'unknown';

  // Rate limit
  if (!rateLimit(ip, 30, 60000)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }

  try {
    // Validate input
    const body = AIRequestSchema.parse(req.body);
    const { prompt, previousInteractionId } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return mock response
      return res.json({
        text: getMockResponse(prompt),
        interactionId: 'mock-' + Date.now(),
        isMock: true,
      });
    }

    // Call Gemini API using the @google/genai SDK
    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey });

    const interaction = await client.interactions.create({
      model: 'gemini-3.8-flash',
      input: prompt,
      ...(previousInteractionId && !previousInteractionId.startsWith('mock-')
        ? { previous_interaction_id: previousInteractionId }
        : {}),
      store: true,
    });

    const text = interaction.output_text || '';
    return res.json({
      text,
      interactionId: interaction.id,
      isMock: false,
    });

  } catch (err: any) {
    console.error('AI API error:', err);
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request format', details: err.errors });
    }
    if (err?.status === 401) {
      return res.status(401).json({ error: 'Invalid API key. Check your GEMINI_API_KEY in server/.env' });
    }
    if (err?.status === 429) {
      return res.status(429).json({ error: 'AI API rate limit reached. Please try again later.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to generate answer' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    mode: process.env.GEMINI_API_KEY ? 'AI' : 'mock',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 StudyVault AI Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  GEMINI_API_KEY not set — running in MOCK mode');
    console.log('   Add GEMINI_API_KEY=your_key to server/.env to enable real AI');
  } else {
    console.log('✅ Gemini API key detected — AI mode active');
  }
  console.log('');
});
