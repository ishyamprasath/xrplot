'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
import SpaceNode from './SpaceNode';
import ConnectionEdge from './ConnectionEdge';
import ImageUploadModal from '../upload/ImageUploadModal';
import ViewerModal from '../viewer/ViewerModal';
import { v4 as uuidv4 } from 'uuid';

const nodeTypes = { spaceNode: SpaceNode };
const edgeTypes = { connectionEdge: ConnectionEdge };

const defaultEdgeOptions = {
  type: 'connectionEdge',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },
  style: { stroke: '#7c3aed', strokeWidth: 2 },
  animated: true,
};

export default function WorldCanvas({ world, onSave, saving, lastSaved, onBack, onPreview, onRefresh }) {
  // Convert world data to React Flow format
  const initialNodes = (world.nodes || []).map(n => ({
    id: n.id,
    type: 'spaceNode',
    position: n.position || { x: 0, y: 0 },
    data: {
      label: n.label,
      images: n.images || [],
      panoramaUrl: n.panoramaUrl || '',
      status: n.status || 'empty',
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
      transitionImages: e.transitionImages || [],
      status: e.status || 'empty',
      worldId: world._id,
      edgeId: e.id,
    },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [worldName, setWorldName] = useState(world.name);
  const [uploadModal, setUploadModal] = useState(null); // { type: 'node'|'edge', id, data }
  const [viewerModal, setViewerModal] = useState(null); // { panoramaUrl, label }
  const [doubleClickNode, setDoubleClickNode] = useState(null);
  const saveTimerRef = useRef(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const worldNameRef = useRef(worldName);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { worldNameRef.current = worldName; }, [worldName]);

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
            panoramaPublicId: serverNode.panoramaPublicId || '',
            status: serverNode.status || 'empty',
            label: serverNode.label || n.data.label,
          }
        };
      }
      return n;
    }));
    
    setEdges(eds => eds.map(e => {
      const serverEdge = world.edges?.find(we => we.id === e.id);
      if (serverEdge) {
        return {
          ...e,
          data: {
            ...e.data,
            transitionImages: serverEdge.transitionImages || e.data.transitionImages,
            transitionPanorama: serverEdge.transitionPanorama || '',
            status: serverEdge.status || 'empty',
          }
        };
      }
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
      panoramaPublicId: n.data.panoramaPublicId || '',
      status: n.data.status || 'empty',
    }));
    
    const worldEdges = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      transitionImages: e.data?.transitionImages || [],
      transitionPanorama: e.data?.transitionPanorama || '',
      status: e.data?.status || 'empty',
    }));
    
    onSave({ name: worldName, nodes: worldNodes, edges: worldEdges });
  }, [nodes, edges, worldName, onSave]);

  // Simple effect for auto-saving when nodes or edges change
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, 1000);
    return () => clearTimeout(saveTimerRef.current);
  }, [doSave]);

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
        transitionImages: [],
        status: 'empty',
        worldId: world._id,
        edgeId,
      },
    };
    setEdges(eds => addEdge(newEdge, eds));
    setTimeout(triggerSave, 100);
  }, [setEdges, world._id, triggerSave]);

  // Double-click to connect nodes
  const onNodeDoubleClick = useCallback((event, node) => {
    if (!doubleClickNode) {
      setDoubleClickNode(node.id);
    } else if (doubleClickNode !== node.id) {
      // Create edge between the two double-clicked nodes
      const edgeExists = edges.some(
        e => (e.source === doubleClickNode && e.target === node.id) ||
             (e.source === node.id && e.target === doubleClickNode)
      );
      if (!edgeExists) {
        onConnect({ source: doubleClickNode, target: node.id });
      }
      setDoubleClickNode(null);
    } else {
      setDoubleClickNode(null);
    }
  }, [doubleClickNode, edges, onConnect]);

  // Handle node data updates (from SpaceNode callbacks)
  useEffect(() => {
    const handler = (e) => {
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
      }
      if (type === 'openEdgeUpload') {
        doSave();
        setTimeout(() => {
          const edge = edges.find(e => e.id === edgeId);
          if (edge) {
            setUploadModal({ type: 'edge', id: edgeId, data: edge.data });
          }
        }, 300);
        return;
      } else if (type === 'openPreview') {
        const node = nodes.find(n => n.id === nodeId);
        if (node?.data?.panoramaUrl) {
          setViewerModal({ panoramaUrl: node.data.panoramaUrl, label: node.data.label });
        }
      } else if (type === 'updateNodeLabel') {
        setNodes(nds => nds.map(n => 
          n.id === nodeId ? { ...n, data: { ...n.data, label: data.label } } : n
        ));
        triggerSave();
      }
    };
    window.addEventListener('xrplot-action', handler);
    return () => window.removeEventListener('xrplot-action', handler);
  }, [nodes, edges, setNodes, triggerSave, doSave]);

  // After upload completes, refresh world data
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
      panoramaPublicId: n.data.panoramaPublicId || '',
      status: n.data.status || 'empty',
    }));
    const worldEdges = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      transitionImages: e.data?.transitionImages || [],
      transitionPanorama: e.data?.transitionPanorama || '',
      status: e.data?.status || 'empty',
    }));
    onSave({ name: worldName, nodes: worldNodes, edges: worldEdges });
  };

  const hasReadyNodes = nodes.some(n => n.data.status === 'ready');

  return (
    <div className="canvas-page">
      {/* Toolbar */}
      <div className="canvas-toolbar">
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
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
            ⚡ Double-click another node to connect
          </span>
        )}
        <button className="btn btn-secondary" onClick={addNode}>+ Add Space</button>
        <button className="btn btn-secondary" onClick={handleManualSave} disabled={saving}>
          {saving ? '💾 Saving...' : '💾 Save'}
        </button>
        {lastSaved && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
        <button
          className="btn btn-primary"
          onClick={onPreview}
          disabled={!hasReadyNodes}
          title={!hasReadyNodes ? 'Add and stitch at least one space first' : 'Preview your world'}
        >
          👁️ Preview World
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
          existingImages={uploadModal.type === 'node' ? uploadModal.data.images : uploadModal.data.transitionImages}
          onClose={() => setUploadModal(null)}
          onComplete={handleUploadComplete}
        />
      )}

      {/* Viewer Modal */}
      {viewerModal && (
        <ViewerModal
          panoramaUrl={viewerModal.panoramaUrl}
          label={viewerModal.label}
          onClose={() => setViewerModal(null)}
        />
      )}
    </div>
  );
}
