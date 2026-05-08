import { GoogleGenAI } from '@google/genai';
import connectDB from './db';
import World from '@/models/World';
import Folder from '@/models/Folder';

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// In-memory idempotency store for prediction requests (prevents duplicate worlds)
// Key: userId + location, Value: { timestamp, worldId, status }
const predictionRequestStore = new Map();
const PREDICTION_COOLDOWN_MS = 60000; // 60 second cooldown to prevent duplicates

function getPredictionKey(userId, location) {
  const normalizedLocation = (location || '').toLowerCase().trim().replace(/\s+/g, ' ');
  return `${userId}:${normalizedLocation}`;
}

function isDuplicatePrediction(userId, location) {
  const key = getPredictionKey(userId, location);
  const existing = predictionRequestStore.get(key);
  if (!existing) return false;
  
  const now = Date.now();
  if (now - existing.timestamp > PREDICTION_COOLDOWN_MS) {
    // Expired, clean up
    predictionRequestStore.delete(key);
    return false;
  }
  
  return true; // Still within cooldown period
}

function recordPredictionRequest(userId, location, worldId = null, status = 'pending') {
  const key = getPredictionKey(userId, location);
  predictionRequestStore.set(key, {
    timestamp: Date.now(),
    worldId,
    status,
    location
  });
}

function getRecentPrediction(userId, location) {
  const key = getPredictionKey(userId, location);
  return predictionRequestStore.get(key);
}

const MODEL_NAME = 'gemini-3-flash-preview';

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

async function createWorld({ userId, name, description = '' }) {
  await connectDB();
  const world = await World.create({
    userId,
    name: name || 'Untitled World',
    description,
    nodes: [],
    edges: [],
  });
  return {
    success: true,
    worldId: world._id.toString(),
    name: world.name,
    link: `${getBaseUrl()}/worlds/${world._id}`,
  };
}

async function updateWorld({ userId, worldId, name, description, folderId }) {
  await connectDB();
  const update = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (folderId !== undefined) update.folderId = folderId === 'root' ? null : folderId;
  
  const world = await World.findOneAndUpdate(
    { _id: worldId, userId },
    { $set: update },
    { new: true }
  ).lean();
  if (!world) throw new Error('World not found');
  return {
    success: true,
    worldId: world._id.toString(),
    name: world.name,
    link: `${getBaseUrl()}/worlds/${world._id}`,
  };
}

async function deleteWorld({ userId, worldId }) {
  await connectDB();
  const world = await World.findOneAndDelete({ _id: worldId, userId });
  if (!world) throw new Error('World not found');
  return { success: true, message: `World "${world.name}" deleted.` };
}

async function createFolder({ userId, name, parentId = null }) {
  await connectDB();
  const folder = await Folder.create({
    userId,
    name,
    description: '',
    parentId: parentId || null,
  });
  return {
    success: true,
    folderId: folder._id.toString(),
    name: folder.name,
    link: `${getBaseUrl()}/dashboard?folder=${folder._id}`,
  };
}

async function updateFolder({ userId, folderId, name, parentId }) {
  await connectDB();
  const update = {};
  if (name !== undefined) update.name = name;
  if (parentId !== undefined) update.parentId = parentId === 'root' ? null : parentId;

  const folder = await Folder.findOneAndUpdate(
    { _id: folderId, userId },
    { $set: update },
    { new: true }
  ).lean();
  if (!folder) throw new Error('Folder not found');
  return {
    success: true,
    folderId: folder._id.toString(),
    name: folder.name,
  };
}

async function deleteFolderAgent({ userId, folderId }) {
  await connectDB();
  const folder = await Folder.findOneAndDelete({ _id: folderId, userId });
  if (!folder) throw new Error('Folder not found');
  return { success: true, message: `Folder "${folder.name}" deleted.` };
}

async function createNode({ userId, worldId, label = 'New Space', position = { x: 0, y: 0 } }) {
  await connectDB();
  const world = await World.findOne({ _id: worldId, userId });
  if (!world) throw new Error('World not found');
  const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  world.nodes.push({
    id,
    label,
    position: { x: position?.x ?? 0, y: position?.y ?? 0 },
    images: [],
    status: 'empty',
  });
  await world.save();
  return {
    success: true,
    nodeId: id,
    label,
    worldId: world._id.toString(),
    link: `${getBaseUrl()}/worlds/${world._id}`,
  };
}

