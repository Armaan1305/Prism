"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ImpactGraph from "@/components/ImpactGraph";
import AnalysisHistory from "@/components/AnalysisHistory";
import { API_URL } from "@/lib/api";

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

type FunctionChange = {
  type: string;
  function: string;
  message: string;
  old_signature?: string;
  new_signature?: string;
};

type SecurityFinding = {
  type?: string;
  severity: string;
  message: string;
  line?: number;
};

type TestRecommendation = {
  source_file: string;
  test_file: string | null;
  status: string;
  priority: string;
  recommendation: string;
};

type DependencyRelationship = {
  source: string;
  target: string;
  depth: number;
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
    function_changes: (FunctionChange | string)[];
    import_changes: boolean;
    logic_changes: boolean;
    change_summary?: string;
  };

  security_findings?: SecurityFinding[];

  affected_files?: string[];
  affected_areas?: number;

  dependency_depths?: Record<string, number>;
  dependency_relationships?: DependencyRelationship[];

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

  test_recommendations?: TestRecommendation[];
};

function getRiskStyles(level: string) {
  const normalized = level.toUpperCase();

  if (normalized === "HIGH" || normalized === "CRITICAL") {
    return {
      badge:
        "border-red-500/30 bg-red-500/10 text-red-400",
      accent: "text-red-400",
      ring: "border-red-500/20",
      glow: "shadow-red-950/20",
    };
  }

  if (normalized === "MEDIUM") {
    return {
      badge:
        "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
      accent: "text-yellow-400",
      ring: "border-yellow-500/20",
      glow: "shadow-yellow-950/20",
    };
  }

  if (normalized === "LOW") {
    return {
      badge:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      accent: "text-emerald-400",
      ring: "border-emerald-500/20",
      glow: "shadow-emerald-950/20",
    };
  }

  return {
    badge:
      "border-white/10 bg-white/5 text-zinc-300",
    accent: "text-white",
    ring: "border-white/10",
    glow: "shadow-black",
  };
}

