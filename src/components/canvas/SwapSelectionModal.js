'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle } from 'lucide-react';

export default function SwapSelectionModal({ 
  isOpen, 
  onClose, 
  nodes, 
  edges = [],
  onSwapConfirm,
  selectedNodes = [],
  onNodeSelect 
}) {
  const [sourceNode, setSourceNode] = useState(null);
  const [targetNode, setTargetNode] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [swapStrategy, setSwapStrategy] = useState(null);

  useEffect(() => {
    if (selectedNodes.length >= 1) {
      setSourceNode(selectedNodes[0]);
    }
    if (selectedNodes.length >= 2) {
      setTargetNode(selectedNodes[1]);
    }
  }, [selectedNodes]);

  useEffect(() => {
    if (sourceNode && targetNode) {
      analyzeSwapStrategy();
    }
  }, [sourceNode, targetNode]);

  const analyzeSwapStrategy = async () => {
    if (!sourceNode || !targetNode) return;
    
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Import and use strategy detector
    const { SwapStrategyDetector } = await import('../../utils/SwapTransactionManager');
    const strategy = SwapStrategyDetector.detectSwapStrategy(sourceNode, targetNode, edges);
    
    setSwapStrategy(strategy);
    setIsAnalyzing(false);
  };

  const handleNodeClick = (node) => {
    if (!sourceNode) {
      setSourceNode(node);
      onNodeSelect?.([node]);
    } else if (!targetNode && node.id !== sourceNode.id) {
      setTargetNode(node);
      onNodeSelect?.([sourceNode, node]);
    } else if (node.id === sourceNode.id) {
      // Deselect source
      setSourceNode(targetNode);
      setTargetNode(null);
      onNodeSelect?.(targetNode ? [targetNode] : []);
    }
  };

  const handleConfirm = () => {
    if (sourceNode && targetNode) {
      onSwapConfirm(sourceNode, targetNode, swapStrategy);
      handleClose();
    }
  };

  const handleClose = () => {
    setSourceNode(null);
    setTargetNode(null);
    setSwapStrategy(null);
    onClose();
  };

  const getStrategyDescription = (strategy) => {
    switch (strategy) {
      case 'direct':
        return 'Direct swap - nodes have compatible types and geometry';
      case 'adaptive':
        return 'Adaptive swap - remapping connections for different geometries';
      case 'recursive':
        return 'Recursive swap - preserving sub-graph structure';
      default:
        return 'Analyzing...';
    }
  };

  const getStrategyColor = (strategy) => {
    switch (strategy) {
      case 'direct': return '#10b981'; // green
      case 'adaptive': return '#f59e0b'; // amber
      case 'recursive': return '#8b5cf6'; // purple
      default: return '#6b7280'; // gray
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: '#ffffff',
        border: '2px solid #000000',
        borderRadius: 12,
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ArrowRightLeft size={24} color="#000" />
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
              Swap Nodes
            </h2>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} color="#000" />
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          background: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '12px',
          marginBottom: '20px',
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151' }}>
            Select two nodes to swap. The system will automatically determine the best swap strategy.
          </p>
        </div>

        {/* Selection Status */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
                Source Node
              </div>
              <div style={{
                background: sourceNode ? '#10b981' : '#f3f4f6',
                border: '2px solid #000',
                borderRadius: 8,
                padding: '12px',
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: sourceNode ? '#ffffff' : '#9ca3af',
                fontWeight: 600,
              }}>
                {sourceNode ? sourceNode.data?.label || 'Unnamed Node' : 'Click to select'}
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              paddingTop: '32px'
            }}>
              <ArrowRightLeft size={24} color="#000" />
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
                Target Node
              </div>
              <div style={{
                background: targetNode ? '#3b82f6' : '#f3f4f6',
                border: '2px solid #000',
                borderRadius: 8,
                padding: '12px',
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: targetNode ? '#ffffff' : '#9ca3af',
                fontWeight: 600,
              }}>
                {targetNode ? targetNode.data?.label || 'Unnamed Node' : 'Click to select'}
              </div>
            </div>
          </div>

          {/* Strategy Analysis */}
          {(isAnalyzing || swapStrategy) && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: 8,
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              {isAnalyzing ? (
                <>
                  <AlertCircle size={16} color="#f59e0b" />
                  <span style={{ fontSize: '0.85rem', color: '#92400e' }}>
                    Analyzing nodes and determining swap strategy...
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} color={getStrategyColor(swapStrategy)} />
                  <span style={{ fontSize: '0.85rem', color: '#374151' }}>
                    <strong>Strategy:</strong> {getStrategyDescription(swapStrategy)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Node Grid */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px' }}>
            Available Nodes ({nodes.length})
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '8px',
            maxHeight: '200px',
            overflow: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '8px',
          }}>
            {nodes.map(node => {
              const isSelected = node.id === sourceNode?.id || node.id === targetNode?.id;
              const isSource = node.id === sourceNode?.id;
              const isTarget = node.id === targetNode?.id;
              
              return (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  disabled={node.id === sourceNode?.id && !targetNode}
                  style={{
                    background: isSelected 
                      ? (isSource ? '#10b981' : '#3b82f6')
                      : '#ffffff',
                    border: '2px solid #000',
                    borderRadius: 6,
                    padding: '8px',
                    cursor: (node.id === sourceNode?.id && !targetNode) ? 'not-allowed' : 'pointer',
                    color: isSelected ? '#ffffff' : '#000000',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    opacity: (node.id === sourceNode?.id && !targetNode) ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!(node.id === sourceNode?.id && !targetNode)) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    {node.data?.label || 'Unnamed Node'}
                    {isSelected && (
                      <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                        {isSource ? 'Source' : 'Target'}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClose}
            style={{
              background: '#ffffff',
              border: '2px solid #000',
              borderRadius: 8,
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
          >
            Cancel
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!sourceNode || !targetNode || isAnalyzing}
            style={{
              background: (!sourceNode || !targetNode || isAnalyzing) 
                ? '#d1d5db' 
                : '#000000',
              border: '2px solid #000',
              borderRadius: 8,
              padding: '10px 20px',
              cursor: (!sourceNode || !targetNode || isAnalyzing) 
                ? 'not-allowed' 
                : 'pointer',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              if (sourceNode && targetNode && !isAnalyzing) {
                e.currentTarget.style.background = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (sourceNode && targetNode && !isAnalyzing) {
                e.currentTarget.style.background = '#000000';
              }
            }}
          >
            <ArrowRightLeft size={16} />
            Execute Swap
          </button>
        </div>
      </div>
    </div>
  );
}
