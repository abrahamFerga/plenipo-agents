# Tabs and the server-driven UI

The module manifest describes its screens declaratively; the shell renders them. Most modules need
no custom React at all.

## `TabDescriptor`

| Member | Required | Notes |
|---|---|---|
| `Id` | **yes** | unique within the module. |
| `Label` | **yes** | tab caption. |
| `Route` | **yes** | **unique across all modules** — startup validates this globally. |
| `Icon` | no | icon key. |
| `Permission` | no on `Tabs`, **yes on `AdminTabs`** | startup throws for an admin tab without one. |
| `Order` | no | sort position. |
| `Home` | no | marks the module's landing tab. |
| `DataEndpoint` | no | a `GET` returning a **JSON array**. The grid's source. |
| `Columns` | no | `TabColumn(Field, Header, Masked)`. |
| `Singleton` | no | render one record instead of a list. |
| `Editor` | no | `TabEditor` + `TabEditorField` — the create/edit form. |
| `Chart` | no | `TabChart(Kind, XField, YField, …)`, `Kind` ∈ `Line` \| `Donut` \| `Bar`. |
| `Actions` | no | `TabAction` — page-level buttons. |
| `RowActions` | no | `TabRowAction` — per-row buttons; its `EndpointTemplate` must contain a `{field}` placeholder. |
| `DetailEndpoint` | no | must contain **exactly one** `{field}` placeholder, substituted from the row. |
| `Placeholder` | no | empty-state text. |

### The camelCase trap

**Every `Field` / `XField` / `YField` addresses the JSON your endpoint returns, and that JSON is
serialized camelCase.** Declare `"monthlyLimit"`, not `"MonthlyLimit"` — even though the C# property
is `MonthlyLimit`.

A mismatch produces a table with the right headers, the right row count, and every cell blank — no
warning, no console error, nothing in the logs. Verify by calling the `DataEndpoint` and reading the
keys off the response body; never infer them from the C# type.
