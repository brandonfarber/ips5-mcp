# Issue log

| Date (UTC) | Severity | Summary | Status |
| ---------- | -------- | ------- | ------ |
| 2026-05-12 | info | Catalog extracted from PHP docblocks (~229 endpoints); inherited base-controller methods may be missing vs `getAllEndpoints()` in a live IPS install. | Open |
| 2026-05-12 | info | `@apimemberonly` endpoints need OAuth, not API key; tools are registered but will return IPS permission errors without OAuth. | Open |
| 2026-05-12 | info | Large tool surface (229+ tools); use `ips_list_endpoints` / `ips_api_call` if the host struggles with tool list size. | Open |
| 2026-05-12 | info | Site glossary in `docs/agent-guide.md` has TODO placeholders — fill before sharing MCP with others. | Open |
| 2026-06-02 | info | Hosted HTTP mode (`MCP_TRANSPORT=http`) ships for Bunny Magic Containers; see `docs/hosted-deployment.md`. | Open |

| 2026-06-09 | info | Bunny CDN endpoints: use `https://mc-<id>.b-cdn.net` for HTTPS (not `bunny.run`, which can fail TLS). | Open |
| 2026-06-09 | info | `GET /core/search` `start_after` / `updated_after`: catalog says “Date period (from current time)” but live site expects a **Unix timestamp** (e.g. `1780521600` for 2026-06-04). ISO datetimes (`2026-06-04T00:00:00Z`) and `P5D` do not filter; ISO returns unfiltered results, `P5D` behaves unpredictably. Documented in `docs/mcp-instructions.md`, `docs/agent-guide.md`, and `g_core_search` tool description. | Open |
| 2026-06-09 | info | `GET /forums/posts` `sortBy=date&sortDir=desc` is not strictly chronological; recent posts can appear on page 1 mixed with older posts. No server-side date filter — counting posts in a date range requires scanning and filtering client-side. | Open |
| 2026-06-02 | info | OAuth 2.1 for ChatGPT MCP: IPS-backed login, admin-only via `MCP_ADMIN_GROUP_IDS`; in-memory OAuth store unless `MCP_OAUTH_STORE_PATH` set — limit Bunny autoscale max=1 without shared storage. See `docs/oauth-chatgpt.md`. | Open |
| 2026-06-13 | info | Bunny startup probes may fail when `MCP_ALLOWED_HOSTS` omitted `127.0.0.1`; fixed by auto-allowing probe hosts. `GET /health` reports `oauth_configured` — `.well-known` 404 means that flag is false (check `MCP_ADMIN_GROUP_IDS` and IPS OAuth secrets). | Open |

## Resolved

- 2026-06-02: `POST /copywritingcourse/pages` initially returned empty/root URL data; latest site patch confirmed create now returns `full_path` and page-specific `url` directly (`https://kopywriting.com/brandontesttest/` in test), and follow-up GET matches.
- 2026-06-02: Shortened MCP endpoint tool names for Cursor’s 60-char **server+tool** limit (`g_`/`p_`/`u_`/`d_` prefixes, segment abbreviations, `.cursor/mcp.json` server key `ip`). Re-run `npm run build` and reload MCP after pull.
- 2026-06-02: First pass shortened names (`ips_del_*`, `cwc`, etc.); superseded by `g_`/`p_`/`d_` scheme above.
- 2026-06-02: Boolean form fields were encoded as `true`/`false`, which did not enable `ipb_wrapper`; fixed form encoding to send booleans as `1`/`0` for IPS compatibility.
- 2026-06-02: Live API key returned `NO_PERMISSION (2S291/7)` for `GET /copywritingcourse/pages`; resolved after API key permissions were updated in ACP.
- 2026-06-02: Endpoint extractor parsed `@apiparam` fields as `name=type`; fixed parser to store `type name description` and mark `@reqapiparam` entries as required.
- Initial stub without tools; superseded by full catalog + `core_hello` alias.
- Agent sandbox lacked `npm` during early scaffold.
