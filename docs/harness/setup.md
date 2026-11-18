# Pipeline setup

Do these in order.

## 1. Create the GitHub App
1. Open <https://github.com/settings/apps/new>.
2. Name it anything unique. Use the repo URL as the homepage. Untick **Webhook > Active**.
3. Under **Repository permissions**, set these to **Read and write**: Actions, Commit statuses, Contents, Issues, Pull requests. Do not grant Workflows.
4. Choose **Only on this account**, then create it.
5. Note the **App ID**. Under **Private keys**, generate a key and keep the downloaded file.
6. Choose **Install App**, and install it on `agent-harness-test` only.

## 2. Add the secrets
```
gh secret set APP_ID --repo dcheng1248/agent-harness-test
gh secret set APP_PRIVATE_KEY --repo dcheng1248/agent-harness-test < path/to/private-key.pem
claude setup-token
gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo dcheng1248/agent-harness-test
```
Delete the local key file afterwards if you don't need it. To use an API key instead, see `auth.md`.

## 3. Merge the bootstrap PR
Branch protection is not on yet, so this is a normal merge.

## 4. Configure the repo
```
GITHUB_REPOSITORY=dcheng1248/agent-harness-test node .agent/scripts/setup-repo.mjs --app-id <APP_ID> --reviewers dcheng1248
```
This sets labels, variables, auto-merge, the `agent-metrics` branch and branch protection. It is safe to re-run.

## 5. Set up issue intake (required)
```
claude plugin install mattpocock-skills@claude-plugins-official
```
In Claude Code, on a new branch, run `/setup-matt-pocock-skills`:
- Tracker: GitHub Issues.
- Keep `ready-for-agent` as the label for ready work. `/to-tickets` adds it itself.
- In `docs/agents/issue-tracker.md`, make sure blockers use GitHub's built-in "blocked by" links. Dispatch ignores a "Blocked by" line in issue text.

Commit what it creates and merge it through a normal PR. Since you can't approve your own PR, use the admin merge option.

## 6. Use it
Run `/grill-me`, then `/to-tickets`. See `operations.md`.
