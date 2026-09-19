"use client";

import { useEffect, useState } from "react";
import ImpactGraph from "@/components/ImpactGraph";
import AnalysisHistory from "@/components/AnalysisHistory";
import { API_URL } from "@/lib/api";

type User = {
  github_login: string;
  github_name?: string;
  avatar_url?: string;
};

type Repository = {
  name: string;
  full_name?: string;
  private?: boolean;
  default_branch?: string;
  language?: string | null;
};

type PullRequest = {
  number: number;
  title: string;
  state?: string;
  author?: string;
  head_branch?: string;
  base_branch?: string;
  draft?: boolean;
};

type DiffAnalysis = {
  added_lines: number;
  removed_lines: number;
  function_changes: string[];
  import_changes: boolean;
  logic_changes: boolean;
  change_summary?: string;
};

type SecurityFinding = {
  type?: string;
  severity?: string;
  message?: string;
  line?: number;
};

type TestRecommendation = {
  source_file: string;
  test_file: string | null;
  status: string;
  priority: string;
  recommendation: string;
};

type RiskExplanation = {
  summary: string;
  reasons: string[];
};

type DependencyRelationship = {
  source: string;
  target: string;
  depth: number;
};

type RiskFactors = {
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

type Analysis = {
  file: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  diff_analysis: DiffAnalysis;
  security_findings: SecurityFinding[];
  affected_files: string[];
  affected_areas: number;
  dependency_depths: Record<string, number>;
  dependency_relationships: DependencyRelationship[];
  risk_score: number;
  risk_level: string;
  risk_factors: RiskFactors;
  risk_explanation: RiskExplanation;
  test_recommendations: TestRecommendation[];
};

type AnalysisResponse = {
  repository: string;
  pull_request: number;
  title: string;
  author: string;
  branch: string;
  head_sha: string;
  base_branch: string;
  changed_files: number;
  analysis: Analysis[];
};

function safeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return fallback;
}

