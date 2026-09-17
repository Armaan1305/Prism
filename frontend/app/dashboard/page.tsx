"use client";

import { useEffect, useState } from "react";

type User = {
  id: number;
  github_login: string;
  github_name: string | null;
  avatar_url: string | null;
};

type Repository = {
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  language: string | null;
};

type PullRequest = {
  number: number;
  title: string;
  state: string;
  author: string;
  head_branch: string;
  base_branch: string;
  draft: boolean;
};

type Analysis = {
  file: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;

  diff_analysis?: {
    added_lines: number;
    removed_lines: number;
    function_changes: string[];
    import_changes: boolean;
    logic_changes: boolean;
    change_summary?: string;
  };

  security_findings?: {
    severity: string;
    message: string;
  }[];

  affected_files?: string[];
  affected_areas?: number;

  dependency_depths?: Record<string, number>;

  risk_score: number;
  risk_level: string;

  risk_factors?: {
    change_score: number;
    impact_score: number;
    depth_score: number;
    logic_score: number;
    function_score: number;
    import_score: number;
    deletion_score: number;
    security_score: number;
    high_security_findings: number;
    medium_security_findings: number;
    max_dependency_depth: number;
  };

  risk_explanation?: {
    summary: string;
    reasons: string[];
  };

  test_recommendations?: {
    source_file: string;
    test_file: string | null;
    status: string;
    priority: string;
    recommendation: string;
  }[];
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);

  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [repoLoading, setRepoLoading] = useState(false);
  const [prLoading, setPrLoading] = useState(false);
  const [analyzingPR, setAnalyzingPR] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  // --------------------------------------------------
  // LOAD USER + REPOSITORIES
  // --------------------------------------------------

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setRepoLoading(true);
        setError("");

        const authResponse = await fetch(
          "http://localhost:8000/auth/me",
          {
            credentials: "include",
          }
        );

        if (!authResponse.ok) {
          throw new Error("Authentication request failed");
        }

        const authData = await authResponse.json();

        console.log("AUTH RESPONSE:", authData);

        if (!authData.authenticated || !authData.user) {
          setUser(null);
          return;
        }

        setUser(authData.user);

        const repoResponse = await fetch(
          `http://localhost:8000/github/repositories/${authData.user.github_login}`,
          {
            credentials: "include",
          }
        );

        if (!repoResponse.ok) {
          throw new Error("Failed to load repositories");
        }

        const repoData = await repoResponse.json();

        console.log("REPOSITORY RESPONSE:", repoData);

        setRepositories(repoData.repositories || []);
      } catch (err) {
        console.error("DASHBOARD ERROR:", err);
        setError("Unable to load GitHub data.");
      } finally {
        setRepoLoading(false);
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // --------------------------------------------------
  // SELECT REPOSITORY
  // --------------------------------------------------

  async function selectRepository(repoName: string) {
    if (!user) return;

    setSelectedRepo(repoName);
    setPullRequests([]);
    setPrLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch(
        `http://localhost:8000/github/pull-requests/${user.github_login}/${repoName}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load pull requests");
      }

      const data = await response.json();

      console.log("PR RESPONSE:", data);

      setPullRequests(data.pull_requests || []);
    } catch (err) {
      console.error("PR ERROR:", err);
      setError("Unable to load pull requests.");
    } finally {
      setPrLoading(false);
    }
  }

  // --------------------------------------------------
  // ANALYZE PR
  // --------------------------------------------------

  async function analyzePullRequest(prNumber: number) {
    if (!user || !selectedRepo) return;

    setAnalyzingPR(prNumber);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch(
        `http://localhost:8000/github/analyze-pr/${prNumber}?owner=${user.github_login}&repo=${selectedRepo}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to analyze pull request");
      }

      const data = await response.json();

      console.log("PRISM ANALYSIS:", data);

      if (!data.analysis || !data.analysis[0]) {
        throw new Error("No analysis returned");
      }

      setAnalysis(data.analysis[0]);
    } catch (err) {
      console.error("ANALYSIS ERROR:", err);
      setError("Failed to analyze pull request.");
    } finally {
      setAnalyzingPR(null);
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-500">
          Loading PRISM...
        </p>
      </main>
    );
  }

  // --------------------------------------------------
  // NOT AUTHENTICATED
  // --------------------------------------------------

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            Connect GitHub
          </h1>

          <p className="mt-3 text-zinc-500">
            Connect your GitHub account to use PRISM.
          </p>

          <a
            href="http://localhost:8000/auth/github"
            className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            Connect GitHub
          </a>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HEADER */}

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-xl font-bold tracking-tight">
              PRISM<span className="text-zinc-500">.</span>
            </h1>

            <p className="mt-1 text-xs text-zinc-600">
              Developer Intelligence Platform
            </p>
          </div>

          <div className="flex items-center gap-3">

            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt="GitHub avatar"
                className="h-9 w-9 rounded-full"
              />
            )}

            <div>
              <p className="text-sm font-medium">
                @{user.github_login}
              </p>

              <p className="text-xs text-zinc-600">
                GitHub connected
              </p>
            </div>

          </div>

        </div>
      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-6 py-14">

        <p className="text-sm text-zinc-500">
          Dashboard
        </p>

        <h2 className="mt-3 text-5xl font-bold tracking-tight">
          Welcome back,
          <br />

          <span className="text-zinc-500">
            @{user.github_login}.
          </span>
        </h2>

        <p className="mt-5 max-w-2xl leading-7 text-zinc-400">
          Select a repository, choose a pull request, and let
          PRISM analyze the potential impact of the change.
        </p>

        {/* STATS */}

        <div className="mt-12 grid gap-4 md:grid-cols-3">

          <div className="border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs uppercase tracking-widest text-zinc-600">
              Repositories
            </p>

            <p className="mt-4 text-4xl font-bold">
              {repositories.length}
            </p>
          </div>

          <div className="border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs uppercase tracking-widest text-zinc-600">
              Pull Requests
            </p>

            <p className="mt-4 text-4xl font-bold">
              {pullRequests.length}
            </p>
          </div>

          <div className="border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs uppercase tracking-widest text-zinc-600">
              Selected Repository
            </p>

            <p className="mt-4 truncate text-xl font-semibold">
              {selectedRepo || "None"}
            </p>
          </div>

        </div>

        {/* REPOSITORIES */}

        <div className="mt-16">

          <p className="text-xs uppercase tracking-widest text-zinc-600">
            GitHub
          </p>

          <h3 className="mt-2 text-2xl font-semibold">
            Select a repository
          </h3>

          {repoLoading ? (

            <div className="mt-6 border border-white/10 p-8 text-sm text-zinc-500">
              Loading repositories...
            </div>

          ) : repositories.length === 0 ? (

            <div className="mt-6 border border-white/10 p-8 text-sm text-zinc-500">
              No repositories found.
            </div>

          ) : (

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">

              {repositories.map((repo) => (

                <button
                  key={repo.full_name}
                  onClick={() => selectRepository(repo.name)}
                  className={`group border p-6 text-left transition hover:-translate-y-1 ${
                    selectedRepo === repo.name
                      ? "border-white/40 bg-white/[0.06]"
                      : "border-white/10 bg-zinc-950 hover:border-white/20"
                  }`}
                >

                  <div className="flex items-start justify-between gap-4">

                    <h4 className="font-mono text-sm font-medium text-zinc-200 group-hover:text-white">
                      {repo.name}
                    </h4>

                    <span className="text-zinc-700 transition group-hover:text-white">
                      →
                    </span>

                  </div>

                  <p className="mt-3 text-sm text-zinc-500">
                    {repo.full_name}
                  </p>

                  <div className="mt-6 flex items-center justify-between">

                    <span className="text-[10px] uppercase tracking-widest text-zinc-700">
                      {repo.private ? "Private" : "Public"}
                    </span>

                    <span className="text-xs text-zinc-600">
                      {repo.language || "Unknown"}
                    </span>

                  </div>

                </button>

              ))}

            </div>

          )}

        </div>

        {/* PULL REQUESTS */}

        {selectedRepo && (

          <div className="mt-16">

            <div className="flex items-end justify-between">

              <div>

                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Pull Requests
                </p>

                <h3 className="mt-2 text-2xl font-semibold">
                  {selectedRepo}
                </h3>

              </div>

              <span className="text-xs text-zinc-600">
                {pullRequests.length} PRs
              </span>

            </div>

            {prLoading ? (

              <div className="mt-6 border border-white/10 p-8 text-sm text-zinc-500">
                Loading pull requests...
              </div>

            ) : pullRequests.length === 0 ? (

              <div className="mt-6 border border-white/10 p-8 text-sm text-zinc-500">
                No pull requests found.
              </div>

            ) : (

              <div className="mt-6 space-y-3">

                {pullRequests.map((pr) => (

                  <div
                    key={pr.number}
                    className="flex flex-col gap-5 border border-white/10 bg-zinc-950 p-5 md:flex-row md:items-center md:justify-between"
                  >

                    <div className="flex items-center gap-5">

                      <span className="font-mono text-xs text-zinc-600">
                        #{pr.number}
                      </span>

                      <div>

                        <h4 className="text-sm font-medium text-zinc-200">
                          {pr.title}
                        </h4>

                        <p className="mt-1 text-xs text-zinc-600">
                          opened by @{pr.author}
                        </p>

                      </div>

                    </div>

                    <div className="flex items-center justify-between gap-6">

                      <div className="text-right">

                        <p className="text-xs text-zinc-500">
                          {pr.head_branch} → {pr.base_branch}
                        </p>

                        <p className="mt-1 text-[10px] text-zinc-700">
                          {pr.draft
                            ? "Draft"
                            : "Ready for review"}
                        </p>

                      </div>

                      <button
                        onClick={() => analyzePullRequest(pr.number)}
                        disabled={analyzingPR === pr.number}
                        className="shrink-0 rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {analyzingPR === pr.number
                          ? "Analyzing..."
                          : "Analyze PR"}
                      </button>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        )}

        {/* ANALYSIS */}

        {analysis && (

          <div className="mt-20">

            {/* ANALYSIS HEADER */}

            <div className="border-b border-white/10 pb-8">

              <p className="text-xs uppercase tracking-widest text-zinc-600">
                PRISM Analysis
              </p>

              <div className="mt-5 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">

                <div>

                  <h3 className="text-4xl font-bold tracking-tight">
                    Risk Assessment
                  </h3>

                  <p className="mt-3 text-sm text-zinc-500">
                    {analysis.file}
                  </p>

                </div>

                <div className="flex items-end gap-6">

                  <div>
                    <p className="text-xs uppercase tracking-widest text-zinc-600">
                      Score
                    </p>

                    <p className="mt-2 text-6xl font-bold">
                      {analysis.risk_score}
                      <span className="text-2xl text-zinc-700">
                        /100
                      </span>
                    </p>
                  </div>

                  <div className="pb-2">

                    <span className="border border-white/20 px-4 py-2 text-xs font-medium tracking-widest">
                      {analysis.risk_level}
                    </span>

                  </div>

                </div>

              </div>

            </div>

            {/* OVERVIEW */}

            <div className="mt-8 grid gap-4 md:grid-cols-4">

              <div className="border border-white/10 bg-zinc-950 p-6">
                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Changed
                </p>

                <p className="mt-3 text-3xl font-bold">
                  {analysis.changes}
                </p>

                <p className="mt-1 text-xs text-zinc-700">
                  total lines
                </p>
              </div>

              <div className="border border-white/10 bg-zinc-950 p-6">
                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Added
                </p>

                <p className="mt-3 text-3xl font-bold">
                  +{analysis.additions}
                </p>

                <p className="mt-1 text-xs text-zinc-700">
                  lines
                </p>
              </div>

              <div className="border border-white/10 bg-zinc-950 p-6">
                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Deleted
                </p>

                <p className="mt-3 text-3xl font-bold">
                  -{analysis.deletions}
                </p>

                <p className="mt-1 text-xs text-zinc-700">
                  lines
                </p>
              </div>

              <div className="border border-white/10 bg-zinc-950 p-6">
                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Affected
                </p>

                <p className="mt-3 text-3xl font-bold">
                  {analysis.affected_areas || 0}
                </p>

                <p className="mt-1 text-xs text-zinc-700">
                  downstream areas
                </p>
              </div>

            </div>

            {/* CHANGE ANALYSIS */}

            <div className="mt-8 grid gap-4 md:grid-cols-2">

              <div className="border border-white/10 bg-zinc-950 p-7">

                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Change Analysis
                </p>

                <div className="mt-6 space-y-4">

                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">
                      Logic changes
                    </span>

                    <span className="text-sm">
                      {analysis.diff_analysis?.logic_changes
                        ? "Detected"
                        : "None"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">
                      Import changes
                    </span>

                    <span className="text-sm">
                      {analysis.diff_analysis?.import_changes
                        ? "Detected"
                        : "None"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">
                      Functions changed
                    </span>

                    <span className="text-sm">
                      {analysis.diff_analysis?.function_changes?.length || 0}
                    </span>
                  </div>

                </div>

              </div>

              <div className="border border-white/10 bg-zinc-950 p-7">

                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Dependency Impact
                </p>

                <div className="mt-6 space-y-4">

                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">
                      Affected files
                    </span>

                    <span className="text-sm">
                      {analysis.affected_files?.length || 0}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">
                      Maximum depth
                    </span>

                    <span className="text-sm">
                      {analysis.risk_factors?.max_dependency_depth || 0}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">
                      Impact score
                    </span>

                    <span className="text-sm">
                      {analysis.risk_factors?.impact_score || 0}
                    </span>
                  </div>

                </div>

              </div>

            </div>

            {/* FUNCTIONS */}

            {analysis.diff_analysis?.function_changes &&
              analysis.diff_analysis.function_changes.length > 0 && (

              <div className="mt-8 border border-white/10 bg-zinc-950 p-7">

                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Function Changes
                </p>

                <div className="mt-5 space-y-2">

                  {analysis.diff_analysis.function_changes.map(
                    (fn, index) => (

                      <div
                        key={index}
                        className="border border-white/5 bg-black px-4 py-3 font-mono text-xs text-zinc-400"
                      >
                        {fn}
                      </div>

                    )
                  )}

                </div>

              </div>

            )}

            {/* AFFECTED FILES */}

            {analysis.affected_files &&
              analysis.affected_files.length > 0 && (

              <div className="mt-8 border border-white/10 bg-zinc-950 p-7">

                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Affected Files
                </p>

                <div className="mt-5 grid gap-2 md:grid-cols-2">

                  {analysis.affected_files.map(
                    (file, index) => (

                      <div
                        key={index}
                        className="border border-white/5 bg-black px-4 py-3 font-mono text-xs text-zinc-500"
                      >
                        {file}
                      </div>

                    )
                  )}

                </div>

              </div>

            )}

            {/* SECURITY */}

            <div className="mt-8 border border-white/10 bg-zinc-950 p-7">

              <p className="text-xs uppercase tracking-widest text-zinc-600">
                Security
              </p>

              {analysis.security_findings &&
              analysis.security_findings.length > 0 ? (

                <div className="mt-5 space-y-3">

                  {analysis.security_findings.map(
                    (finding, index) => (

                      <div
                        key={index}
                        className="border border-red-500/20 bg-red-500/5 p-4"
                      >

                        <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
                          {finding.severity}
                        </p>

                        <p className="mt-2 text-sm text-zinc-300">
                          {finding.message}
                        </p>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <p className="mt-5 text-sm text-zinc-500">
                  No security findings detected.
                </p>

              )}

            </div>

            {/* TEST RECOMMENDATIONS */}

            {analysis.test_recommendations &&
              analysis.test_recommendations.length > 0 && (

              <div className="mt-8 border border-white/10 bg-zinc-950 p-7">

                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Test Recommendations
                </p>

                <div className="mt-5 space-y-3">

                  {analysis.test_recommendations.map(
                    (test, index) => (

                      <div
                        key={index}
                        className="flex flex-col gap-3 border border-white/5 bg-black p-5 md:flex-row md:items-center md:justify-between"
                      >

                        <div>

                          <p className="font-mono text-xs text-zinc-400">
                            {test.source_file}
                          </p>

                          <p className="mt-2 text-sm text-zinc-500">
                            {test.recommendation}
                          </p>

                        </div>

                        <span className="shrink-0 border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-zinc-500">
                          {test.priority}
                        </span>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}

            {/* RISK EXPLANATION */}

            {analysis.risk_explanation && (

              <div className="mt-8 border border-white/10 bg-zinc-950 p-7">

                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Why PRISM gave this score
                </p>

                <p className="mt-5 text-lg leading-8 text-zinc-300">
                  {analysis.risk_explanation.summary}
                </p>

                <div className="mt-6 space-y-3">

                  {analysis.risk_explanation.reasons.map(
                    (reason, index) => (

                      <div
                        key={index}
                        className="flex gap-3 text-sm text-zinc-500"
                      >
                        <span className="text-zinc-700">
                          0{index + 1}
                        </span>

                        <span>
                          {reason}
                        </span>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}

          </div>

        )}

        {/* ERROR */}

        {error && (

          <div className="mt-8 border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
            {error}
          </div>

        )}

      </section>

    </main>
  );
}