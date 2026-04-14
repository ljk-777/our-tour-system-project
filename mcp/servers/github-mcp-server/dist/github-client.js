/**
 * GitHub REST API v3 client — thin wrapper using native fetch.
 * All methods throw on HTTP errors with actionable messages.
 */
const BASE_URL = "https://api.github.com";
const CHARACTER_LIMIT = 40_000;
export class GitHubClient {
    token;
    constructor(options) {
        this.token = options.token;
    }
    async request(path, params = {}, options = {}) {
        const url = new URL(`${BASE_URL}${path}`);
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined)
                url.searchParams.set(key, String(value));
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
            }
            else if (response.status === 403) {
                const remaining = response.headers.get("x-ratelimit-remaining");
                if (remaining === "0") {
                    const reset = response.headers.get("x-ratelimit-reset");
                    const resetDate = reset ? new Date(Number(reset) * 1000).toISOString() : "unknown";
                    msg += `. Rate limit exceeded. Resets at ${resetDate}.`;
                }
                else {
                    msg += ". Insufficient token permissions — ensure repo/read:org scopes are enabled.";
                }
            }
            else if (response.status === 404) {
                msg += ". Resource not found — verify owner, repo, and number are correct.";
            }
            else if (body) {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.message)
                        msg += `. ${parsed.message}`;
                }
                catch {
                    // ignore parse error
                }
            }
            throw new Error(msg);
        }
        return response.json();
    }
    // ─── Pull Requests ────────────────────────────────────────────────────────
    async listPullRequests(owner, repo, opts = {}) {
        return this.request(`/repos/${owner}/${repo}/pulls`, {
            state: opts.state ?? "open",
            base: opts.base,
            head: opts.head,
            per_page: opts.per_page ?? 30,
            page: opts.page ?? 1,
        });
    }
    async getPullRequest(owner, repo, prNumber) {
        return this.request(`/repos/${owner}/${repo}/pulls/${prNumber}`);
    }
    async getPullRequestFiles(owner, repo, prNumber, opts = {}) {
        return this.request(`/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
            per_page: opts.per_page ?? 30,
            page: opts.page ?? 1,
        });
    }
    async getPullRequestReviewComments(owner, repo, prNumber, opts = {}) {
        return this.request(`/repos/${owner}/${repo}/pulls/${prNumber}/comments`, {
            per_page: opts.per_page ?? 50,
            page: opts.page ?? 1,
        });
    }
    // ─── Issues ───────────────────────────────────────────────────────────────
    async listIssues(owner, repo, opts = {}) {
        return this.request(`/repos/${owner}/${repo}/issues`, {
            state: opts.state ?? "open",
            labels: opts.labels,
            assignee: opts.assignee,
            per_page: opts.per_page ?? 30,
            page: opts.page ?? 1,
        });
    }
    async getIssue(owner, repo, issueNumber) {
        return this.request(`/repos/${owner}/${repo}/issues/${issueNumber}`);
    }
    async getIssueComments(owner, repo, issueNumber, opts = {}) {
        return this.request(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
            per_page: opts.per_page ?? 50,
            page: opts.page ?? 1,
        });
    }
    // ─── Repositories ─────────────────────────────────────────────────────────
    async getRepository(owner, repo) {
        return this.request(`/repos/${owner}/${repo}`);
    }
    async listRepositories(owner, opts = {}) {
        return this.request(`/users/${owner}/repos`, {
            type: opts.type ?? "all",
            sort: opts.sort ?? "updated",
            per_page: opts.per_page ?? 30,
            page: opts.page ?? 1,
        });
    }
    // ─── Commits ──────────────────────────────────────────────────────────────
    async listCommits(owner, repo, opts = {}) {
        return this.request(`/repos/${owner}/${repo}/commits`, {
            sha: opts.sha,
            path: opts.path,
            per_page: opts.per_page ?? 30,
            page: opts.page ?? 1,
        });
    }
    // ─── File Contents ────────────────────────────────────────────────────────
    async getFileContent(owner, repo, filePath, opts = {}) {
        return this.request(`/repos/${owner}/${repo}/contents/${filePath}`, {
            ref: opts.ref,
        });
    }
    // ─── Search ───────────────────────────────────────────────────────────────
    async searchCode(query, opts = {}) {
        return this.request("/search/code", { q: query, per_page: opts.per_page ?? 20, page: opts.page ?? 1 }, { headers: { Accept: "application/vnd.github.text-match+json" } });
    }
}
// ─── Formatting Helpers ───────────────────────────────────────────────────────
export function formatPR(pr) {
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
export function formatIssue(issue) {
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
export function truncate(text, limit = CHARACTER_LIMIT) {
    if (text.length <= limit)
        return text;
    return text.slice(0, limit) + `\n\n… [truncated, ${text.length - limit} chars omitted]`;
}
export function decodeBase64(encoded) {
    return Buffer.from(encoded.replace(/\n/g, ""), "base64").toString("utf-8");
}
//# sourceMappingURL=github-client.js.map