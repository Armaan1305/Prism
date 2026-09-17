"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type HistoryItem = {
  id: number;
  repository: string;
  pull_request: number;
  title: string;
  author: string;
  branch: string;
  base_branch: string;
  risk_score: number;
  risk_level: string;
  created_at: string;
};

type AnalysisHistoryProps = {
  githubLogin: string;
};

export default function AnalysisHistory({
  githubLogin,
}: AnalysisHistoryProps) {
  const router = useRouter();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(
          `http://localhost:8000/history/${encodeURIComponent(githubLogin)}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load analysis history");
        }

        const data = await response.json();

        setHistory(data.history || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load analysis history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [githubLogin]);

  function getRiskClass(level: string) {
    switch (level) {
      case "HIGH":
        return "border-red-500/20 bg-red-500/5 text-red-400";

      case "MEDIUM":
        return "border-yellow-500/20 bg-yellow-500/5 text-yellow-400";

      case "LOW":
        return "border-green-500/20 bg-green-500/5 text-green-400";

      default:
        return "border-white/10 bg-white/5 text-zinc-400";
    }
  }

  if (loading) {
    return (
      <section className="mt-16 border border-white/10 bg-zinc-950 p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          Analysis History
        </p>

        <p className="mt-6 text-sm text-zinc-500">
          Loading previous analyses...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-16 border border-red-500/20 bg-red-500/5 p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-500">
          Analysis History
        </p>

        <p className="mt-4 text-sm text-red-400">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-16">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          Analysis History
        </p>

        <h2 className="mt-2 text-2xl font-medium text-white">
          Previous Analyses
        </h2>

        <p className="mt-2 text-sm text-zinc-600">
          Review previously analyzed pull requests.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="border border-white/10 bg-zinc-950 p-8">
          <p className="text-sm text-zinc-500">
            No previous analyses found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(`/analysis/${item.id}`)}
              className="group w-full border border-white/10 bg-zinc-950 p-5 text-left transition hover:border-white/25 hover:bg-zinc-900"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-zinc-600">
                      PR #{item.pull_request}
                    </span>

                    <span
                      className={`border px-2 py-1 font-mono text-[9px] tracking-widest ${getRiskClass(
                        item.risk_level
                      )}`}
                    >
                      {item.risk_level}
                    </span>
                  </div>

                  <h3 className="mt-3 truncate text-base font-medium text-white transition group-hover:text-zinc-300">
                    {item.title}
                  </h3>

                  <p className="mt-2 font-mono text-xs text-zinc-600">
                    {item.repository}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-8">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-700">
                      Risk Score
                    </p>

                    <p className="mt-1 font-mono text-lg text-zinc-300">
                      {item.risk_score}
                      <span className="text-xs text-zinc-700">
                        /100
                      </span>
                    </p>
                  </div>

                  <div className="hidden text-right sm:block">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-700">
                      Analyzed
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(item.created_at).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>

                  <span className="text-xl text-zinc-700 transition group-hover:translate-x-1 group-hover:text-white">
                    →
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}