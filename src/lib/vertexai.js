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
      config.googleAuthOptions = { credentials };
    } catch (e) {
      console.error('Failed to parse GCP_SERVICE_ACCOUNT_KEY:', e);
    }
  } else {
    // Fallback to the traditional file path method
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath && !path.isAbsolute(credPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.cwd(), credPath);
    }
  }

  vertexClient = new VertexAI(config);
  return vertexClient;
}

/**
 * Returns the generative model configured for image stitching.
 * Uses the latest Gemini 3.1 Flash Image model for multi-image fusion.
 */
export function getStitchingModel() {
  const vertex = getVertexClient();
  return vertex.getGenerativeModel({
    model: 'gemini-3.1-flash-image',
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.1,
    },
  });
}
