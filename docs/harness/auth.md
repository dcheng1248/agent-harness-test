# Claude login for the pipeline

The repo variable `CLAUDE_AUTH` selects the credential.

## Current: subscription token
1. Run `claude setup-token`.
2. Save the result as the repo secret `CLAUDE_CODE_OAUTH_TOKEN`.
3. Keep `CLAUDE_AUTH=oauth`.

Runs use your Claude plan's limits. Costs in the metrics are marked `estimated`.

## Switch to an API key
1. Create a key in the Anthropic Console, and consider a spend limit.
2. Run `gh secret set ANTHROPIC_API_KEY --repo dcheng1248/agent-harness-test` and paste the key.
3. Run `gh variable set CLAUDE_AUTH --repo dcheng1248/agent-harness-test --body api`.

The next run uses the key, and costs are marked `billed`. To switch back, set `CLAUDE_AUTH` to `oauth`.
