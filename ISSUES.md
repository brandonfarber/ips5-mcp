# Issue log

| Date (UTC) | Severity | Summary | Status |
| ---------- | -------- | ------- | ------ |
| 2026-05-12 | info | Catalog extracted from PHP docblocks (~229 endpoints); inherited base-controller methods may be missing vs `getAllEndpoints()` in a live IPS install. | Open |
| 2026-05-12 | info | `@apimemberonly` endpoints need OAuth, not API key; tools are registered but will return IPS permission errors without OAuth. | Open |
| 2026-05-12 | info | Large tool surface (229+ tools); use `ips_list_endpoints` / `ips_api_call` if the host struggles with tool list size. | Open |

## Resolved

- Initial stub without tools; superseded by full catalog + `core_hello` alias.
- Agent sandbox lacked `npm` during early scaffold.
