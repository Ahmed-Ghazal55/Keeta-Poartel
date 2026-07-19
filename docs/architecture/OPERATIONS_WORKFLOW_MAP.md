# Operations Workflow Map

Last updated: 2026-07-09

## 1. Runtime Layer

The live portal runs from:

1. `keeta_operations_portal_starter_v4.html`
2. `vendor/xlsx.full.min.js`
3. `keeta_operations_portal_logic.js`
4. `src/lib/*.js`
5. `keeta_operations_portal_v9_extension.js`
6. `keeta_operations_portal_app_v4.js`

## 2. Functional Domains

### Salary and commission

- manual calculator
- monthly closing salary bridge
- validity-sensitive incentive clearing

### Shift operations

- rider ID parsing
- shift template loading
- target/max balancing
- shortage handling without exceeding max

### Vehicle operations

- operating vehicle truth source
- update vehicle reconciliation
- branch/register agreement checks
- capacity and city mismatch detection

### Monthly operations intelligence

- VDA / validity
- face verification
- delivery experience
- OPR search and action previews
- monthly closing comparison and settlement

## 3. Data Flow

### Vehicle flow

1. load files from `data/raw/vehicles/`
2. normalize rows
3. compare operating vehicles vs update vehicles
4. validate branch/register compatibility
5. produce assignments, conflicts, and utilization

### July operations flow

1. read Jeddah workbook or exported CSVs from `data/raw/operations/jeddah/2026-07/`
2. normalize rider, OPR, VDA, face, and delivery datasets
3. render operational pages
4. export summaries for supervisors and operations leads

### Monthly closing flow

1. load company invoice files from `data/raw/monthly_closing/jeddah/<month>/`
2. load internal final settlement workbook when available
3. normalize company and internal rows
4. run matching rules
5. calculate final monthly settlement
6. generate exports and archive bundle

## 4. Folder Ownership

### Root

- active runtime only

### `docs/`

- prompts
- architecture maps
- migration notes
- execution plans
- historical reports
- reference scripts

### `data/raw/`

- source business files
- never edit manually unless replacing source inputs

### `data/reference/`

- expected outputs and curated validation samples

### `data/archive/`

- generated archive bundles for completed monthly work

### `storage/`

- placeholder manifests for imports, exports, runtime state, and archive metadata

### `tests/`

- node validation suites for baseline, V6 modules, and V9 monthly closing

## 5. Current Decision Rules

- company invoice rows remain the source of truth for monthly settlement row coverage
- internal sheets enrich and validate, but do not replace, company invoice rows
- Jeddah and Riyadh data must stay isolated
- invalid riders must lose validity-linked incentives
- UI shell should stay offline and browser-first

## 6. Next Review Targets

1. confirm which Keeta operations page we prioritize next
2. decide whether to add an import registry backed by `storage/`
3. review stale docs and refresh only the ones we still trust operationally
4. define the final production folder contract for future monthly runs