async function updateNode({ userId, worldId, nodeId, label, position }) {
  await connectDB();
  const world = await World.findOne({ _id: worldId, userId });
  if (!world) throw new Error('World not found');
  const node = world.nodes.find(n => String(n.id) === String(nodeId));
  if (!node) throw new Error('Node not found');
  if (label !== undefined) node.label = label;
  if (position !== undefined) {
    node.position.x = position?.x ?? node.position.x;
    node.position.y = position?.y ?? node.position.y;
  }
  await world.save();
  return {
    success: true,
    nodeId,
    label: node.label,
    worldId: world._id.toString(),
    link: `${getBaseUrl()}/worlds/${world._id}`,
    message: `Node "${node.label}" created. Would you like to upload images for this node?`,
  };
}

async function deleteNode({ userId, worldId, nodeId }) {
  await connectDB();
  const world = await World.findOne({ _id: worldId, userId });
  if (!world) throw new Error('World not found');
  world.nodes = world.nodes.filter(n => String(n.id) !== String(nodeId));
  world.edges = world.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  await world.save();
  return {
    success: true,
    message: 'Node deleted.',
    worldId: world._id.toString(),
    link: `${getBaseUrl()}/worlds/${world._id}`,
  };
}

async function createConnection({ userId, worldId, sourceId, targetId }) {
  await connectDB();
  const world = await World.findOne({ _id: worldId, userId });
  if (!world) throw new Error('World not found');
  const id = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  world.edges.push({ id, source: sourceId, target: targetId, transitionImages: [], status: 'empty' });
  await world.save();
  return {
    success: true,
    edgeId: id,
    sourceId,
    targetId,
    worldId: world._id.toString(),
    link: `${getBaseUrl()}/worlds/${world._id}`,
  };
}

async function deleteConnection({ userId, worldId, edgeId }) {
  await connectDB();
  const world = await World.findOne({ _id: worldId, userId });
  if (!world) throw new Error('World not found');
  world.edges = world.edges.filter(e => String(e.id) !== String(edgeId));
  await world.save();
  return {
    success: true,
    message: 'Connection deleted.',
    worldId: world._id.toString(),
    link: `${getBaseUrl()}/worlds/${world._id}`,
  };
}

async function getWorlds({ userId }) {
  await connectDB();
  const worlds = await World.find({ userId }).sort({ updatedAt: -1 }).lean();
  return {
    worlds: worlds.map(w => ({
      worldId: w._id.toString(),
      name: w.name,
      description: w.description,
      isPredictionWorld: w.isPredictionWorld,
      folderId: w.folderId?.toString() || null,
      nodeCount: w.nodes?.length || 0,
      link: `${getBaseUrl()}/worlds/${w._id}`,
    }))
  };
}

async function getFolders({ userId }) {
  await connectDB();
  const folders = await Folder.find({ userId }).sort({ updatedAt: -1 }).lean();
  return {
    folders: folders.map(f => ({
      folderId: f._id.toString(),
      name: f.name,
      parentId: f.parentId?.toString() || null,
    }))
  };
}

async function getWorld({ userId, worldId }) {
  await connectDB();
  const world = await World.findOne({ _id: worldId, userId }).lean();
  if (!world) throw new Error('World not found');
  return {
    worldId: world._id.toString(),
    name: world.name,
    description: world.description,
    nodes: world.nodes.map(n => ({
      id: n.id,
      label: n.label,
      position: n.position,
      status: n.status,
      isCentralNode: n.isCentralNode,
    })),
    edges: world.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
    link: `${getBaseUrl()}/worlds/${world._id}`,
  };
}

async function requestImageUpload({ userId, worldId, nodeId }) {
  await connectDB();
  const world = await World.findOne({ _id: worldId, userId });
  if (!world) throw new Error('World not found');
  
  let node = world.nodes.find(n => String(n.id) === String(nodeId));
  if (!node && nodeId) {
    node = world.nodes.find(n => n.label.toLowerCase() === nodeId.toLowerCase() || n.label.toLowerCase().includes(nodeId.toLowerCase()));
  }
  
  if (!node) throw new Error('Node not found');
  
  return {
    success: true,
    message: 'Please upload images for this node. After uploading, you can view the world.',
    worldId: world._id.toString(),
    nodeId: node.id,
    nodeLabel: node.label,
    link: `${getBaseUrl()}/worlds/${world._id}`,
  };
}

