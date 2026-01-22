const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyDi-CYWHQQx7xI04liHVSG4JLnRPsH1U_w');

async function testModels() {
  const models = [
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-pro',
    'gemini-1.0-pro'
  ];

  for (const modelName of models) {
    try {
      console.log(`\nTesting model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello in one word');
      const response = result.response;
      const text = response.text();
      console.log(`✓ ${modelName} works! Response: ${text}`);
      break; // Stop at first working model
    } catch (error) {
      console.log(`✗ ${modelName} failed: ${error.message}`);
    }
  }
}

testModels();
