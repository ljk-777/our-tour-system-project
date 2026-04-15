# github-mcp-server

MCP server for GitHub — read PRs, issues, repos, file contents, and search code.

## Tools

| Tool | Description |
|------|-------------|
| `github_list_prs` | List pull requests for a repo |
| `github_get_pr` | Get full PR details (title, body, stats, labels, reviewers) |
| `github_get_pr_diff` | Get changed files and unified diff patches |
| `github_get_pr_comments` | Get inline review comments on a PR |
| `github_list_issues` | List issues (excludes PRs by default) |
| `github_get_issue` | Get full issue details |
| `github_get_issue_comments` | Get comments on an issue or PR |
| `github_get_repo` | Get repo metadata (stars, forks, language, topics) |
| `github_list_repos` | List repos for a user or organization |
| `github_list_commits` | List commits, optionally filtered by branch or file path |
| `github_get_file` | Read file content from a repo |
| `github_search_code` | Search code across GitHub with qualifiers |

## Setup

### 1. Install dependencies

```bash
cd mcp/servers/github-mcp-server
npm install
npm run build
```

### 2. Create a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Select scopes: `repo` (for private repos) or `public_repo` (for public only)
4. Copy the token

### 3. Configure Claude Desktop

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/servers/github-mcp-server/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

Or using `tsx` for development (no build step):

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp/servers/github-mcp-server/src/index.ts"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### 4. Configure for this project (CLAUDE.md)

Add to your `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["/Users/marine/Desktop/our-tour-system-project/mcp/servers/github-mcp-server/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

## Example Prompts

After connecting, you can ask Claude:

- "List all open PRs in ljk-777/our-tour-system-project"
- "Show me the diff for PR #11"
- "What review comments were left on PR #10?"
- "Find all issues labeled 'bug'"
- "Read the file src/backend/src/algorithms/dijkstra.js"
- "Search for 'shortestPath' in the project repo"

## Development

```bash
# Run without building (dev mode)
npm run dev

# Inspect tools interactively
npm run inspect

# Build for production
npm run build
```

## Search Query Examples

`github_search_code` supports GitHub's full search syntax:

```
# Search within this project
dijkstra repo:ljk-777/our-tour-system-project

# Search by language
useState language:javascript

# Search in specific directory
shortestPath path:src/backend repo:ljk-777/our-tour-system-project

# Search by filename
filename:dijkstra.js
```
