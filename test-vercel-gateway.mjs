import { generateText } from 'ai';

const VERCEL_AI_GATEWAY_API_KEY = process.env.VERCEL_AI_GATEWAY_API_KEY;

console.log('Testing Vercel AI Gateway with image generation...');

try {
  const result = await generateText({
    model: 'google/gemini-2.5-flash-image',
    prompt: 'Generate a simple test image of a red balloon',
    maxTokens: 1000,
  });

  console.log('Success! Response length:', result.text.length);
  console.log('Response preview:', result.text.substring(0, 200) + '...');
  
  // Try to extract base64 image
  const base64Match = result.text.match(/[A-Za-z0-9+/=]{1000,}/);
  if (base64Match) {
    console.log('Found base64 image data:', base64Match[0].length, 'characters');
  } else {
    console.log('No base64 image data found in response');
  }
  
} catch (error) {
  console.error('Error:', error.message);
  console.error('Full error:', error);
}
