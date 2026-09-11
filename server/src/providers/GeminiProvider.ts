import { LLMProvider } from './LLMProvider';
import { GoogleGenAI } from '@google/genai';

export class GeminiProvider implements LLMProvider {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });
      return response.text || '{}';
    } catch (error: any) {
      throw new Error(`Gemini Provider Error: ${error.message}`);
    }
  }
}