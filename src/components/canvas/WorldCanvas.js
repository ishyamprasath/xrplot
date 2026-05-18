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
import SpaceNode from './SpaceNode';
import ConnectionEdge from './ConnectionEdge';
import ImageUploadModal from '../upload/ImageUploadModal';
import ViewerModal from '../viewer/ViewerModal';
import TourCapture from '../capture/TourCapture';
import { v4 as uuidv4 } from 'uuid';

const nodeTypes = { spaceNode: SpaceNode };
const edgeTypes = { connectionEdge: ConnectionEdge };

const defaultEdgeOptions = {
  type: 'connectionEdge',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },
  style: { stroke: '#7c3aed', strokeWidth: 2 },
  animated: true,
};

const guideSteps = [
  {
    key: 'canvas',
    title: 'This is your world map',
    body: 'Each card is a space in the real place. Arrange spaces first so the tour structure is clear before detailed media work begins.',
  },
  {
    key: 'spaces',
    title: 'Add spaces as nodes',
    body: 'Use Add space for every room, viewpoint, or area visitors can enter. Rename each node as soon as you create it.',
  },
  {
    key: 'connect',
    title: 'Connect spaces as portals',
    body: 'Drag from a node handle to another node, or double-click two nodes in sequence. Connections become visitor navigation paths.',
  },
  {
    key: 'inspector',
    title: 'Finish the selected space',
    body: 'Use the inspector to rename, capture, upload, and preview the currently selected space without hunting inside the canvas.',
  },
];

