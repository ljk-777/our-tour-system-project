/**
 * GitHub REST API v3 client — thin wrapper using native fetch.
 * All methods throw on HTTP errors with actionable messages.
 */

const BASE_URL = "https://api.github.com";
const CHARACTER_LIMIT = 40_000;

export interface GitHubClientOptions {
  token: string;
}

export interface PullRequest {
  number: number;
  title: string;
  state: string;
  body: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  user: { login: string };
  head: { ref: string; sha: string };
  base: { ref: string };
  draft: boolean;
  labels: Array<{ name: string }>;
  requested_reviewers: Array<{ login: string }>;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface Issue {
  number: number;
  title: string;
  state: string;
  body: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: { login: string };
  labels: Array<{ name: string; color: string }>;
  assignees: Array<{ login: string }>;
  comments: number;
  pull_request?: { url: string };
}

export interface Repository {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  default_branch: string;
  topics: string[];
  visibility: string;
  updated_at: string;
}

export interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface ReviewComment {
  id: number;
  user: { login: string };
  body: string;
  path: string;
  line: number | null;
  created_at: string;
  html_url: string;
}

export interface IssueComment {
  id: number;
  user: { login: string };
  body: string;
  created_at: string;
  html_url: string;
}

export interface Commit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
  author: { login: string } | null;
}

export interface FileContent {
  name: string;
  path: string;
  content: string; // base64 encoded
  encoding: string;
  size: number;
  html_url: string;
}

export interface SearchResult<T> {
  total_count: number;
  items: T[];
}

export interface CodeSearchItem {
  name: string;
  path: string;
  repository: { full_name: string };
  html_url: string;
  text_matches?: Array<{ fragment: string }>;
}

export class GitHubClient {
  private token: string;

  constructor(options: GitHubClientOptions) {
    this.token = options.token;
  }

