---
name: github-kb
description: GitHub repository knowledge base management. Use when user mentions GitHub, repo, repository, or asks to download/clone repositories. Manages local GitHub repos at E:\workspace\github, maintains repo summaries in @E:\workspace\github\CLAUDE.md, and uses gh CLI to search GitHub issues, PRs, and repositories.
---

# GitHub Knowledge Base

## Local Repository Path

The primary GitHub directory is **E:\workspace\github**.

**If this directory does not exist, ask the user for the correct path and update this SKILL.md accordingly.**

## Repository Registry

All repositories are tracked with one-line summaries in `@E:\workspace\github\CLAUDE.md`.

When working with repositories, always read this file first to understand what repos are available.

## Workflow

### When User Mentions GitHub/Repo/Repository

1. **Read** `@E:\workspace\github\CLAUDE.md` to see available repositories
2. **Search** the local directory for matching repo names using `ls` or `dir`
3. **Analyze** the query and answer based on local repo contents
4. **Use gh CLI** for additional information about issues, PRs, or repository details

### When User Asks to Download a Repo

1. **Clone** the repository to `E:\workspace\github` using `git clone`
2. **Update** `@E:\workspace\github\CLAUDE.md` with a one-line summary of the new repo
3. **Confirm** to the user that the repo is ready

### GitHub CLI (gh) Commands

Use `gh` commands to search and query GitHub:

- `gh repo view [owner/repo]` - View repository details
- `gh issue list -R [owner/repo]` - List issues
- `gh pr list -R [owner/repo]` - List pull requests
- `gh search repos <query>` - Search repositories
- `gh search issues <query>` - Search issues
- `gh api /repos/owner/repo/readme` - Get README content

### Adding New Repos to CLAUDE.md

After cloning a new repo, add an entry in this format:

```markdown
- [repo-name](./repo-name): One-line description of what this repo does
```

Place it alphabetically under the appropriate section.

## Examples

**User**: "What do I have in my github directory?"
→ Read CLAUDE.md, list repos with descriptions

**User**: "Download the anthropic/claude-code repo"
→ `git clone https://github.com/anthropic/claude-code.git E:\workspace\github\claude-code`
→ Add entry to CLAUDE.md

**User**: "What issues are open in the claude-code repo?"
→ `gh issue list -R anthropic/claude-code`

**User**: "Search for repos about python automation"
→ `gh search repos python automation`
