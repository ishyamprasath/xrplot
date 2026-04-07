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
import { ArrowLeft, Plus, Save, Eye, Loader2, Zap } from 'lucide-react';
import SpaceNode from './SpaceNode';
import ConnectionEdge from './ConnectionEdge';
import ImageUploadModal from '../upload/ImageUploadModal';
import ViewerModal from '../viewer/ViewerModal';
import PromptModal from '../prompt/PromptModal';
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
      originalPanoramaUrl: n.originalPanoramaUrl,
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
      worldId: world._id,
      edgeId: e.id,
    },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [worldName, setWorldName] = useState(world.name);
  const [uploadModal, setUploadModal] = useState(null); // { type: 'node'|'edge', id, data }
  const [promptModal, setPromptModal] = useState(null); // { id, data }
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
            originalPanoramaUrl: serverNode.originalPanoramaUrl !== undefined ? serverNode.originalPanoramaUrl : n.data.originalPanoramaUrl,
            panoramaPublicId: serverNode.panoramaPublicId || '',
            status: serverNode.status || 'empty',
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
        } catch(err) {
          alert(err.message);
        } finally {
          setBuilding(false);
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

        const worldEdges = updatedEdges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        }));

        onSave({ name: worldName, nodes: worldNodes, edges: worldEdges });
      }
    };
    window.addEventListener('xrplot-action', handler);
    return () => window.removeEventListener('xrplot-action', handler);
  }, [nodes, edges, setNodes, triggerSave, doSave, world, onRefresh]);

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

  const handleBuildAndPreview = async () => {
    handleManualSave();
    setBuilding(true);
    setBuildProgress('Checking for unstitched spaces...');

    try {
      const pendingNodes = nodes.filter(n => n.data.images?.length > 0 && n.data.status !== 'ready' && n.data.status !== 'stitching');

      for (let i = 0; i < pendingNodes.length; i++) {
        const node = pendingNodes[i];
        setBuildProgress(`Stitching Space ${i + 1} of ${pendingNodes.length}: ${node.data.label}...`);
        const res = await fetch(`/api/worlds/${world._id}/nodes/${node.id}/stitch`, { method: 'POST' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(`Failed to stitch ${node.data.label}: ${errData.error || 'Unknown error'}`);
        }
      }

      if (pendingNodes.length > 0) {
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
  );
}
