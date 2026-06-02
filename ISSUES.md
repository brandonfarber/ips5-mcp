# Issue log

| Date (UTC) | Severity | Summary | Status |
| ---------- | -------- | ------- | ------ |
| 2026-05-12 | info | Catalog extracted from PHP docblocks (~229 endpoints); inherited base-controller methods may be missing vs `getAllEndpoints()` in a live IPS install. | Open |
| 2026-05-12 | info | `@apimemberonly` endpoints need OAuth, not API key; tools are registered but will return IPS permission errors without OAuth. | Open |
| 2026-05-12 | info | Large tool surface (229+ tools); use `ips_list_endpoints` / `ips_api_call` if the host struggles with tool list size. | Open |
| 2026-05-12 | info | Site glossary in `docs/agent-guide.md` has TODO placeholders — fill before sharing MCP with others. | Open |
| 2026-06-02 | info | `POST /copywritingcourse/pages` returned an empty `full_path` and root `url` for new page IDs 769 and 770; immediate GET for 770 also returned root `url`. A follow-up update populated `full_path`/`url` for 769. Investigate whether create should call `setFullPath()`. | Open |

## Resolved

- 2026-06-02: Shortened MCP endpoint tool names for Cursor’s 60-char **server+tool** limit (`g_`/`p_`/`u_`/`d_` prefixes, segment abbreviations, `.cursor/mcp.json` server key `ip`). Re-run `npm run build` and reload MCP after pull.
- 2026-06-02: First pass shortened names (`ips_del_*`, `cwc`, etc.); superseded by `g_`/`p_`/`d_` scheme above.
- 2026-06-02: Boolean form fields were encoded as `true`/`false`, which did not enable `ipb_wrapper`; fixed form encoding to send booleans as `1`/`0` for IPS compatibility.
- 2026-06-02: Live API key returned `NO_PERMISSION (2S291/7)` for `GET /copywritingcourse/pages`; resolved after API key permissions were updated in ACP.
- 2026-06-02: Endpoint extractor parsed `@apiparam` fields as `name=type`; fixed parser to store `type name description` and mark `@reqapiparam` entries as required.
- Initial stub without tools; superseded by full catalog + `core_hello` alias.
- Agent sandbox lacked `npm` during early scaffold.