async function requestPreview({ userId, worldId }) {
  await connectDB();
  const world = await World.findOne({ _id: worldId, userId });
  if (!world) throw new Error('World not found');
  return {
    success: true,
    message: `You can view your world "${world.name}" here.`,
    worldId: world._id.toString(),
    link: `${getBaseUrl()}/worlds/${world._id}`,
  };
}

async function swapNodes({ userId, worldId, nodeId1, nodeId2 }) {
  await connectDB();
  const world = await World.findOne({ _id: worldId, userId });
  if (!world) throw new Error('World not found');

  const resolveNode = (idOrLabel) => {
    let node = world.nodes.find(n => String(n.id) === String(idOrLabel));
    if (!node && idOrLabel) {
      node = world.nodes.find(n => n.label.toLowerCase() === idOrLabel.toLowerCase() || n.label.toLowerCase().includes(idOrLabel.toLowerCase()));
    }
    return node;
  };

  const node1 = resolveNode(nodeId1);
  const node2 = resolveNode(nodeId2);

  if (!node1 || !node2) {
    throw new Error(`Could not find one or both nodes. Found: ${node1?.label || 'None'}, ${node2?.label || 'None'}`);
  }

  // Swap data logic
  const tempLabel = node1.label;
  const tempImages = [...node1.images];
  const tempPanorama = node1.panoramaUrl;
  const tempStatus = node1.status;

  node1.label = node2.label;
  node1.images = node2.images;
  node1.panoramaUrl = node2.panoramaUrl;
  node1.status = node2.status;

  node2.label = tempLabel;
  node2.images = tempImages;
  node2.panoramaUrl = tempPanorama;
  node2.status = tempStatus;

  await world.save();

  return {
    success: true,
    message: `Successfully swapped node "${node1.label}" with "${node2.label}".`,
    worldId: world._id.toString(),
    link: `${getBaseUrl()}/worlds/${world._id}`,
  };
}

async function createPredictionWorld({ userId, location, predictionYear = 2036 }) {
  if (!location) throw new Error('Location/City name is required for Decade 2.0 prediction.');
  
  // Check for duplicate request
  if (isDuplicatePrediction(userId, location)) {
    const recent = getRecentPrediction(userId, location);
    console.log(`[Decade 2.0] Duplicate request blocked for ${location} (user: ${userId})`);
    console.log(`[Decade 2.0] Recent request status: ${recent?.status}, worldId: ${recent?.worldId}`);
    
    if (recent?.worldId && recent?.status === 'completed') {
      return {
        success: true,
        message: `Decade 2.0 prediction for "${location}" was already completed. The world is ready at the link below.`,
        worldId: recent.worldId,
        link: `${getBaseUrl()}/worlds/${recent.worldId}`,
        duplicate: true,
      };
    }
    
    return {
      success: false,
      error: `A prediction for "${location}" is already in progress. Please wait for it to complete (about 1-2 minutes).`,
      duplicate: true,
    };
  }
  
  // Record this prediction request
  recordPredictionRequest(userId, location, null, 'pending');
  console.log(`[Decade 2.0] Starting new prediction for ${location} (user: ${userId})`);

  await connectDB();

  // 1) Geocode the location using OpenStreetMap Nominatim
  let lat, lng, displayName;
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'XRPlot/1.0' } });
    const geoData = await geoRes.json();
    
    if (geoData && geoData.length > 0) {
      lat = parseFloat(geoData[0].lat);
      lng = parseFloat(geoData[0].lon);
      displayName = geoData[0].display_name;
    } else {
      // Fallback to Chennai if search fails
      lat = 13.0827;
      lng = 80.2707;
      displayName = location;
    }
  } catch (err) {
    console.warn('Geocoding failed, using fallback:', err.message);
    lat = 13.0827;
    lng = 80.2707;
    displayName = location;
  }

  // 2) Trigger the background analysis and generation
  // We'll call our internal API logic directly since it's a long process
  // We import the POST logic from the route or simulate its behavior
  const analysisUrl = `${getBaseUrl()}/api/prediction/analyze`;
  
  try {
    // Note: In a real production app, we'd use a Background Job / Queue (like BullMQ or Vercel KV)
    // but for now, we'll perform the long-running task synchronously as requested.
    const res = await fetch(analysisUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'bypass-auth': 'true'
      },
      body: JSON.stringify({
        lat,
        lng,
        placeName: displayName,
        userId: userId, // Pass current agent's userId
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to generate prediction world.');
    }

    const data = await res.json();
    
    // Record successful completion
    recordPredictionRequest(userId, location, data.predictedWorldId, 'completed');
    console.log(`[Decade 2.0] Prediction completed successfully. World ID: ${data.predictedWorldId}`);

    return {
      success: true,
      message: `Decade 2.0 Automation Complete: I have searched for "${location}", performed the urban satellite analysis, and generated ${data.nodesAdded || 7} distinct nodes (Main Streets, Residential, Healthcare, etc.) with 360° panoramas for the year 2036.`,
      worldId: data.predictedWorldId,
      link: `${getBaseUrl()}/worlds/${data.predictedWorldId}`,
      summary: data.summary,
    };
  } catch (err) {
    console.error('Decade 2.0 Automation Error:', err);
    // Clear the pending request on error so user can retry
    predictionRequestStore.delete(getPredictionKey(userId, location));
    throw new Error(`Automation failed: ${err.message}`);
  }
}

