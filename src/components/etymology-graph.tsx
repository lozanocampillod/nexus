"use client";

import { EtymologyNode } from "@/lib/etymology";
import { motion } from "framer-motion";
import WordInfoSheet from "@/components/word-info-sheet";
import { useState } from "react";
import { LangCode } from "@/lib/langcodes";

const EtymologyGraph = ({ graph }: { graph: EtymologyNode }) => {
  const [word, setWord] = useState<string | null>(null);
  const [lang, setLang] = useState<LangCode | null>(null);

  const renderNode = (node: EtymologyNode, depth = 0) => {
    return (
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: depth * 0.1 }}
      >
        <motion.div
          className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 rounded-md min-w-[11rem] text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
          onClick={() => (setWord(node.word), setLang(node.lang))}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-lg font-medium text-gray-800 dark:text-gray-200">
            {node.word}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
            {node.lang}
          </div>
        </motion.div>

        {!!node.relations?.length && (
          <>
            <motion.div
              className="w-px h-10 bg-gray-200 dark:bg-gray-700 my-3"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.4, delay: depth * 0.1 }}
            ></motion.div>

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
      </motion.div>
    );
  };

  return (
    <>
      <div className="flex justify-center items-start">{renderNode(graph)}</div>
      <WordInfoSheet
        className="min-w-[50vw] p-8 overflow-y-auto"
        word={word}
        lang={lang}
        onOpenChange={(isOpen) => !isOpen && setWord(null)}
      />
    </>
  );
};

export default EtymologyGraph;
