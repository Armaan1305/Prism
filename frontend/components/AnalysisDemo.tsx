"use client";

import { useEffect, useState } from "react";
import ImpactGraph from "./ImpactGraph";
import { API_URL } from "@/lib/api";

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
  function_changes: {
    type: string;
    function: string;
    message: string;
    old_signature?: string;
    new_signature?: string;
  }[];
  import_changes: boolean;
  logic_changes: boolean;
};

  dependency_depths: Record<string, number>;

  dependency_relationships: DependencyRelationship[];

  risk_score: number;
  risk_level: string;

  affected_files: string[];

  change_summary?: string;

  security_findings: unknown[];

  risk_explanation?: {
    summary: string;
    reasons: string[];
  };
};

type CurrentUser = {
  github_login: string;
  github_name: string | null;
  avatar_url: string | null;
};

export default function AnalysisDemo() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);

  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedPR, setSelectedPR] = useState("");

  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingPRs, setLoadingPRs] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [error, setError] = useState("");

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check GitHub authentication
  useEffect(() => {
    async function checkAuthentication() {
      try {
        const response = await fetch(
          `${API_URL}/auth/me`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Authentication check failed");
        }

        const data = await response.json();

        if (data.authenticated) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuthentication();
  }, []);

  // Load repositories
  useEffect(() => {
    if (!currentUser) return;

    async function loadRepositories() {
  if (!currentUser) return;

  setLoadingRepos(true);
  setError("");

  try {
    const response = await fetch(
      `${API_URL}/github/repositories/${currentUser.github_login}`,
      {
        credentials: "include",
      }
    );

        if (!response.ok) {
          throw new Error("Failed to load repositories");
        }

        const data = await response.json();

        setRepositories(data.repositories || []);
      } catch {
        setError("Could not load GitHub repositories.");
      } finally {
        setLoadingRepos(false);
      }
    }

    loadRepositories();
  }, [currentUser]);

  // Load pull requests when repository changes
  async function handleRepositoryChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const repo = event.target.value;

    setSelectedRepo(repo);
    setSelectedPR("");
    setPullRequests([]);
    setAnalysis(null);
    setError("");

    if (!repo || !currentUser) return;

    setLoadingPRs(true);

    try {
      const response = await fetch(
        `${API_URL}/github/pull-requests/${currentUser.github_login}/${repo}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load pull requests");
      }

      const data = await response.json();

      setPullRequests(data.pull_requests || []);
    } catch {
      setError("Could not load pull requests.");
    } finally {
      setLoadingPRs(false);
    }
  }

  // Analyze selected pull request
  async function analyzePullRequest() {
    if (!selectedRepo || !selectedPR || !currentUser) return;

    setAnalyzing(true);
    setAnalysis(null);
    setError("");

    try {
      const response = await fetch(
       `${API_URL}/github/analyze-pr/${selectedPR}?owner=${encodeURIComponent(
         currentUser.github_login
       )}&repo=${encodeURIComponent(selectedRepo)}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();

      if (data.analysis?.length > 0) {
        setAnalysis(data.analysis[0]);
      } else {
        setError("No analysis results were returned.");
      }
    } catch {
      setError("PR analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="border-y border-black/10 bg-zinc-950 px-5 py-24 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500">
            Live GitHub Analysis
          </p>

          <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Analyze a pull request.
          </h2>

          <p className="mt-5 leading-7 text-zinc-500">
            Select a repository and pull request. PRISM analyzes the actual
            code changes, dependency impact, security findings and risk.
          </p>
        </div>

        {/* Authentication status */}
        {checkingAuth && (
          <div className="mt-10 border border-white/10 bg-black p-5 text-sm text-zinc-500">
            Checking GitHub authentication...
          </div>
        )}

        {!checkingAuth && !currentUser && (
          <div className="mt-10 border border-yellow-900/50 bg-yellow-950/20 p-5 text-sm text-yellow-500">
            Please connect your GitHub account before using live analysis.
          </div>
        )}

        {/* Selectors */}
        {currentUser && (
          <>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {/* Repository */}
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Repository
                </label>

                <select
                  value={selectedRepo}
                  onChange={handleRepositoryChange}
                  disabled={loadingRepos}
                  className="w-full border border-white/10 bg-black px-4 py-4 text-sm text-white outline-none transition focus:border-white/30"
                >
                  <option value="">
                    {loadingRepos
                      ? "Loading repositories..."
                      : "Select repository"}
                  </option>

                  {repositories.map((repo) => (
                    <option key={repo.full_name} value={repo.name}>
                      {repo.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pull Request */}
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Pull Request
                </label>

                <select
                  value={selectedPR}
                  onChange={(event) => {
                    setSelectedPR(event.target.value);
                    setAnalysis(null);
                  }}
                  disabled={!selectedRepo || loadingPRs}
                  className="w-full border border-white/10 bg-black px-4 py-4 text-sm text-white outline-none transition focus:border-white/30 disabled:opacity-40"
                >
                  <option value="">
                    {loadingPRs
                      ? "Loading pull requests..."
                      : "Select pull request"}
                  </option>

                  {pullRequests.map((pr) => (
                    <option key={pr.number} value={pr.number}>
                      #{pr.number} — {pr.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={analyzePullRequest}
              disabled={!selectedRepo || !selectedPR || analyzing}
              className="mt-6 border border-white bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {analyzing
                ? "Analyzing..."
                : "Analyze Pull Request →"}
            </button>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 border border-red-900/50 bg-red-950/20 px-5 py-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="mt-16 space-y-8">
            {/* Top Stats */}
            <div className="grid gap-5 sm:grid-cols-3">
              {/* Risk Score */}
              <div className="border border-white/10 bg-black p-6">
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Risk Score
                </p>

                <p className="mt-3 text-4xl font-semibold">
                  {analysis.risk_score}
                  <span className="text-lg text-zinc-600">
                    /100
                  </span>
                </p>
              </div>

              {/* Risk Level */}
              <div className="border border-white/10 bg-black p-6">
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Risk Level
                </p>

                <p className="mt-3 text-2xl font-semibold">
                  {analysis.risk_level}
                </p>
              </div>

              {/* Affected Files */}
              <div className="border border-white/10 bg-black p-6">
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Affected Files
                </p>

                <p className="mt-3 text-4xl font-semibold">
                  {analysis.affected_files.length}
                </p>
              </div>
            </div>

            {/* Changed File */}
            <div className="border border-white/10 bg-black p-6">
              <p className="text-xs uppercase tracking-wider text-zinc-600">
                Changed File
              </p>

              <p className="mt-3 font-mono text-sm text-zinc-300">
                {analysis.file}
              </p>

              <div className="mt-5 flex gap-6 text-xs text-zinc-500">
                <span>+{analysis.additions} additions</span>
                <span>-{analysis.deletions} deletions</span>
                <span>{analysis.changes} changes</span>
              </div>
            </div>

            {/* Risk Explanation */}
            {analysis.risk_explanation && (
              <div className="border border-white/10 bg-black p-6">
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Why this risk?
                </p>

                <p className="mt-4 text-sm leading-7 text-zinc-300">
                  {analysis.risk_explanation.summary}
                </p>

                <ul className="mt-5 space-y-3">
                  {analysis.risk_explanation.reasons.map(
                    (reason, index) => (
                      <li
                        key={index}
                        className="text-sm leading-6 text-zinc-500"
                      >
                        — {reason}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {/* Dependency Impact Graph */}
            <ImpactGraph
              dependencyDepths={analysis.dependency_depths}
              relationships={analysis.dependency_relationships}
            />

            {/* Security + Impacted Files */}
            <div className="grid gap-8 md:grid-cols-2">
              {/* Security */}
              <div className="border border-white/10 bg-black p-6">
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Security
                </p>

                <p className="mt-4 text-2xl font-semibold">
                  {analysis.security_findings.length === 0
                    ? "No findings"
                    : `${analysis.security_findings.length} findings`}
                </p>
              </div>

              {/* Impacted Files */}
              <div className="border border-white/10 bg-black p-6">
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Impacted Files
                </p>

                <div className="mt-4 space-y-2">
                  {analysis.affected_files.map((file) => (
                    <p
                      key={file}
                      className="truncate font-mono text-xs text-zinc-500"
                    >
                      {file}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}