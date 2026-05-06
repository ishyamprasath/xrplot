import { VertexAI } from '@google-cloud/vertexai';
import path from 'path';

let vertexClient = null;

/**
 * Returns a singleton VertexAI client.
 * Reads credentials from GOOGLE_APPLICATION_CREDENTIALS env var
 * (path to the service account JSON key file).
 */
export function getVertexClient() {
  if (vertexClient) return vertexClient;

  const project = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION || 'us-central1';
  const saKey = process.env.GCP_SERVICE_ACCOUNT_KEY;

  if (!project) {
    throw new Error('GCP_PROJECT_ID environment variable is not set.');
  }

  let config = { project, location };

  // If the full JSON key is provided as a string (Pro Fix for Vercel)
  if (saKey) {
    try {
      const credentials = JSON.parse(saKey);
      if (!credentials.private_key || !credentials.client_email) {
        throw new Error('Service account key missing required fields (private_key, client_email)');
      }
      config.googleAuthOptions = { credentials };
      console.log('[VertexAI] Using service account from GCP_SERVICE_ACCOUNT_KEY');
    } catch (e) {
      console.error('[VertexAI] Failed to parse GCP_SERVICE_ACCOUNT_KEY:', e.message);
      throw new Error(`Invalid GCP_SERVICE_ACCOUNT_KEY: ${e.message}. Please ensure the key is a valid JSON string with proper escaping.`);
    }
  } else {
    // Fallback to the traditional file path method
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath) {
      throw new Error('No Google Cloud credentials found. Please set either GCP_SERVICE_ACCOUNT_KEY (JSON string) or GOOGLE_APPLICATION_CREDENTIALS (file path).');
    }
    if (credPath && !path.isAbsolute(credPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.cwd(), credPath);
    }
    console.log('[VertexAI] Using service account from GOOGLE_APPLICATION_CREDENTIALS file');
  }

  try {
    vertexClient = new VertexAI(config);
    console.log('[VertexAI] Client initialized successfully');
    return vertexClient;
  } catch (e) {
    console.error('[VertexAI] Failed to initialize client:', e);
    throw new Error(`VertexAI initialization failed: ${e.message}. Check your GCP credentials.`);
  }
}

/**
 * Returns the generative model configured for image stitching.
 * Uses Gemini 2.5 Flash model which supports image inputs for multi-image fusion.
 */
export function getStitchingModel() {
  const vertex = getVertexClient();
  return vertex.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.1,
    },
  });
}
