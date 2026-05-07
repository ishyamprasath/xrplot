'use client';



import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import {

  ReactFlow,

  Controls,

  MiniMap,

  Background,

  useNodesState,

  useEdgesState,

  addEdge,

  MarkerType,

} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { ArrowLeft, Plus, Save, Eye, Loader2, Zap, Hexagon, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

import SpaceNode from './SpaceNode';

import ConnectionEdge from './ConnectionEdge';

import ImageUploadModal from '../upload/ImageUploadModal';

import ViewerModal from '../viewer/ViewerModal';

import PromptModal from '../prompt/PromptModal';

import WorkflowModal from './WorkflowModal';

import dynamic from 'next/dynamic';

import { v4 as uuidv4 } from 'uuid';

import WorldManager from '../management/WorldManager';



const SwapSelectionModal = dynamic(() => import('./SwapSelectionModal'), {

  ssr: false,

  loading: () => <div>Loading...</div>

});

// Swap utilities will be imported dynamically to avoid SSR issues



const nodeTypes = { spaceNode: SpaceNode };

const edgeTypes = { connectionEdge: ConnectionEdge };



const defaultEdgeOptions = {

  type: 'connectionEdge',

  markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },

  style: { stroke: '#7c3aed', strokeWidth: 2 },

  animated: true,

};



