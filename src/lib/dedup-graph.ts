import { LangCode } from "@/lib/langcodes";

export interface EtymologyGraph {
  nodes: { lang: LangCode; word: string }[];
  edges: { source: string; target: string; type: string }[];
}

// Helper function to create a unique key for a node
function getNodeKey(node: { lang: LangCode; word: string }): string {
  return `${node.lang}:${node.word}`;
}

// Recursive function to traverse the JSON and collect nodes and edges
function traverse(
  nodeObj: {
    lang: LangCode;
    word: string;
    relations?: { lang: LangCode; word: string; type: string }[];
  },
  nodeMap: Map<string, { lang: LangCode; word: string }>,
  edgeList: { source: string; target: string; type: string }[],
  edgeSet: Set<string>
) {
  // Get the unique key for the current node
  const currentKey = getNodeKey(nodeObj);

  // Add the node to the map if it’s not already present
  if (!nodeMap.has(currentKey)) {
    nodeMap.set(currentKey, { lang: nodeObj.lang, word: nodeObj.word });
  }

  // Process relations if they exist
  if (nodeObj.relations) {
    for (const relation of nodeObj.relations) {
      // Get the unique key for the target node
      const targetKey = getNodeKey(relation);

      // Add the target node to the map if it’s not already present
      if (!nodeMap.has(targetKey)) {
        nodeMap.set(targetKey, { lang: relation.lang, word: relation.word });
      }

      // Create a unique edge identifier
      const edgeKey = `${currentKey}->${targetKey}:${relation.type}`;

      // Add the edge if it hasn’t been added before
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edgeList.push({
          source: currentKey,
          target: targetKey,
          type: relation.type,
        });
      }

      // Recursively traverse the relation
      traverse(relation, nodeMap, edgeList, edgeSet);
    }
  }
}

// Main function to build the graph
export function dedupGraph(root: {
  lang: LangCode;
  word: string;
  relations?: { lang: LangCode; word: string; type: string }[];
}): EtymologyGraph {
  const nodeMap = new Map<string, { lang: LangCode; word: string }>(); // Stores unique nodes with their keys
  const edgeList: { source: string; target: string; type: string }[] = []; // Stores all edges
  const edgeSet = new Set<string>(); // Ensures edge uniqueness

  // Start traversal from the root
  traverse(root, nodeMap, edgeList, edgeSet);

  // Return the graph with nodes and edges
  return {
    nodes: Array.from(nodeMap.values()),
    edges: edgeList,
  };
}
