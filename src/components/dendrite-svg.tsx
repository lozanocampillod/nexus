"use client";
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { hierarchy, cluster } from "d3-hierarchy";
import { select } from "d3-selection";
import { zoom, ZoomBehavior, zoomIdentity, zoomTransform } from "d3-zoom";
import { useTheme } from "next-themes";
import { LangCode } from "@/lib/langcodes";
import { EtymologyGraph } from "@/lib/dedup-graph";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";

// **Graph Data Types**
export interface GraphNode {
  lang: LangCode;
  word: string;
  length?: number; // branch length; if absent, assumed 1
}

export interface GraphEdge {
  source: string; // e.g., "en:house"
  target: string; // e.g., "enm:hous"
  type: string; // e.g., "cognate", "etymon"
}

export interface DendriteGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// **Extended Node Type for Hierarchy**
export interface ExtendedEtymologyNode extends GraphNode {
  relations?: ExtendedEtymologyNode[];
  relationFromParent?: string; // Added to store edge type
}

/**
 * Transform the flat graph into a hierarchical tree, including relation types.
 */
const transformGraphData = (
  graph: DendriteGraph
): ExtendedEtymologyNode | null => {
  const nodesMap = new Map<string, ExtendedEtymologyNode>();
  graph.nodes.forEach((node) => {
    const id = `${node.lang}:${node.word}`;
    nodesMap.set(id, {
      ...node,
      length: node.length ?? 1,
      relations: [],
    });
  });

  // **Build adjacency list with relation types: source -> Map<target, type>**
  const adj = new Map<string, Map<string, string>>();
  graph.edges.forEach((edge) => {
    if (!adj.has(edge.source)) {
      adj.set(edge.source, new Map());
    }
    adj.get(edge.source)!.set(edge.target, edge.type);
  });

  // **DFS to build the tree and assign relation types**
  const visited = new Set<string>();
  const dfs = (id: string): ExtendedEtymologyNode => {
    visited.add(id);
    const node = nodesMap.get(id)!;
    const childrenIds = adj.get(id) || new Map();
    childrenIds.forEach((type, childId) => {
      if (!visited.has(childId) && nodesMap.has(childId)) {
        const childNode = dfs(childId);
        childNode.relationFromParent = type; // Store relation type
        node.relations!.push(childNode);
      }
    });
    return node;
  };

  const forest: ExtendedEtymologyNode[] = [];
  nodesMap.forEach((_, id) => {
    if (!visited.has(id)) {
      forest.push(dfs(id));
    }
  });

  return forest.length === 1 ? forest[0] : null;
};

// **ZoomControls Component (Unchanged)**
const ZoomControls: React.FC<{
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFullscreen?: () => void;
  showFullscreen?: boolean;
}> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onFullscreen,
  showFullscreen = true,
}) => (
  <div className="absolute left-4 bottom-4 flex flex-col space-y-2 bg-neutral-100 dark:bg-neutral-900 p-2 rounded shadow z-10">
    <Button
      variant="outline"
      size="icon"
      className="text-neutral-800 dark:text-neutral-200 border"
      onClick={onZoomIn}
    >
      <Plus className="w-5 h-5" />
    </Button>
    <Button
      variant="outline"
      size="icon"
      className="text-neutral-800 dark:text-neutral-200 border"
      onClick={onZoomOut}
    >
      <Minus className="w-5 h-5" />
    </Button>
    <Button
      variant="outline"
      size="icon"
      className="text-neutral-800 dark:text-neutral-200 border"
      onClick={onReset}
    >
      <RotateCcw className="w-5 h-5" />
    </Button>
    {showFullscreen && onFullscreen && (
      <Button
        variant="outline"
        size="icon"
        className="text-neutral-800 dark:text-neutral-200 border"
        onClick={onFullscreen}
      >
        <Maximize2 className="w-5 h-5" />
      </Button>
    )}
  </div>
);

// **FullscreenDialog Component (Unchanged)**
const FullscreenDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  graph: EtymologyGraph;
  onNodeClick?: (word: string, lang: LangCode) => void;
}> = ({ isOpen, onOpenChange, graph, onNodeClick }) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogTrigger className="hidden" />
    <DialogContent className="max-w-[100vw] max-h-[100vh] w-[100vw] h-[100vh] p-0 m-0 border-0">
      <DialogTitle className="sr-only">Fullscreen View</DialogTitle>
      <DendriteSVG graph={graph} isFullscreen onNodeClick={onNodeClick} />
    </DialogContent>
  </Dialog>
);

// **DendriteSVG Component**
interface DendriteSVGProps {
  graph: EtymologyGraph;
  isFullscreen?: boolean;
  onNodeClick?: (word: string, lang: LangCode) => void;
}

