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
| 3 | `ips_get_*` / `ips_post_*` | Call a specific catalogued endpoint |
| 4 | `ips_api_call` | Fallback: known `method` + `/api` path not in catalog |

There are 200+ endpoint tools. Prefer **`ips_list_endpoints`** + **`ips_read_agent_guide`** over guessing tool names.

## Common IPS patterns

- **List + paginate**: `query.page`, `query.perPage`, `query.sortBy`, `query.sortDir` (see endpoint doc in list output).
- **Path IDs**: pass as tool args, e.g. `id` for `/forums/topics/{id}`.
- **POST/PUT body**: form-urlencoded fields in `body` (not JSON), unless docs say otherwise.
- **Commerce (Nexus)**: `transactions` = payments; `invoices` = orders/line items; `purchases` = subscriptions/licenses.

## Community-specific terms

**Read `ips_read_agent_guide` or the MCP resource `ips5://docs/agent-guide`** for this site’s glossary and recipes (forum IDs, product names, internal jargon).

The site owner maintains:

- `docs/agent-guide.md` — full glossary and recipes (edit this file)
- `docs/recipes.md` — optional extra examples

## Sanity check

- `core_hello` or `ips_get_core_hello` — confirms API connectivity.
