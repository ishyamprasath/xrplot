/**
 * Swap Transaction Manager
 * Handles atomic node swap operations with rollback capabilities
 */

export class SwapTransactionManager {
  constructor(nodes, edges) {
    this.originalNodes = JSON.parse(JSON.stringify(nodes));
    this.originalEdges = JSON.parse(JSON.stringify(edges));
    this.currentNodes = nodes;
    this.currentEdges = edges;
    this.operations = [];
  }

  /**
   * Create a snapshot of current state
   */
  createSnapshot() {
    return {
      nodes: JSON.parse(JSON.stringify(this.currentNodes)),
      edges: JSON.parse(JSON.stringify(this.currentEdges))
    };
  }

  /**
   * Add operation to transaction log
   */
  addOperation(type, data) {
    this.operations.push({ type, data, timestamp: Date.now() });
  }

  /**
   * Rollback to original state
   */
  rollback() {
    this.currentNodes.splice(0, this.currentNodes.length, ...this.originalNodes);
    this.currentEdges.splice(0, this.currentEdges.length, ...this.originalEdges);
    this.operations = [];
    return true;
  }

  /**
   * Commit transaction (clear operations log)
   */
  commit() {
    this.operations = [];
    this.originalNodes = JSON.parse(JSON.stringify(this.currentNodes));
    this.originalEdges = JSON.parse(JSON.stringify(this.currentEdges));
    return true;
  }

  /**
   * Get connected edges for a node
   */
  getNodeEdges(nodeId) {
    return this.currentEdges.filter(edge => 
      edge.source === nodeId || edge.target === nodeId
    );
  }

  /**
   * Update node position
   */
  updateNodePosition(nodeId, position) {
    const node = this.currentNodes.find(n => n.id === nodeId);
    if (node) {
      const oldPosition = { ...node.position };
      node.position = position;
      this.addOperation('updatePosition', { nodeId, oldPosition, newPosition: position });
      return true;
    }
    return false;
  }

  /**
   * Swap node data between two nodes
   */
  swapNodeData(nodeId1, nodeId2) {
    const node1 = this.currentNodes.find(n => n.id === nodeId1);
    const node2 = this.currentNodes.find(n => n.id === nodeId2);
    
    if (!node1 || !node2) return false;

    const oldData1 = { ...node1.data };
    const oldData2 = { ...node2.data };
    
    // Swap data but keep IDs and positions
    const tempData = { ...node1.data };
    node1.data = { ...node2.data };
    node2.data = tempData;

    this.addOperation('swapData', { 
      nodeId1, nodeId2, 
      oldData1, oldData2 
    });

    return true;
  }

  /**
   * Remap edges from one node to another
   */
  remapEdges(fromNodeId, toNodeId) {
    const affectedEdges = [];
    
    this.currentEdges.forEach(edge => {
      if (edge.source === fromNodeId) {
        const oldSource = edge.source;
        edge.source = toNodeId;
        affectedEdges.push({ edgeId: edge.id, type: 'source', oldSource, newSource: toNodeId });
        this.addOperation('remapEdge', { edgeId: edge.id, type: 'source', oldSource, newSource: toNodeId });
      }
      if (edge.target === fromNodeId) {
        const oldTarget = edge.target;
        edge.target = toNodeId;
        affectedEdges.push({ edgeId: edge.id, type: 'target', oldTarget, newTarget: toNodeId });
        this.addOperation('remapEdge', { edgeId: edge.id, type: 'target', oldTarget, newTarget: toNodeId });
      }
    });

    return affectedEdges;
  }

  /**
   * Validate graph integrity after swap
   */
  validateGraph() {
    const nodeIds = new Set(this.currentNodes.map(n => n.id));
    
    // Check if all edges reference existing nodes
    for (const edge of this.currentEdges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        return { valid: false, error: `Edge ${edge.id} references non-existent node` };
      }
    }

    // Check for duplicate node IDs
    const idCounts = {};
    for (const node of this.currentNodes) {
      idCounts[node.id] = (idCounts[node.id] || 0) + 1;
      if (idCounts[node.id] > 1) {
        return { valid: false, error: `Duplicate node ID: ${node.id}` };
      }
    }

    return { valid: true };
  }
}

/**
 * Swap Strategy Detector
 * Determines the appropriate swap strategy based on node analysis
 */

