# ips5-mcp — agent instructions

You are connected to an Invision Community 5 site via its REST API.

## Before calling tools

1. Credentials come from `IPS5_BASE_URL` and `IPS5_API_KEY` (or the MCP client `env` / `envFile`).
2. The API key must be allowed to access each endpoint in ACP → System → REST & OAuth → API Keys.
3. Endpoints marked `@apimemberonly` need OAuth (member token), not an API key alone.

## How to choose a tool

| Step | Tool | When |
|------|------|------|
| 1 | `ips_read_agent_guide` | Unfamiliar domain terms, forum names, package names, or “how do I…?” |
| 2 | `ips_list_endpoints` | Find the right `ips_*` tool (`app`, `search`, `method`) |
| 3 | `g_*` / `p_*` / `u_*` / `d_*` | Call a catalogued endpoint (`g`=GET, `p`=POST, `u`=PUT, `d`=DELETE) |
| 4 | `ips_api_call` | Fallback: known `method` + `/api` path not in catalog |

There are 200+ endpoint tools. Prefer **`ips_list_endpoints`** + **`ips_read_agent_guide`** over guessing tool names.

## Common IPS patterns

- **List + paginate**: `query.page`, `query.perPage`, `query.sortBy`, `query.sortDir` (see endpoint doc in list output).
- **Path IDs**: pass as tool args, e.g. `id` for `/forums/topics/{id}`.
- **POST/PUT body**: form-urlencoded fields in `body` (not JSON), unless docs say otherwise.
- **CMS page creation**: when creating raw HTML pages, default `body.ipb_wrapper` to `true` (“Use Suite HTML wrapper”) unless the user explicitly asks for no wrapper.
- **CMS page links**: after creating a page, return the response `url` when it points to the created page. Do not derive links from `full_path`; if `url` is missing or only the site root, report that the API did not return a usable page URL.
- **Commerce (Nexus)**: `transactions` = payments; `invoices` = orders/line items; `purchases` = subscriptions/licenses.
- **Search date filters** (`g_core_search`): `start_after`, `start_before`, `updated_after`, and `updated_before` must be **Unix timestamps in seconds** (string or number), e.g. `"1780521600"` for 2026-06-04 00:00:00 UTC. Do **not** use ISO datetimes (`2026-06-04T00:00:00Z`) or ISO-8601 durations (`P5D`) — those do not filter correctly on the live API.
- **Forum posts in a date range**: `g_forums_posts` has no date filter; paginate and filter on `results[].date`, or use `g_core_search` with a Unix `start_after` plus `type` (see agent guide). Search indexes primary content items, not every forum reply.

## Community-specific terms

**Read `ips_read_agent_guide` or the MCP resource `ips5://docs/agent-guide`** for this site’s glossary and recipes (forum IDs, product names, internal jargon).

The site owner maintains:

- `docs/agent-guide.md` — full glossary and recipes (edit this file)
- `docs/recipes.md` — optional extra examples

## Sanity check

- `core_hello` or `g_core_hello` — confirms API connectivity.
