"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { hierarchy, tree, HierarchyNode } from "d3-hierarchy";
import { select } from "d3-selection";
import { zoom, ZoomBehavior, zoomIdentity } from "d3-zoom";
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

interface TreeSVGProps {
  graph: EtymologyNode;
  isFullscreen?: boolean;
  onNodeClick?: (word: string, lang: LangCode) => void;
}

interface Node {
  x: number;
  y: number;
}

interface Link {
  source: Node;
  target: Node;
}

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
  <div className="absolute left-4 bottom-4 flex flex-col space-y-2 bg-gray-200 dark:bg-gray-800 p-2 rounded-lg shadow-lg z-10">
    <Button
      variant="outline"
      size="icon"
      className="text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={onZoomIn}
    >
      <Plus className="w-5 h-5" />
    </Button>
    <Button
      variant="outline"
      size="icon"
      className="text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={onZoomOut}
    >
      <Minus className="w-5 h-5" />
    </Button>
    <Button
      variant="outline"
      size="icon"
      className="text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={onReset}
    >
      <RotateCcw className="w-5 h-5" />
    </Button>
    {showFullscreen && onFullscreen && (
      <Button
        variant="outline"
        size="icon"
        className="text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
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

// Utility function to calculate text width
const calculateTextWidth = (
  text: string,
  fontSize: number,
  fontWeight: string = "normal"
): number => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return text.length * fontSize * 0.6; // Fallback if canvas not supported

  context.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
  return context.measureText(text).width;
};

// Main TreeSVG Component
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

  // Tree rendering function
  const renderTree = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = isFullscreen
      ? window.innerWidth
      : containerRef.current.clientWidth;
    const height = isFullscreen
      ? window.innerHeight
      : containerRef.current.clientHeight;
    const margin = { top: 40, right: 150, bottom: 40, left: 150 };

    const svg = select(svgRef.current);
    svg
      .attr("width", width)
      .attr("height", height)
      .style("background", isDark ? "#1e293b" : "#f8fafc")
      .style("display", "block");

    svg.selectAll("*").remove();

    const gContainer = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    const g = gContainer.append("g");

    // Create hierarchy and set up tree layout
    const root: HierarchyNode<EtymologyNode> = hierarchy(
      graph,
      (d) => d.relations
    );
    const treeLayout = tree<EtymologyNode>().size([
      width - margin.left - margin.right,
      height - margin.top - margin.bottom,
    ]);
    treeLayout(root);

    root.x = (width - margin.left - margin.right) / 2;
    const spacing = 180; // Increased spacing between nodes

    const assignPositions = (
      node: HierarchyNode<EtymologyNode>,
      spacing: number
    ) => {
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
        child.x = node.x! + (i - mid) * spacing;
        assignPositions(child, spacing);
      });
    };
    assignPositions(root, spacing);

    const linkGen = linkVertical<Link, Node>()
      .x((d) => d.x)
      .y((d) => d.y);

    g.selectAll<SVGPathElement, Link>(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", isDark ? "#94a3b8" : "#64748b")
      .attr("stroke-width", 1.5) // Slightly thinner for minimalism
      .attr("stroke-opacity", 0.5) // More subtle
      .attr("d", (d) => linkGen(d as any))
      .style("transition", "all 0.3s ease");

    const nodeEnter = g
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr(
        "class",
        (d) => `node${d.children ? " node--internal" : " node--leaf"}`
      )
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .on("click", (_, d) => onNodeClick?.(d.data.word, d.data.lang))
      .on("mouseover", function () {
        select(this)
          .select("rect")
          .attr("stroke-width", 2)
          .attr("fill-opacity", 0.9);
      })
      .on("mouseout", function () {
        select(this)
          .select("rect")
          .attr("stroke-width", 1.5)
          .attr("fill-opacity", 1);
      });

    // Calculate node sizes based on text content
    nodeEnter.each(function (d) {
      const node = select(this);
      const wordWidth = calculateTextWidth(d.data.word, 14, "600");
      const infoText = `${d.data.type || "root"} · ${d.data.lang}`;
      const infoWidth = calculateTextWidth(infoText, 12);

      // Determine the wider text
      const maxTextWidth = Math.max(wordWidth, infoWidth);

      // Set minimum width and add padding
      const boxWidth = Math.max(100, maxTextWidth + 30);
      const boxHeight = 60;

      // Apply the calculated dimensions
      const rectX = -boxWidth / 2;
      const rectY = -boxHeight / 2;

      node
        .append("rect")
        .attr("x", rectX)
        .attr("y", rectY)
        .attr("width", boxWidth)
        .attr("height", boxHeight)
        .attr("rx", 6) // Smaller rounded corners for minimalism
        .attr("ry", 6)
        .attr("fill", (d: any) =>
          d.depth === 0
            ? isDark
              ? "#3b82f6"
              : "#60a5fa"
            : d.children
            ? isDark
              ? "#374151"
              : "#dbeafe"
            : isDark
            ? "#1f2937"
            : "#ffffff"
        )
        .attr("stroke", isDark ? "#60a5fa" : "#3b82f6")
        .attr("stroke-width", 1.5) // Thinner stroke for minimalism
        .style("cursor", "pointer")
        .style("transition", "all 0.2s ease");
    });

    // Render the word (top line)
    nodeEnter
      .append("text")
      .attr("dy", "-0.4em")
      .attr("text-anchor", "middle")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "14px")
      .style("fill", isDark ? "#f1f5f9" : "#1e293b")
      .style("font-weight", "600")
      .style("cursor", "pointer")
      .text((d) => d.data.word);

    // Render type and language (second line)
    nodeEnter
      .append("text")
      .attr("dy", "1em")
      .attr("text-anchor", "middle")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "12px")
      .style("fill", isDark ? "#94a3b8" : "#64748b")
      .style("font-weight", "400")
      .style("cursor", "pointer")
      .text((d) => `${d.data.type || "root"} · ${d.data.lang}`);

    // Set up zoom behavior
    const zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> = zoom<
      SVGSVGElement,
      unknown
    >()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;
  }, [graph, isFullscreen, isDark, onNodeClick]);

  // Handle component mount/unmount and window resize
  useEffect(() => {
    renderTree();

    const handleResize = () => renderTree();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (svgRef.current) {
        select(svgRef.current).selectAll("*").remove();
      }
    };
  }, [renderTree]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current)
        .transition()
        .call(zoomBehaviorRef.current.scaleBy, 1.2);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current)
        .transition()
        .call(zoomBehaviorRef.current.scaleBy, 0.8);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current)
        .transition()
        .call(zoomBehaviorRef.current.transform, zoomIdentity);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreenOpen(true);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />

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
