import { EtymologyNode } from "./etymology";

type Node = {
  id: string;
  label: string;
  group: string;
};

type Link = {
  source: string;
  target: string;
  id: string;
  label: string;
  lang: string;
};

export function convertEtymologyToForceGraphData(graph: EtymologyNode): {
  nodes: Node[];
  links: Link[];
} {
  const nodes: Node[] = [];
  const links: Link[] = [];
  // Add root node
  const rootId = `${graph.lang}-${graph.word}`;
  nodes.push({
    id: rootId,
    label: graph.word,
    group: graph.lang,
  });

  // Process relations
  if (graph.relations) {
    graph.relations.forEach((relation: EtymologyNode) => {
      const relationId = `${relation.lang}-${relation.word}`;

      // Add relation node
      nodes.push({
        id: relationId,
        label: relation.word,
        group: relation.lang,
      });

      // Add link from root to relation
      links.push({
        source: rootId,
        target: relationId,
        id: `${rootId}-${relationId}`,
        label: relation.type,
        lang: relation.lang,
      });

      // Process nested relations if any
      if (relation.relations) {
        relation.relations.forEach((nestedRelation: EtymologyNode) => {
          const nestedRelationId = `${nestedRelation.lang}-${nestedRelation.word}`;

          // Add nested relation node
          nodes.push({
            id: nestedRelationId,
            label: nestedRelation.word,
            group: nestedRelation.lang,
          });

          // Add link from relation to nested relation
          links.push({
            source: relationId,
            target: nestedRelationId,
            id: `${relationId}-${nestedRelationId}`,
            label: nestedRelation.type,
            lang: nestedRelation.lang,
          });
        });
      }
    });
  }

  return { nodes, links };
}

export function visualizeEtymologyGraph(graph: EtymologyNode): string {
  try {
    const renderTree = (node: EtymologyNode, indent = 0) => {
      const spacer = "  ".repeat(indent);
      // Format the current node.
      let treeStr = `${spacer}- ${node.word} [${node.lang}, ${node.type}]\n`;
      // If the node has child relations, render each of them.
      if (node.relations && node.relations.length > 0) {
        for (const child of node.relations) {
          treeStr += renderTree(child, indent + 1);
        }
      }
      return treeStr;
    };

    return renderTree(graph);
  } catch (err) {
    console.error("Error generating etymology graph visualization:", err);
    throw err;
  }
}
