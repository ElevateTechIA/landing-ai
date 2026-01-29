import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'No GEMINI_API_KEY found' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try different model names
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-pro',
    'gemini-2.0-flash-exp',
    'gemini-2-flash-exp',
  ];

  const results: any = {};

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "test"');
      const response = await result.response;
      const text = response.text();
      results[modelName] = { success: true, response: text };
    } catch (error: any) {
      results[modelName] = { 
        success: false, 
        error: error.message,
        status: error.status 
      };
    }
  }

  return NextResponse.json({ results });
}