export class SwapStrategyDetector {
  static detectSwapStrategy(nodeA, nodeB, edges) {
    // Get semantic types from node data
    const typeA = this.getNodeSemanticType(nodeA);
    const typeB = this.getNodeSemanticType(nodeB);

    // Check if nodes are containers (have sub-graphs)
    const isContainerA = this.isContainerNode(nodeA, edges);
    const isContainerB = this.isContainerNode(nodeB, edges);

    // Recursive swap for container nodes
    if (isContainerA || isContainerB) {
      return 'recursive';
    }

    // Direct swap for identical semantic types
    if (typeA === typeB && this.hasCompatibleGeometry(nodeA, nodeB, edges)) {
      return 'direct';
    }

    // Adaptive swap for different geometries or types
    return 'adaptive';
  }

  static getNodeSemanticType(node) {
    // Extract semantic type from node data
    // This could be based on label, custom data, or other properties
    const label = node.data?.label || '';
    const customType = node.data?.semanticType;
    
    if (customType) return customType;
    
    // Infer type from label patterns
    if (label.toLowerCase().includes('room')) return 'room';
    if (label.toLowerCase().includes('hallway') || label.toLowerCase().includes('corridor')) return 'hallway';
    if (label.toLowerCase().includes('door')) return 'door';
    if (label.toLowerCase().includes('entrance')) return 'entrance';
    if (label.toLowerCase().includes('exit')) return 'exit';
    
    return 'space'; // Default type
  }

  static hasCompatibleGeometry(nodeA, nodeB, edges) {
    // Check if nodes have similar geometry requirements
    // This is a simplified check - in practice, you'd analyze actual geometry data
    const connectionsA = this.getNodeConnectionCount(nodeA, edges || []);
    const connectionsB = this.getNodeConnectionCount(nodeB, edges || []);
    
    // Consider compatible if connection counts are similar
    return Math.abs(connectionsA - connectionsB) <= 2;
  }

  static getNodeConnectionCount(node, edges) {
    if (!edges || !Array.isArray(edges)) return 0;
    return edges.filter(edge => 
      edge.source === node.id || edge.target === node.id
    ).length;
  }

  static isContainerNode(node, edges) {
    // Check if node contains sub-graph structure
    // This could be based on node data or edge patterns
    return node.data?.isContainer || 
           node.data?.subNodes ||
           this.hasNestedStructure(node, edges || []);
  }

  static hasNestedStructure(node, edges) {
    // Check for edges that suggest hierarchical relationships
    if (!edges || !Array.isArray(edges)) return false;
    const outgoingEdges = edges.filter(edge => edge.source === node.id);
    return outgoingEdges.length > 2; // Heuristic for container nodes
  }
}

/**
 * Swap Strategy Implementations
 */

export class DirectSwapStrategy {
  static execute(transactionManager, nodeId1, nodeId2) {
    // Direct swap: exchange data while preserving positions and connections
    const success = transactionManager.swapNodeData(nodeId1, nodeId2);
    return success;
  }
}

export class AdaptiveSwapStrategy {
  static execute(transactionManager, nodeId1, nodeId2) {
    // Adaptive swap: remap edges based on spatial compatibility
    const edges1 = transactionManager.getNodeEdges(nodeId1);
    const edges2 = transactionManager.getNodeEdges(nodeId2);

    // Analyze edge patterns and remap accordingly
    const remapResult1 = this.remapEdgesByPattern(transactionManager, edges1, nodeId1, nodeId2);
    const remapResult2 = this.remapEdgesByPattern(transactionManager, edges2, nodeId2, nodeId1);

    // Swap node data
    const swapSuccess = transactionManager.swapNodeData(nodeId1, nodeId2);

    return swapSuccess && remapResult1 && remapResult2;
  }

  static remapEdgesByPattern(transactionManager, edges, fromNodeId, toNodeId) {
    // Implement intelligent edge remapping based on spatial analysis
    // This is a simplified version - full implementation would analyze port positions
    return transactionManager.remapEdges(fromNodeId, toNodeId);
  }
}

export class RecursiveSwapStrategy {
  static execute(transactionManager, nodeId1, nodeId2) {
    // Recursive swap: handle container nodes with sub-graphs
    const node1 = transactionManager.currentNodes.find(n => n.id === nodeId1);
    const node2 = transactionManager.currentNodes.find(n => n.id === nodeId2);

    if (!node1 || !node2) return false;

    // Preserve sub-graph structure
    const subNodes1 = node1.data?.subNodes || [];
    const subNodes2 = node2.data?.subNodes || [];

    // Swap container data while preserving internal structure
    const containerData1 = { ...node1.data };
    const containerData2 = { ...node2.data };

    // Swap main container data
    node1.data = { ...containerData2, subNodes: subNodes1 };
    node2.data = { ...containerData1, subNodes: subNodes2 };

    // Remap external connections
    transactionManager.remapEdges(nodeId1, nodeId2);
    transactionManager.remapEdges(nodeId2, nodeId1);

    return true;
  }
}
