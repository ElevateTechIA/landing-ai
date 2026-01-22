// Test to list available Gemini models
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Try different model names
    const modelNames = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-exp'
    ];

    for (const modelName of modelNames) {
      try {
        console.log(`\nTesting model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say hello in one word');
        const response = await result.response;
        const text = response.text();
        console.log(`✓ ${modelName} works! Response: ${text}`);
        break; // Found a working model
      } catch (error) {
        console.log(`✗ ${modelName} failed: ${error.message.split('\n')[0]}`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listModels();
