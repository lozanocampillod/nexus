"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  hierarchy,
  tree,
  HierarchyNode,
  HierarchyPointLink,
} from "d3-hierarchy";
import { select, Selection } from "d3-selection";
import { zoom, ZoomBehavior, zoomIdentity, ZoomTransform } from "d3-zoom";
import { linkVertical, Link } from "d3-shape";
import WordInfoSheet from "@/components/word-info-sheet";
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

  const renderTree = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const isDark = theme === "dark";
    const width = isFullscreen
      ? window.innerWidth
      : containerRef.current.clientWidth;
    const height = isFullscreen
      ? window.innerHeight
      : containerRef.current.clientHeight;
    const margin = { top: 40, right: 150, bottom: 40, left: 150 };

    const svg = select(svgRef.current) as Selection<
      SVGSVGElement,
      unknown,
      null,
      undefined
    >;
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
    const spacing = 150;

    const assignPositions = (node: HierarchyNode<EtymologyNode>) => {
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
        child.x = node.x! + (i - mid) * spacing; // ! because x is defined after hierarchy
        assignPositions(child);
      });
    };
    assignPositions(root);

    interface Node {
      x: number;
      y: number;
    }

    interface Link {
      source: Node;
      target: Node;
    }

    // Crear el generador de enlaces verticales con los tipos especificados
    const linkGen = linkVertical<Link, Node>()
      .x((d) => d.x)
      .y((d) => d.y)
      .source((d) => d.source)
      .target((d) => d.target);

    g.selectAll<SVGPathElement, Link>(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", isDark ? "#94a3b8" : "#64748b")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6)
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
          .attr("x", -48)
          .attr("y", -30)
          .attr("width", 94)
          .attr("height", 60)
          .attr("fill-opacity", 0.8)
          .attr("stroke-width", 3);
      })
      .on("mouseout", function () {
        select(this)
          .select("rect")
          .attr("x", -45)
          .attr("y", -28)
          .attr("width", 90)
          .attr("height", 56)
          .attr("fill-opacity", 1)
          .attr("stroke-width", 2);
      });

    nodeEnter
      .append("rect")
      .attr("x", -45)
      .attr("y", -28)
      .attr("width", 90)
      .attr("height", 56)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", (d) =>
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
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .style("transition", "all 0.2s ease");

    nodeEnter
      .append("text")
      .attr("dy", "-0.5em")
      .attr("text-anchor", "middle")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "14px")
      .style("fill", isDark ? "#f1f5f9" : "#1e293b")
      .style("font-weight", "500")
      .style("cursor", "pointer")
      .text((d) => d.data.word);

    nodeEnter
      .append("text")
      .attr("dy", "1em")
      .attr("text-anchor", "middle")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "12px")
      .style("fill", isDark ? "#94a3b8" : "#64748b")
      .style("font-weight", "400")
      .text((d) => d.data.type || "root");

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
  }, [graph, isFullscreen, theme, onNodeClick]);

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

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
      <div className="absolute left-4 bottom-4 flex flex-col space-y-2 bg-gray-200 dark:bg-gray-800 p-2 rounded-lg shadow-lg z-10">
        <Button
          variant="outline"
          size="icon"
          className="text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={handleZoomIn}
        >
          <Plus className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={handleZoomOut}
        >
          <Minus className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={handleResetZoom}
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
        {!isFullscreen && (
          <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Maximize2 className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[100vw] max-h-[100vh] w-[100vw] h-[100vh] p-0 m-0 border-0">
              <DialogTitle className="sr-only" />
              <TreeSVG graph={graph} isFullscreen onNodeClick={onNodeClick} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default function EtymologyTree({ graph }: { graph: EtymologyNode }) {
  const [wordInfo, setWordInfo] = useState<{
    word: string;
    lang: LangCode;
  } | null>(null);

  const handleNodeClick = (word: string, lang: LangCode) => {
    setWordInfo({ word, lang });
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <TreeSVG graph={graph} onNodeClick={handleNodeClick} />
      <WordInfoSheet
        className="min-w-[50vw] p-8 overflow-y-auto"
        word={wordInfo?.word ?? null}
        lang={wordInfo?.lang ?? null}
        onOpenChange={(isOpen) => !isOpen && setWordInfo(null)}
      />
    </div>
  );
}