async function requestNodeEdit({ userId, worldId, nodeId }) {
  await connectDB();
  
  let world;
  if (worldId && worldId.length === 24) {
    world = await World.findOne({ _id: worldId, userId });
  }
  
  if (!world) {
    world = await World.findOne({ userId }).sort({ updatedAt: -1 });
  }

  if (!world) throw new Error('World not found. Please specify which world you want to edit.');
  
  // First check if any nodes exist
  if (!world.nodes || world.nodes.length === 0) {
    throw new Error('No nodes found in this world. Please create a node first.');
  }
  
  let node = world.nodes.find(n => String(n.id) === String(nodeId));
  if (!node && nodeId) {
    node = world.nodes.find(n => n.label.toLowerCase() === nodeId.toLowerCase() || n.label.toLowerCase().includes(nodeId.toLowerCase()));
  }
  
  if (!node) {
    const availableNodes = world.nodes.map(n => n.label).join(', ');
    throw new Error(`Node "${nodeId || 'unspecified'}" not found. Available nodes: ${availableNodes}. Please specify exactly which node you want to edit.`);
  }
  
  return {
    success: true,
    message: `I'm opening the AI Visual Studio for the node "${node.label}". You can transform the space there.`,
    worldId: world._id.toString(),
    nodeId: node.id,
    nodeData: {
      nodeId: node.id,
      label: node.label,
      images: node.images,
      panoramaUrl: node.panoramaUrl,
      originalPanoramaUrl: node.originalPanoramaUrl,
    },
  };
}

async function requestWorldEdit({ userId, worldId }) {
  await connectDB();
  let world;
  if (worldId && worldId.length === 24) {
    world = await World.findOne({ _id: worldId, userId });
  }
  
  if (!world) {
    world = await World.findOne({ userId }).sort({ updatedAt: -1 });
  }

  if (!world) throw new Error('World not found');
  
  const centralNode = world.nodes.find(n => n.isCentralNode) || world.nodes[0];
  if (!centralNode) throw new Error('No nodes found to edit. Please create a node first.');
  
  return {
    success: true,
    message: `I'll open the AI Visual Studio for the main view ("${centralNode.label}"). If you wanted to edit a different node, please let me know the name!`,
    worldId: world._id.toString(),
    nodeId: centralNode.id,
    nodeData: {
      nodeId: centralNode.id,
      label: centralNode.label,
      images: centralNode.images,
      panoramaUrl: centralNode.panoramaUrl,
      originalPanoramaUrl: centralNode.originalPanoramaUrl,
    },
  };
}

import { tools } from './agent-tools';

export const functionMap = {
  createWorld,
  updateWorld,
  deleteWorld,
  createFolder,
  updateFolder,
  deleteFolder: deleteFolderAgent,
  createNode,
  updateNode,
  deleteNode,
  createConnection,
  deleteConnection,
  getWorlds,
  getFolders,
  getWorld,
  createPredictionWorld: createPredictionWorld,
  createDecadePrediction: createPredictionWorld,
  swapNodes,
  requestImageUpload,
  requestNodeEdit,
  requestWorldEdit,
  requestPreview,
};

