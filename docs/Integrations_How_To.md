# Arena360 Integrations How-To

## Purpose
This guide explains how to configure and use integrations in Arena360:
- Slack
- GitHub
- Outgoing Webhooks

## Where To Open
1. Login to Arena360.
2. Go to `Integrations` page (`/app/integrations`).
3. You will see two sections:
- `Slack & GitHub`
- `Outgoing webhooks`

## Slack Integration
### What it does
- Sends notifications to Slack (based on product events/flows).
- Supports manual test message from the UI.

### Create Slack integration
1. In `Slack & GitHub`, click `Add integration`.
2. Set `Type` = `Slack`.
3. Fill:
- `Name` (example: `#project-alerts`)
- `Webhook URL` (Slack Incoming Webhook URL)
- `Channel` (optional)
4. Keep `Enabled` checked.
5. Click `Save`.

### Test Slack integration
1. In the integration row, click `Test`.
2. Expected result: toast `Test message sent to Slack`.
3. Confirm message appears in Slack.

### Common Slack issues
- `Slack integration not found`: integration is missing, wrong type, or disabled.
- `Slack webhook URL not configured`: webhook URL is empty/invalid.

## GitHub Integration
### What it does
- Creates GitHub issues directly from Arena360.

### Create GitHub integration
1. Click `Add integration`.
2. Set `Type` = `GitHub`.
3. Fill:
- `Name`
- `Personal access token`
- `Repo (owner/repo)` (example: `wahidsami/360`)
4. Keep `Enabled` checked.
5. Click `Save`.

### Create issue from Arena360
1. In GitHub integration row, click `New issue`.
2. Enter:
- `Title` (required)
- `Body` (optional)
3. Click `Create issue`.
4. Expected result: toast like `Issue #123 created`.

### Common GitHub issues
- `GitHub integration not found`: missing/disabled integration.
- `GitHub token and repo are required`: token or repo not configured.
- `Invalid repo format; use owner/repo`: repo must be exactly `owner/repo`.

## Outgoing Webhooks
### What it does
- Sends HTTP POST callbacks to your endpoint when selected events occur.

### Add webhook
1. In `Outgoing webhooks`, click `Add webhook`.
2. Fill:
- `Name`
- `URL`
- `Secret` (optional)
- `Events` (select one or more)
- `Enabled`
3. Click `Save`.

### Supported event names
- `task.created`
- `task.updated`
- `finding.created`
- `finding.updated`
- `invoice.created`
- `approval.requested`

### Edit/Delete webhook
- Use pencil icon to edit.
- Use trash icon to delete.

## Edit Existing Integrations
- Click pencil icon on integration/webhook row.
- Update values.
- Click `Save`.

Notes:
- For GitHub token: if you leave token blank during edit, existing token is kept.
- Disabled items remain saved but inactive.

## Security Recommendations
- Use least-privilege GitHub token.
- Rotate Slack/GitHub secrets periodically.
- Use HTTPS webhook endpoints only.
- Store secrets securely; do not share screenshots with tokens.

## Quick Validation Checklist
After setup, confirm:
1. Slack `Test` sends message successfully.
2. GitHub `New issue` creates issue in target repo.
3. Webhook endpoint receives POST payload for selected events.
4. Disabled integrations/webhooks do not execute.