function normalizeFunctionChange(change: unknown): string {
  if (typeof change === "string") {
    return change;
  }

  if (!change || typeof change !== "object") {
    return "Function change detected.";
  }

  const item = change as Record<string, unknown>;

  const type = safeString(
    item.type,
    "CHANGE"
  );

  const functionName = safeString(
    item.function,
    "Unknown function"
  );

  const message = safeString(
    item.message,
    "Function change detected."
  );

  const oldSignature =
    item.old_signature !== undefined &&
    item.old_signature !== null
      ? safeString(item.old_signature)
      : "";

  const newSignature =
    item.new_signature !== undefined &&
    item.new_signature !== null
      ? safeString(item.new_signature)
      : "";

  return [
    `${type}: ${functionName}`,
    message,
    oldSignature
      ? `Before: ${oldSignature}`
      : "",
    newSignature
      ? `After: ${newSignature}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeAnalysis(
  item: any
): Analysis {
  const diff = item?.diff_analysis ?? {};

  const rawFunctions = Array.isArray(
    diff.function_changes
  )
    ? diff.function_changes
    : [];

  const functionChanges = rawFunctions.map(
    normalizeFunctionChange
  );

  const rawSecurity = Array.isArray(
    item?.security_findings
  )
    ? item.security_findings
    : [];

  const securityFindings: SecurityFinding[] =
    rawSecurity.map((finding: any) => ({
      type:
        finding &&
        typeof finding.type !== "object"
          ? safeString(finding.type)
          : undefined,
      severity:
        finding &&
        typeof finding.severity !== "object"
          ? safeString(finding.severity)
          : undefined,
      message:
        finding &&
        typeof finding.message !== "object"
          ? safeString(finding.message)
          : undefined,
      line:
        typeof finding?.line === "number"
          ? finding.line
          : undefined,
    }));

  const rawRecommendations = Array.isArray(
    item?.test_recommendations
  )
    ? item.test_recommendations
    : [];

  const testRecommendations: TestRecommendation[] =
    rawRecommendations.map((test: any) => ({
      source_file: safeString(
        test?.source_file,
        "Unknown source file"
      ),
      test_file:
        test?.test_file === null ||
        test?.test_file === undefined
          ? null
          : safeString(test.test_file),
      status: safeString(
        test?.status,
        "UNKNOWN"
      ),
      priority: safeString(
        test?.priority,
        "MEDIUM"
      ),
      recommendation: safeString(
        test?.recommendation,
        "No recommendation available."
      ),
    }));

  const rawAffected = Array.isArray(
    item?.affected_files
  )
    ? item.affected_files
    : [];

  const affectedFiles = rawAffected.map(
    (file: unknown) =>
      safeString(file, "Unknown file")
  );

  const rawDepths =
    item?.dependency_depths &&
    typeof item.dependency_depths === "object"
      ? item.dependency_depths
      : {};

  const dependencyDepths: Record<string, number> =
    {};

  Object.entries(rawDepths).forEach(
    ([file, depth]) => {
      dependencyDepths[file] =
        typeof depth === "number"
          ? depth
          : Number(depth) || 0;
    }
  );

  const rawRelationships = Array.isArray(
    item?.dependency_relationships
  )
    ? item.dependency_relationships
    : [];

  const dependencyRelationships: DependencyRelationship[] =
    rawRelationships.map(
      (relationship: any) => ({
        source: safeString(
          relationship?.source
        ),
        target: safeString(
          relationship?.target
        ),
        depth:
          typeof relationship?.depth === "number"
            ? relationship.depth
            : Number(relationship?.depth) || 0,
      })
    );

  const riskFactors = {
    change_score:
      Number(
        item?.risk_factors?.change_score
      ) || 0,

    impact_score:
      Number(
        item?.risk_factors?.impact_score
      ) || 0,

    depth_score:
      Number(
        item?.risk_factors?.depth_score
      ) || 0,

    logic_score:
      Number(
        item?.risk_factors?.logic_score
      ) || 0,

    function_score:
      Number(
        item?.risk_factors?.function_score
      ) || 0,

    import_score:
      Number(
        item?.risk_factors?.import_score
      ) || 0,

    deletion_score:
      Number(
        item?.risk_factors?.deletion_score
      ) || 0,

    security_score:
      Number(
        item?.risk_factors?.security_score
      ) || 0,

    high_security_findings:
      Number(
        item?.risk_factors
          ?.high_security_findings
      ) || 0,

    medium_security_findings:
      Number(
        item?.risk_factors
          ?.medium_security_findings
      ) || 0,

    max_dependency_depth:
      Number(
        item?.risk_factors
          ?.max_dependency_depth
      ) || 0,
  };

  const rawReasons = Array.isArray(
    item?.risk_explanation?.reasons
  )
    ? item.risk_explanation.reasons
    : [];

  const reasons = rawReasons.map(
    (reason: unknown) =>
      safeString(
        reason,
        "Risk factor detected."
      )
  );

  return {
    file: safeString(
      item?.file,
      "Unknown file"
    ),

    status: safeString(
      item?.status,
      "unknown"
    ),

    additions:
      Number(item?.additions) || 0,

    deletions:
      Number(item?.deletions) || 0,

    changes:
      Number(item?.changes) || 0,

    diff_analysis: {
      added_lines:
        Number(diff?.added_lines) || 0,

      removed_lines:
        Number(diff?.removed_lines) || 0,

      function_changes: functionChanges,

      import_changes:
        Boolean(diff?.import_changes),

      logic_changes:
        Boolean(diff?.logic_changes),

      change_summary:
        typeof diff?.change_summary === "string"
          ? diff.change_summary
          : undefined,
    },

    security_findings: securityFindings,

    affected_files: affectedFiles,

    affected_areas:
      Number(item?.affected_areas) || 0,

    dependency_depths:
      dependencyDepths,

    dependency_relationships:
      dependencyRelationships,

    risk_score:
      Number(item?.risk_score) || 0,

    risk_level: safeString(
      item?.risk_level,
      "UNKNOWN"
    ),

    risk_factors: riskFactors,

    risk_explanation: {
      summary: safeString(
        item?.risk_explanation?.summary,
        "No risk explanation available."
      ),
      reasons,
    },

    test_recommendations:
      testRecommendations,
  };
}

export default function DashboardPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [repositories, setRepositories] =
    useState<Repository[]>([]);

  const [selectedRepo, setSelectedRepo] =
    useState("");

  const [pullRequests, setPullRequests] =
    useState<PullRequest[]>([]);

  const [selectedPR, setSelectedPR] =
    useState("");

  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResponse | null>(null);

  const [loadingUser, setLoadingUser] =
    useState(true);

  const [loadingRepos, setLoadingRepos] =
    useState(false);

  const [loadingPRs, setLoadingPRs] =
    useState(false);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==================================================
  // GET CURRENT USER
  // ==================================================

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoadingUser(true);
        setError("");

        const response = await fetch(
          `${API_URL}/auth/me`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Unable to authenticate with GitHub."
          );
        }

        const data = await response.json();

        if (
          !data.authenticated ||
          !data.user
        ) {
          throw new Error(
            "You are not authenticated with GitHub."
          );
        }

        setUser(data.user);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Authentication failed."
        );
      } finally {
        setLoadingUser(false);
      }
    }

    fetchUser();
  }, []);

  // ==================================================
  // GET REPOSITORIES
  // ==================================================

  // ==================================================
// GET REPOSITORIES
// ==================================================

useEffect(() => {
  if (!user) {
    return;
  }

  const githubLogin = user.github_login;

  async function fetchRepositories() {
    try {
      setLoadingRepos(true);
      setError("");

      const response = await fetch(
        `${API_URL}/github/repositories/${encodeURIComponent(
          githubLogin
        )}`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load repositories."
        );
      }

      const repoList = Array.isArray(
        data?.repositories
      )
        ? data.repositories
        : Array.isArray(data)
          ? data
          : [];

      setRepositories(repoList);
    } catch (err) {
      console.error(err);

      setRepositories([]);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load repositories."
      );
    } finally {
      setLoadingRepos(false);
    }
  }

  fetchRepositories();
}, [user]);

// ==================================================
// GET PULL REQUESTS
// ==================================================

useEffect(() => {
  if (!user || !selectedRepo) {
    setPullRequests([]);
    setSelectedPR("");
    return;
  }

  const githubLogin = user.github_login;
  const repository = selectedRepo;

  async function fetchPullRequests() {
    try {
      setLoadingPRs(true);
      setError("");
      setSelectedPR("");
      setAnalysisResult(null);

      const response = await fetch(
        `${API_URL}/github/pull-requests/${encodeURIComponent(
          githubLogin
        )}/${encodeURIComponent(repository)}`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load pull requests."
        );
      }

      const prList = Array.isArray(
        data?.pull_requests
      )
        ? data.pull_requests
        : Array.isArray(data)
          ? data
          : [];

      setPullRequests(
        prList.map((pr: any) => ({
          number: Number(pr?.number) || 0,
          title: safeString(
            pr?.title,
            "Untitled Pull Request"
          ),
          state: safeString(pr?.state),
          author: safeString(
            pr?.author || pr?.user?.login,
            "unknown"
          ),
          head_branch: safeString(
            pr?.head_branch || pr?.head?.ref
          ),
          base_branch: safeString(
            pr?.base_branch || pr?.base?.ref
          ),
          draft: Boolean(pr?.draft),
        }))
      );
    } catch (err) {
      console.error(err);

      setPullRequests([]);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load pull requests."
      );
    } finally {
      setLoadingPRs(false);
    }
  }

  fetchPullRequests();
}, [selectedRepo, user]);

  // ==================================================
  // ANALYZE PULL REQUEST
  // ==================================================

  async function analyzePullRequest() {
    if (
      !user ||
      !selectedRepo ||
      !selectedPR
    ) {
      return;
    }

    try {
      setAnalyzing(true);
      setError("");
      setAnalysisResult(null);

      const response = await fetch(
        `${API_URL}/github/analyze-pr/${encodeURIComponent(
          selectedPR
        )}?owner=${encodeURIComponent(
          user.github_login
        )}&repo=${encodeURIComponent(
          selectedRepo
        )}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const rawData = await response.json();

      if (!response.ok) {
        throw new Error(
          rawData?.error ||
            rawData?.detail ||
            "Failed to analyze pull request."
        );
      }

      const normalized: AnalysisResponse = {
        repository: safeString(
          rawData?.repository,
          `${user.github_login}/${selectedRepo}`
        ),

        pull_request:
          Number(
            rawData?.pull_request
          ) || Number(selectedPR),

        title: safeString(
          rawData?.title,
          "Pull Request"
        ),

        author: safeString(
          rawData?.author,
          user.github_login
        ),

        branch: safeString(
          rawData?.branch
        ),

        head_sha: safeString(
          rawData?.head_sha
        ),

        base_branch: safeString(
          rawData?.base_branch
        ),

        changed_files:
          Number(
            rawData?.changed_files
          ) || 0,

        analysis: Array.isArray(
          rawData?.analysis
        )
          ? rawData.analysis.map(
              (item: any) =>
                normalizeAnalysis(item)
            )
          : [],
      };

      setAnalysisResult(normalized);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Analysis failed."
      );
    } finally {
       setAnalyzing(false);
    }
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loadingUser) {
    return (
      <main className="min-h-screen bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-600">
            PRISM
          </p>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight">
            Loading dashboard...
          </h1>
        </div>
      </main>
    );
  }

  // ==================================================
  // DASHBOARD
  // ==================================================

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">

        {/* HEADER */}

        <header className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-600">
              PRISM
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Repository Intelligence
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              Analyze pull requests, detect security issues,
              understand dependency impact, and estimate
              change risk.
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.github_login}
                  className="h-9 w-9 rounded-full border border-white/10"
                />
              )}

              <div>
                <p className="text-sm font-medium">
                  {user.github_name ||
                    user.github_login}
                </p>

                <p className="font-mono text-xs text-zinc-600">
                  @{user.github_login}
                </p>
              </div>
            </div>
          )}
        </header>

        {/* ERROR */}

        {error && (
          <div className="mt-8 border border-red-500/20 bg-red-500/5 px-5 py-4">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* CONTROLS */}

        <section className="mt-10 grid gap-5 lg:grid-cols-3">

          {/* REPOSITORY */}

          <div className="border border-white/10 bg-zinc-950 p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              01 / Repository
            </p>

            <label className="mt-4 block text-sm font-medium">
              Select repository
            </label>

            <select
              value={selectedRepo}
              onChange={(event) => {
                setSelectedRepo(
                  event.target.value
                );
                setAnalysisResult(null);
              }}
              disabled={loadingRepos}
              className="mt-3 w-full border border-white/10 bg-black px-4 py-3 text-sm outline-none"
            >
              <option value="">
                {loadingRepos
                  ? "Loading repositories..."
                  : "Choose a repository"}
              </option>

              {repositories.map((repo) => (
                <option
                  key={
                    repo.full_name ||
                    repo.name
                  }
                  value={repo.name}
                >
                  {repo.name}
                </option>
              ))}
            </select>
          </div>

          {/* PULL REQUEST */}

          <div className="border border-white/10 bg-zinc-950 p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              02 / Pull Request
            </p>

            <label className="mt-4 block text-sm font-medium">
              Select pull request
            </label>

            <select
              value={selectedPR}
              onChange={(event) => {
                setSelectedPR(
                  event.target.value
                );
                setAnalysisResult(null);
              }}
              disabled={
                !selectedRepo ||
                loadingPRs
              }
              className="mt-3 w-full border border-white/10 bg-black px-4 py-3 text-sm outline-none"
            >
              <option value="">
                {loadingPRs
                  ? "Loading pull requests..."
                  : !selectedRepo
                    ? "Select a repository first"
                    : "Choose a pull request"}
              </option>

              {pullRequests.map((pr) => (
                <option
                  key={pr.number}
                  value={String(pr.number)}
                >
                  #{pr.number} — {pr.title}
                </option>
              ))}
            </select>
          </div>

          {/* ANALYZE */}

          <div className="flex flex-col justify-between border border-white/10 bg-zinc-950 p-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                03 / Analysis
              </p>

              <p className="mt-4 text-sm leading-6 text-zinc-500">
                Run PRISM against the selected pull request.
              </p>
            </div>

            <button
              onClick={analyzePullRequest}
              disabled={
                !selectedPR ||
                analyzing
              }
              className="mt-6 w-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {analyzing
                ? "Analyzing..."
                : "Analyze Pull Request →"}
            </button>
          </div>
        </section>

        {/* ANALYSIS */}

        {analysisResult && (
          <section className="mt-16">

            {/* HEADER */}

            <div className="border-b border-white/10 pb-8">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-600">
                Analysis Result
              </p>

              <h2 className="mt-3 text-3xl font-semibold">
                PR #{analysisResult.pull_request}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                {analysisResult.title}
              </p>
            </div>

            {/* EACH FILE */}

            {analysisResult.analysis.map(
              (analysis, index) => (
                <div
                  key={`${analysis.file}-${index}`}
                  className="mt-10"
                >

                  {/* RISK OVERVIEW */}

                  <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-4">

                    <div className="bg-zinc-950 p-6">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                        Risk Score
                      </p>

                      <p className="mt-4 text-5xl font-semibold">
                        {analysis.risk_score}
                      </p>

                      <p className="mt-2 text-xs text-zinc-600">
                        out of 100
                      </p>
                    </div>

                    <div className="bg-zinc-950 p-6">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                        Risk Level
                      </p>

                      <p className="mt-4 text-2xl font-semibold">
                        {analysis.risk_level}
                      </p>
                    </div>

                    <div className="bg-zinc-950 p-6">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                        Changed Files
                      </p>

                      <p className="mt-4 text-2xl font-semibold">
                        {analysisResult.changed_files}
                      </p>
                    </div>

                    <div className="bg-zinc-950 p-6">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                        Affected Areas
                      </p>

                      <p className="mt-4 text-2xl font-semibold">
                        {analysis.affected_areas}
                      </p>
                    </div>

                  </div>

                  {/* CHANGED FILE */}

                  <div className="mt-10 border border-white/10 bg-zinc-950 p-6">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Changed File
                    </p>

                    <p className="mt-4 font-mono text-sm">
                      {analysis.file}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-6 text-xs">

                      <div>
                        <span className="text-zinc-600">
                          Status
                        </span>

                        <span className="ml-2">
                          {analysis.status}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-600">
                          Additions
                        </span>

                        <span className="ml-2">
                          +{analysis.additions}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-600">
                          Deletions
                        </span>

                        <span className="ml-2">
                          -{analysis.deletions}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-600">
                          Changes
                        </span>

                        <span className="ml-2">
                          {analysis.changes}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* CHANGE ANALYSIS */}

                  <div className="mt-6 border border-white/10 bg-zinc-950 p-6">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Change Analysis
                    </p>

                    <h3 className="mt-2 text-xl font-medium">
                      What changed?
                    </h3>

                    {analysis.diff_analysis.change_summary && (
                      <p className="mt-5 text-sm leading-7 text-zinc-400">
                        {analysis.diff_analysis.change_summary}
                      </p>
                    )}

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                      <div className="border border-white/10 p-4">
                        <p className="text-xs text-zinc-600">
                          Added Lines
                        </p>

                        <p className="mt-2 text-xl">
                          {analysis.diff_analysis.added_lines}
                        </p>
                      </div>

                      <div className="border border-white/10 p-4">
                        <p className="text-xs text-zinc-600">
                          Removed Lines
                        </p>

                        <p className="mt-2 text-xl">
                          {analysis.diff_analysis.removed_lines}
                        </p>
                      </div>

                      <div className="border border-white/10 p-4">
                        <p className="text-xs text-zinc-600">
                          Import Changes
                        </p>

                        <p className="mt-2 text-xl">
                          {analysis.diff_analysis.import_changes
                            ? "Yes"
                            : "No"}
                        </p>
                      </div>

                      <div className="border border-white/10 p-4">
                        <p className="text-xs text-zinc-600">
                          Logic Changes
                        </p>

                        <p className="mt-2 text-xl">
                          {analysis.diff_analysis.logic_changes
                            ? "Yes"
                            : "No"}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* FUNCTION CHANGES */}

                  <div className="mt-6 border border-white/10 bg-zinc-950 p-6">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Function Changes
                    </p>

                    {analysis.diff_analysis.function_changes.length === 0 ? (
                      <p className="mt-5 text-sm text-zinc-600">
                        No function definition changes detected.
                      </p>
                    ) : (
                      <div className="mt-5 space-y-3">

                        {analysis.diff_analysis.function_changes.map(
                          (change, index) => (
                            <div
                              key={index}
                              className="border border-white/10 bg-black p-5"
                            >
                              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-zinc-300">
                                {change}
                              </pre>
                            </div>
                          )
                        )}

                      </div>
                    )}
                  </div>

                  {/* BLAST RADIUS */}

                  <div className="mt-6">
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

                  <div className="mt-6 border border-white/10 bg-zinc-950 p-6">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Affected Files
                    </p>

                    {analysis.affected_files.length === 0 ? (
                      <p className="mt-5 text-sm text-zinc-600">
                        No downstream affected files detected.
                      </p>
                    ) : (
                      <div className="mt-5 space-y-2">

                        {analysis.affected_files.map(
                          (file) => (
                            <div
                              key={file}
                              className="flex items-center justify-between border border-white/10 bg-black px-4 py-3"
                            >
                              <span className="font-mono text-xs">
                                {file}
                              </span>

                              <span className="text-[10px] uppercase tracking-widest text-zinc-600">
                                affected
                              </span>
                            </div>
                          )
                        )}

                      </div>
                    )}
                  </div>

                  {/* DEPENDENCY DEPTH */}

                  <div className="mt-6 border border-white/10 bg-zinc-950 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                          Dependency Depth
                        </p>

                        <h3 className="mt-2 text-xl font-medium">
                          Propagation depth
                        </h3>
                      </div>

                      <span className="font-mono text-xs text-zinc-600">
                        max depth{" "}
                        {
                          analysis.risk_factors
                            .max_dependency_depth
                        }
                      </span>
                    </div>

                    <div className="mt-6 space-y-2">

                      {Object.entries(
                        analysis.dependency_depths
                      )
                        .sort(
                          (a, b) =>
                            a[1] - b[1]
                        )
                        .map(
                          ([file, depth]) => (
                            <div
                              key={file}
                              className="flex items-center justify-between border border-white/10 bg-black px-4 py-3"
                            >
                              <span className="font-mono text-xs">
                                {file}
                              </span>

                              <span className="font-mono text-xs text-zinc-600">
                                depth {depth}
                              </span>
                            </div>
                          )
                        )}

                    </div>
                  </div>

                  {/* SECURITY */}

                  <div className="mt-6 border border-white/10 bg-zinc-950 p-6">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Security
                    </p>

                    {analysis.security_findings.length === 0 ? (
                      <div className="mt-5 border border-white/10 bg-black p-4">
                        <p className="text-sm text-zinc-400">
                          No security findings detected.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-3">

                        {analysis.security_findings.map(
                          (
                            finding,
                            index
                          ) => (
                            <div
                              key={index}
                              className="border border-white/10 bg-black p-4"
                            >

                              <div className="flex flex-wrap gap-4">

                                {finding.severity && (
                                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                                    {finding.severity}
                                  </span>
                                )}

                                {finding.type && (
                                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                                    {finding.type}
                                  </span>
                                )}

                              </div>

                              {finding.message && (
                                <p className="mt-3 text-sm text-zinc-300">
                                  {finding.message}
                                </p>
                              )}

                              {finding.line !==
                                undefined && (
                                <p className="mt-2 font-mono text-xs text-zinc-600">
                                  Line {finding.line}
                                </p>
                              )}

                            </div>
                          )
                        )}

                      </div>
                    )}
                  </div>

                  {/* TEST RECOMMENDATIONS */}

                  <div className="mt-6 border border-white/10 bg-zinc-950 p-6">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Test Recommendations
                    </p>

                    {analysis.test_recommendations.length === 0 ? (
                      <p className="mt-5 text-sm text-zinc-600">
                        No test recommendations generated.
                      </p>
                    ) : (
                      <div className="mt-5 space-y-3">

                        {analysis.test_recommendations.map(
                          (
                            test,
                            index
                          ) => (
                            <div
                              key={`${test.source_file}-${index}`}
                              className="border border-white/10 bg-black p-5"
                            >

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                                <div>
                                  <p className="font-mono text-xs">
                                    {test.source_file}
                                  </p>

                                  <p className="mt-2 text-sm text-zinc-500">
                                    {test.recommendation}
                                  </p>
                                </div>

                                <div className="flex gap-3">

                                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                                    {test.priority}
                                  </span>

                                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                                    {test.status}
                                  </span>

                                </div>

                              </div>

                              {test.test_file && (
                                <p className="mt-4 font-mono text-xs text-zinc-700">
                                  Test: {test.test_file}
                                </p>
                              )}

                            </div>
                          )
                        )}

                      </div>
                    )}
                  </div>

                  {/* RISK FACTORS */}

                  <div className="mt-6 border border-white/10 bg-zinc-950 p-6">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Risk Factors
                    </p>

                    <div className="mt-6 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-5">

                      <div className="bg-zinc-950 p-4">
                        <p className="text-xs text-zinc-600">
                          Change
                        </p>
                        <p className="mt-2 text-lg">
                          {analysis.risk_factors.change_score}
                        </p>
                      </div>

                      <div className="bg-zinc-950 p-4">
                        <p className="text-xs text-zinc-600">
                          Impact
                        </p>
                        <p className="mt-2 text-lg">
                          {analysis.risk_factors.impact_score}
                        </p>
                      </div>

                      <div className="bg-zinc-950 p-4">
                        <p className="text-xs text-zinc-600">
                          Depth
                        </p>
                        <p className="mt-2 text-lg">
                          {analysis.risk_factors.depth_score}
                        </p>
                      </div>

                      <div className="bg-zinc-950 p-4">
                        <p className="text-xs text-zinc-600">
                          Logic
                        </p>
                        <p className="mt-2 text-lg">
                          {analysis.risk_factors.logic_score}
                        </p>
                      </div>

                      <div className="bg-zinc-950 p-4">
                        <p className="text-xs text-zinc-600">
                          Security
                        </p>
                        <p className="mt-2 text-lg">
                          {analysis.risk_factors.security_score}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* RISK EXPLANATION */}

                  <div className="mt-6 border border-white/10 bg-zinc-950 p-6">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      Risk Explanation
                    </p>

                    <p className="mt-5 text-sm leading-7 text-zinc-400">
                      {analysis.risk_explanation.summary}
                    </p>

                    {analysis.risk_explanation.reasons.length > 0 && (
                      <div className="mt-6 space-y-3">

                        {analysis.risk_explanation.reasons.map(
                          (
                            reason,
                            index
                          ) => (
                            <div
                              key={index}
                              className="flex gap-3 border-b border-white/5 pb-3"
                            >
                              <span className="font-mono text-xs text-zinc-600">
                                0{index + 1}
                              </span>

                              <p className="text-sm text-zinc-400">
                                {reason}
                              </p>
                            </div>
                          )
                        )}

                      </div>
                    )}
                  </div>

                </div>
              )
            )}

          </section>
        )}

        {/* EMPTY STATE */}

        {!analysisResult &&
          !analyzing && (
            <section className="mt-16 border border-dashed border-white/10 px-6 py-20 text-center">

              <p className="font-mono text-xs uppercase tracking-widest text-zinc-700">
                PRISM / READY
              </p>

              <h2 className="mt-5 text-2xl font-medium text-zinc-400">
                Select a repository and pull request
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-700">
                PRISM will analyze code changes,
                dependencies, security findings,
                testing requirements, and overall
                change risk.
              </p>

            </section>
          )}

        {/* ANALYSIS HISTORY */}

        {user && (
          <AnalysisHistory
            githubLogin={user.github_login}
          />
        )}

        {/* ANALYZING */}

        {analyzing && (
          <section className="mt-16 border border-white/10 bg-zinc-950 px-6 py-20 text-center">

            <p className="font-mono text-xs uppercase tracking-widest text-zinc-600">
              PRISM / ANALYZING
            </p>

            <h2 className="mt-5 text-2xl font-medium">
              Analyzing pull request...
            </h2>

            <p className="mt-3 text-sm text-zinc-600">
              Inspecting code changes, dependencies,
              security, and risk.
            </p>

          </section>
        )}

      </div>
    </main>
  );
}