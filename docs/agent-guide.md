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

### Search — content since a date

**User:** “What was posted in the last N days?” / “Content since {date}”

- **Tool:** `g_core_search`
- **Date params:** `start_after`, `start_before`, `updated_after`, `updated_before` require a **Unix timestamp in seconds** (not ISO datetime, not `P5D`).
- **Compute cutoff:** e.g. five days ago → `Math.floor((Date.now() - 5 * 864e5) / 1000)` → pass as string in `query`.
- **Example query** (all indexed content since 2026-06-04 00:00:00 UTC):
  ```json
  {
    "query": {
      "start_after": "1780521600",
      "sortby": "newest",
      "perPage": 100,
      "page": 1,
      "doNotTrack": 1
    }
  }
  ```
- **Restrict by app:** add `"type": "forums_topic"` (or another value from `g_core_search_ctypes`). Search returns indexed items; it may omit some forum replies.
- **Response:** use `totalResults` for count; paginate with `page` if needed.

### Forums — posts in a date range

**User:** “How many forum posts in the last N days?”

- **Tool:** `g_forums_posts` (forum replies, not topics)
- **No server-side date filter** — paginate with `sortBy: "date"`, `sortDir: "desc"`, filter each `results[].date` against your cutoff. Note: sort is not strictly chronological; scan pages until confident you have the full set.
- **Alternative:** `g_core_search` with Unix `start_after` only finds indexed primary content, not every reply.

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
- **Visual editor pages:** `POST /copywritingcourse/pages` still defaults to `type=html`. Set `body.type` to `builder` to create a page composed of blocks. Do not send `content` on a builder page (`1CWC/P12`). Do not send `areas` or `blocks` on an HTML page (`1CWC/P13`). The page type cannot be changed later (`1CWC/P5`).
- **Layout:** `body.areas` replaces the whole layout. Send a list of `{area, blocks}` or a map such as `{"col1":["hero","cta"]}`. Areas you omit are removed, including widgets that are not CMS blocks. `body.blocks` is shorthand that replaces only `col1`. Do not send `areas` and `blocks` together.
- **Block references:** a key, a numeric ID, or `{"key":"..."}` / `{"id":1}`.
- **Read back:** builder pages include `areas`. HTML pages include `embedded_blocks` for `{block="key"}` tags. Placements are the same widget-area records the visual editor uses: a `cms` / `Blocks` widget whose configuration is `cms_widget_custom_block` = the block key.
- **Builder body example:**
  ```json
  {
    "body": {
      "name": "Home",
      "type": "builder",
      "areas": { "col1": ["hero", "cta"] },
      "ipb_wrapper": true
    }
  }
  ```

### CMS — blocks

**User:** “Create a CMS block” / “Put blocks on a page”

- **List:** `g_cwc_blocks` with optional `query.type` (`custom` or `plugin`), `query.category_id`, `query.key`, and `query.name`.
- **View one:** `g_cwc_blocks_id`. The response includes `content`, `plugin_config`, and `used_on_pages`.
- **Create:** `p_cwc_blocks`. `body.name` is required. `type` is `custom` (default) or `plugin`. `editor` is `html` (default) or `editor` for WYSIWYG. PHP blocks cannot be created or updated (`1CWC/B3`).
- **Plugin blocks:** send `plugin` and `plugin_app`, or set `plugin` to `db_feed_{databaseId}` and omit `plugin_app`. `plugin_config` is a JSON object.
- **Update:** `p_cwc_blocks_id`. The block type cannot change.
- **Delete:** `d_cwc_blocks_id`. Returns `409 BLOCK_IN_USE` with page IDs unless `body.force` is `1`. `force=1` deletes the block record and leaves existing page placements in place; those widgets then render empty.
- **Limit:** content is at most 1MB.
- Objects and arrays in `body` are sent as JSON. The API decodes a field whose value starts with `{` or `[`.

### CMS — menu manager

**User:** “Update the front navigation menu”

Writes publish the front navigation menu immediately. `p_cwc_menu_publish` rebuilds it again from `core_menu`. `p_cwc_menu_restore` replaces the menu with application defaults and requires `body.confirm` = `1`.

- **Tree:** `g_cwc_menu`. Each item includes `children`.
- **Addable types:** `g_cwc_menu_types` (`core_CustomItem`, `core_Menu`, `cms_Pages`, and their config fields).
- **One item:** `g_cwc_menu_id`.
- **Create:** `p_cwc_menu`. `body.extension` is required.
- **Update:** `p_cwc_menu_id`. Sent `config` fields merge into the saved config.
- **Delete:** `d_cwc_menu_id` deletes the item and its children.
- **Reorder:** `p_cwc_menu_reorder`. `body.items` is a JSON array of `{id, parent, position}`.
- `title` fills the first translatable field when `config` omits it. `parent` of `0` is the root. A dropdown (`core_Menu`) cannot be nested under another dropdown.
- `permissions` is `*`, `inherit`, a comma-separated group list, or a JSON array of group IDs. `menu_types` is `*` or a JSON array of `header`, `sidebar`, and `smallscreen`.
- Error codes run `1CWC/N1`–`N12`, `N16`, `N18` and `2CWC/N13`–`N15`, `N17`, `N19`. `1CWC/N8` is `FIELD_REQUIRED` or `INVALID_CONFIG:menu_content_page`.

### CMS — theme CSS

**User:** “Edit theme custom CSS” / “Change a CSS variable”

`{id}` is a numeric theme ID or `default`.

- **List themes:** `g_cwc_theme`.
- **One theme:** `g_cwc_theme_id` returns custom CSS, saved CSS variable overrides, and layout options.
- **Variables:** `g_cwc_theme_id_variables`. Each variable includes `default`, `value`, `custom`, and `writable`.
- **Update:** `p_cwc_theme_id` with `custom_css`, `css_variables`, and/or `layout`.
- Custom CSS is limited to 512KB and must compile. A closing `</style` tag or `<?` is rejected. An empty `css_variables` value removes that override. An empty `layout` value removes that option. Image theme settings are read-only (`1CWC/T5`).

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
