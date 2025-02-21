"use client";
import { EtymologyNode } from "@/lib/etymology";

const EtymologyGraph = ({ graph }: { graph: EtymologyNode }) => {
  const renderNode = (node: EtymologyNode, depth = 0) => {
    return (
      <div className="flex flex-col items-center">
        <div className="bg-white border border-gray-200 p-5 rounded-md min-w-44 text-center hover:border-gray-400 transition-colors">
          <div className="text-lg font-medium text-gray-800">{node.word}</div>
          <div className="text-sm text-gray-500 mt-1 font-mono">
            {node.lang}
          </div>
        </div>

        {!!node.relations?.length && (
          <>
            <div className="w-px h-10 bg-gray-200 my-3"></div>
            <div
              className={`flex flex-wrap justify-center gap-8 ${
                depth > 2 ? "w-full" : ""
              }`}
            >
              {node.relations?.map((relation, index) => (
                <div key={index} className="flex flex-col items-center">
                  {renderNode(relation, depth + 1)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex flex-col justify-center items-center py-8 bg-gray-50">
      <div className="w-full h-full overflow-y-auto">
        <div className="flex justify-center items-start">
          {renderNode(graph)}
        </div>
      </div>
    </div>
  );
};

export default EtymologyGraph;
