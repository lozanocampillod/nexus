"use client";

import { EtymologyNode } from "@/lib/etymology";
import { searchWordAtom } from "@/store/atom";
import { useAtom } from "jotai";

const EtymologyGraph = ({ graph }: { graph: EtymologyNode }) => {
  const [searchWord, setSearchWord] = useAtom(searchWordAtom);

  const renderNode = (node: EtymologyNode, depth = 0) => {
    return (
      <div className="flex flex-col items-center">
        <div
          className="bg-white border border-gray-200 p-5 rounded-md min-w-[11rem] text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={() =>
            setSearchWord(() => ({ word: node.word, lang: node.lang }))
          }
        >
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
              {node.relations.map((relation, index) => (
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
    <div className="flex justify-center items-start">{renderNode(graph)}</div>
  );
};

export default EtymologyGraph;
