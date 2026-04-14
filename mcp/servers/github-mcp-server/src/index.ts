#!/usr/bin/env node
/**
 * github-mcp-server — MCP server for GitHub API (stdio transport)
 *
 * Tools:
 *   github_list_prs          List pull requests for a repo
 *   github_get_pr            Get details of a single PR
 *   github_get_pr_diff       Get changed files and diff patches of a PR
 *   github_get_pr_comments   Get review comments on a PR
 *   github_list_issues       List issues for a repo
 *   github_get_issue         Get details of a single issue
 *   github_get_issue_comments Get comments on an issue
 *   github_get_repo          Get repository metadata
 *   github_list_repos        List repos for a user or org
 *   github_list_commits      List commits for a branch or file
 *   github_get_file          Get file content from a repo
 *   github_search_code       Search code across GitHub
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  GitHubClient,
  formatPR,
  formatIssue,
  truncate,
  decodeBase64,
} from "./github-client.js";

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error(
    "Error: GITHUB_TOKEN environment variable is required.\n" +
    "Set it to a GitHub Personal Access Token with 'repo' scope:\n" +
    "  export GITHUB_TOKEN=ghp_..."
  );
  process.exit(1);
}

const gh = new GitHubClient({ token });

const server = new McpServer({
  name: "github-mcp-server",
  version: "1.0.0",
});

// ─── Shared Schemas ───────────────────────────────────────────────────────────

const OwnerRepo = {
  owner: z.string().min(1).describe("GitHub user or organization name (e.g. 'ljk-777')"),
  repo: z.string().min(1).describe("Repository name (e.g. 'our-tour-system-project')"),
};

const Pagination = {
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(30)
    .describe("Number of items per page (max 100)"),
  page: z.number().int().min(1).default(1).describe("Page number (1-based)"),
};

// ─── Tool: github_list_prs ────────────────────────────────────────────────────

server.registerTool(
  "github_list_prs",
  {
    description:
      "List pull requests for a GitHub repository. Returns title, number, state, author, " +
      "branch info, and URL. Use github_get_pr to fetch full details for a specific PR.",
    inputSchema: {
      ...OwnerRepo,
      state: z
        .enum(["open", "closed", "all"])
        .default("open")
        .describe("Filter by PR state"),
      base: z.string().optional().describe("Filter by base branch (e.g. 'main')"),
      ...Pagination,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ owner, repo, state, base, per_page, page }) => {
    const prs = await gh.listPullRequests(owner, repo, { state, base, per_page, page });

    if (prs.length === 0) {
      return {
        content: [{ type: "text", text: `No ${state} pull requests found in ${owner}/${repo}.` }],
      };
    }

    const lines = prs.map((pr) => {
      const status = pr.merged_at ? "merged" : pr.state;
      const draft = pr.draft ? " [draft]" : "";
      return `- #${pr.number} [${status}${draft}] **${pr.title}** by ${pr.user.login} (${pr.head.ref} → ${pr.base.ref}) ${pr.html_url}`;
    });

    const text = [
      `## Pull Requests — ${owner}/${repo} (${state}, page ${page})`,
      `Showing ${prs.length} results`,
      "",
      ...lines,
      "",
      prs.length === per_page
        ? `_More results available — use page=${page + 1} to continue._`
        : "",
    ].join("\n");

    return { content: [{ type: "text", text: truncate(text) }] };
  }
);

// ─── Tool: github_get_pr ──────────────────────────────────────────────────────

server.registerTool(
  "github_get_pr",
  {
    description:
      "Get full details of a single pull request including description, diff stats, labels, " +
      "and requested reviewers. Use github_get_pr_diff for file-level changes.",
    inputSchema: {
      ...OwnerRepo,
      pr_number: z.number().int().min(1).describe("Pull request number"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ owner, repo, pr_number }) => {
    const pr = await gh.getPullRequest(owner, repo, pr_number);
    return { content: [{ type: "text", text: formatPR(pr) }] };
  }
);

// ─── Tool: github_get_pr_diff ─────────────────────────────────────────────────

server.registerTool(
  "github_get_pr_diff",
  {
    description:
      "Get the list of changed files for a pull request, including diff patches. " +
      "Patches may be truncated for large diffs. Use per_page/page to paginate files.",
    inputSchema: {
      ...OwnerRepo,
      pr_number: z.number().int().min(1).describe("Pull request number"),
      include_patch: z
        .boolean()
        .default(true)
        .describe("Whether to include the unified diff patch for each file"),
      ...Pagination,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ owner, repo, pr_number, include_patch, per_page, page }) => {
    const files = await gh.getPullRequestFiles(owner, repo, pr_number, { per_page, page });

    if (files.length === 0) {
      return { content: [{ type: "text", text: "No changed files found." }] };
    }

    const sections = files.map((f) => {
      const header = `### ${f.filename} (${f.status}) +${f.additions} -${f.deletions}`;
      if (!include_patch || !f.patch) return header;
      return `${header}\n\`\`\`diff\n${truncate(f.patch, 3000)}\n\`\`\``;
    });

    const totalAdded = files.reduce((s, f) => s + f.additions, 0);
    const totalDeleted = files.reduce((s, f) => s + f.deletions, 0);

    const text = [
      `## PR #${pr_number} Changed Files — ${owner}/${repo} (page ${page})`,
      `${files.length} files · +${totalAdded} −${totalDeleted}`,
      "",
      ...sections,
      "",
      files.length === per_page
        ? `_More files available — use page=${page + 1} to continue._`
        : "",
    ].join("\n");

    return { content: [{ type: "text", text: truncate(text) }] };
  }
);

// ─── Tool: github_get_pr_comments ─────────────────────────────────────────────

server.registerTool(
  "github_get_pr_comments",
  {
    description:
      "Get inline review comments left on a pull request (line-level code comments). " +
      "For general issue-style comments, use github_get_issue_comments on the same number.",
    inputSchema: {
      ...OwnerRepo,
      pr_number: z.number().int().min(1).describe("Pull request number"),
      ...Pagination,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ owner, repo, pr_number, per_page, page }) => {
    const comments = await gh.getPullRequestReviewComments(owner, repo, pr_number, {
      per_page,
      page,
    });

    if (comments.length === 0) {
      return {
        content: [{ type: "text", text: `No review comments on PR #${pr_number}.` }],
      };
    }

    const lines = comments.map((c) =>
      [
        `### @${c.user.login} on \`${c.path}\` (line ${c.line ?? "??"})`,
        `_${new Date(c.created_at).toLocaleDateString()}_ — ${c.html_url}`,
        "",
        truncate(c.body, 1000),
        "",
      ].join("\n")
    );

    const text = [
      `## Review Comments — PR #${pr_number} in ${owner}/${repo} (page ${page})`,
      `${comments.length} comment(s)`,
      "",
      ...lines,
    ].join("\n");

    return { content: [{ type: "text", text: truncate(text) }] };
  }
);

// ─── Tool: github_list_issues ─────────────────────────────────────────────────

server.registerTool(
  "github_list_issues",
  {
    description:
      "List issues for a GitHub repository. Note: GitHub's API also returns pull requests " +
      "as issues. Filter with labels or assignee to narrow down results.",
    inputSchema: {
      ...OwnerRepo,
      state: z
        .enum(["open", "closed", "all"])
        .default("open")
        .describe("Filter by issue state"),
      labels: z.string().optional().describe("Comma-separated label names to filter by"),
      assignee: z
        .string()
        .optional()
        .describe("Filter by assignee login, or 'none' for unassigned"),
      exclude_prs: z
        .boolean()
        .default(true)
        .describe("Exclude pull requests from results (default true)"),
      ...Pagination,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ owner, repo, state, labels, assignee, exclude_prs, per_page, page }) => {
    let issues = await gh.listIssues(owner, repo, { state, labels, assignee, per_page, page });

    if (exclude_prs) {
      issues = issues.filter((i) => !i.pull_request);
    }

    if (issues.length === 0) {
      return {
        content: [{ type: "text", text: `No ${state} issues found in ${owner}/${repo}.` }],
      };
    }

    const lines = issues.map((i) => {
      const labelStr = i.labels.map((l) => `[${l.name}]`).join(" ");
      return `- #${i.number} [${i.state}] **${i.title}** ${labelStr} by ${i.user.login} — ${i.comments} comments`;
    });

    const text = [
      `## Issues — ${owner}/${repo} (${state}, page ${page})`,
      `Showing ${issues.length} results`,
      "",
      ...lines,
      "",
      issues.length === per_page
        ? `_More results available — use page=${page + 1} to continue._`
        : "",
    ].join("\n");

    return { content: [{ type: "text", text: truncate(text) }] };
  }
);

// ─── Tool: github_get_issue ───────────────────────────────────────────────────

server.registerTool(
  "github_get_issue",
  {
    description: "Get full details of a single GitHub issue including body, labels, and assignees.",
    inputSchema: {
      ...OwnerRepo,
      issue_number: z.number().int().min(1).describe("Issue number"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ owner, repo, issue_number }) => {
    const issue = await gh.getIssue(owner, repo, issue_number);
    return { content: [{ type: "text", text: formatIssue(issue) }] };
  }
);

// ─── Tool: github_get_issue_comments ──────────────────────────────────────────

server.registerTool(
  "github_get_issue_comments",
  {
    description:
      "Get comments on a GitHub issue or pull request (general discussion comments, " +
      "not inline code review comments).",
    inputSchema: {
      ...OwnerRepo,
      issue_number: z.number().int().min(1).describe("Issue or PR number"),
      ...Pagination,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ owner, repo, issue_number, per_page, page }) => {
    const comments = await gh.getIssueComments(owner, repo, issue_number, { per_page, page });

    if (comments.length === 0) {
      return {
        content: [{ type: "text", text: `No comments on #${issue_number}.` }],
      };
    }

    const lines = comments.map((c) =>
      [
        `### @${c.user.login} — ${new Date(c.created_at).toLocaleDateString()}`,
        c.html_url,
        "",
        truncate(c.body, 1500),
        "",
      ].join("\n")
    );

    const text = [
      `## Comments — #${issue_number} in ${owner}/${repo} (page ${page})`,
      `${comments.length} comment(s)`,
      "",
      ...lines,
    ].join("\n");

    return { content: [{ type: "text", text: truncate(text) }] };
  }
);

// ─── Tool: github_get_repo ────────────────────────────────────────────────────

server.registerTool(
  "github_get_repo",
  {
    description:
      "Get metadata for a GitHub repository: description, stars, forks, open issues, " +
      "language, default branch, topics, and visibility.",
    inputSchema: { ...OwnerRepo },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ owner, repo }) => {
    const r = await gh.getRepository(owner, repo);
    const text = [
      `## ${r.full_name}`,
      r.description ?? "_No description_",
      "",
      `**Stars**: ${r.stargazers_count} | **Forks**: ${r.forks_count} | **Open Issues**: ${r.open_issues_count}`,
      `**Language**: ${r.language ?? "N/A"} | **Visibility**: ${r.visibility}`,
      `**Default Branch**: ${r.default_branch}`,
      `**Topics**: ${r.topics.join(", ") || "none"}`,
      `**Last Updated**: ${new Date(r.updated_at).toLocaleDateString()}`,
      `**URL**: ${r.html_url}`,
    ].join("\n");
    return { content: [{ type: "text", text: text }] };
  }
);

// ─── Tool: github_list_repos ──────────────────────────────────────────────────

server.registerTool(
  "github_list_repos",
  {
    description: "List public repositories for a GitHub user or organization.",
    inputSchema: {
      owner: z.string().min(1).describe("GitHub username or organization"),
      type: z
        .enum(["all", "owner", "member", "public", "private", "forks", "sources"])
        .default("public")
        .describe("Repository type filter"),
      sort: z
        .enum(["created", "updated", "pushed", "full_name"])
        .default("updated")
        .describe("Sort order"),
      ...Pagination,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ owner, type, sort, per_page, page }) => {
    const repos = await gh.listRepositories(owner, { type, sort, per_page, page });

    if (repos.length === 0) {
      return { content: [{ type: "text", text: `No repositories found for ${owner}.` }] };
    }

    const lines = repos.map(
      (r) =>
        `- **${r.full_name}** ⭐${r.stargazers_count} | ${r.language ?? "?"} | ${r.description?.slice(0, 80) ?? ""}`
    );

    const text = [
      `## Repositories — ${owner} (page ${page})`,
      `Showing ${repos.length} repos`,
      "",
      ...lines,
      "",
      repos.length === per_page ? `_More results — use page=${page + 1} to continue._` : "",
    ].join("\n");

    return { content: [{ type: "text", text: truncate(text) }] };
  }
);

// ─── Tool: github_list_commits ────────────────────────────────────────────────

server.registerTool(
  "github_list_commits",
  {
    description:
      "List commits for a repository, optionally filtered by branch/SHA or file path.",
    inputSchema: {
      ...OwnerRepo,
      sha: z
        .string()
        .optional()
        .describe("Branch name, tag, or commit SHA to start from (default: default branch)"),
      path: z.string().optional().describe("Only include commits that touched this file path"),
      ...Pagination,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ owner, repo, sha, path, per_page, page }) => {
    const commits = await gh.listCommits(owner, repo, { sha, path, per_page, page });

    if (commits.length === 0) {
      return { content: [{ type: "text", text: "No commits found." }] };
    }

    const lines = commits.map((c) => {
      const author = c.author?.login ?? c.commit.author.name;
      const date = new Date(c.commit.author.date).toLocaleDateString();
      const msg = c.commit.message.split("\n")[0].slice(0, 100);
      return `- \`${c.sha.slice(0, 7)}\` [${date}] **${msg}** — ${author}`;
    });

    const text = [
      `## Commits — ${owner}/${repo}${sha ? ` (${sha})` : ""}${path ? ` touching ${path}` : ""} (page ${page})`,
      "",
      ...lines,
      "",
      commits.length === per_page
        ? `_More results — use page=${page + 1} to continue._`
        : "",
    ].join("\n");

    return { content: [{ type: "text", text: truncate(text) }] };
  }
);

// ─── Tool: github_get_file ────────────────────────────────────────────────────

server.registerTool(
  "github_get_file",
  {
    description:
      "Get the text content of a file from a GitHub repository. " +
      "Returns the decoded file contents. Large files will be truncated.",
    inputSchema: {
      ...OwnerRepo,
      path: z.string().min(1).describe("File path within the repository (e.g. 'src/index.ts')"),
      ref: z
        .string()
        .optional()
        .describe("Branch, tag, or commit SHA (default: default branch)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ owner, repo, path: filePath, ref }) => {
    const file = await gh.getFileContent(owner, repo, filePath, { ref });

    if (file.encoding !== "base64") {
      return {
        content: [
          { type: "text", text: `Unsupported encoding: ${file.encoding}. Expected base64.` },
        ],
      };
    }

    const content = decodeBase64(file.content);
    const header = [
      `## ${file.path}`,
      `Size: ${file.size} bytes | URL: ${file.html_url}`,
      "",
      "```",
    ].join("\n");

    return {
      content: [{ type: "text", text: header + truncate(content, 30_000) + "\n```" }],
    };
  }
);

// ─── Tool: github_search_code ─────────────────────────────────────────────────

server.registerTool(
  "github_search_code",
  {
    description:
      "Search for code across GitHub repositories. Use GitHub search qualifiers in the query " +
      "(e.g. 'dijkstra repo:ljk-777/our-tour-system-project', 'useState language:typescript').",
    inputSchema: {
      query: z
        .string()
        .min(1)
        .describe(
          "GitHub code search query. Supports qualifiers: repo:owner/name, language:ts, path:src/, filename:index.ts"
        ),
      ...Pagination,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ query, per_page, page }) => {
    const result = await gh.searchCode(query, { per_page, page });

    if (result.items.length === 0) {
      return {
        content: [{ type: "text", text: `No code results for: "${query}"` }],
      };
    }

    const lines = result.items.map((item) => {
      const matches = item.text_matches
        ?.map((m) => `  > ${m.fragment.replace(/\n/g, " ").slice(0, 120)}`)
        .join("\n") ?? "";
      return [`- **${item.repository.full_name}** — \`${item.path}\``, matches, item.html_url].join("\n");
    });

    const text = [
      `## Code Search: "${query}"`,
      `${result.total_count.toLocaleString()} total results (showing page ${page})`,
      "",
      ...lines,
      "",
      result.items.length === per_page
        ? `_More results — use page=${page + 1} to continue._`
        : "",
    ].join("\n");

    return { content: [{ type: "text", text: truncate(text) }] };
  }
);

// ─── Start Server ─────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
// Note: do NOT log to stdout — use stderr only (stdio transport requirement)
console.error("github-mcp-server started (stdio)");
