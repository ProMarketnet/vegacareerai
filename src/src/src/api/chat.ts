import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { message, model = 'claude' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let response = '';

    if (model === 'claude') {
      const result = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `As an expert career advisor, provide comprehensive guidance on: ${message}

Please structure your response with:
1. Key insights and analysis
2. Actionable recommendations
3. Next steps or follow-up suggestions

Be professional, encouraging, and specific in your advice.`
        }],
      });

      response = result.content[0].type === 'text' ? result.content[0].text : 'Error processing response';
    } else if (model === 'gemini') {
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await geminiModel.generateContent(`As an expert career advisor, provide comprehensive guidance on: ${message}

Please structure your response with:
1. Key insights and analysis
2. Actionable recommendations
3. Next steps or follow-up suggestions

Be professional, encouraging, and specific in your advice.`);
      
      response = result.response.text();
    }

    return res.json({
      content: response,
      model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
