export const tools = [
  {
    name: 'createWorld',
    description: 'Create a new virtual world. Returns a link to the new world.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the world' },
        description: { type: 'string', description: 'Optional description' },
      },
      required: ['name'],
    },
  },
  {
    name: 'updateWorld',
    description: 'Update an existing world name, description, or move it to a folder.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        folderId: { type: 'string', description: 'ID of the folder to move the world into' },
      },
      required: ['worldId'],
    },
  },
  {
    name: 'deleteWorld',
    description: 'Delete a world permanently.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
      },
      required: ['worldId'],
    },
  },
  {
    name: 'createFolder',
    description: 'Create a new folder to organize worlds.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        parentId: { type: 'string', description: 'Optional parent folder ID' },
      },
      required: ['name'],
    },
  },
  {
    name: 'updateFolder',
    description: 'Update a folder name or move it to another folder (nesting).',
    parameters: {
      type: 'object',
      properties: {
        folderId: { type: 'string' },
        name: { type: 'string' },
        parentId: { type: 'string', description: 'ID of the parent folder to move this folder into' },
      },
      required: ['folderId'],
    },
  },
  {
    name: 'deleteFolder',
    description: 'Delete a folder.',
    parameters: {
      type: 'object',
      properties: {
        folderId: { type: 'string' },
      },
      required: ['folderId'],
    },
  },
  {
    name: 'createNode',
    description: 'Create a new space/node inside a world.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
        label: { type: 'string' },
        position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } },
      },
      required: ['worldId'],
    },
  },
  {
    name: 'updateNode',
    description: 'Update a node label or position.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
        nodeId: { type: 'string' },
        label: { type: 'string' },
        position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } },
      },
      required: ['worldId', 'nodeId'],
    },
  },
  {
    name: 'deleteNode',
    description: 'Delete a node from a world.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
        nodeId: { type: 'string' },
      },
      required: ['worldId', 'nodeId'],
    },
  },
  {
    name: 'createConnection',
    description: 'Create a connection (edge) between two nodes.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
        sourceId: { type: 'string' },
        targetId: { type: 'string' },
      },
      required: ['worldId', 'sourceId', 'targetId'],
    },
  },
  {
    name: 'deleteConnection',
    description: 'Delete a connection between nodes.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
        edgeId: { type: 'string' },
      },
      required: ['worldId', 'edgeId'],
    },
  },
  {
    name: 'getWorlds',
    description: 'List all worlds for the user.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'getFolders',
    description: 'List all folders for the user.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'getWorld',
    description: 'Get details of a specific world including nodes and edges.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
      },
      required: ['worldId'],
    },
  },
  {
    name: 'createPredictionWorld',
    description: 'Mark a world as a prediction world and add a prediction node with coordinates.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        predictionYear: { type: 'number' },
      },
      required: ['worldId', 'latitude', 'longitude'],
    },
  },
  {
    name: 'requestImageUpload',
    description: 'Trigger an image upload prompt in the chat UI for a specific node. Use this when the user wants to upload images to a node.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
        nodeId: { type: 'string' },
      },
      required: ['worldId', 'nodeId'],
    },
  },
  {
    name: 'swapNodes',
    description: 'Swap the data (images, panorama, label) between two existing nodes.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
        nodeId1: { type: 'string', description: 'ID or Name of the first node' },
        nodeId2: { type: 'string', description: 'ID or Name of the second node' },
      },
      required: ['worldId', 'nodeId1', 'nodeId2'],
    },
  },
  {
    name: 'createDecadePrediction',
    description: 'EARTH LENS 2036: Generate eco-prediction with NDVI/LST dystopia vs green future. Detects location and builds Earth Twin.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'The city or area to eco-predict (e.g. "Delhi", "Chennai", "Kochi")' },
        predictionYear: { type: 'number', description: 'Future year, default 2036' },
        worldId: { type: 'string', description: 'Optional: add prediction to existing world' },
      },
      required: ['location'],
    },
  },
  {
    name: 'analyzeEcoImpact',
    description: 'Analyze environmental cost for a location: green loss, heat island, flood & air risk with AI fixes.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Place to analyze' },
        lat: { type: 'number' },
        lng: { type: 'number' },
      },
      required: ['location'],
    },
  },
  {
    name: 'suggestGreenInterventions',
    description: 'Suggest nature-based solutions (Miyawaki, cool roofs, wetland revival) for a location with cooling & carbon math.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        focus: { type: 'string', description: 'heat, flood, air, water, or all', enum: ['heat','flood','air','water','all'] },
      },
      required: ['location'],
    },
  },
  {
    name: 'requestNodeEdit',
    description: 'Open the AI Visual Studio (prompt box) for a specific node so the user can edit it.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
        nodeId: { type: 'string', description: 'ID or label of the node to edit' },
      },
      required: ['worldId', 'nodeId'],
    },
  },
  {
    name: 'requestWorldEdit',
    description: 'Open the AI Visual Studio for the main view of a world.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
      },
      required: ['worldId'],
    },
  },
  {
    name: 'requestPreview',
    description: 'Provide a preview link to view a world or node.',
    parameters: {
      type: 'object',
      properties: {
        worldId: { type: 'string' },
      },
      required: ['worldId'],
    },
  },
];