export default function WorldCanvas({ world, onSave, saving, lastSaved, onBack, onPreview, onRefresh }) {

  const router = useRouter();

  // Convert world data to React Flow format

  const initialNodes = (world.nodes || []).map(n => ({

    id: n.id,

    type: 'spaceNode',

    position: n.position || { x: 0, y: 0 },

    data: {

      label: n.label,

      images: n.images || [],

      panoramaUrl: n.panoramaUrl || '',

      panoramaPublicId: n.panoramaPublicId || '',

      originalPanoramaUrl: n.originalPanoramaUrl,

      status: n.status || 'empty',
      workflows: n.workflows || [],

      // Decade 2.0 predictive intelligence fields
      isPredictionNode: n.isPredictionNode || false,
      predictionType: n.predictionType || '',
      predictionYear: n.predictionYear ?? null,
      urbanDensity: n.urbanDensity ?? null,
      predictionConfidence: n.predictionConfidence ?? null,
      latitude: n.latitude ?? null,
      longitude: n.longitude ?? null,
      geojsonHotspots: n.geojsonHotspots ?? null,
      ndbiTrend: n.ndbiTrend || [],

      worldId: world._id,

      nodeId: n.id,

    },

  }));



  const initialEdges = (world.edges || []).map(e => ({

    id: e.id,

    source: e.source,

    target: e.target,

    type: 'connectionEdge',

    animated: true,

    style: { stroke: '#7c3aed', strokeWidth: 2 },

    markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },

    data: {

      worldId: world._id,

      edgeId: e.id,

    },

  }));



  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [worldName, setWorldName] = useState(world.name);

  const [uploadModal, setUploadModal] = useState(null); // { type: 'node'|'edge', id, data }

  const [promptModal, setPromptModal] = useState(null); // { id, data }

  const [workflowModal, setWorkflowModal] = useState(null); // { id, data }

  const [viewerModal, setViewerModal] = useState(null); // { panoramaUrl, label }

  const [doubleClickNode, setDoubleClickNode] = useState(null);

  const saveTimerRef = useRef(null);



  // Swap system state

  const [swapModalOpen, setSwapModalOpen] = useState(false);

  const [selectedSwapNodes, setSelectedSwapNodes] = useState([]);

  const [isSwapping, setIsSwapping] = useState(false);

  const [swapError, setSwapError] = useState(null);

  const [managementModalOpen, setManagementModalOpen] = useState(false);

  const [allWorlds, setAllWorlds] = useState([]);

  const [allFolders, setAllFolders] = useState([]);

  const nodesRef = useRef(nodes);

  const edgesRef = useRef(edges);

  const worldNameRef = useRef(worldName);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  useEffect(() => { edgesRef.current = edges; }, [edges]);

  useEffect(() => { worldNameRef.current = worldName; }, [worldName]);

  // Load all worlds and folders for management
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load worlds
        const worldsRes = await fetch('/api/worlds');
        if (worldsRes.ok) {
          const worldsData = await worldsRes.json();
          setAllWorlds(worldsData);
        }
        
        // Load folders (you'll need to create this API endpoint)
        const foldersRes = await fetch('/api/folders');
        if (foldersRes.ok) {
          const foldersData = await foldersRes.json();
          setAllFolders(foldersData);
        }
      } catch (error) {
        console.error('Failed to load management data:', error);
      }
    };
    
    if (managementModalOpen) {
      loadData();
    }
  }, [managementModalOpen]);

  // World management handlers
  const handleWorldCreate = async (worldData) => {
    try {
      const res = await fetch('/api/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(worldData)
      });
      
      if (res.ok) {
        const newWorld = await res.json();
        setAllWorlds(prev => [...prev, newWorld]);
        // Navigate to new world
        router.push(`/worlds/${newWorld._id}`);
      }
    } catch (error) {
      console.error('Failed to create world:', error);
    }
  };

  const handleWorldUpdate = async (worldId, updates) => {
    try {
      const res = await fetch(`/api/worlds/${worldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (res.ok) {
        setAllWorlds(prev => prev.map(w => w._id === worldId ? { ...w, ...updates } : w));
      }
    } catch (error) {
      console.error('Failed to update world:', error);
    }
  };

  const handleWorldDelete = async (worldId) => {
    try {
      const res = await fetch(`/api/worlds/${worldId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setAllWorlds(prev => prev.filter(w => w._id !== worldId));
        // If current world was deleted, navigate away
        if (world._id === worldId) {
          router.push('/worlds');
        }
      }
    } catch (error) {
      console.error('Failed to delete world:', error);
    }
  };

  // Folder management handlers
  const handleFolderCreate = async (folderData) => {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      });
      
      if (res.ok) {
        const newFolder = await res.json();
        setAllFolders(prev => [...prev, newFolder]);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleFolderUpdate = async (folderId, updates) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (res.ok) {
        setAllFolders(prev => prev.map(f => f.id === folderId ? { ...f, ...updates } : f));
      }
    } catch (error) {
      console.error('Failed to update folder:', error);
    }
  };

  const handleFolderDelete = async (folderId) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setAllFolders(prev => prev.filter(f => f.id !== folderId));
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };



  // Sync React Flow state with world prop changes (e.g. after uploading/stitching)

  useEffect(() => {

    if (!world) return;

    setNodes(nds => nds.map(n => {

      const serverNode = world.nodes?.find(wn => wn.id === n.id);

      if (serverNode) {

        return {

          ...n,

          data: {

            ...n.data,

            images: serverNode.images || n.data.images,

            panoramaUrl: serverNode.panoramaUrl || '',

            originalPanoramaUrl: serverNode.originalPanoramaUrl !== undefined ? serverNode.originalPanoramaUrl : n.data.originalPanoramaUrl,

            panoramaPublicId: serverNode.panoramaPublicId || '',

            status: serverNode.status || 'empty',
            workflows: serverNode.workflows || n.data.workflows || [],

            // Decade 2.0 predictive intelligence fields
            isPredictionNode: serverNode.isPredictionNode || false,
            predictionType: serverNode.predictionType || '',
            predictionYear: serverNode.predictionYear ?? null,
            urbanDensity: serverNode.urbanDensity ?? null,
            predictionConfidence: serverNode.predictionConfidence ?? null,
            latitude: serverNode.latitude ?? null,
            longitude: serverNode.longitude ?? null,
            geojsonHotspots: serverNode.geojsonHotspots ?? null,
            ndbiTrend: serverNode.ndbiTrend || [],

            label: serverNode.label || n.data.label,

          }

        };

      }

      return n;

    }));



    setEdges(eds => eds.map(e => {

      return e;

    }));

  }, [world, setNodes, setEdges]);



  const doSave = useCallback(() => {

    const worldNodes = nodes.map(n => ({

      id: n.id,

      label: n.data.label,

      position: n.position,

      images: n.data.images || [],

      panoramaUrl: n.data.panoramaUrl || '',

      originalPanoramaUrl: n.data.originalPanoramaUrl,

      panoramaPublicId: n.data.panoramaPublicId || '',

      status: n.data.status || 'empty',

      // Decade 2.0 predictive intelligence fields
      isPredictionNode: n.data.isPredictionNode || false,
      predictionType: n.data.predictionType || '',
      predictionYear: n.data.predictionYear ?? null,
      urbanDensity: n.data.urbanDensity ?? null,
      predictionConfidence: n.data.predictionConfidence ?? null,
      latitude: n.data.latitude ?? null,
      longitude: n.data.longitude ?? null,
      geojsonHotspots: n.data.geojsonHotspots ?? null,
      ndbiTrend: n.data.ndbiTrend || [],

      // Decade 2.0 predictive intelligence fields
      isPredictionNode: n.data.isPredictionNode || false,
      predictionType: n.data.predictionType || '',
      predictionYear: n.data.predictionYear ?? null,
      urbanDensity: n.data.urbanDensity ?? null,
      predictionConfidence: n.data.predictionConfidence ?? null,
      latitude: n.data.latitude ?? null,
      longitude: n.data.longitude ?? null,
      geojsonHotspots: n.data.geojsonHotspots ?? null,
      ndbiTrend: n.data.ndbiTrend || [],

    }));



    const worldEdges = edges.map(e => ({

      id: e.id,

      source: e.source,

      target: e.target,

    }));



    onSave({ name: worldName, nodes: worldNodes, edges: worldEdges });

  }, [nodes, edges, worldName, onSave]);



  // Removed the useEffect that caused infinite background saves.

  // Saves should only be triggered by deliberate actions (hasDrag, onConnect, etc) using triggerSave().

  const triggerSave = useCallback(() => {

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(doSave, 1000);

  }, [doSave]);



  // Add new node

  const addNode = useCallback(() => {

    const id = uuidv4();

    const newNode = {

      id,

      type: 'spaceNode',

      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },

      data: {

        label: 'New Space',

        images: [],

        panoramaUrl: '',

        status: 'empty',

        worldId: world._id,

        nodeId: id,

      },

    };

    setNodes(nds => [...nds, newNode]);

    // Save immediately (debounced)

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(triggerSave, 200);

  }, [setNodes, world._id, triggerSave]);



  // Connect nodes

  const onConnect = useCallback((connection) => {

    const edgeId = uuidv4();

    const newEdge = {

      ...connection,

      id: edgeId,

      type: 'connectionEdge',

      animated: true,

      style: { stroke: '#7c3aed', strokeWidth: 2 },

      markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },

      data: {

        worldId: world._id,

        edgeId,

      },

    };

    setEdges(eds => addEdge(newEdge, eds));

    setTimeout(triggerSave, 100);

  }, [setEdges, world._id, triggerSave]);



  // Double-click to connect nodes
  const onNodeDoubleClick = useCallback((event, node) => {
    console.log('=== DOUBLE CLICK DEBUG ===');
    console.log('Double-clicked node:', node.id);
    console.log('Current doubleClickNode:', doubleClickNode);
    console.log('Current edges count:', edges.length);
    console.log('Event type:', event.type);
    
    // Prevent any default behavior and stop propagation
    event.preventDefault();
    event.stopPropagation();
    
    if (!doubleClickNode) {
      console.log('Setting first node:', node.id);
      setDoubleClickNode(node.id);
    } else if (doubleClickNode !== node.id) {
      console.log('Creating connection between', doubleClickNode, 'and', node.id);
      // Create edge between the two double-clicked nodes
      const edgeExists = edges.some(
        e => (e.source === doubleClickNode && e.target === node.id) ||
          (e.source === node.id && e.target === doubleClickNode)
      );
      console.log('Edge exists check:', edgeExists);
      console.log('Current edges:', edges.map(e => `${e.source}->${e.target}`));
      
      if (!edgeExists) {
        console.log('Creating new edge...');
        // Create the edge directly
        const edgeId = uuidv4();
        const newEdge = {
          source: doubleClickNode,
          target: node.id,
          id: edgeId,
          type: 'connectionEdge',
          animated: true,
          style: { stroke: '#7c3aed', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },
          data: {
            worldId: world._id,
            edgeId,
          },
        };
        console.log('New edge object:', newEdge);
        setEdges(eds => {
          console.log('Before addEdge, edges count:', eds.length);
          const result = addEdge(newEdge, eds);
          console.log('After addEdge, edges count:', result.length);
          return result;
        });
        setTimeout(triggerSave, 100);
      } else {
        console.log('Edge already exists, skipping creation');
      }
      setDoubleClickNode(null);
    } else {
      console.log('Same node clicked twice, clearing state');
      setDoubleClickNode(null);
    }
    console.log('=== END DOUBLE CLICK DEBUG ===');
  }, [doubleClickNode, edges, setEdges, world._id, triggerSave]);



  // Swap functionality handlers

  const handleSwapClick = useCallback(() => {

    setSwapModalOpen(true);

    setSelectedSwapNodes([]);

    setSwapError(null);

  }, []);



  const handleSwapConfirm = useCallback(async (sourceNode, targetNode, strategy) => {

    if (!sourceNode || !targetNode) return;



    setIsSwapping(true);

    setSwapError(null);



    try {

      // Dynamic import to avoid SSR issues

      const {

        SwapTransactionManager,

        DirectSwapStrategy,

        AdaptiveSwapStrategy,

        RecursiveSwapStrategy

      } = await import('../../utils/SwapTransactionManager');



      // Create transaction manager

      const transactionManager = new SwapTransactionManager(nodes, edges);



      // Execute swap based on strategy

      let success = false;

      switch (strategy) {

        case 'direct':

          success = DirectSwapStrategy.execute(transactionManager, sourceNode.id, targetNode.id);

          break;

        case 'adaptive':

          success = AdaptiveSwapStrategy.execute(transactionManager, sourceNode.id, targetNode.id);

          break;

        case 'recursive':

          success = RecursiveSwapStrategy.execute(transactionManager, sourceNode.id, targetNode.id);

          break;

        default:

          throw new Error(`Unknown swap strategy: ${strategy}`);

      }



      if (!success) {

        throw new Error('Swap execution failed');

      }



      // Validate graph integrity

      const validation = transactionManager.validateGraph();

      if (!validation.valid) {

        throw new Error(`Graph validation failed: ${validation.error}`);

      }



      // Update React Flow state

      setNodes([...transactionManager.currentNodes]);

      setEdges([...transactionManager.currentEdges]);



      // Commit transaction

      transactionManager.commit();



      // Save changes

      const worldNodes = transactionManager.currentNodes.map(n => ({

        id: n.id,

        label: n.data.label,

        position: n.position,

        images: n.data.images || [],

        panoramaUrl: n.data.panoramaUrl || '',

        originalPanoramaUrl: n.data.originalPanoramaUrl,

        panoramaPublicId: n.data.panoramaPublicId || '',

        status: n.data.status || 'empty',

      }));



      const worldEdges = transactionManager.currentEdges.map(e => ({

        id: e.id,

        source: e.source,

        target: e.target,

      }));



      await onSave({ name: worldName, nodes: worldNodes, edges: worldEdges });



    } catch (error) {

      console.error('Swap failed:', error);

      setSwapError(error.message);



      // Rollback on error - dynamic import

      try {

        const { SwapTransactionManager } = await import('../../utils/SwapTransactionManager');

        const transactionManager = new SwapTransactionManager(nodes, edges);

        transactionManager.rollback();

        setNodes([...transactionManager.currentNodes]);

        setEdges([...transactionManager.currentEdges]);

      } catch (rollbackError) {

        console.error('Rollback failed:', rollbackError);

      }

    } finally {

      setIsSwapping(false);

    }

  }, [nodes, edges, worldName, onSave]);



  const handleSwapNodeSelect = useCallback((selectedNodes) => {

    setSelectedSwapNodes(selectedNodes);

  }, []);



  const handleNodeDoubleClick = (e) => {
    const { nodeId } = e.detail;
    console.log('=== DOUBLE CLICK DEBUG (Custom Event) ===');
    console.log('Double-clicked node:', nodeId);
    console.log('Current doubleClickNode:', doubleClickNode);
    console.log('Current edges count:', edges.length);
    
    if (!doubleClickNode) {
      console.log('Setting first node:', nodeId);
      setDoubleClickNode(nodeId);
    } else if (doubleClickNode !== nodeId) {
      console.log('Creating connection between', doubleClickNode, 'and', nodeId);
      // Create edge between the two double-clicked nodes
      const edgeExists = edges.some(
        e => (e.source === doubleClickNode && e.target === nodeId) ||
          (e.source === nodeId && e.target === doubleClickNode)
      );
      console.log('Edge exists check:', edgeExists);
      console.log('Current edges:', edges.map(e => `${e.source}->${e.target}`));
      
      if (!edgeExists) {
        console.log('Creating new edge...');
        // Create the edge directly
        const edgeId = uuidv4();
        const newEdge = {
          source: doubleClickNode,
          target: nodeId,
          id: edgeId,
          type: 'connectionEdge',
          animated: true,
          style: { stroke: '#7c3aed', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },
          data: {
            worldId: world._id,
            edgeId,
          },
        };
        console.log('New edge object:', newEdge);
        setEdges(eds => {
          console.log('Before addEdge, edges count:', eds.length);
          const result = addEdge(newEdge, eds);
          console.log('After addEdge, edges count:', result.length);
          return result;
        });
        setTimeout(triggerSave, 100);
      } else {
        console.log('Edge already exists, skipping creation');
      }
      setDoubleClickNode(null);
    } else {
      console.log('Same node clicked twice, clearing state');
      setDoubleClickNode(null);
    }
    console.log('=== END DOUBLE CLICK DEBUG ===');
  };

  useEffect(() => {

    const handler = async (e) => {

      const { type, nodeId, edgeId, data } = e.detail;

      if (type === 'openUpload') {

        // Save before upload so the node exists in DB

        doSave();

        setTimeout(() => {

          const node = nodes.find(n => n.id === nodeId);

          if (node) {

            setUploadModal({ type: 'node', id: nodeId, data: node.data });

          }

        }, 300);

        return;

      } else if (type === 'openPreview') {

        const node = nodes.find(n => n.id === nodeId);

        if (node?.data?.panoramaUrl) {

          setViewerModal({ panoramaUrl: node.data.panoramaUrl, label: node.data.label });

        }

      } else if (type === 'openPrompt') {

        const node = nodes.find(n => n.id === nodeId);

        if (node) {

          setPromptModal({ id: nodeId, data: node.data });

        }

      } else if (type === 'openWorkflows') {

        const node = nodes.find(n => n.id === nodeId);

        if (node) {

          setWorkflowModal({ id: nodeId, data: node.data });

        }

      } else if (type === 'updateNodeLabel') {

        const updatedNodes = nodes.map(n =>

          n.id === nodeId ? { ...n, data: { ...n.data, label: data.label } } : n

        );

        setNodes(updatedNodes);



        const worldNodes = updatedNodes.map(n => ({

          id: n.id,

          label: n.data.label,

          position: n.position,

          images: n.data.images || [],

          panoramaUrl: n.data.panoramaUrl || '',

          originalPanoramaUrl: n.data.originalPanoramaUrl,

          panoramaPublicId: n.data.panoramaPublicId || '',

          status: n.data.status || 'empty',

          // Decade 2.0 predictive intelligence fields
          isPredictionNode: n.data.isPredictionNode || false,
          predictionType: n.data.predictionType || '',
          predictionYear: n.data.predictionYear ?? null,
          urbanDensity: n.data.urbanDensity ?? null,
          predictionConfidence: n.data.predictionConfidence ?? null,
          latitude: n.data.latitude ?? null,
          longitude: n.data.longitude ?? null,
          geojsonHotspots: n.data.geojsonHotspots ?? null,
          ndbiTrend: n.data.ndbiTrend || [],

          // Decade 2.0 predictive intelligence fields
          isPredictionNode: n.data.isPredictionNode || false,
          predictionType: n.data.predictionType || '',
          predictionYear: n.data.predictionYear ?? null,
          urbanDensity: n.data.urbanDensity ?? null,
          predictionConfidence: n.data.predictionConfidence ?? null,
          latitude: n.data.latitude ?? null,
          longitude: n.data.longitude ?? null,
          geojsonHotspots: n.data.geojsonHotspots ?? null,
          ndbiTrend: n.data.ndbiTrend || [],

        }));



        const worldEdges = edges.map(e => ({

          id: e.id,

          source: e.source,

          target: e.target,

        }));



        onSave({ name: worldName, nodes: worldNodes, edges: worldEdges });

      } else if (type === 'deleteNode') {

        const updatedNodes = nodes.filter(n => n.id !== nodeId);

        const updatedEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);

        setNodes(updatedNodes);

        setEdges(updatedEdges);



        const worldNodes = updatedNodes.map(n => ({

          id: n.id,

          label: n.data.label,

          position: n.position,

          images: n.data.images || [],

          panoramaUrl: n.data.panoramaUrl || '',

          originalPanoramaUrl: n.data.originalPanoramaUrl,

          panoramaPublicId: n.data.panoramaPublicId || '',

          status: n.data.status || 'empty',

        }));



        const worldEdges = updatedEdges.map(e => ({

          id: e.id,

          source: e.source,

          target: e.target,

        }));



      } else if (type === 'revertChanges') {

        setBuilding(true);

        setBuildProgress('Reverting changes...');

        const worldIdStr = world._id || world.id;

        try {

          const res = await fetch(`/api/worlds/${worldIdStr}/nodes/${nodeId}/revert`, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ targetIndex: 'panorama' }),

          });

          if (!res.ok) throw new Error('Revert failed');

          await onRefresh();

        } catch (err) {

          alert(err.message);

        } finally {

          setBuilding(false);

        }

      } else if (type === 'initiateSwap') {

        const sourceNode = nodes.find(n => n.id === nodeId);

        if (sourceNode && nodes.length >= 2) {

          setSelectedSwapNodes([sourceNode]);

          setSwapModalOpen(true);

          setSwapError(null);

        }

      } else if (type === 'acceptChanges') {

        const updatedNodes = nodes.map(n => {

          if (n.id === nodeId) {

            return {

              ...n,

              data: {

                ...n.data,

                originalPanoramaUrl: null // clear the unmodified state locally to hide tick/cross

              }

            };

          }

          return n;

        });

        setNodes(updatedNodes);

        doSave();

      } else if (type === 'deleteEdge') {

        const eid = e.detail.edgeId;

        const updatedEdges = edges.filter(edge => edge.id !== eid);

        setEdges(updatedEdges);

      }

    };

    window.addEventListener('xrplot-action', handler);

    window.addEventListener('xrplot-node-double-click', handleNodeDoubleClick);

    return () => {

      window.removeEventListener('xrplot-action', handler);

      window.removeEventListener('xrplot-node-double-click', handleNodeDoubleClick);

    };

  }, [nodes, setNodes, setEdges, triggerSave, doubleClickNode, edges, setEdges, world._id]);
  const handleUploadComplete = useCallback(async () => {

    setUploadModal(null);

    await onRefresh();

  }, [onRefresh]);



  // Handle node position changes

  const handleNodesChange = useCallback((changes) => {

    onNodesChange(changes);

    const hasDrag = changes.some(c => c.type === 'position' && c.dragging === false);

    if (hasDrag) triggerSave();

  }, [onNodesChange, triggerSave]);



  // Manual save

  const handleManualSave = () => {

    const worldNodes = nodes.map(n => ({

      id: n.id,

      label: n.data.label,

      position: n.position,

      images: n.data.images || [],

      panoramaUrl: n.data.panoramaUrl || '',

      originalPanoramaUrl: n.data.originalPanoramaUrl,

      panoramaPublicId: n.data.panoramaPublicId || '',

      status: n.data.status || 'empty',

    }));

    const worldEdges = edges.map(e => ({

      id: e.id,

      source: e.source,

      target: e.target,

    }));

    onSave({ name: worldName, nodes: worldNodes, edges: worldEdges });

  };



  const [building, setBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState('');
  const [workflowSelectionPrompt, setWorkflowSelectionPrompt] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null); // { nodeId, workflowId, workflowName, nodeLabel }

  // Detect connected subgraphs as "workflows" automatically with central node identification
  const allWorkflows = useMemo(() => {
    const adj = new Map();
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(e => {
      adj.get(e.source)?.push(e.target);
      adj.get(e.target)?.push(e.source);
    });

    const visited = new Set();
    const subgraphs = [];

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component = [];
        const queue = [node.id];
        visited.add(node.id);
        while (queue.length > 0) {
          const u = queue.shift();
          component.push(u);
          (adj.get(u) || []).forEach(v => {
            if (!visited.has(v)) {
              visited.add(v);
              queue.push(v);
            }
          });
        }
        subgraphs.push(component);
      }
    });

    // Format subgraphs into workflow options with central node detection
    return subgraphs.map((nodeIds, idx) => {
      // Find central node (node with highest connectivity or marked as central)
      let centralNode = null;
      let maxConnections = -1;
      
      nodeIds.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          const connectionCount = adj.get(nodeId)?.length || 0;
          
          // Priority: Explicit central node > Most connections > First node
          if (node.data.isCentralNode) {
            centralNode = node;
          } else if (!centralNode && connectionCount > maxConnections) {
            centralNode = node;
            maxConnections = connectionCount;
          }
        }
      });

      // Fallback to first node if no central found
      if (!centralNode) {
        centralNode = nodes.find(n => n.id === nodeIds[0]);
      }

      return {
        nodeIds,
        workflowName: centralNode?.data.label || `Workflow ${idx + 1}`,
        centralNodeId: centralNode?.id || nodeIds[0],
        centralNodeLabel: centralNode?.data.label || 'Unknown',
        nodeCount: nodeIds.length
      };
    });
  }, [nodes, edges]);

  const handleBuildAndPreview = async (chosenWorkflow = null) => {
    if (allWorkflows.length > 1 && !chosenWorkflow) {
      setWorkflowSelectionPrompt(true);
      return;
    }

    setWorkflowSelectionPrompt(false);
    handleManualSave();
    setBuilding(true);
    setBuildProgress('Checking for unstitched spaces...');

    try {
      const workflowToUse = chosenWorkflow || (allWorkflows.length === 1 ? allWorkflows[0] : null);
      const updatedNodes = nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          isCentralNode: workflowToUse ? n.id === workflowToUse.centralNodeId : false
        }
      }));
      setNodes(updatedNodes);

      const allPending = nodes.filter(n => n.data.images?.length > 0 && n.data.status !== 'ready' && n.data.status !== 'stitching');
      const nodesToStitch = workflowToUse 
        ? allPending.filter(n => workflowToUse.nodeIds.includes(n.id))
        : allPending;

      for (let i = 0; i < nodesToStitch.length; i++) {

        const node = nodesToStitch[i];

        setBuildProgress(`Stitching Space ${i + 1} of ${nodesToStitch.length}: ${node.data.label}...`);

        const res = await fetch(`/api/worlds/${world._id}/nodes/${node.id}/stitch`, { method: 'POST' });

        if (!res.ok) {

          const errData = await res.json();

          throw new Error(`Failed to stitch ${node.data.label}: ${errData.error || 'Unknown error'}`);

        }

      }

      if (nodesToStitch.length > 0) {
        setBuildProgress('Finalizing build...');
        await onRefresh();
      }

      setBuilding(false);
      onPreview();
    } catch (err) {
      console.error(err);
      alert('Build failed: ' + err.message);
      setBuilding(false);
    }
    };



  const hasAnyImages = nodes.some(n => n.data.images?.length > 0);

  const hasReadyNodes = nodes.some(n => n.data.status === 'ready');

  const canPreview = hasAnyImages || hasReadyNodes;



  return (

    <div className="canvas-page">

      {/* Toolbar */}

      <div className="canvas-toolbar">

        <button className="btn btn-ghost" onClick={onBack}><ArrowLeft size={16} /> Back</button>

        <div className="canvas-toolbar-title">

          <input

            value={worldName}

            onChange={e => setWorldName(e.target.value)}

            onBlur={triggerSave}

            placeholder="World name..."

          />

        </div>

        {doubleClickNode && (

          <span style={{ fontSize: '0.8rem', color: 'var(--amber-light)', padding: '4px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-full)' }}>

            <Zap size={12} /> Double-click another node to connect

          </span>

        )}

        <button className="btn btn-secondary" onClick={addNode}><Plus size={16} /> Add Space</button>

        <button className="btn btn-secondary" onClick={() => setManagementModalOpen(true)}>
          <Settings size={16} /> Manage
        </button>

        <button className="btn btn-secondary" onClick={handleManualSave} disabled={saving}>

          {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving</> : <><Save size={14} /> Save</>}

        </button>

        {lastSaved && (

          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>

            Saved {lastSaved.toLocaleTimeString()}

          </span>

        )}

        <button

          className="btn btn-primary"

          onClick={handleBuildAndPreview}

          disabled={!canPreview || building}

          title={!canPreview ? 'Upload photos to at least one space first' : 'Build and Preview World'}

        >

          {building ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Building</> : <><Eye size={14} /> Build & Preview</>}

        </button>

      </div>



      {/* Canvas */}

      <div className="canvas-container">

        <ReactFlow

          nodes={nodes}

          edges={edges}

          onNodesChange={handleNodesChange}

          onEdgesChange={onEdgesChange}

          onConnect={onConnect}

          onNodeDoubleClick={onNodeDoubleClick}

          nodeTypes={nodeTypes}

          edgeTypes={edgeTypes}

          defaultEdgeOptions={defaultEdgeOptions}

          fitView

          fitViewOptions={{

            padding: 0.2, // Add some padding around nodes

            minZoom: 0.1,  // Allow zooming out more to see all nodes

            maxZoom: 2     // Allow reasonable zoom in

          }}

          minZoom={0.05}   // Minimum zoom level (zoom out further)

          maxZoom={2}      // Maximum zoom level

          defaultViewport={{

            x: 0,

            y: 0,

            zoom: 0.5     // Start zoomed out more

          }}

          proOptions={{ hideAttribution: true }}

          style={{ background: '#07070f' }}

        >

          <Background color="#1a1a2e" gap={20} size={1} />

          <Controls />

          <MiniMap

            nodeColor={(n) => {

              switch (n.data?.status) {

                case 'ready': return '#10b981';

                case 'uploaded': return '#06b6d4';

                case 'analyzing':

                case 'stitching': return '#f59e0b';

                case 'error': return '#ef4444';

                default: return '#4b5563';

              }

            }}

            maskColor="rgba(7, 7, 15, 0.8)"

          />

        </ReactFlow>

      </div>



      {/* Upload Modal */}

      {uploadModal && (

        <ImageUploadModal

          type={uploadModal.type}

          worldId={world._id}

          itemId={uploadModal.id}

          existingImages={uploadModal.data.images}

          onClose={() => setUploadModal(null)}

          onComplete={handleUploadComplete}

        />

      )}



      {/* Viewer Modal */}

      {promptModal && (

        <PromptModal

          worldId={world._id}

          nodeData={nodes.find(n => n.id === promptModal.id)?.data || promptModal.data}

          onClose={() => setPromptModal(null)}

          onComplete={async () => {

            setPromptModal(null);

            await onRefresh();

          }}

        />

      )}



      {viewerModal && (
        <ViewerModal
          panoramaUrl={viewerModal.panoramaUrl}
          label={viewerModal.label}
          onClose={() => setViewerModal(null)}
        />
      )}

      {/* Workflow Modal */}
      {workflowModal && (
        <WorkflowModal
          nodeId={workflowModal.id}
          nodeData={nodes.find(n => n.id === workflowModal.id)?.data || workflowModal.data}
          onClose={() => setWorkflowModal(null)}
          onUpdate={(nodeId, updates) => {
            console.log("WorldCanvas: Updating node", nodeId, "with updates:", updates);
            const updatedNodes = nodes.map(n => 
              n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
            );
            console.log("WorldCanvas: New nodes state:", updatedNodes);
            setNodes(updatedNodes);

            // We do a manual save here so workflows persist
            const worldNodes = updatedNodes.map(n => ({
              id: n.id,
              label: n.data.label,
              position: n.position,
              images: n.data.images || [],
              panoramaUrl: n.data.panoramaUrl || '',
              originalPanoramaUrl: n.data.originalPanoramaUrl,
              panoramaPublicId: n.data.panoramaPublicId || '',
              status: n.data.status || 'empty',
              workflows: n.data.workflows || [],
              isPredictionNode: n.data.isPredictionNode || false,
              predictionType: n.data.predictionType || '',
              predictionYear: n.data.predictionYear ?? null,
              urbanDensity: n.data.urbanDensity ?? null,
              predictionConfidence: n.data.predictionConfidence ?? null,
              latitude: n.data.latitude ?? null,
              longitude: n.data.longitude ?? null,
              geojsonHotspots: n.data.geojsonHotspots ?? null,
              ndbiTrend: n.data.ndbiTrend || [],
            }));
            const worldEdges = edges.map(e => ({ id: e.id, source: e.source, target: e.target }));
            onSave({ name: worldName, nodes: worldNodes, edges: worldEdges });
          }}
        />
      )}

      {/* Swap Selection Modal */}

      <SwapSelectionModal

        isOpen={swapModalOpen}

        onClose={() => setSwapModalOpen(false)}

        nodes={nodes}

        edges={edges}

        onSwapConfirm={handleSwapConfirm}

        selectedNodes={selectedSwapNodes}

        onNodeSelect={handleSwapNodeSelect}

      />



      {/* Workflow Selection Modal */}
      {workflowSelectionPrompt && (
        <div className="modal-overlay" onClick={() => setWorkflowSelectionPrompt(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2><List size={20} /> Select Workflow</h2>
              <button className="modal-close" onClick={() => setWorkflowSelectionPrompt(false)}>×</button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Select a workflow to start your world preview:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {allWorkflows.map((wf, idx) => (
                  <button 
                    key={`${wf.centralNodeId}-${idx}`}
                    onClick={() => handleBuildAndPreview(wf)}
                    style={{ 
                      textAlign: 'left', 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: '12px', 
                      color: 'white', 
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(124, 58, 237, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--violet-light)' }}>{wf.workflowName}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Central Node:</span> <strong>{wf.centralNodeLabel}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {wf.nodeCount} nodes in workflow
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* World Manager Modal */}
      {managementModalOpen && (
        <WorldManager
          worlds={allWorlds}
          folders={allFolders}
          onWorldCreate={handleWorldCreate}
          onWorldUpdate={handleWorldUpdate}
          onWorldDelete={handleWorldDelete}
          onFolderCreate={handleFolderCreate}
          onFolderUpdate={handleFolderUpdate}
          onFolderDelete={handleFolderDelete}
          onClose={() => setManagementModalOpen(false)}
        />
      )}

      {/* Building Overlay */}

      {building && (

        <div style={{

          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,

          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'

        }}>

          <div className="spinner" style={{ width: 48, height: 48, marginBottom: 24, borderTopColor: 'var(--violet)' }} />

          <h2 style={{ color: 'white', marginBottom: 12 }}>Building World</h2>

          <p style={{ color: 'var(--text-secondary)' }}>{buildProgress}</p>

        </div>

      )}

    </div>

  );}

