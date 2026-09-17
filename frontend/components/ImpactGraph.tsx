"use client";

import { motion } from "motion/react";

type DependencyRelationship = {
  source: string;
  target: string;
  depth: number;
};

type ImpactGraphProps = {
  dependencyDepths?: Record<string, number>;
  relationships?: DependencyRelationship[];
};

export default function ImpactGraph({
  dependencyDepths = {},
  relationships = [],
}: ImpactGraphProps) {
  const nodes = Object.entries(dependencyDepths).sort(
    (a, b) => a[1] - b[1]
  );

  if (nodes.length === 0) {
    return (
      <div className="border border-white/10 bg-zinc-950 p-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          Blast Radius
        </p>

        <p className="mt-4 text-sm text-zinc-500">
          No dependency propagation detected.
        </p>
      </div>
    );
  }

  const maxDepth = Math.max(
    ...nodes.map(([, depth]) => depth)
  );

  const fileName = (file: string) =>
    file.split("/").pop() || file;

  return (
    <div className="overflow-hidden border border-white/10 bg-black">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            Dependency Analysis
          </p>

          <h3 className="mt-2 text-xl font-medium text-white">
            Blast Radius
          </h3>

          <p className="mt-2 text-xs text-zinc-600">
            How the change propagates through the repository.
          </p>
        </div>

        <div className="flex gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-700">
              Nodes
            </p>

            <p className="mt-1 font-mono text-sm text-zinc-300">
              {nodes.length}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-700">
              Max Depth
            </p>

            <p className="mt-1 font-mono text-sm text-zinc-300">
              {maxDepth}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-700">
              Edges
            </p>

            <p className="mt-1 font-mono text-sm text-zinc-300">
              {relationships.length}
            </p>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="overflow-x-auto px-6 py-12">
        <div className="flex min-w-max flex-col items-center">
          {nodes.map(([file, depth], index) => {
            const isChanged = depth === 0;

            const outgoing = relationships.filter(
              (relationship) =>
                relationship.source === file
            );

            return (
              <div
                key={file}
                className="flex flex-col items-center"
              >
                {/* Node */}
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 15,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.12,
                    duration: 0.35,
                  }}
                  className="w-[260px]"
                >
                  <div
                    className={`relative border px-5 py-5 transition ${
                      isChanged
                        ? "border-white/30 bg-white/[0.07]"
                        : "border-white/10 bg-zinc-950 hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-widest ${
                          isChanged
                            ? "text-white/50"
                            : "text-zinc-700"
                        }`}
                      >
                        {isChanged
                          ? "Changed"
                          : `Depth ${depth}`}
                      </span>

                      <span
                        className={`h-2 w-2 rounded-full ${
                          isChanged
                            ? "bg-white"
                            : "bg-zinc-600"
                        }`}
                      />
                    </div>

                    <p className="mt-5 truncate font-mono text-xs text-zinc-200">
                      {fileName(file)}
                    </p>

                    <p className="mt-2 truncate text-[10px] text-zinc-700">
                      {file}
                    </p>

                    <div className="mt-5 border-t border-white/5 pt-3">
                      <p className="font-mono text-[10px] text-zinc-700">
                        DEPENDENCY DEPTH
                      </p>

                      <p className="mt-1 font-mono text-sm text-zinc-400">
                        {depth}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Connection */}
                {index < nodes.length - 1 && (
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{
                        scaleY: 0,
                        opacity: 0,
                      }}
                      animate={{
                        scaleY: 1,
                        opacity: 1,
                      }}
                      transition={{
                        delay: index * 0.12 + 0.1,
                        duration: 0.35,
                      }}
                      className="h-10 w-px origin-top bg-white/15"
                    />

                    <span className="h-2 w-2 rotate-45 border-r border-t border-white/30" />
                  </div>
                )}

                {/* Relationships */}
                {outgoing.length > 0 && (
                  <div className="mt-4 w-[260px] space-y-2">
                    {outgoing.map(
                      (relationship, relationshipIndex) => (
                        <motion.div
                          key={`${relationship.source}-${relationship.target}-${relationshipIndex}`}
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay:
                              index * 0.12 +
                              relationshipIndex * 0.08,
                          }}
                          className="border border-white/5 bg-zinc-950 px-4 py-3"
                        >
                          <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-700">
                            Imports
                          </p>

                          <p className="mt-2 truncate font-mono text-[11px] text-zinc-400">
                            {fileName(
                              relationship.target
                            )}
                          </p>
                        </motion.div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 border-t border-white/10 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white" />

          <span className="text-[11px] text-zinc-600">
            Changed file
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-zinc-600" />

          <span className="text-[11px] text-zinc-600">
            Affected dependency
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-white/20" />

          <span className="text-[11px] text-zinc-600">
            Dependency relationship
          </span>
        </div>
      </div>
    </div>
  );
}