  private async request<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
    options: RequestInit = {}
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "github-mcp-server/1.0",
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      let msg = `GitHub API error ${response.status}: ${response.statusText}`;
      if (response.status === 401) {
        msg += ". Check that GITHUB_TOKEN is valid and has the required scopes.";
      } else if (response.status === 403) {
        const remaining = response.headers.get("x-ratelimit-remaining");
        if (remaining === "0") {
          const reset = response.headers.get("x-ratelimit-reset");
          const resetDate = reset ? new Date(Number(reset) * 1000).toISOString() : "unknown";
          msg += `. Rate limit exceeded. Resets at ${resetDate}.`;
        } else {
          msg += ". Insufficient token permissions — ensure repo/read:org scopes are enabled.";
        }
      } else if (response.status === 404) {
        msg += ". Resource not found — verify owner, repo, and number are correct.";
      } else if (body) {
        try {
          const parsed = JSON.parse(body) as { message?: string };
          if (parsed.message) msg += `. ${parsed.message}`;
        } catch {
          // ignore parse error
        }
      }
      throw new Error(msg);
    }

    return response.json() as Promise<T>;
  }

  // ─── Pull Requests ────────────────────────────────────────────────────────

  async listPullRequests(
    owner: string,
    repo: string,
    opts: { state?: string; base?: string; head?: string; per_page?: number; page?: number } = {}
  ): Promise<PullRequest[]> {
    return this.request<PullRequest[]>(`/repos/${owner}/${repo}/pulls`, {
      state: opts.state ?? "open",
      base: opts.base,
      head: opts.head,
      per_page: opts.per_page ?? 30,
      page: opts.page ?? 1,
    });
  }

  async getPullRequest(owner: string, repo: string, prNumber: number): Promise<PullRequest> {
    return this.request<PullRequest>(`/repos/${owner}/${repo}/pulls/${prNumber}`);
  }

  async getPullRequestFiles(
    owner: string,
    repo: string,
    prNumber: number,
    opts: { per_page?: number; page?: number } = {}
  ): Promise<PullRequestFile[]> {
    return this.request<PullRequestFile[]>(`/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
      per_page: opts.per_page ?? 30,
      page: opts.page ?? 1,
    });
  }

  async getPullRequestReviewComments(
    owner: string,
    repo: string,
    prNumber: number,
    opts: { per_page?: number; page?: number } = {}
  ): Promise<ReviewComment[]> {
    return this.request<ReviewComment[]>(`/repos/${owner}/${repo}/pulls/${prNumber}/comments`, {
      per_page: opts.per_page ?? 50,
      page: opts.page ?? 1,
    });
  }

  // ─── Issues ───────────────────────────────────────────────────────────────

  async listIssues(
    owner: string,
    repo: string,
    opts: { state?: string; labels?: string; assignee?: string; per_page?: number; page?: number } = {}
  ): Promise<Issue[]> {
    return this.request<Issue[]>(`/repos/${owner}/${repo}/issues`, {
      state: opts.state ?? "open",
      labels: opts.labels,
      assignee: opts.assignee,
      per_page: opts.per_page ?? 30,
      page: opts.page ?? 1,
    });
  }

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<Issue> {
    return this.request<Issue>(`/repos/${owner}/${repo}/issues/${issueNumber}`);
  }

  async getIssueComments(
    owner: string,
    repo: string,
    issueNumber: number,
    opts: { per_page?: number; page?: number } = {}
  ): Promise<IssueComment[]> {
    return this.request<IssueComment[]>(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      per_page: opts.per_page ?? 50,
      page: opts.page ?? 1,
    });
  }

  // ─── Repositories ─────────────────────────────────────────────────────────

  async getRepository(owner: string, repo: string): Promise<Repository> {
    return this.request<Repository>(`/repos/${owner}/${repo}`);
  }

  async listRepositories(
    owner: string,
    opts: { type?: string; sort?: string; per_page?: number; page?: number } = {}
  ): Promise<Repository[]> {
    return this.request<Repository[]>(`/users/${owner}/repos`, {
      type: opts.type ?? "all",
      sort: opts.sort ?? "updated",
      per_page: opts.per_page ?? 30,
      page: opts.page ?? 1,
    });
  }

  // ─── Commits ──────────────────────────────────────────────────────────────

  async listCommits(
    owner: string,
    repo: string,
    opts: { sha?: string; path?: string; per_page?: number; page?: number } = {}
  ): Promise<Commit[]> {
    return this.request<Commit[]>(`/repos/${owner}/${repo}/commits`, {
      sha: opts.sha,
      path: opts.path,
      per_page: opts.per_page ?? 30,
      page: opts.page ?? 1,
    });
  }

  // ─── File Contents ────────────────────────────────────────────────────────

  async getFileContent(
    owner: string,
    repo: string,
    filePath: string,
    opts: { ref?: string } = {}
  ): Promise<FileContent> {
    return this.request<FileContent>(`/repos/${owner}/${repo}/contents/${filePath}`, {
      ref: opts.ref,
    });
  }

  // ─── Search ───────────────────────────────────────────────────────────────

  async searchCode(
    query: string,
    opts: { per_page?: number; page?: number } = {}
  ): Promise<SearchResult<CodeSearchItem>> {
    return this.request<SearchResult<CodeSearchItem>>(
      "/search/code",
      { q: query, per_page: opts.per_page ?? 20, page: opts.page ?? 1 },
      { headers: { Accept: "application/vnd.github.text-match+json" } }
    );
  }
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

export function formatPR(pr: PullRequest): string {
  const status = pr.merged_at ? "merged" : pr.state;
  const labels = pr.labels.map((l) => l.name).join(", ") || "none";
  const reviewers = pr.requested_reviewers.map((r) => r.login).join(", ") || "none";
  return [
    `## PR #${pr.number}: ${pr.title}`,
    `**Status**: ${status} | **Draft**: ${pr.draft}`,
    `**Author**: ${pr.user.login}`,
    `**Branch**: \`${pr.head.ref}\` → \`${pr.base.ref}\``,
    `**Created**: ${new Date(pr.created_at).toLocaleDateString()}`,
    `**Changed**: +${pr.additions} -${pr.deletions} in ${pr.changed_files} files`,
    `**Labels**: ${labels}`,
    `**Reviewers**: ${reviewers}`,
    `**URL**: ${pr.html_url}`,
    "",
    pr.body ? truncate(pr.body, 2000) : "_No description_",
  ].join("\n");
}

export function formatIssue(issue: Issue): string {
  const labels = issue.labels.map((l) => l.name).join(", ") || "none";
  const assignees = issue.assignees.map((a) => a.login).join(", ") || "none";
  return [
    `## Issue #${issue.number}: ${issue.title}`,
    `**Status**: ${issue.state}`,
    `**Author**: ${issue.user.login}`,
    `**Created**: ${new Date(issue.created_at).toLocaleDateString()}`,
    `**Labels**: ${labels}`,
    `**Assignees**: ${assignees}`,
    `**Comments**: ${issue.comments}`,
    `**URL**: ${issue.html_url}`,
    "",
    issue.body ? truncate(issue.body, 2000) : "_No description_",
  ].join("\n");
}

export function truncate(text: string, limit: number = CHARACTER_LIMIT): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + `\n\n… [truncated, ${text.length - limit} chars omitted]`;
}

export function decodeBase64(encoded: string): string {
  return Buffer.from(encoded.replace(/\n/g, ""), "base64").toString("utf-8");
}
