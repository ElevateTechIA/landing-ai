const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyDi-CYWHQQx7xI04liHVSG4JLnRPsH1U_w');

async function listModels() {
  try {
    console.log('Testing different model names without -latest suffix...\n');
    
    // Try the models without specifying latest
    const modelsToTest = [
      'gemini-2.0-flash-exp',
      'gemini-exp-1206',
      'gemini-2.0-flash-thinking-exp-1219'
    ];
    
    for (const modelName of modelsToTest) {
      try {
        console.log(`Testing: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say hello');
        console.log(`✓ SUCCESS with ${modelName}!`);
        console.log(`Response: ${result.response.text()}\n`);
        return modelName;
      } catch (error) {
        console.log(`✗ Failed: ${error.message.substring(0, 100)}...\n`);
      }
    }
    
    console.log('\nNo working model found. Your API key might need to be regenerated or might have restrictions.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listModels();
