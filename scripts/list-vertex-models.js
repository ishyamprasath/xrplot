#!/usr/bin/env node

// Script to list available Vertex AI models for your project
// Run with: node scripts/list-vertex-models.js

const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function listModels() {
  try {
    console.log('🔍 Connecting to Vertex AI...\n');
    
    const project = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_LOCATION || 'us-central1';
    
    if (!project) {
      throw new Error('GCP_PROJECT_ID not set in .env.local');
    }
    
    // Initialize VertexAI with same config as our app
    let config = { project, location };
    
    // Try file-based auth first
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath && !path.isAbsolute(credPath)) {
      config.googleAuthOptions = {
        credentials: JSON.parse(fs.readFileSync(path.resolve(process.cwd(), credPath), 'utf8'))
      };
    }
    
    const vertex = new VertexAI(config);
    console.log(`✅ Connected to project: ${project}`);
    console.log(`📍 Location: ${location}\n`);
    
    // List models
    const aiplatform = require('@google-cloud/aiplatform');
    const { ModelServiceClient } = aiplatform.v1;
    
    const client = new ModelServiceClient({
      apiEndpoint: `${location}-aiplatform.googleapis.com`,
      projectId: project,
      authClient: vertex.auth
    });
    
    const [models] = await client.listModels({
      parent: `projects/${project}/locations/${location}`
    });
    
    console.log(`\n📋 Found ${models.length} models:\n`);
    
    // Filter for generative models
    const generativeModels = models.filter(model => 
      model.name.includes('gemini') || 
      model.name.includes('imagen') ||
      model.name.includes('publishers/google')
    );
    
    console.log('🎨 Generative Models (for stitching):\n');
    generativeModels.forEach(model => {
      const modelId = model.name.split('/').pop();
      const displayName = model.displayName || modelId;
      console.log(`  • ${modelId} - ${displayName}`);
      
      // Show supported actions
      if (model.supportedExportFormats && model.supportedExportFormats.length > 0) {
        console.log(`    Export formats: ${model.supportedExportFormats.join(', ')}`);
      }
    });
    
    // Find the best model for image stitching
    const imageModels = generativeModels.filter(model => 
      model.name.includes('flash-image') || 
      model.name.includes('pro-vision') ||
      model.name.includes('gemini-2.5')
    );
    
    console.log('\n🎯 Recommended models for image stitching:\n');
    if (imageModels.length > 0) {
      imageModels.forEach(model => {
        const modelId = model.name.split('/').pop();
        console.log(`  • ${modelId} - ${model.displayName || modelId}`);
      });
    } else {
      console.log('  • gemini-2.5-flash (latest, supports images)');
      console.log('  • gemini-2.5-pro (higher quality, supports images)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Unable to authenticate')) {
      console.log('\n💡 Authentication tips:');
      console.log('1. Ensure GCP_PROJECT_ID is set in .env.local');
      console.log('2. Ensure GOOGLE_APPLICATION_CREDENTIALS points to valid service account JSON');
      console.log('3. Ensure service account has "Vertex AI User" role');
    }
    
    process.exit(1);
  }
}

listModels();