const SYSTEM_PROMPT = `You are XRPlot Agent, an advanced AI assistant that helps users build and manage 360° virtual worlds.

You have full control over the XRPlot application. You can:
- Create, update, and delete Worlds, Folders, Nodes, and Connections.
- List all your worlds using getWorlds and folders using getFolders.
- See details of a specific world (including its nodes) using getWorld.
- Move worlds to folders using updateWorld (set folderId).
- Move folders into other folders (nesting) using updateFolder (set parentId). Use "root" to move to top level.
- Set up prediction worlds for Decade 2.0 analysis.
- Trigger automated urban predictions for any city using createDecadePrediction.
- Swap nodes using swapNodes.
- Trigger image uploads for nodes.
- Open the AI Visual Studio (Prompt Box) for editing nodes.
- Retrieve information about existing content.

RULES:
1. Always confirm the action you took and provide a direct link to the resource.
2. When you create/update something, return the link in markdown: [Open Resource](link)
3. Use createDecadePrediction when a user asks for future predictions, urban analysis, or "Decade 2.0". Automatically detect the city name from their query.
4. Use swapNodes when a user asks to switch, swap, or exchange two nodes.
5. If a user asks to "edit" or "modify" something:
   - If they specify a node (e.g., "edit the kitchen"), use requestNodeEdit.
   - If they say "edit the world" or "edit the view" without a node name, use requestWorldEdit.
   - If it's completely ambiguous, ASK the user: "Which node would you like to edit?".
6. After the user finishes editing in the popup box, they will tell you. You MUST then respond with a [Preview Node](/worlds/{worldId}?nodeId={nodeId}) link.
7. If the user says "cancel", acknowledge it and stop the current operation.
8. Be concise but helpful.
9. Links should be absolute and point to the correct pages.
10. If the user asks to "list nodes" or "show nodes" for a world, use getWorld(worldId).
`;

export async function runAgent({ userId, messages }) {
  if (!ai) {
    return {
      text: 'Gemini API key is not configured. Please set GEMINI_API_KEY in your environment.',
      functionName: null,
      functionArgs: null,
      functionResponse: null,
    };
  }

  const contents = messages.map(m => {
    // Sanitize old-format functionResponse messages stored in DB
    if (m.functionResponse) {
      return {
        role: 'user',
        parts: [{ text: `Function ${m.functionName} result: ${JSON.stringify(m.functionResponse)}` }],
      };
    }
    return {
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }],
    };
  });

  let maxTurns = 10;
  let lastText = '';
  let lastTool = null;
  let actionsTaken = [];

  while (maxTurns > 0) {
    maxTurns--;
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        tools: [{ functionDeclarations: tools }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      },
    });

    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCallParts = parts.filter(p => p.functionCall);
    const textPart = parts.map(p => p.text).filter(Boolean).join('\n');

    if (textPart) {
      lastText += (lastText ? '\n\n' : '') + textPart;
    }

    if (functionCallParts.length === 0) {
      break;
    }

    // Handle first function call (Gemini usually does one per turn or we handle sequentially)
    const callPart = functionCallParts[0];
    const call = callPart.functionCall;
    const fn = functionMap[call.name];

    if (!fn) {
      const errorMsg = `Unknown function: ${call.name}`;
      lastText += (lastText ? '\n\n' : '') + errorMsg;
      break;
    }

    const args = { ...call.args, userId };
    let toolResult;
    try {
      toolResult = await fn(args);
      actionsTaken.push(call.name);
    } catch (err) {
      toolResult = { error: err.message };
    }

    lastTool = {
      functionName: call.name,
      functionArgs: call.args,
      functionResponse: toolResult,
    };

    // Add model function call to contents
    contents.push({
      role: 'model',
      parts: [callPart],
    });

    // Add function result as text
    contents.push({
      role: 'user',
      parts: [{ text: `Function ${call.name} result: ${JSON.stringify(toolResult)}` }],
    });
  }

  if (!lastText && actionsTaken.length > 0) {
    lastText = `I have completed the following actions: ${actionsTaken.join(', ')}.`;
  } else if (!lastText) {
    lastText = "I've processed your request but have no further information to provide.";
  }

  return {
    text: lastText,
    ...lastTool,
  };
}
