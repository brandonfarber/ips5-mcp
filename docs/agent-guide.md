# Agent guide — Invision Community (site-specific)

> **Maintainers:** Fill in the sections marked `<!-- TODO -->`. This file is exposed to AI agents via MCP (`ips_read_agent_guide` and resource `ips5://docs/agent-guide`).

## Site overview

<!-- TODO -->

- **Community URL:** (from `IPS5_BASE_URL`)
- **Primary apps:** core, forums, nexus (commerce), CMS, blogs

## Glossary

Map **member language** → **what to query**. Agents should look here before picking tools.

| Term / phrase | Meaning on this site | Hints (forum ID, tag, app, package) |
|---------------|----------------------|-------------------------------------|
| <!-- TODO --> | | |

### Forum map (optional)

<!-- TODO: table of forum IDs or slugs agents should know -->

| Forum name | Forum ID | Notes |
|------------|----------|-------|
| <!-- TODO --> | | |

### Commerce / packages (optional)

<!-- TODO: package names, subscription IDs, price points -->

| Product name | Item type / ID | Typical price | Notes |
|--------------|----------------|---------------|-------|
| <!-- TODO --> Yearly | nexus subscription, itemId 1 | $750 initial, $365 renewal | |

## Recipes

Copy-paste patterns: **user question** → **tool** → **example arguments**.

### Forums — recent topics

**User:** “What are the latest topics?” / “most recent posts on the forums”

- **Tool:** `ips_get_forums_topics`
- **Example query:**
  ```json
  {
    "query": {
      "perPage": 20,
      "page": 1,
      "sortBy": "date",
      "sortDir": "desc"
    }
  }
  ```
- **Response:** `results[].title`, `firstPost.date`, `forum.name`

### Forums — topics in one board

**User:** “Latest topics in {forum name}”

1. Resolve forum ID from **Forum map** above (or `ips_get_forums_forums`).
2. **Tool:** `ips_get_forums_topics`
3. **Example query:** `{ "query": { "forums": "<id>", "perPage": 20, "sortBy": "date", "sortDir": "desc" } }`

### Members — search

**User:** “Find member by email/name”

- **Tool:** `ips_get_core_members`
- **Example query:** `{ "query": { "email": "partial@", "perPage": 25 } }` or `{ "name": "partial" }`

### Commerce — payments in a year

**User:** “How many $X packages sold in {year}?”

1. Paginate `ips_get_nexus_transactions` with `statuses=okay`, `sortBy=date`, filter by year and `amount.amount === "X.00"`.
2. Confirm line item on sample invoices via `ips_get_nexus_invoices_id`.
3. See maintainer notes in repo `scripts/` if batch scripts exist.

<!-- TODO: add your common business questions -->

## Endpoints that need OAuth

These often fail with API key-only auth (`@apimemberonly`):

- `GET /core/me` — use member OAuth, not API key

Check `memberOnly: true` in `ips_list_endpoints` output.

## Regenerating the tool catalog

When IPS is upgraded or apps add API controllers:

```bash
npm run extract-endpoints
npm run build
```

Then restart the MCP server.