export default function WorldCanvas({ world, onSave, saving, lastSaved, onBack, onPreview, onRefresh }) {
  const initialNodes = (world.nodes || []).map(n => ({
    id: n.id,
    type: 'spaceNode',
    position: n.position || { x: 0, y: 0 },
    data: {
      label: n.label,
      images: n.images || [],
      panoramaUrl: n.panoramaUrl || '',
      panoramaPublicId: n.panoramaPublicId || '',
      status: n.status || 'empty',
      worldId: world._id,
      nodeId: n.id,
    },
  }));

  const uniqueEdges = [];
  const edgeKeys = new Set();
  (world.edges || []).forEach(e => {
    const key1 = `${e.source}-${e.target}`;
    const key2 = `${e.target}-${e.source}`;
    if (!edgeKeys.has(key1) && !edgeKeys.has(key2)) {
      edgeKeys.add(key1);
      uniqueEdges.push(e);
    }
  });

  const initialEdges = uniqueEdges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'connectionEdge',
    animated: true,
    style: { stroke: '#7c3aed', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },
    data: {
      transitionImages: e.transitionImages || [],
      transitionPanorama: e.transitionPanorama || '',
      status: e.status || 'empty',
      worldId: world._id,
      edgeId: e.id,
    },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [worldName, setWorldName] = useState(world.name);
  const [selectedNodeId, setSelectedNodeId] = useState(initialNodes[0]?.id || null);
  const [uploadModal, setUploadModal] = useState(null);
  const [viewerModal, setViewerModal] = useState(null);
  const [captureModal, setCaptureModal] = useState(null);
  const [doubleClickNode, setDoubleClickNode] = useState(null);
  const [guideIndex, setGuideIndex] = useState(null);
  const saveTimerRef = useRef(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const worldNameRef = useRef(worldName);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { worldNameRef.current = worldName; }, [worldName]);

  useEffect(() => {
    if (!world) return;
    setNodes(nds => nds.map(n => {
      const serverNode = world.nodes?.find(wn => wn.id === n.id);
      if (!serverNode) return n;
      return {
        ...n,
        data: {
          ...n.data,
          images: serverNode.images || n.data.images,
          panoramaUrl: serverNode.panoramaUrl || '',
          panoramaPublicId: serverNode.panoramaPublicId || '',
          status: serverNode.status || 'empty',
          label: serverNode.label || n.data.label,
        },
      };
    }));

    setEdges(eds => eds.map(e => {
      const serverEdge = world.edges?.find(we => we.id === e.id);
      if (!serverEdge) return e;
      return {
        ...e,
        data: {
          ...e.data,
          transitionImages: serverEdge.transitionImages || e.data.transitionImages,
          transitionPanorama: serverEdge.transitionPanorama || '',
          status: serverEdge.status || 'empty',
        },
      };
    }));
  }, [world, setNodes, setEdges]);

  const doSave = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const currentWorldName = worldNameRef.current;
    const worldNodes = currentNodes.map(n => ({
      id: n.id,
      label: n.data.label,
      position: n.position,
      images: n.data.images || [],
      panoramaUrl: n.data.panoramaUrl || '',
      panoramaPublicId: n.data.panoramaPublicId || '',
      status: n.data.status || 'empty',
    }));

    const worldEdges = currentEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      transitionImages: e.data?.transitionImages || [],
      transitionPanorama: e.data?.transitionPanorama || '',
      status: e.data?.status || 'empty',
    }));

    onSave({ name: currentWorldName, nodes: worldNodes, edges: worldEdges });
  }, [onSave]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, 1000);
    return () => clearTimeout(saveTimerRef.current);
  }, [nodes, edges, worldName, doSave]);

  const triggerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(doSave, 350);
  }, [doSave]);

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  );

  const selectedConnections = useMemo(
    () => selectedNode ? edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id) : [],
    [edges, selectedNode],
  );

  const readyNodes = nodes.filter(n => n.data.status === 'ready' || n.data.panoramaUrl).length;
  const setupSteps = [
    { label: 'Add a space', done: nodes.length > 0 },
    { label: 'Add panorama', done: readyNodes > 0 },
    { label: 'Connect spaces', done: edges.length > 0 },
    { label: 'Preview world', done: readyNodes > 0 && edges.length > 0 },
  ];
  const setupDone = setupSteps.filter(s => s.done).length;
  const activeGuide = guideIndex === null ? null : guideSteps[guideIndex];

  const addNode = useCallback((label = 'New Space') => {
    const id = uuidv4();
    const newNode = {
      id,
      type: 'spaceNode',
      position: { x: Math.random() * 360 + 120, y: Math.random() * 260 + 100 },
      data: {
        label,
        images: [],
        panoramaUrl: '',
        panoramaPublicId: '',
        status: 'empty',
        worldId: world._id,
        nodeId: id,
      },
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(id);
    triggerSave();
  }, [setNodes, world._id, triggerSave]);

  const onConnect = useCallback((connection) => {
    const edgeExists = edgesRef.current.some(
      e => (e.source === connection.source && e.target === connection.target) ||
           (e.source === connection.target && e.target === connection.source),
    );
    if (edgeExists) return;

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
        transitionPanorama: '',
        status: 'empty',
        worldId: world._id,
        edgeId,
      },
    };
    setEdges(eds => addEdge(newEdge, eds));
    triggerSave();
  }, [setEdges, world._id, triggerSave]);

  const onNodeDoubleClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
    if (!doubleClickNode) {
      setDoubleClickNode(node.id);
      return;
    }
    if (doubleClickNode !== node.id) {
      const existingEdge = edges.find(
        e => (e.source === doubleClickNode && e.target === node.id) ||
             (e.source === node.id && e.target === doubleClickNode),
      );
      if (!existingEdge) {
        onConnect({ source: doubleClickNode, target: node.id });
      } else {
        setEdges(eds => eds.filter(e => e.id !== existingEdge.id));
        triggerSave();
      }
    }
    setDoubleClickNode(null);
  }, [doubleClickNode, edges, onConnect]);

  const openCaptureForNode = useCallback((node) => {
    if (!node) return;
    doSave();
    setTimeout(() => setCaptureModal({ nodeId: node.id, data: node.data }), 300);
  }, [doSave]);

  const openUploadForNode = useCallback((node) => {
    if (!node) return;
    doSave();
    setTimeout(() => setUploadModal({ type: 'node', id: node.id, data: node.data }), 300);
  }, [doSave]);

  const updateSelectedLabel = (label) => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n =>
      n.id === selectedNode.id ? { ...n, data: { ...n.data, label } } : n,
    ));
    triggerSave();
  };

  useEffect(() => {
    const handler = (e) => {
      const { type, nodeId, edgeId, data } = e.detail;
      if (nodeId) setSelectedNodeId(nodeId);
      if (type === 'openCapture') {
        const node = nodes.find(n => n.id === nodeId);
        openCaptureForNode(node);
        return;
      }
      if (type === 'openUpload') {
        const node = nodes.find(n => n.id === nodeId);
        openUploadForNode(node);
        return;
      }
      if (type === 'deleteEdge') {
        setEdges(eds => eds.filter(e => e.id !== edgeId));
        triggerSave();
        return;
      }
      if (type === 'openEdgeUpload') {
        doSave();
        setTimeout(() => {
          const edge = edges.find(edge => edge.id === edgeId);
          if (edge) setUploadModal({ type: 'edge', id: edgeId, data: edge.data });
        }, 300);
        return;
      }
      if (type === 'openPreview') {
        const node = nodes.find(n => n.id === nodeId);
        if (node?.data?.panoramaUrl) {
          setViewerModal({ panoramaUrl: node.data.panoramaUrl, label: node.data.label });
        }
        return;
      }
      if (type === 'updateNodeLabel') {
        setNodes(nds => nds.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, label: data.label } } : n,
        ));
        triggerSave();
      }
    };
    window.addEventListener('xrplot-action', handler);
    return () => window.removeEventListener('xrplot-action', handler);
  }, [nodes, edges, setNodes, triggerSave, doSave, openCaptureForNode, openUploadForNode]);

  const handleCaptureComplete = useCallback(async (panoramaUrl) => {
    if (!captureModal || !panoramaUrl) return;

    try {
      setNodes(nds => nds.map(n =>
        n.id === captureModal.nodeId
          ? { ...n, data: { ...n.data, panoramaUrl, status: 'ready' } }
          : n,
      ));

      const worldNodes = nodesRef.current.map(n => ({
        id: n.id,
        label: n.data.label,
        position: n.position,
        images: n.data.images || [],
        panoramaUrl: n.id === captureModal.nodeId ? panoramaUrl : (n.data.panoramaUrl || ''),
        panoramaPublicId: n.data.panoramaPublicId || '',
        status: n.id === captureModal.nodeId ? 'ready' : (n.data.status || 'empty'),
      }));
      const worldEdges = edgesRef.current.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        transitionImages: e.data?.transitionImages || [],
        transitionPanorama: e.data?.transitionPanorama || '',
        status: e.data?.status || 'empty',
      }));
      await onSave({ name: worldNameRef.current, nodes: worldNodes, edges: worldEdges });
    } catch (error) {
      console.error('[WorldCanvas] Error saving captured panorama:', error);
    } finally {
      setCaptureModal(null);
    }
  }, [captureModal, setNodes, onSave]);

  const handleUploadComplete = useCallback(async () => {
    setUploadModal(null);
    await onRefresh();
  }, [onRefresh]);

  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    const hasDrag = changes.some(c => c.type === 'position' && c.dragging === false);
    if (hasDrag) triggerSave();
  }, [onNodesChange, triggerSave]);

  const handleManualSave = () => {
    doSave();
  };

  const startGuide = () => setGuideIndex(0);
  const closeGuide = () => setGuideIndex(null);
  const nextGuide = () => {
    setGuideIndex(index => (index === null || index >= guideSteps.length - 1 ? null : index + 1));
  };

  const focusClass = (key) => activeGuide?.key === key ? 'guide-focus' : '';
  const hasReadyNodes = readyNodes > 0;

  return (
    <div className="world-builder">
      <header className="builder-topbar">
        <button className="btn btn-ghost" onClick={onBack}>Back</button>
        <div className="builder-title-block">
          <span className="section-kicker">Editing world</span>
          <input
            value={worldName}
            onChange={e => setWorldName(e.target.value)}
            onBlur={triggerSave}
            placeholder="World name..."
            aria-label="World name"
          />
        </div>
        <div className="builder-status">
          {saving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosave ready'}
        </div>
        <button className="btn btn-secondary" onClick={handleManualSave} disabled={saving}>Save</button>
        <button
          className="btn btn-primary"
          onClick={onPreview}
          disabled={!hasReadyNodes}
          title={!hasReadyNodes ? 'Add and stitch at least one space first' : 'Preview your world'}
        >
          Preview world
        </button>
      </header>

      <div className="builder-layout">
        <aside className={`builder-sidebar ${focusClass('spaces')} ${focusClass('connect')}`}>
          <section className="builder-panel">
            <p className="section-kicker">Setup path</p>
            <div className="mini-progress">
              <div className="mini-progress-bar"><span style={{ width: `${(setupDone / setupSteps.length) * 100}%` }} /></div>
              <strong>{setupDone} of {setupSteps.length} complete</strong>
            </div>
            <div className="builder-steps">
              {setupSteps.map((step, index) => (
                <div key={step.label} className={`builder-step ${step.done ? 'done' : setupDone === index ? 'active' : ''}`}>
                  <span>{index + 1}</span>
                  {step.label}
                </div>
              ))}
            </div>
          </section>

          <section className="builder-panel">
            <p className="section-kicker">Add space</p>
            <button className="tool-row primary" onClick={() => addNode('New Space')}>
              <span>+</span>
              <strong>Add space node</strong>
              <small>Create a room, area, or viewpoint.</small>
            </button>
            <button className="tool-row" onClick={() => selectedNode ? openUploadForNode(selectedNode) : addNode('Upload Space')}>
              <span>UP</span>
              <strong>Upload panorama</strong>
              <small>{selectedNode ? 'Attach media to selected space.' : 'Add a space first, then upload.'}</small>
            </button>
            <button className="tool-row" onClick={() => selectedNode ? openCaptureForNode(selectedNode) : addNode('Captured Space')}>
              <span>CA</span>
              <strong>Capture with camera</strong>
              <small>{selectedNode ? 'Open guided capture for this node.' : 'Create a node, then capture.'}</small>
            </button>
          </section>

          <section className="builder-panel">
            <p className="section-kicker">Map tools</p>
            <button className="tool-row" onClick={startGuide}>
              <span>?</span>
              <strong>Walk me through</strong>
              <small>Highlight the canvas, nodes, connections, and inspector.</small>
            </button>
            <div className={`connect-hint ${doubleClickNode ? 'active' : ''}`}>
              {doubleClickNode ? 'Double-click another node to connect it.' : 'Tip: double-click two nodes to create a connection.'}
            </div>
          </section>
        </aside>

        <section className={`builder-canvas ${focusClass('canvas')}`}>
          {nodes.length === 0 && (
            <div className="empty-canvas-prompt">
              <div className="empty-map-preview compact">
                <span className="preview-node n1" />
                <span className="preview-node n2" />
                <span className="preview-edge e1" />
              </div>
              <h2>Your world map is empty</h2>
              <p>Add the first space node. You can capture or upload the panorama after the map structure is clear.</p>
              <button className="btn btn-primary" onClick={() => addNode('Main Entrance')}>Add first space</button>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(event, node) => setSelectedNodeId(node.id)}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            proOptions={{ hideAttribution: true }}
            style={{ background: '#07070f' }}
          >
            <Background color="#252541" gap={28} size={1} />
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
              maskColor="rgba(7, 7, 15, 0.76)"
            />
          </ReactFlow>
        </section>

        <aside className={`builder-inspector ${focusClass('inspector')}`}>
          <section className="inspector-header">
            <p className="section-kicker">Inspector</p>
            <h2>{selectedNode ? 'Selected space' : 'No space selected'}</h2>
          </section>

          {selectedNode ? (
            <div className="inspector-body">
              <label className="field-label" htmlFor="selected-label">Space name</label>
              <input
                id="selected-label"
                className="input"
                value={selectedNode.data.label}
                onChange={e => updateSelectedLabel(e.target.value)}
              />

              <div className="inspector-stat-grid">
                <div>
                  <span>{selectedNode.data.panoramaUrl ? 'Ready' : selectedNode.data.status || 'Empty'}</span>
                  <small>Panorama</small>
                </div>
                <div>
                  <span>{selectedConnections.length}</span>
                  <small>Connections</small>
                </div>
              </div>

              <div className="inspector-section">
                <p className="field-label">Next best action</p>
                {!selectedNode.data.panoramaUrl ? (
                  <p className="helper-copy">Add a panorama to make this space previewable in the visitor tour.</p>
                ) : selectedConnections.length === 0 ? (
                  <p className="helper-copy">Connect this space to another node so visitors can navigate from it.</p>
                ) : (
                  <p className="helper-copy">This space is ready to preview. Keep refining links or add transition media.</p>
                )}
              </div>

              <div className="inspector-actions">
                <button className="btn btn-secondary" onClick={() => openCaptureForNode(selectedNode)}>Capture</button>
                <button className="btn btn-secondary" onClick={() => openUploadForNode(selectedNode)}>Upload</button>
                <button
                  className="btn btn-primary"
                  disabled={!selectedNode.data.panoramaUrl}
                  onClick={() => setViewerModal({ panoramaUrl: selectedNode.data.panoramaUrl, label: selectedNode.data.label })}
                >
                  Preview space
                </button>
              </div>
            </div>
          ) : (
            <div className="inspector-empty">
              <p>Select a node on the map to rename it, add a panorama, or preview the space.</p>
              <button className="btn btn-secondary" onClick={() => addNode('New Space')}>Add space</button>
            </div>
          )}
        </aside>
      </div>

      {activeGuide && (
        <div className="builder-guide" role="dialog" aria-modal="false" aria-label="Builder walkthrough">
          <div className={`guide-card guide-card-${activeGuide.key}`}>
            <span className="section-kicker">Step {guideIndex + 1} of {guideSteps.length}</span>
            <h2>{activeGuide.title}</h2>
            <p>{activeGuide.body}</p>
            <div className="guide-footer">
              <div className="guide-dots">
                {guideSteps.map((step, index) => (
                  <span key={step.key} className={index === guideIndex ? 'active' : ''} />
                ))}
              </div>
              <div className="guide-actions">
                <button className="btn btn-ghost" onClick={closeGuide}>Skip</button>
                <button className="btn btn-primary" onClick={nextGuide}>
                  {guideIndex === guideSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {captureModal && (
        <TourCapture
          onTourReady={handleCaptureComplete}
          onClose={() => setCaptureModal(null)}
        />
      )}

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
