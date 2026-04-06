# Hidden Items Tracker

This file tracks UI items intentionally hidden from users so we can manage them consistently.

## Sidebar Items Hidden For All Users

- `Wiki`
- `Analytics`
- `Automations`
- `Integrations`
- `Report Builder`
- `Workspace Builder`

## Finance Surfaces Hidden For All Users

- Project `Financials` tab
- Project details finance fetch/render path
- Client `Financials` tab
- Revenue and finance dashboard cards, including `Revenue Velocity`
- Client list outstanding balance column
- Client detail finance summaries and budget display
- Project create/edit budget inputs
- Finance permission visibility in admin role/user editors
- Financial tab option in workspace template builder
- Contract/invoice upload categories in client file upload
- Invoice-related notification/SLA wording in settings
- Invoice webhook events in integrations
- Invoice automation trigger options and copy
- Finance quick tools in tool registry

## Notes

- Hidden from the left sidebar navigation in `src/components/Layout.tsx`
- Hidden sidebar routes `Wiki`, `Analytics`, `Automations`, and `Integrations` now redirect to `/app/dashboard`
- Finance backend APIs and dormant components are intentionally kept in code so hiding does not break future restore work
