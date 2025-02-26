"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { hierarchy, tree, HierarchyNode } from "d3-hierarchy";
import { select } from "d3-selection";
import { zoom, ZoomBehavior, zoomIdentity, zoomTransform } from "d3-zoom";
import { linkVertical } from "d3-shape";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw, Maximize2 } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EtymologyNode } from "@/lib/etymology";
import { LangCode } from "@/lib/langcodes";

// Custom type to ensure x and y properties are defined.
type TreeNode = HierarchyNode<EtymologyNode> & {
  x: number;
  y: number;
};

interface TreeSVGProps {
  graph: EtymologyNode;
  isFullscreen?: boolean;
  onNodeClick?: (word: string, lang: LangCode) => void;
}

// Utility to measure text width.
const calculateTextWidth = (
  text: string,
  fontSize: number,
  fontWeight: string = "normal"
): number => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return text.length * fontSize * 0.6;
  context.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
  return context.measureText(text).width;
};

const computeBoxWidth = (node: TreeNode): number => {
  const wordWidth = calculateTextWidth(node.data.word, 14, "600");
  const infoText = `${node.data.type || "root"} · ${node.data.lang}`;
  const infoWidth = calculateTextWidth(infoText, 12);
  return Math.max(100, wordWidth, infoWidth) + 30;
};

// Reorders children so that etymons remain centered with cognates split.
const assignPositions = (node: TreeNode, spacing: number) => {
  if (!node.children) return;
  const etymonChildren = node.children.filter(
    (child) => child.data.type !== "cognate"
  );
  const cognateChildren = node.children.filter(
    (child) => child.data.type === "cognate"
  );
  const leftCount = Math.floor(cognateChildren.length / 2);
  const leftCognates = cognateChildren.slice(0, leftCount);
  const rightCognates = cognateChildren.slice(leftCount);
  node.children = [...leftCognates, ...etymonChildren, ...rightCognates];

  const n = node.children.length;
  const mid = (n - 1) / 2;
  node.children.forEach((child, i) => {
    (child as TreeNode).x = node.x + (i - mid) * spacing;
    assignPositions(child as TreeNode, spacing);
  });
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
  graph: EtymologyNode;
  onNodeClick?: (word: string, lang: LangCode) => void;
}> = ({ isOpen, onOpenChange, graph, onNodeClick }) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogTrigger className="hidden" />
    <DialogContent className="max-w-[100vw] max-h-[100vh] w-[100vw] h-[100vh] p-0 m-0 border-0">
      <DialogTitle className="sr-only">Fullscreen View</DialogTitle>
      <TreeSVG graph={graph} isFullscreen onNodeClick={onNodeClick} />
    </DialogContent>
  </Dialog>
);

const TreeSVG: React.FC<TreeSVGProps> = ({
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

  const renderTree = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const width = isFullscreen
      ? window.innerWidth
      : containerRef.current.clientWidth;
    const height = isFullscreen
      ? window.innerHeight
      : containerRef.current.clientHeight;

    // Minimal monochromatic colors.
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

    // Preserve the current zoom transform.
    const currentTransform = zoomBehaviorRef.current
      ? zoomTransform(svgRef.current)
      : zoomIdentity.translate(margin.left, margin.top);

    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", currentTransform.toString());

    // Build hierarchy and layout.
    const root = hierarchy(graph, (d) => d.relations);
    const treeLayout = tree<EtymologyNode>().size([
      width - margin.left - margin.right,
      height - margin.top - margin.bottom,
    ]);
    treeLayout(root);
    // Center the root.
    (root as TreeNode).x = (width - margin.left - margin.right) / 2;
    assignPositions(root as TreeNode, 180);

    const linkGen = linkVertical()
      .x((d: any) => d.x)
      .y((d: any) => d.y);

    // Draw links.
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", linkColor)
      .attr("stroke-width", 1.5)
      .attr("d", (d) => linkGen(d as any));

    // Draw nodes.
    const nodes = g
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .on("click", (_, d) => onNodeClick?.(d.data.word, d.data.lang));

    nodes.each(function (d) {
      const node = select(this);
      const boxWidth = computeBoxWidth(d as TreeNode);
      const boxHeight = 60;
      const rectX = -boxWidth / 2;
      const rectY = -boxHeight / 2;

      node
        .append("rect")
        .attr("x", rectX)
        .attr("y", rectY)
        .attr("width", boxWidth)
        .attr("height", boxHeight)
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("fill", nodeFill)
        .attr("stroke", nodeStroke)
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer");

      node
        .append("text")
        .attr("dy", "-0.4em")
        .attr("text-anchor", "middle")
        .style("font-family", "Arial, sans-serif")
        .style("font-size", "14px")
        .style("fill", textColor)
        .style("font-weight", "600")
        .style("cursor", "pointer")
        .text(d.data.word);

      node
        .append("text")
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .style("font-family", "Arial, sans-serif")
        .style("font-size", "12px")
        .style("fill", textColor)
        .style("opacity", 0.7)
        .style("cursor", "pointer")
        .text(`${d.data.type || "root"} · ${d.data.lang}`);
    });

    // Set up zoom behavior.
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior).call(zoomBehavior.transform, currentTransform);
    zoomBehaviorRef.current = zoomBehavior;
  }, [graph, isFullscreen, isDark, onNodeClick]);

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
      const margin = { top: 40, right: 40, bottom: 40, left: 40 };
      select(svgRef.current)
        .transition()
        .duration(300)
        .call(
          zoomBehaviorRef.current.transform,
          zoomIdentity.translate(margin.left, margin.top)
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

export default TreeSVG;
