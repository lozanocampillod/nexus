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

export interface GraphNode {
  lang: LangCode;
  word: string;
  length?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface DendriteGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ExtendedEtymologyNode extends GraphNode {
  relations?: ExtendedEtymologyNode[];
  relationFromParent?: string;
}

const transformGraphData = (
  graph: DendriteGraph
): ExtendedEtymologyNode | null => {
  const nodesMap = new Map<string, ExtendedEtymologyNode>();
  graph.nodes.forEach((node) => {
    const id = `${node.lang}:${node.word}`;
    nodesMap.set(id, { ...node, length: node.length ?? 1, relations: [] });
  });

  const adj = new Map<string, Map<string, string>>();
  graph.edges.forEach((edge) => {
    if (!adj.has(edge.source)) adj.set(edge.source, new Map());
    adj.get(edge.source)!.set(edge.target, edge.type);
  });

  const visited = new Set<string>();
  const dfs = (id: string): ExtendedEtymologyNode => {
    visited.add(id);
    const node = nodesMap.get(id)!;
    (adj.get(id) || new Map()).forEach((type, childId) => {
      if (!visited.has(childId) && nodesMap.has(childId)) {
        const child = dfs(childId);
        child.relationFromParent = type;
        node.relations!.push(child);
      }
    });
    return node;
  };

  const forest: ExtendedEtymologyNode[] = [];
  nodesMap.forEach((_, id) => {
    if (!visited.has(id)) forest.push(dfs(id));
  });
  return forest.length === 1 ? forest[0] : null;
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
    <Button variant="outline" size="icon" onClick={onZoomIn}>
      <Plus className="w-5 h-5" />
    </Button>
    <Button variant="outline" size="icon" onClick={onZoomOut}>
      <Minus className="w-5 h-5" />
    </Button>
    <Button variant="outline" size="icon" onClick={onReset}>
      <RotateCcw className="w-5 h-5" />
    </Button>
    {showFullscreen && onFullscreen && (
      <Button variant="outline" size="icon" onClick={onFullscreen}>
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
    // Reduced margin subtraction for a larger inner radius.
    const innerRadius = outerRadius;

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
    cluster<ExtendedEtymologyNode>()
      .size([360, innerRadius])
      .separation(() => 1)(root);

    const maxLength = (node: any): number =>
      (node.data.length || 1) +
      (node.children ? Math.max(...node.children.map(maxLength)) : 0);
    const maxLen = maxLength(root);
    const k = innerRadius / maxLen;
    const setRadius = (node: any, y0: number) => {
      const len = node.data.length || 1;
      node.radius = (y0 + len) * k;
      node.children &&
        node.children.forEach((child: any) => setRadius(child, y0 + len));
    };
    setRadius(root, 0);

    const linkStep = (
      startAngle: number,
      startRadius: number,
      endAngle: number,
      endRadius: number
    ) => {
      const a0 = ((startAngle - 90) * Math.PI) / 180;
      const a1 = ((endAngle - 90) * Math.PI) / 180;
      return `M${startRadius * Math.cos(a0)},${
        startRadius * Math.sin(a0)
      }A${startRadius},${startRadius} 0 0 ${endAngle > startAngle ? 1 : 0} ${
        startRadius * Math.cos(a1)
      },${startRadius * Math.sin(a1)}L${endRadius * Math.cos(a1)},${
        endRadius * Math.sin(a1)
      }`;
    };

    g.append("g")
      .selectAll("path")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", linkColor)
      .attr("stroke-width", 1.5)
      .attr("id", (_, i) => `link-${i}`)
      .attr("d", (d: any) =>
        linkStep(d.source.x, d.source.radius, d.target.x, d.target.radius)
      );

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

    node
      .append("text")
      .attr("dy", "0.31em")
      .attr("x", (d: any) => (d.x < 180 ? 6 : -6))
      .attr("text-anchor", (d: any) => (d.x < 180 ? "start" : "end"))
      .attr("transform", (d: any) => (d.x >= 180 ? "rotate(180)" : null))
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "10px")
      .style("fill", textColor)
      .each(function (d: any) {
        const text = select(this);
        text
          .append("tspan")
          .attr("x", 0)
          .attr("dy", "0em")
          .text(d.data.word)
          .attr("text-anchor", "middle");
        text
          .append("tspan")
          .attr("x", 0)
          .attr("dy", "1.2em")
          .style("font-size", "6px")
          .text(d.data.lang)
          .attr("text-anchor", "middle");
      });

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => g.attr("transform", event.transform.toString()));
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
    if (svgRef.current && zoomBehaviorRef.current && containerRef.current) {
      select(svgRef.current)
        .transition()
        .duration(300)
        .call(
          zoomBehaviorRef.current.transform,
          zoomIdentity.translate(
            containerRef.current.clientWidth / 2,
            containerRef.current.clientHeight / 2
          )
        );
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full" />
      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetZoom}
        onFullscreen={() => setIsFullscreenOpen(true)}
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
