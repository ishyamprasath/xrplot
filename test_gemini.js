const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Testing model: gemini-3-flash-preview');
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    });
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

test();
