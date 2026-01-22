// Quick test script for chatbot API
const testChatbot = async () => {
  try {
    console.log('Testing chatbot API...');

    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'What services do you offer?' }),
    });

    console.log('Response status:', response.status);

    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
};

testChatbot();
