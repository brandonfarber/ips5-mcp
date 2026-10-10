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

- **Tool:** `g_forums_topics`
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

1. Resolve forum ID from **Forum map** above (or `g_forums`).
2. **Tool:** `g_forums_topics`
3. **Example query:** `{ "query": { "forums": "<id>", "perPage": 20, "sortBy": "date", "sortDir": "desc" } }`

### Members — search

**User:** “Find member by email/name”

- **Tool:** `g_core_members`
- **Example query:** `{ "query": { "email": "partial@", "perPage": 25 } }` or `{ "name": "partial" }`

### Commerce — payments in a year

**User:** “How many $X packages sold in {year}?”

1. Paginate `g_nexus_transactions` with `statuses=okay`, `sortBy=date`, filter by year and `amount.amount === "X.00"`.
2. Confirm line item on sample invoices via `g_nexus_invoices_id`.
3. See maintainer notes in repo `scripts/` if batch scripts exist.

### CMS — raw HTML pages

**User:** “Create a CMS page” / “Generate a new page”

- **List pages:** `g_cwc_pages` with `query.page` and `query.perPage`
- **View one page:** `g_cwc_pages_id` with `id`
- **Create page:** `p_cwc_pages` with form fields in `body`
- **Update page:** `p_cwc_pages_id` with `id` and changed fields in `body`
- **Delete page:** `d_cwc_pages_id` with `id`
- **Wrapper default:** Unless the user says otherwise, set `body.ipb_wrapper` to `true` so “Use Suite HTML wrapper” is enabled.
- **After create:** Return the response `url` as the page link when it points to the created page. Do not derive the final link from `full_path`; if `url` is missing or is only the site root, say the API did not return a usable page URL.
- **Create body example:**
  ```json
  {
    "body": {
      "name": "Landing Page",
      "seo_name": "landing-page",
      "content": "<h1>Landing Page</h1>",
      "ipb_wrapper": true,
      "title": "Landing Page",
      "meta_description": "Short page summary",
      "meta_index": true
    }
  }
  ```

### CMS — media manager

**User:** “Upload an image to the CMS media manager” / “List media files”

- **List files:** `g_cwc_media` with `query.page`, `query.perPage`, and optional `query.folder_id`, `query.filename`, or `query.path`
- **View one file:** `g_cwc_media_id` with `id`. Use the response `url` as the public file link and `tag` (for example `{media="123"}`) when the file should be inserted into a CMS page or template.
- **List folders:** `g_cwc_mediafolders`. Optional `query.parent_id` (`0` is the root) and `query.name`.
- **Create a folder:** `p_cwc_mediafolders` with `body.name` and optional `body.parent_id`. Names are stored as friendly URL titles and must be unique across the media manager.
- **Upload a file:** `p_cwc_media`. Put the file bytes in `body.content` as base64 (a `data:*;base64,` prefix is accepted). Do not send raw binary or multipart uploads.
- **Overwrite:** set `body.replace` to `1` to replace a file that already has the same filename in the destination folder. Otherwise the API returns `FILE_EXISTS`.
- **Folders on upload:** `body.folder_id` selects an existing folder (`0` is the root). `body.folder_path` (or a directory prefix on `body.filename`, such as `images/hero.png`) creates any missing folders under that parent.
- **Replace bytes for an existing ID:** `p_cwc_media_id` with `id` and `body.content`. Omit `content` to rename or move only.
- **Delete:** `d_cwc_media_id` deletes a file. `d_cwc_mediafolders_id` deletes a folder only when it has no files and no subfolders.
- **Limits:** decoded files must be 32MB or smaller. Allowed types match the media manager (images, video, pdf, svg, and common font files).
- **Upload body example:**
  ```json
  {
    "body": {
      "filename": "images/hero.png",
      "content": "<base64 file bytes>",
      "replace": 1
    }
  }
  ```

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
