import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    const result = await model.generateContent('Say hello');
    const response = result.response;
    const text = response.text();

    return NextResponse.json({
      response: text,
      apiKeySet: !!process.env.GEMINI_API_KEY
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        apiKeySet: !!process.env.GEMINI_API_KEY
      },
      { status: 500 }
    );
  }
}