const DendriteSVG: React.FC<DendriteSVGProps> = ({
  graph,
  isFullscreen = false,
  onNodeClick,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const isDark = theme === "dark";

  const treeData = useMemo(() => transformGraphData(graph), [graph]);

  const renderTree = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !treeData) return;

    const width = isFullscreen
      ? window.innerWidth
      : containerRef.current.clientWidth;
    const height = isFullscreen
      ? window.innerHeight
      : containerRef.current.clientHeight;

    const outerRadius = Math.min(width, height) / 2;
    const innerRadius = outerRadius - 50;

    const backgroundColor = isDark ? "#1a1a1a" : "#fff";
    const nodeFill = isDark ? "#333" : "#fff";
    const nodeStroke = isDark ? "#666" : "#ccc";
    const textColor = isDark ? "#eee" : "#333";
    const linkColor = isDark ? "#666" : "#ccc";

    const svg = select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("background", backgroundColor)
      .style("display", "block");

    const currentTransform = zoomBehaviorRef.current
      ? zoomTransform(svgRef.current)
      : zoomIdentity.translate(width / 2, height / 2);

    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", currentTransform.toString());

    const root = hierarchy(treeData, (d) => d.relations);
    const clusterLayout = cluster<ExtendedEtymologyNode>()
      .size([360, innerRadius])
      .separation(() => 1);
    clusterLayout(root);

    function maxLength(node: any): number {
      return (
        (node.data.length || 1) +
        (node.children ? Math.max(...node.children.map(maxLength)) : 0)
      );
    }
    const maxLen = maxLength(root);
    const k = innerRadius / maxLen;

    function setRadius(node: any, y0: number) {
      const len = node.data.length || 1;
      node.radius = (y0 + len) * k;
      if (node.children) {
        node.children.forEach((child: any) => setRadius(child, y0 + len));
      }
    }
    setRadius(root, 0);

    function linkStep(
      startAngle: number,
      startRadius: number,
      endAngle: number,
      endRadius: number
    ) {
      const a0 = ((startAngle - 90) * Math.PI) / 180;
      const a1 = ((endAngle - 90) * Math.PI) / 180;
      const c0 = Math.cos(a0),
        s0 = Math.sin(a0);
      const c1 = Math.cos(a1),
        s1 = Math.sin(a1);
      return (
        "M" +
        startRadius * c0 +
        "," +
        startRadius * s0 +
        "A" +
        startRadius +
        "," +
        startRadius +
        " 0 0 " +
        (endAngle > startAngle ? 1 : 0) +
        " " +
        startRadius * c1 +
        "," +
        startRadius * s1 +
        "L" +
        endRadius * c1 +
        "," +
        endRadius * s1
      );
    }

    // **Draw Links with IDs**
    g.append("g")
      .selectAll("path")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", linkColor)
      .attr("stroke-width", 1.5)
      .attr("id", (d, i) => `link-${i}`) // Unique ID for each link
      .attr("d", (d: any) =>
        linkStep(d.source.x, d.source.radius, d.target.x, d.target.radius)
      );
    // **Draw Nodes**
    const node = g
      .append("g")
      .selectAll("g")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr(
        "transform",
        (d: any) => `rotate(${d.x - 90}) translate(${d.radius},0)`
      )
      .on("click", (_, d) => onNodeClick?.(d.data.word, d.data.lang));

    node
      .append("circle")
      .attr("r", 2)
      .attr("fill", nodeFill)
      .attr("stroke", nodeStroke);

    // **Add Word and Language Code to Nodes**
    node
      .append("text")
      .attr("dy", "0.31em")
      .attr("x", (d: any) => (d.x < 180 ? 6 : -6))
      .attr("text-anchor", (d: any) => (d.x < 180 ? "start" : "end"))
      .attr("transform", (d: any) => (d.x >= 180 ? "rotate(180)" : null))
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "10px")
      .style("fill", textColor)
      .each(function (d) {
        const text = select(this);
        // Word
        text
          .append("tspan")
          .attr("x", 0)
          .attr("dy", "0em")
          .text(d.data.word)
          .attr("text-anchor", "middle");
        // Language code below the word
        text
          .append("tspan")
          .attr("x", 0)
          .attr("dy", "1.2em") // Offset below the word
          .style("font-size", "6px") // Smaller font
          .text(d.data.lang)
          .attr("text-anchor", "middle");
      });

    // Configure zoom behavior.
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior).call(zoomBehavior.transform, currentTransform);
    zoomBehaviorRef.current = zoomBehavior;
  }, [treeData, isFullscreen, isDark, onNodeClick]);

  useEffect(() => {
    renderTree();
    const handleResize = () => renderTree();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (svgRef.current) select(svgRef.current).selectAll("*").remove();
    };
  }, [renderTree]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 1.2);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 0.8);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current)
        .transition()
        .duration(300)
        .call(
          zoomBehaviorRef.current.transform,
          zoomIdentity.translate(
            containerRef.current!.clientWidth / 2,
            containerRef.current!.clientWidth / 2
          )
        );
    }
  };

  const toggleFullscreen = () => setIsFullscreenOpen(true);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full" />
      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetZoom}
        onFullscreen={toggleFullscreen}
        showFullscreen={!isFullscreen}
      />
      {!isFullscreen && (
        <FullscreenDialog
          isOpen={isFullscreenOpen}
          onOpenChange={setIsFullscreenOpen}
          graph={graph}
          onNodeClick={onNodeClick}
        />
      )}
    </div>
  );
};

export default DendriteSVG;