function renderFunctionChange(
  change: FunctionChange | string
) {
  if (typeof change === "string") {
    return (
      <div className="border border-white/5 bg-black px-4 py-4 font-mono text-xs leading-6 text-zinc-400">
        {change}
      </div>
    );
  }

  return (
    <div className="border border-white/5 bg-black p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          {change.type}
        </span>

        <span className="font-mono text-[10px] text-zinc-700">
          Function Change
        </span>
      </div>

      <p className="mt-4 font-mono text-sm text-zinc-200">
        {change.function}
      </p>

      <p className="mt-3 text-sm leading-6 text-zinc-500">
        {change.message}
      </p>

      {change.old_signature && (
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700">
            Before
          </p>

          <div className="mt-2 overflow-x-auto border border-white/5 bg-zinc-950 p-3">
            <code className="font-mono text-xs text-zinc-500">
              {change.old_signature}
            </code>
          </div>
        </div>
      )}

      {change.new_signature && (
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700">
            After
          </p>

          <div className="mt-2 overflow-x-auto border border-white/5 bg-zinc-950 p-3">
            <code className="font-mono text-xs text-zinc-300">
              {change.new_signature}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  const [repositories, setRepositories] =
    useState<Repository[]>([]);

  const [pullRequests, setPullRequests] =
    useState<PullRequest[]>([]);

  const [selectedRepo, setSelectedRepo] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [repoLoading, setRepoLoading] = useState(false);
  const [prLoading, setPrLoading] = useState(false);
  const [analyzingPR, setAnalyzingPR] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  // ==================================================
  // LOAD USER + REPOSITORIES
  // ==================================================

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setRepoLoading(true);
        setError("");

        const authResponse = await fetch(
          `${API_URL}/auth/me`,
          {
            credentials: "include",
          }
        );

        if (!authResponse.ok) {
          throw new Error(
            "Authentication request failed"
          );
        }

        const authData = await authResponse.json();

        if (
          !authData.authenticated ||
          !authData.user
        ) {
          setUser(null);
          return;
        }

        setUser(authData.user);

        const githubLogin =
          authData.user.github_login;

        const repoResponse = await fetch(
          `${API_URL}/github/repositories/${encodeURIComponent(
            githubLogin
          )}`,
          {
            credentials: "include",
          }
        );

        if (!repoResponse.ok) {
          throw new Error(
            "Failed to load repositories"
          );
        }

        const repoData =
          await repoResponse.json();

        const repoList = Array.isArray(
          repoData?.repositories
        )
          ? repoData.repositories
          : Array.isArray(repoData)
            ? repoData
            : [];

        setRepositories(repoList);
      } catch (err) {
        console.error(
          "DASHBOARD ERROR:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load GitHub data."
        );
      } finally {
        setRepoLoading(false);
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // ==================================================
  // SELECT REPOSITORY
  // ==================================================

  async function selectRepository(
    repoName: string
  ) {
    if (!user) return;

    setSelectedRepo(repoName);
    setPullRequests([]);
    setPrLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const githubLogin =
        user.github_login;

      const response = await fetch(
        `${API_URL}/github/pull-requests/${encodeURIComponent(
          githubLogin
        )}/${encodeURIComponent(repoName)}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load pull requests"
        );
      }

      const data = await response.json();

      const prs = Array.isArray(
        data?.pull_requests
      )
        ? data.pull_requests
        : Array.isArray(data)
          ? data
          : [];

      setPullRequests(prs);
    } catch (err) {
      console.error(
        "PR ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load pull requests."
      );
    } finally {
      setPrLoading(false);
    }
  }

  // ==================================================
  // ANALYZE PR
  // ==================================================

  async function analyzePullRequest(
    prNumber: number
  ) {
    if (!user || !selectedRepo) return;

    setAnalyzingPR(prNumber);
    setError("");
    setAnalysis(null);

    try {
      const githubLogin =
        user.github_login;

      const response = await fetch(
        `${API_URL}/github/analyze-pr/${prNumber}?owner=${encodeURIComponent(
          githubLogin
        )}&repo=${encodeURIComponent(selectedRepo)}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to analyze pull request"
        );
      }

      const data = await response.json();

      if (
        !Array.isArray(data?.analysis) ||
        !data.analysis[0]
      ) {
        throw new Error(
          "No analysis returned"
        );
      }

      setAnalysis(data.analysis[0]);
    } catch (err) {
      console.error(
        "ANALYSIS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to analyze pull request."
      );
    } finally {
      setAnalyzingPR(null);
    }
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-pulse rounded-full border border-white/20" />

          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
            PRISM / Initializing
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Loading your developer workspace...
          </p>
        </div>
      </main>
    );
  }

  // ==================================================
  // NOT AUTHENTICATED
  // ==================================================

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-10 text-center shadow-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
            PRISM
          </p>

          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            Connect GitHub
          </h1>

          <p className="mt-4 leading-7 text-zinc-500">
            Connect your GitHub account to inspect
            repositories and analyze pull requests.
          </p>

          <a
            href={`${API_URL}/auth/github`}
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Continue with GitHub
          </a>

          <Link
            href="/"
            className="mt-4 inline-block text-xs text-zinc-600 transition hover:text-white"
          >
            ← Back to PRISM
          </Link>
        </div>
      </main>
    );
  }

  const riskStyles = analysis
    ? getRiskStyles(analysis.risk_level)
    : getRiskStyles("");

  // ==================================================
  // DASHBOARD
  // ==================================================

  return (
    <main className="min-h-screen bg-[#050505] text-white">

      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">

          <Link
            href="/"
            className="group"
          >
            <h1 className="text-xl font-bold tracking-tight">
              PRISM
              <span className="text-violet-400">.</span>
            </h1>

            <p className="mt-0.5 hidden text-[9px] uppercase tracking-[0.2em] text-zinc-600 sm:block">
              Developer Intelligence
            </p>
          </Link>

          <div className="flex items-center gap-3">

            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.github_login}
                className="h-9 w-9 rounded-full border border-white/10 object-cover"
              />
            )}

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white">
                {user.github_name ||
                  `@${user.github_login}`}
              </p>

              <p className="font-mono text-[10px] text-zinc-600">
                @{user.github_login}
              </p>
            </div>

          </div>

        </div>
      </header>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">

        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/[0.08] via-zinc-950 to-zinc-950 p-7 sm:p-10">

          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />

          <div className="relative">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-violet-400">
              PRISM / Workspace
            </p>

            <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              Repository
              <span className="text-zinc-500">
                {" "}Intelligence.
              </span>
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              Select a GitHub repository and inspect
              pull requests through PRISM&apos;s risk,
              dependency, security, and testing analysis.
            </p>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* STATS */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 transition hover:border-white/20">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              Repositories
            </p>

            <div className="mt-5 flex items-end justify-between">
              <p className="text-4xl font-bold tracking-tight">
                {repositories.length}
              </p>

              <span className="text-xs text-zinc-700">
                GitHub
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 transition hover:border-white/20">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              Pull Requests
            </p>

            <div className="mt-5 flex items-end justify-between">
              <p className="text-4xl font-bold tracking-tight">
                {pullRequests.length}
              </p>

              <span className="text-xs text-zinc-700">
                selected repo
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 transition hover:border-white/20 sm:col-span-2 lg:col-span-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              Active Repository
            </p>

            <p className="mt-5 truncate text-xl font-semibold">
              {selectedRepo || "None selected"}
            </p>

            <p className="mt-1 text-xs text-zinc-700">
              {selectedRepo
                ? "Analysis workspace active"
                : "Choose a repository below"}
            </p>
          </div>

        </div>

        {/* REPOSITORIES */}
        <div className="mt-14">

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                01 / GitHub
              </p>

              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                Select a repository
              </h3>

              <p className="mt-2 text-sm text-zinc-600">
                Choose the codebase you want PRISM to inspect.
              </p>
            </div>

            <span className="text-xs text-zinc-700">
              {repositories.length} available
            </span>

          </div>

          {repoLoading ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-10 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700">
                Loading repositories
              </p>

              <div className="mx-auto mt-5 h-1 w-16 animate-pulse rounded-full bg-white/20" />
            </div>
          ) : repositories.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <p className="text-sm text-zinc-500">
                No repositories found.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              {repositories.map((repo) => {
                const selected =
                  selectedRepo === repo.name;

                return (
                  <button
                    key={repo.full_name}
                    onClick={() =>
                      selectRepository(repo.name)
                    }
                    className={`group rounded-2xl border p-6 text-left transition duration-300 hover:-translate-y-1 ${
                      selected
                        ? "border-violet-500/40 bg-violet-500/[0.07] shadow-xl shadow-violet-950/10"
                        : "border-white/10 bg-zinc-950 hover:border-white/20"
                    }`}
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <p className="font-mono text-sm font-medium text-zinc-200 transition group-hover:text-white">
                          {repo.name}
                        </p>

                        <p className="mt-2 truncate text-xs text-zinc-600">
                          {repo.full_name}
                        </p>

                      </div>

                      <span
                        className={`transition ${
                          selected
                            ? "text-violet-400"
                            : "text-zinc-700 group-hover:text-white"
                        }`}
                      >
                        →
                      </span>

                    </div>

                    <div className="mt-8 flex items-center justify-between">

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] ${
                          repo.private
                            ? "border-yellow-500/20 bg-yellow-500/5 text-yellow-500"
                            : "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
                        }`}
                      >
                        {repo.private
                          ? "Private"
                          : "Public"}
                      </span>

                      <span className="text-xs text-zinc-600">
                        {repo.language ||
                          "Unknown"}
                      </span>

                    </div>

                  </button>
                );
              })}

            </div>
          )}

        </div>

        {/* PULL REQUESTS */}
        {selectedRepo && (
          <div className="mt-16">

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                  02 / Pull Requests
                </p>

                <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                  {selectedRepo}
                </h3>
              </div>

              <span className="text-xs text-zinc-700">
                {pullRequests.length} PR
                {pullRequests.length === 1
                  ? ""
                  : "s"}
              </span>

            </div>

            {prLoading ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-10 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700">
                  Fetching pull requests
                </p>

                <div className="mx-auto mt-5 h-1 w-16 animate-pulse rounded-full bg-white/20" />
              </div>
            ) : pullRequests.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-10 text-center">
                <p className="text-sm text-zinc-500">
                  No pull requests found for this repository.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">

                {pullRequests.map((pr) => (
                  <div
                    key={pr.number}
                    className="group rounded-2xl border border-white/10 bg-zinc-950 p-5 transition hover:border-white/20"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-3">

                          <span className="font-mono text-xs text-zinc-600">
                            #{pr.number}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] ${
                              pr.draft
                                ? "border-zinc-700 text-zinc-600"
                                : "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
                            }`}
                          >
                            {pr.draft
                              ? "Draft"
                              : "Ready"}
                          </span>

                        </div>

                        <h4 className="mt-3 text-sm font-medium text-zinc-200 transition group-hover:text-white">
                          {pr.title}
                        </h4>

                        <p className="mt-2 text-xs text-zinc-600">
                          opened by @{pr.author}
                        </p>

                      </div>

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                        <div className="text-left sm:text-right">
                          <p className="font-mono text-xs text-zinc-500">
                            {pr.head_branch}
                            <span className="mx-2 text-zinc-700">
                              →
                            </span>
                            {pr.base_branch}
                          </p>

                          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-zinc-700">
                            {pr.state}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            analyzePullRequest(
                              pr.number
                            )
                          }
                          disabled={
                            analyzingPR ===
                            pr.number
                          }
                          className="rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {analyzingPR ===
                          pr.number
                            ? "Analyzing..."
                            : "Analyze PR →"}
                        </button>

                      </div>

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
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-7 shadow-2xl sm:p-10">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">

                <div className="min-w-0">

                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-violet-400">
                    03 / PRISM Analysis
                  </p>

                  <h3 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                    Risk Assessment
                  </h3>

                  <p className="mt-3 truncate font-mono text-xs text-zinc-600">
                    {analysis.file}
                  </p>

                </div>

                <div
                  className={`rounded-2xl border px-6 py-5 ${riskStyles.ring} ${riskStyles.glow}`}
                >

                  <div className="flex items-end gap-6">

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                        Risk Score
                      </p>

                      <p
                        className={`mt-2 text-6xl font-bold tracking-tight ${riskStyles.accent}`}
                      >
                        {analysis.risk_score}
                        <span className="text-2xl text-zinc-700">
                          /100
                        </span>
                      </p>
                    </div>

                    <span
                      className={`mb-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-[0.18em] ${riskStyles.badge}`}
                    >
                      {analysis.risk_level}
                    </span>

                  </div>

                </div>

              </div>

              {/* OVERVIEW */}
              <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                <div className="rounded-xl border border-white/10 bg-black p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Changed
                  </p>

                  <p className="mt-3 text-3xl font-bold">
                    {analysis.changes}
                  </p>

                  <p className="mt-1 text-xs text-zinc-700">
                    total changes
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Added
                  </p>

                  <p className="mt-3 text-3xl font-bold text-emerald-400">
                    +{analysis.additions}
                  </p>

                  <p className="mt-1 text-xs text-zinc-700">
                    lines added
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Deleted
                  </p>

                  <p className="mt-3 text-3xl font-bold text-red-400">
                    -{analysis.deletions}
                  </p>

                  <p className="mt-1 text-xs text-zinc-700">
                    lines removed
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
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

            </div>

            {/* CHANGE + DEPENDENCY */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-7">

                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  Change Analysis
                </p>

                {analysis.diff_analysis?.change_summary && (
                  <p className="mt-4 text-sm leading-7 text-zinc-400">
                    {analysis.diff_analysis.change_summary}
                  </p>
                )}

                <div className="mt-6 space-y-4">

                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-sm text-zinc-500">
                      Logic changes
                    </span>

                    <span className="text-sm text-zinc-200">
                      {analysis.diff_analysis
                        ?.logic_changes
                        ? "Detected"
                        : "None"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-sm text-zinc-500">
                      Import changes
                    </span>

                    <span className="text-sm text-zinc-200">
                      {analysis.diff_analysis
                        ?.import_changes
                        ? "Detected"
                        : "None"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">
                      Functions changed
                    </span>

                    <span className="text-sm text-zinc-200">
                      {analysis.diff_analysis
                        ?.function_changes
                        ?.length || 0}
                    </span>
                  </div>

                </div>

              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-7">

                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  Dependency Impact
                </p>

                <div className="mt-6 space-y-4">

                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-sm text-zinc-500">
                      Affected files
                    </span>

                    <span className="text-sm text-zinc-200">
                      {analysis.affected_files
                        ?.length || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-sm text-zinc-500">
                      Maximum depth
                    </span>

                    <span className="text-sm text-zinc-200">
                      {analysis.risk_factors
                        ?.max_dependency_depth ||
                        0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">
                      Impact score
                    </span>

                    <span className="text-sm text-zinc-200">
                      {analysis.risk_factors
                        ?.impact_score || 0}
                    </span>
                  </div>

                </div>

              </div>

            </div>

            {/* FUNCTION CHANGES */}
            {analysis.diff_analysis
              ?.function_changes &&
              analysis.diff_analysis
                .function_changes.length >
                0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-7">

                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Function Changes
                  </p>

                  <div className="mt-5 space-y-3">
                    {analysis.diff_analysis.function_changes.map(
                      (change, index) => (
                        <div key={index}>
                          {renderFunctionChange(
                            change
                          )}
                        </div>
                      )
                    )}
                  </div>

                </div>
              )}

            {/* IMPACT GRAPH */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-2 sm:p-4">
              <ImpactGraph
                dependencyDepths={
                  analysis.dependency_depths
                }
                relationships={
                  analysis.dependency_relationships
                }
              />
            </div>

            {/* AFFECTED FILES */}
            {analysis.affected_files &&
              analysis.affected_files.length >
                0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-7">

                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Affected Files
                  </p>

                  <div className="mt-5 grid gap-2 md:grid-cols-2">

                    {analysis.affected_files.map(
                      (file) => (
                        <div
                          key={file}
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-black px-4 py-3"
                        >
                          <span className="truncate font-mono text-xs text-zinc-400">
                            {file}
                          </span>

                          <span className="ml-4 text-[9px] uppercase tracking-[0.15em] text-zinc-700">
                            affected
                          </span>
                        </div>
                      )
                    )}

                  </div>

                </div>
              )}

            {/* SECURITY */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-7">

              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  Security
                </p>

                <span className="text-[10px] text-zinc-700">
                  {analysis.security_findings
                    ?.length || 0}{" "}
                  findings
                </span>
              </div>

              {analysis.security_findings &&
              analysis.security_findings.length >
                0 ? (
                <div className="mt-5 space-y-3">

                  {analysis.security_findings.map(
                    (finding, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-red-500/20 bg-red-500/5 p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">

                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-400">
                            {finding.severity}
                          </p>

                          {finding.line && (
                            <span className="font-mono text-[10px] text-red-500/60">
                              line {finding.line}
                            </span>
                          )}

                        </div>

                        {finding.type && (
                          <p className="mt-2 font-mono text-xs text-zinc-600">
                            {finding.type}
                          </p>
                        )}

                        <p className="mt-3 text-sm leading-7 text-zinc-300">
                          {finding.message}
                        </p>

                      </div>
                    )
                  )}

                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-5">
                  <p className="text-sm text-emerald-400">
                    No security findings detected.
                  </p>
                </div>
              )}

            </div>

            {/* TEST RECOMMENDATIONS */}
            {analysis.test_recommendations &&
              analysis.test_recommendations
                .length > 0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-7">

                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Test Recommendations
                  </p>

                  <div className="mt-5 space-y-3">

                    {analysis.test_recommendations.map(
                      (test, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-white/5 bg-black p-5"
                        >

                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                            <div>
                              <p className="font-mono text-xs text-zinc-300">
                                {test.source_file}
                              </p>

                              {test.test_file && (
                                <p className="mt-2 font-mono text-[10px] text-zinc-700">
                                  test → {test.test_file}
                                </p>
                              )}

                              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
                                {test.recommendation}
                              </p>
                            </div>

                            <div className="flex shrink-0 gap-2">

                              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-zinc-500">
                                {test.priority}
                              </span>

                              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-zinc-600">
                                {test.status}
                              </span>

                            </div>

                          </div>

                        </div>
                      )
                    )}

                  </div>

                </div>
              )}

            {/* RISK FACTORS */}
            {analysis.risk_factors && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-7">

                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  Risk Factors
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                  {[
                    [
                      "Change",
                      analysis.risk_factors
                        .change_score,
                    ],
                    [
                      "Impact",
                      analysis.risk_factors
                        .impact_score,
                    ],
                    [
                      "Depth",
                      analysis.risk_factors
                        .depth_score,
                    ],
                    [
                      "Logic",
                      analysis.risk_factors
                        .logic_score,
                    ],
                    [
                      "Function",
                      analysis.risk_factors
                        .function_score,
                    ],
                    [
                      "Imports",
                      analysis.risk_factors
                        .import_score,
                    ],
                    [
                      "Deletion",
                      analysis.risk_factors
                        .deletion_score,
                    ],
                    [
                      "Security",
                      analysis.risk_factors
                        .security_score,
                    ],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-xl border border-white/5 bg-black p-4"
                      >
                        <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-700">
                          {label}
                        </p>

                        <p className="mt-2 text-2xl font-semibold">
                          {value}
                        </p>
                      </div>
                    )
                  )}

                </div>

              </div>
            )}

            {/* RISK EXPLANATION */}
            {analysis.risk_explanation && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-7">

                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400">
                  Why PRISM gave this score
                </p>

                <p className="mt-5 max-w-4xl text-lg leading-8 text-zinc-300">
                  {analysis.risk_explanation.summary}
                </p>

                {analysis.risk_explanation.reasons
                  .length > 0 && (
                  <div className="mt-7 space-y-3">

                    {analysis.risk_explanation.reasons.map(
                      (reason, index) => (
                        <div
                          key={index}
                          className="flex gap-4 rounded-xl border border-white/5 bg-black p-4"
                        >
                          <span className="font-mono text-[10px] text-zinc-700">
                            {String(
                              index + 1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          <p className="text-sm leading-7 text-zinc-500">
                            {reason}
                          </p>
                        </div>
                      )
                    )}

                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* HISTORY */}
        {user && (
          <div className="mt-20">
            <div className="mb-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                04 / History
              </p>

              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                Previous Analyses
              </h3>

              <p className="mt-2 text-sm text-zinc-600">
                Review previously analyzed pull requests.
              </p>
            </div>

            <AnalysisHistory
              githubLogin={user.github_login}
            />
          </div>
        )}

      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-8 text-xs text-zinc-700 sm:flex-row sm:px-8">
          <span>PRISM / Developer Intelligence</span>

          <span>
            GitHub connected · @{user.github_login}
          </span>
        </div>
      </footer>

    </main>
  );
}