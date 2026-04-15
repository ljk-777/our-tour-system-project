/**
 * GitHub REST API v3 client — thin wrapper using native fetch.
 * All methods throw on HTTP errors with actionable messages.
 */
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
    user: {
        login: string;
    };
    head: {
        ref: string;
        sha: string;
    };
    base: {
        ref: string;
    };
    draft: boolean;
    labels: Array<{
        name: string;
    }>;
    requested_reviewers: Array<{
        login: string;
    }>;
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
    user: {
        login: string;
    };
    labels: Array<{
        name: string;
        color: string;
    }>;
    assignees: Array<{
        login: string;
    }>;
    comments: number;
    pull_request?: {
        url: string;
    };
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
    user: {
        login: string;
    };
    body: string;
    path: string;
    line: number | null;
    created_at: string;
    html_url: string;
}
export interface IssueComment {
    id: number;
    user: {
        login: string;
    };
    body: string;
    created_at: string;
    html_url: string;
}
export interface Commit {
    sha: string;
    commit: {
        message: string;
        author: {
            name: string;
            date: string;
        };
    };
    html_url: string;
    author: {
        login: string;
    } | null;
}
export interface FileContent {
    name: string;
    path: string;
    content: string;
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
    repository: {
        full_name: string;
    };
    html_url: string;
    text_matches?: Array<{
        fragment: string;
    }>;
}
export declare class GitHubClient {
    private token;
    constructor(options: GitHubClientOptions);
    private request;
    listPullRequests(owner: string, repo: string, opts?: {
        state?: string;
        base?: string;
        head?: string;
        per_page?: number;
        page?: number;
    }): Promise<PullRequest[]>;
    getPullRequest(owner: string, repo: string, prNumber: number): Promise<PullRequest>;
    getPullRequestFiles(owner: string, repo: string, prNumber: number, opts?: {
        per_page?: number;
        page?: number;
    }): Promise<PullRequestFile[]>;
    getPullRequestReviewComments(owner: string, repo: string, prNumber: number, opts?: {
        per_page?: number;
        page?: number;
    }): Promise<ReviewComment[]>;
    listIssues(owner: string, repo: string, opts?: {
        state?: string;
        labels?: string;
        assignee?: string;
        per_page?: number;
        page?: number;
    }): Promise<Issue[]>;
    getIssue(owner: string, repo: string, issueNumber: number): Promise<Issue>;
    getIssueComments(owner: string, repo: string, issueNumber: number, opts?: {
        per_page?: number;
        page?: number;
    }): Promise<IssueComment[]>;
    getRepository(owner: string, repo: string): Promise<Repository>;
    listRepositories(owner: string, opts?: {
        type?: string;
        sort?: string;
        per_page?: number;
        page?: number;
    }): Promise<Repository[]>;
    listCommits(owner: string, repo: string, opts?: {
        sha?: string;
        path?: string;
        per_page?: number;
        page?: number;
    }): Promise<Commit[]>;
    getFileContent(owner: string, repo: string, filePath: string, opts?: {
        ref?: string;
    }): Promise<FileContent>;
    searchCode(query: string, opts?: {
        per_page?: number;
        page?: number;
    }): Promise<SearchResult<CodeSearchItem>>;
}
export declare function formatPR(pr: PullRequest): string;
export declare function formatIssue(issue: Issue): string;
export declare function truncate(text: string, limit?: number): string;
export declare function decodeBase64(encoded: string): string;
//# sourceMappingURL=github-client.d.ts.map