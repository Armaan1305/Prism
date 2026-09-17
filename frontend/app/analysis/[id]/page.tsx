"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ImpactGraph from "@/components/ImpactGraph";

type AnalysisData = {
  file: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;

  diff_analysis: {
    added_lines: number;
    removed_lines: number;
    function_changes: string[];
    import_changes: boolean;
    logic_changes: boolean;
    change_summary?: string;
  };

  security_findings: string[];

  affected_files: string[];
  affected_areas: number;

  dependency_depths: Record<string, number>;

  risk_score: number;
  risk_level: string;

  risk_factors: Record<string, number>;

  risk_explanation: {
    summary: string;
    reasons: string[];
  };

  test_recommendations: {
    source_file: string;
    test_file: string | null;
    status: string;
    priority: string;
    recommendation: string;
  }[];
};

type SavedAnalysis = {
  id: number;
  repository: string;
  pull_request: number;
  title: string;
  author: string;
  branch: string;
  base_branch: string;
  head_sha: string;
  risk_score: number;
  risk_level: string;
  created_at: string;
  result?: {
    analysis?: AnalysisData[];
  };
  analysis?: AnalysisData[];
};

type User = {
  github_login: string;
};

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();

  const [analysis, setAnalysis] = useState<SavedAnalysis | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalysis() {
      try {
        // Get logged-in user
        const userResponse = await fetch(
          "http://localhost:8000/auth/me",
          {
            credentials: "include",
          }
        );

        if (!userResponse.ok) {
          throw new Error("Not authenticated");
        }

        const userData = await userResponse.json();

        setUser(userData);

        const githubLogin = userData.github_login;

        // Get analysis ID from URL
        const id = params.id;

        // Fetch saved analysis
        const response = await fetch(
          `http://localhost:8000/history/${encodeURIComponent(
            githubLogin
          )}/${id}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load analysis");
        }

        const data = await response.json();

        console.log("Historical analysis response:", data);

        setAnalysis(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load this analysis.");
      } finally {
        setLoading(false);
      }
    }

    loadAnalysis();
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs text-zinc-600">
            Loading analysis...
          </p>
        </div>
      </main>
    );
  }

  if (error || !analysis) {
    return (
      <main className="min-h-screen bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => router.back()}
            className="mb-8 text-sm text-zinc-500 transition hover:text-white"
          >
            ← Back
          </button>

          <div className="border border-red-500/20 bg-red-500/5 p-8">
            <p className="text-sm text-red-400">
              {error || "Analysis not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Support both possible API response shapes
  const analysisItems =
    analysis.result?.analysis || analysis.analysis || [];

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => router.back()}
          className="mb-10 text-sm text-zinc-500 transition hover:text-white"
        >
          ← Back to Dashboard
        </button>

        <header className="border-b border-white/10 pb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Historical Analysis
              </p>

              <h1 className="mt-4 text-4xl font-medium tracking-tight sm:text-5xl">
                {analysis.title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-4 font-mono text-xs text-zinc-600">
                <span>{analysis.repository}</span>
                <span>PR #{analysis.pull_request}</span>
                <span>{analysis.branch}</span>
              </div>
            </div>

            <div className="border border-white/10 bg-zinc-950 px-8 py-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                Risk
              </p>

              <p className="mt-2 text-4xl font-medium">
                {analysis.risk_score}
                <span className="text-sm text-zinc-700">
                  /100
                </span>
              </p>

              <p className="mt-2 font-mono text-xs text-zinc-500">
                {analysis.risk_level}
              </p>
            </div>
          </div>
        </header>

        {analysisItems.length === 0 ? (
          <div className="mt-12 border border-white/10 bg-zinc-950 p-8">
            <p className="font-mono text-xs text-zinc-500">
              No analysis data was stored for this record.
            </p>
          </div>
        ) : (
          <div className="mt-12 space-y-10">
            {analysisItems.map((item, index) => (
              <section
                key={`${item.file}-${index}`}
                className="space-y-10"
              >
                {/* Changed File */}
                <div className="border border-white/10 bg-zinc-950 p-6">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    Changed File
                  </p>

                  <p className="mt-3 font-mono text-sm text-zinc-200">
                    {item.file}
                  </p>

                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-zinc-700">
                        ADDITIONS
                      </p>

                      <p className="mt-1 font-mono text-lg text-zinc-300">
                        +{item.additions}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-zinc-700">
                        DELETIONS
                      </p>

                      <p className="mt-1 font-mono text-lg text-zinc-300">
                        -{item.deletions}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-zinc-700">
                        CHANGES
                      </p>

                      <p className="mt-1 font-mono text-lg text-zinc-300">
                        {item.changes}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dependency Impact */}
                <ImpactGraph
                  dependencyDepths={item.dependency_depths}
                />

                {/* Risk Explanation */}
                <div className="border border-white/10 bg-zinc-950 p-6">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    Risk Explanation
                  </p>

                  <p className="mt-4 text-sm leading-7 text-zinc-400">
                    {item.risk_explanation?.summary ||
                      "No risk explanation available."}
                  </p>

                  {item.risk_explanation?.reasons?.length > 0 && (
                    <div className="mt-6 space-y-3">
                      {item.risk_explanation.reasons.map(
                        (reason, reasonIndex) => (
                          <div
                            key={reasonIndex}
                            className="border-l border-white/10 pl-4 text-sm text-zinc-500"
                          >
                            {reason}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Security */}
                <div className="border border-white/10 bg-zinc-950 p-6">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    Security
                  </p>

                  {item.security_findings?.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-500">
                      No security findings detected.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {item.security_findings?.map(
                        (finding, findingIndex) => (
                          <p
                            key={findingIndex}
                            className="text-sm text-red-400"
                          >
                            {finding}
                          </p>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Test Recommendations */}
                <div className="border border-white/10 bg-zinc-950 p-6">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    Test Recommendations
                  </p>

                  {item.test_recommendations?.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-500">
                      No test recommendations available.
                    </p>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {item.test_recommendations?.map(
                        (test, testIndex) => (
                          <div
                            key={testIndex}
                            className="border border-white/5 p-4"
                          >
                            <div className="flex flex-wrap justify-between gap-3">
                              <p className="font-mono text-xs text-zinc-400">
                                {test.source_file}
                              </p>

                              <span className="font-mono text-[9px] text-zinc-600">
                                {test.priority}
                              </span>
                            </div>

                            <p className="mt-3 text-sm text-zinc-500">
                              {test.recommendation}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="mt-16 border-t border-white/10 py-8">
          <div className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[10px] text-zinc-700">
            <span>
              AUTHOR: {analysis.author}
            </span>

            <span>
              BASE: {analysis.base_branch}
            </span>

            <span>
              HEAD: {analysis.head_sha}
            </span>

            <span>
              ANALYZED:{" "}
              {new Date(
                analysis.created_at
              ).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}