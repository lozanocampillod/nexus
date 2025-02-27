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

// New graph shape types with an optional branch length (default 1)
export interface GraphNode {
  lang: LangCode;
  word: string;
  length?: number; // branch length; if absent, assumed 1
}

export interface GraphEdge {
  source: string; // e.g., "en:house"
  target: string; // e.g., "enm:hous"
  type: string;
}

export interface DendriteGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Extended node type for hierarchical data
export interface ExtendedEtymologyNode extends GraphNode {
  relations?: ExtendedEtymologyNode[];
  duplicateOf?: string;
}

/**
 * Transform the flat graph (nodes and edges) into a tree.
 * Uses a DFS over an adjacency list. Also assigns a default branch length
 * (1) when a node does not have one.
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

  // Build an adjacency list: source -> [target, …]
  const adj = new Map<string, string[]>();
  graph.edges.forEach((edge) => {
    if (!adj.has(edge.source)) {
      adj.set(edge.source, []);
    }
    if (!adj.get(edge.source)!.includes(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
    }
  });

  // DFS to build a forest from the adjacency list.
  const visited = new Set<string>();
  const dfs = (id: string): ExtendedEtymologyNode => {
    visited.add(id);
    const node = nodesMap.get(id)!;
    const childrenIds = adj.get(id) || [];
    childrenIds.forEach((childId) => {
      if (!visited.has(childId) && nodesMap.has(childId)) {
        node.relations!.push(dfs(childId));
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

  // If more than one tree exists, wrap them in a dummy root.
  if (forest.length === 1) return forest[0];
  return null;
};

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

  // Transform the flat graph into a hierarchical tree.
  const treeData = useMemo(() => transformGraphData(graph), [graph]);
  if (!treeData) return null;

  const width = isFullscreen
    ? window.innerWidth
    : containerRef.current!.clientWidth;
  const height = isFullscreen
    ? window.innerHeight
    : containerRef.current!.clientHeight;

  const renderTree = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Define layout dimensions.

    const outerRadius = Math.min(width, height) / 2;
    const innerRadius = outerRadius - 100; // reserve space for labels

    // Colors based on theme.
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

    // Center the view.
    const currentTransform = zoomBehaviorRef.current
      ? zoomTransform(svgRef.current)
      : zoomIdentity.translate(width / 2, height / 2);

    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", currentTransform.toString());

    // Create a radial hierarchy.
    const root = hierarchy(treeData, (d) => d.relations);

    // Use cluster layout to compute angles.
    const clusterLayout = cluster<ExtendedEtymologyNode>()
      .size([360, innerRadius])
      .separation(() => 1);
    clusterLayout(root);

    // Compute maximum accumulated branch length.
    function maxLength(node: any): number {
      return (
        (node.data.length || 1) +
        (node.children ? Math.max(...node.children.map(maxLength)) : 0)
      );
    }
    const maxLen = maxLength(root);
    const k = innerRadius / maxLen;

    // Recompute radial distance (“radius”) for each node based on branch lengths.
    function setRadius(node: any, y0: number) {
      const len = node.data.length || 1;
      node.radius = (y0 + len) * k;
      if (node.children) {
        node.children.forEach((child: any) => setRadius(child, y0 + len));
      }
    }
    setRadius(root, 0);

    // Custom curved link function (inspired by the Observable Tree of Life)
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

    // Draw links using the custom linkStep.
    g.append("g")
      .selectAll("path")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", linkColor)
      .attr("stroke-width", 1.5)
      .attr("d", (d: any) =>
        linkStep(d.source.x, d.source.radius, d.target.x, d.target.radius)
      );

    // Draw nodes.
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
      .attr("r", 4)
      .attr("fill", nodeFill)
      .attr("stroke", nodeStroke);

    node
      .append("text")
      .attr("dy", "0.31em")
      .attr("x", (d: any) => (d.x < 180 ? 6 : -6))
      .attr("text-anchor", (d: any) => (d.x < 180 ? "start" : "end"))
      .attr("transform", (d: any) => (d.x >= 180 ? "rotate(180)" : null))
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "10px")
      .style("fill", textColor)
      .text((d) => d.data.word);

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
          zoomIdentity.translate(width / 2, height / 2)
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
