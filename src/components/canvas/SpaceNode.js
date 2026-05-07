'use client';



import { memo, useState, useEffect, useCallback } from 'react';

import { Handle, Position } from '@xyflow/react';

import { Paperclip, Wand2, Eye, Trash2, Camera, Pencil, Check, X, ArrowLeftRight, Telescope, Store, Home, Stethoscope, GraduationCap, TreePine, Cpu, Building2, List } from 'lucide-react';



const statusConfig = {

  empty: { label: 'Empty', className: 'badge-empty' },

  uploaded: { label: 'Uploaded', className: 'badge-uploaded' },

  analyzing: { label: 'Analyzing...', className: 'badge-analyzing' },

  stitching: { label: 'Stitching...', className: 'badge-stitching' },

  ready: { label: 'Ready', className: 'badge-ready' },

  error: { label: 'Error', className: 'badge-error' },

};

const predictionTypeConfig = {
  main_street: { 
    icon: Store, 
    color: '#f59e0b', 
    bgColor: '#fef3c7', 
    borderColor: '#f59e0b33',
    label: 'Main Street'
  },
  residential: { 
    icon: Home, 
    color: '#3b82f6', 
    bgColor: '#dbeafe', 
    borderColor: '#3b82f633',
    label: 'Residential'
  },
  healthcare: { 
    icon: Stethoscope, 
    color: '#ef4444', 
    bgColor: '#fee2e2', 
    borderColor: '#ef444433',
    label: 'Healthcare'
  },
  education: { 
    icon: GraduationCap, 
    color: '#8b5cf6', 
    bgColor: '#ede9fe', 
    borderColor: '#8b5cf633',
    label: 'Education'
  },
  green_space: { 
    icon: TreePine, 
    color: '#10b981', 
    bgColor: '#d1fae5', 
    borderColor: '#10b98133',
    label: 'Green Space'
  },
  tech_hub: { 
    icon: Cpu, 
    color: '#06b6d4', 
    bgColor: '#cffafe', 
    borderColor: '#06b6d433',
    label: 'Tech Hub'
  },
};



const handleStyle = { background: '#7c3aed', border: '2px solid #0d0d1a', width: 10, height: 10 };



function SpaceNode({ id, data, selected }) {

  const [editing, setEditing] = useState(false);

  const [label, setLabel] = useState(data.label || 'New Space');

  useEffect(() => { if (!editing) setLabel(data.label || 'New Space'); }, [data.label, editing]);

  const status = statusConfig[data.status] || statusConfig.empty;

  const predictionType = predictionTypeConfig[data.predictionType];



  const dispatch = (type, detail = {}) => {

    window.dispatchEvent(new CustomEvent('xrplot-action', { detail: { type, nodeId: id, ...detail } }));

  };

  // Handle double-click for node connection
  const handleDoubleClick = useCallback((event) => {
    console.log('SpaceNode double-clicked:', id);
    // Dispatch a custom event for the WorldCanvas to handle
    window.dispatchEvent(new CustomEvent('xrplot-node-double-click', { 
      detail: { 
        nodeId: id,
        nodeData: data
      } 
    }));
  }, [id, data]);



  const handleLabelBlur = () => {

    setEditing(false);

    if (label !== data.label) {

      dispatch('updateNodeLabel', { data: { label } });

    }

  };



  const hasAIEdits = !!data.originalPanoramaUrl || (data.images && data.images.some(img => !!img.originalUrl));



  return (

    <div
      className={`space-node ${selected ? 'selected' : ''}`}
      style={{
        position: 'relative',
        boxShadow: data.isPredictionNode
          ? '0 0 0 1px rgba(124,58,237,0.5), 0 0 20px rgba(124,58,237,0.35), var(--shadow-md)'
          : undefined,
        borderRadius: data.isPredictionNode ? '14px' : undefined,
      }}
      onDoubleClick={handleDoubleClick}
    >

      

      {hasAIEdits && (

        <div style={{ position: 'absolute', top: -38, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', zIndex: 10 }}>

          <button 

            onClick={(e) => { e.stopPropagation(); dispatch('acceptChanges'); }}

            style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', transition: 'background 0.2s' }}

            title="Keep Changes"

            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}

            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}

          >

            <Check size={14} />

          </button>

          <button 

            onClick={(e) => { e.stopPropagation(); dispatch('revertChanges'); }}

            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', transition: 'background 0.2s' }}

            title="Revert to Original"

            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}

            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}

          >

            <X size={14} />

          </button>

        </div>

      )}



      <Handle type="target" position={Position.Top} style={handleStyle} />

      <Handle type="source" position={Position.Bottom} style={handleStyle} />

      <Handle type="target" position={Position.Left} id="left-target" style={handleStyle} />

      <Handle type="source" position={Position.Right} id="right-source" style={handleStyle} />



      {/* Header */}

      <div className="space-node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

        <div className="space-node-label">

          {editing ? (

            <input

              className="input"

              style={{ padding: '2px 6px', fontSize: '0.85rem', width: 120 }}

              value={label}

              onChange={e => setLabel(e.target.value)}

              onBlur={handleLabelBlur}

              onKeyDown={e => e.key === 'Enter' && handleLabelBlur()}

              autoFocus

            />

          ) : (

            <span onClick={() => setEditing(true)} style={{ cursor: 'text', display: 'flex', alignItems: 'center', gap: 4 }}>

              {label} <Pencil size={10} style={{ opacity: 0.4 }} />

            </span>

          )}

        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>

          <button 

            onClick={(e) => { e.stopPropagation(); dispatch('initiateSwap'); }}

            style={{ 

              background: '#ffffff', 

              border: '1.5px solid #000000', 

              borderRadius: '4px', 

              cursor: 'pointer', 

              padding: '2px', 

              display: 'flex', 

              alignItems: 'center',

              justifyContent: 'center',

              width: '20px',

              height: '20px',

              transition: 'all 0.2s ease'

            }}

            title="Swap Node"

            onMouseEnter={(e) => {

              e.currentTarget.style.background = '#f3f4f6';

              e.currentTarget.style.transform = 'scale(1.1)';

            }}

            onMouseLeave={(e) => {

              e.currentTarget.style.background = '#ffffff';

              e.currentTarget.style.transform = 'scale(1)';

            }}

          >

            <ArrowLeftRight size={12} color="#000000" />

          </button>

          <button 

            onClick={(e) => { e.stopPropagation(); dispatch('deleteNode'); }}

            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff4444', padding: '0 4px', display: 'flex', alignItems: 'center' }}

            title="Delete Node"

          >

            <Trash2 size={14} />

          </button>

        </div>

      </div>



      {/* Thumbnail */}

      <div className="space-node-thumb" style={{ position: 'relative' }}>

        {data.panoramaUrl ? (

          <img src={data.panoramaUrl} alt={label} />

        ) : data.images?.length > 0 ? (

          <img src={data.images[0].url} alt={label} />

        ) : (

          <Camera size={24} style={{ opacity: 0.4 }} />

        )}

        {data.isPredictionNode && predictionType && (
          <div style={{
            position: 'absolute',
            top: 6,
            right: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 6,
            background: predictionType.bgColor,
            color: predictionType.color,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            boxShadow: `0 2px 8px ${predictionType.borderColor}`,
            border: `1px solid ${predictionType.borderColor}`,
            zIndex: 5,
            pointerEvents: 'none',
          }}>
            <predictionType.icon size={10} strokeWidth={2.5} /> {predictionType.label}
          </div>
        )}

      </div>



      {/* Status */}

      <div className="space-node-status">

        <span className={`badge ${status.className}`}>

          <span className="badge-dot" />

          {data.isPredictionNode ? `${predictionType?.label || '2036'} · ${data.urbanDensity ?? '--'}% built-up` : status.label}

          {!data.isPredictionNode && data.images?.length > 0 && ` · ${data.images.length} imgs`}

        </span>

      </div>



      {/* Actions */}

      <div className="space-node-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>

        <button

          className="btn"

          onClick={(e) => { e.stopPropagation(); dispatch('openUpload'); }}

          title="Upload Images"

          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', flex: 1, borderRadius: '6px' }}

        >

          <Paperclip size={14} />

        </button>

        <button

          className="btn"

          onClick={(e) => { e.stopPropagation(); dispatch('openPrompt'); }}

          title="AI Prompt"

          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', flex: 1, borderRadius: '6px' }}

        >

          <Wand2 size={14} />

        </button>

        <button

          className="btn"

          onClick={(e) => { e.stopPropagation(); dispatch('openPreview'); }}

          disabled={!data.panoramaUrl}

          title="Preview 360 View"

          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', flex: 1, borderRadius: '6px', opacity: data.panoramaUrl ? 1 : 0.4 }}

        >

          <Eye size={14} />

        </button>

      </div>

    </div>

  );

}



export default memo(SpaceNode);

