# Cinemark Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side React dashboard, in its own git repository, that shows Cinemark-specific metrics (hours, deliveries, execution time, rework) sourced from a Supabase replica of Taskrow.

**Architecture:** Vite + React 19 + TypeScript SPA. All data access goes through `@supabase/supabase-js` with the anon key, filtered to `ClientDisplayName = 'Cinemark'`, paginated client-side (PostgREST caps requests at 1000 rows). Raw rows are normalized into pure, unit-tested functions (`src/lib/*`) before any UI touches them, because `requesttypechange` has a TaskID × User × Day grain that must be deduplicated for task-level metrics. React Query caches the two table fetches (source data refreshes once a day upstream). Four tabs — Hours, Deliveries, Execution Time, Rework — share one global filter (date range + department).

**Tech Stack:** Vite 8, React 19, TypeScript ~6.0.2, Tailwind CSS 3, `@tanstack/react-query` 5, `recharts` 2, `@supabase/supabase-js` 2, `bun` (runtime, package manager, test runner), `oxlint`.

## Global Constraints

- Every Supabase query MUST filter `ClientDisplayName` (or the joined equivalent) to `'Cinemark'` — never fetch the unfiltered replica.
- PostgREST returns at most 1000 rows per request — all fetches paginate with `.range()`.
- `requesttypechange` grain is TaskID × UserLogin × DateCalendar. Sum `SpentHours` directly on raw rows for per-person hours. For any task-level metric (volume, execution time, rework), deduplicate to one row per `TaskID` first (`taskFactsByTaskId`).
- A task/delivery counts toward **every** department (`FunctionGroupName`) that worked on it — this is an intentional, approved design decision, not a bug to "fix" later.
- Rework classification: `RequestTypeClassificationName === 'Ajuste externo'` → external (client-facing), `'Ajuste interno'` → internal, anything else → standard.
- All date bucketing/filtering uses the `America/Sao_Paulo` timezone.
- Repository is a standalone git repo at `/Users/user/antigravity/cinemark`, independent of the workspace's other dashboards. No Vercel config. Do not push to a GitHub remote unless explicitly asked.
- `.env` holds real credentials and is git-ignored; `.env.example` is committed with empty values.
- No unit tests for React components/hooks — this workspace's convention (see `we-trafego`) is to unit-test pure `src/lib` functions only and verify UI manually via `bun run dev`.
- Package manager and test runner: `bun` (matches sibling projects; `bun test`, not `npm test`).

---

### Task 1: Bootstrap do projeto (Vite + React + TS + Tailwind)

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.oxlintrc.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `.env` (not committed — real credentials for local dev)
- Create: `index.html`
- Create: `public/favicon.svg`
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `src/App.tsx` (temporary placeholder, replaced in Task 16)

**Interfaces:**
- Produces: a buildable Vite project (`bun run build` succeeds), alias `@` → `src/`, Tailwind design tokens (`--background`, `--foreground`, `--card`, `--border`, `--primary`, `--muted`, `--destructive`, etc.) and the `.glass-card` utility class, available to every later task.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "cinemark",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "test": "bun test"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.4",
    "@tanstack/react-query": "^5.101.2",
    "@vitejs/plugin-react-swc": "^4.3.1",
    "autoprefixer": "^10.5.2",
    "postcss": "^8.5.16",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "recharts": "^2.15.4",
    "tailwindcss": "3",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^26.0.1",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "bun-types": "^1.3.14",
    "oxlint": "^1.71.0",
    "typescript": "~6.0.2",
    "vite": "^8.1.1"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  server: {
    host: '::',
    port: 8090,
    hmr: { overlay: false },
  },
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 4: Create `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client", "bun-types"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "ignoreDeprecations": "6.0",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "types": ["node"],
    "skipLibCheck": true,

    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        'chart-surface': 'hsl(var(--chart-surface))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
```

- [ ] **Step 7: Create `postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: Create `.oxlintrc.json`**

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

- [ ] **Step 9: Create `.gitignore`**

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local
.env

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

- [ ] **Step 10: Create `.env.example`**

```
VITE_SUPABASE_URL=https://ecxtgqihsbyaquonemll.supabase.co
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 11: Create `.env`** (real values for local development — this file is git-ignored, never commit it)

```
VITE_SUPABASE_URL=https://ecxtgqihsbyaquonemll.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjeHRncWloc2J5YXF1b25lbWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MzkxOTcsImV4cCI6MjA4OTQxNTE5N30.NwMV8hevMO9JLROhZMWpsbjkvzNHgdye4do7oYnEwL8
```

- [ ] **Step 12: Create `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cinemark — Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 13: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="6" fill="#7e14ff"/>
  <rect x="7" y="17" width="4" height="9" rx="1" fill="#ede6ff"/>
  <rect x="14" y="11" width="4" height="15" rx="1" fill="#ede6ff"/>
  <rect x="21" y="6" width="4" height="20" rx="1" fill="#ede6ff"/>
</svg>
```

- [ ] **Step 14: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 15: Create `src/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 20% 4%;
    --foreground: 240 100% 97%;
    --card: 240 18% 9%;
    --card-foreground: 240 100% 97%;
    --popover: 240 18% 9%;
    --popover-foreground: 240 100% 97%;
    --primary: 244 94% 69%;
    --primary-foreground: 0 0% 100%;
    --secondary: 190 100% 50%;
    --secondary-foreground: 0 0% 100%;
    --muted: 240 12% 16%;
    --muted-foreground: 240 10% 58%;
    --accent: 244 94% 69%;
    --accent-foreground: 0 0% 100%;
    --destructive: 348 100% 65%;
    --destructive-foreground: 0 0% 100%;
    --success: 160 100% 45%;
    --warning: 42 100% 50%;
    --border: 0 0% 100% / 0.06;
    --input: 0 0% 100% / 0.06;
    --ring: 244 94% 69%;
    --radius: 0.75rem;
    --chart-surface: 240 14% 12%;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground antialiased;
    font-family: 'Inter', sans-serif;
  }
}

@layer utilities {
  .glass-card {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    transition: all 200ms ease;
  }
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: hsl(240 20% 6%); }
::-webkit-scrollbar-thumb { background: hsl(244 94% 69%); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: hsl(244 94% 75%); }
```

- [ ] **Step 16: Create a temporary `src/App.tsx`** (replaced with the real shell in Task 16)

```tsx
export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p>Cinemark dashboard — em construção</p>
    </div>
  );
}
```

- [ ] **Step 17: Install dependencies and verify the build**

Run: `cd /Users/user/antigravity/cinemark && bun install && bun run build`
Expected: install succeeds, `tsc -b` reports no errors, `vite build` emits `dist/`.

- [ ] **Step 18: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add package.json bun.lock vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.ts postcss.config.js .oxlintrc.json .gitignore .env.example index.html public/favicon.svg src/main.tsx src/index.css src/App.tsx
git commit -m "Bootstrap Vite + React + TS + Tailwind project"
```

---

### Task 2: Tipos de dados e client Supabase

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/supabaseClient.ts`
- Create: `src/lib/supabaseClient.test.ts`
- Create: `src/lib/supabase.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (first `src/lib` file).
- Produces: `TaskChangeRow`, `DeliveryRow` types; `createSupabaseClient(url: string, anonKey: string): SupabaseClient`; `supabase: SupabaseClient` singleton wired to `import.meta.env`. All later data-layer tasks import `TaskChangeRow`/`DeliveryRow` from `@/lib/types` and `supabase` from `@/lib/supabase`.

- [ ] **Step 1: Create `src/lib/types.ts`**

```typescript
export interface TaskChangeRow {
  ClientDisplayName: string | null;
  ClientID: string | null;
  DateCalendar: string | null;
  FunctionGroupID: string | null;
  FunctionGroupName: string | null;
  GroupID: string | null;
  GroupName: string | null;
  JobID: string | null;
  JobNumber: string | null;
  Jobtitle: string | null;
  Month: number | null;
  ParentTaskID: string | null;
  ParentTaskNumber: string | null;
  ParentTaskTitle: string | null;
  PipelineStepID: string | null;
  PipelineStepName: string | null;
  ProductID: string | null;
  ProductName: string | null;
  RequestFirstDueDate: string | null;
  RequestTypeClassificationID: string | null;
  RequestTypeClassificationName: string | null;
  RequestTypeID: string | null;
  RequestTypeName: string | null;
  SpentHours: number | null;
  TaskClosingDate: string | null;
  TaskCreationDate: string | null;
  TaskID: string | null;
  TaskNumber: string | null;
  TaskTags: string | null;
  TaskTitle: string | null;
  UserFunctionID: string | null;
  UserFunctionTitle: string | null;
  UserID: string | null;
  UserLogin: string | null;
  RowID: number;
}

export interface DeliveryRow {
  ClientDisplayName: string | null;
  CreationDate: string | null;
  EffortUnitGroupName: string | null;
  EffortUnitGroupTypeName: string | null;
  JobTitle: string | null;
  Quantity: number | null;
  RequestTypeName: string | null;
  TaskNumber: number | null;
  TaskTitle: string | null;
  UnitName: string | null;
  RequestDeliveryID: number;
}
```

- [ ] **Step 2: Write the failing test for the Supabase client factory**

Create `src/lib/supabaseClient.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import { createSupabaseClient } from './supabaseClient';

describe('createSupabaseClient', () => {
  test('throws when the URL is missing', () => {
    expect(() => createSupabaseClient('', 'anon-key')).toThrow(
      'Supabase URL and anon key are required',
    );
  });

  test('throws when the anon key is missing', () => {
    expect(() => createSupabaseClient('https://x.supabase.co', '')).toThrow(
      'Supabase URL and anon key are required',
    );
  });

  test('creates a client when both values are present', () => {
    const client = createSupabaseClient('https://x.supabase.co', 'anon-key');
    expect(client).toBeDefined();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/supabaseClient.test.ts`
Expected: FAIL — `Cannot find module './supabaseClient'` (file doesn't exist yet).

- [ ] **Step 4: Create `src/lib/supabaseClient.ts`**

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase URL and anon key are required');
  }
  return createClient(url, anonKey);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/supabaseClient.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Create `src/lib/supabase.ts`** (the app's singleton client)

```typescript
import { createSupabaseClient } from './supabaseClient';

export const supabase = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);
```

- [ ] **Step 7: Verify the build still passes**

Run: `cd /Users/user/antigravity/cinemark && bun run build`
Expected: no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/lib/types.ts src/lib/supabaseClient.ts src/lib/supabaseClient.test.ts src/lib/supabase.ts
git commit -m "Add Supabase client factory and row types"
```

---

### Task 3: Paginação genérica do fetch

**Files:**
- Create: `src/lib/fetchPaginated.ts`
- Create: `src/lib/fetchPaginated.test.ts`

**Interfaces:**
- Consumes: nothing (generic, no dependency on `types.ts`).
- Produces: `PageResult<T>`, `PageFetcher<T>`, `fetchAllPages<T>(fetchPage: PageFetcher<T>, options?: { pageSize?: number; maxRetriesPerPage?: number }): Promise<T[]>`. Task 10 (data hooks) is the consumer.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/fetchPaginated.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import { fetchAllPages } from './fetchPaginated';

describe('fetchAllPages', () => {
  test('follows pagination until a partial page is returned', async () => {
    const pages = [
      [{ id: 0 }, { id: 1 }],
      [{ id: 2 }, { id: 3 }],
      [{ id: 4 }],
    ];
    let callCount = 0;
    const result = await fetchAllPages(
      async () => {
        const data = pages[callCount] ?? [];
        callCount++;
        return { data, error: null };
      },
      { pageSize: 2 },
    );
    expect(result).toEqual([{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    expect(callCount).toBe(3);
  });

  test('returns an empty array when the first page is empty', async () => {
    const result = await fetchAllPages(async () => ({ data: [], error: null }), { pageSize: 2 });
    expect(result).toEqual([]);
  });

  test('retries a failed page before succeeding', async () => {
    let attempts = 0;
    const result = await fetchAllPages(
      async () => {
        attempts++;
        if (attempts === 1) return { data: null, error: { message: 'network blip' } };
        return { data: [{ id: 1 }], error: null };
      },
      { pageSize: 10, maxRetriesPerPage: 2 },
    );
    expect(result).toEqual([{ id: 1 }]);
    expect(attempts).toBe(2);
  });

  test('throws after exhausting retries for a page', async () => {
    const fetchPage = async () => ({ data: null, error: { message: 'down' } });
    await expect(
      fetchAllPages(fetchPage, { pageSize: 10, maxRetriesPerPage: 1 }),
    ).rejects.toThrow('Failed to fetch page starting at 0 after 2 attempts: down');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/fetchPaginated.test.ts`
Expected: FAIL — `Cannot find module './fetchPaginated'`.

- [ ] **Step 3: Create `src/lib/fetchPaginated.ts`**

```typescript
export interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export type PageFetcher<T> = (from: number, to: number) => Promise<PageResult<T>>;

export interface FetchAllPagesOptions {
  pageSize?: number;
  maxRetriesPerPage?: number;
}

export async function fetchAllPages<T>(
  fetchPage: PageFetcher<T>,
  options: FetchAllPagesOptions = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? 1000;
  const maxRetriesPerPage = options.maxRetriesPerPage ?? 2;
  const results: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    let page: T[] | null = null;
    let lastErrorMessage: string | null = null;

    for (let attempt = 0; attempt <= maxRetriesPerPage; attempt++) {
      const { data, error } = await fetchPage(from, to);
      if (!error) {
        page = data ?? [];
        break;
      }
      lastErrorMessage = error.message;
    }

    if (page === null) {
      throw new Error(
        `Failed to fetch page starting at ${from} after ${maxRetriesPerPage + 1} attempts: ${lastErrorMessage}`,
      );
    }

    results.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return results;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/fetchPaginated.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/lib/fetchPaginated.ts src/lib/fetchPaginated.test.ts
git commit -m "Add generic paginated fetch with per-page retry"
```

---

### Task 4: Utilitários de data (timezone e filtro por período)

**Files:**
- Create: `src/lib/dateRange.ts`
- Create: `src/lib/dateRange.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `DateRange` (`{ start: Date; end: Date }`), `monthBucket(isoDate: string | null, timeZone?: string): string | null` (returns `"YYYY-MM"`), `isWithinRange(isoDate: string | null, range: DateRange): boolean`, `filterByDateRange<T>(rows: T[], range: DateRange, getDate: (row: T) => string | null): T[]`. Used by every tab (Tasks 12–15) and by `reworkTrend`/`deliveriesOverTime` (Tasks 8–9).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/dateRange.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import { monthBucket, isWithinRange, filterByDateRange } from './dateRange';
import type { DateRange } from './dateRange';

describe('monthBucket', () => {
  test('buckets a UTC timestamp into its America/Sao_Paulo month', () => {
    expect(monthBucket('2026-08-19T03:00:00+00:00')).toBe('2026-08');
  });

  test('returns null for a null date', () => {
    expect(monthBucket(null)).toBeNull();
  });
});

describe('isWithinRange', () => {
  const range: DateRange = {
    start: new Date('2026-08-01T00:00:00Z'),
    end: new Date('2026-08-31T23:59:59Z'),
  };

  test('returns true for a date inside the range', () => {
    expect(isWithinRange('2026-08-15T12:00:00Z', range)).toBe(true);
  });

  test('returns false for a date outside the range', () => {
    expect(isWithinRange('2026-09-01T00:00:00Z', range)).toBe(false);
  });

  test('returns false for a null date', () => {
    expect(isWithinRange(null, range)).toBe(false);
  });
});

describe('filterByDateRange', () => {
  test('keeps only rows whose accessor date falls in range', () => {
    const range: DateRange = {
      start: new Date('2026-08-01T00:00:00Z'),
      end: new Date('2026-08-31T23:59:59Z'),
    };
    const rows = [{ date: '2026-08-10T00:00:00Z' }, { date: '2026-09-10T00:00:00Z' }];
    expect(filterByDateRange(rows, range, (row) => row.date)).toEqual([
      { date: '2026-08-10T00:00:00Z' },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/dateRange.test.ts`
Expected: FAIL — `Cannot find module './dateRange'`.

- [ ] **Step 3: Create `src/lib/dateRange.ts`**

```typescript
export interface DateRange {
  start: Date;
  end: Date;
}

export function monthBucket(isoDate: string | null, timeZone = 'America/Sao_Paulo'): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  });
  return formatter.format(date);
}

export function isWithinRange(isoDate: string | null, range: DateRange): boolean {
  if (!isoDate) return false;
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return false;
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export function filterByDateRange<T>(
  rows: T[],
  range: DateRange,
  getDate: (row: T) => string | null,
): T[] {
  return rows.filter((row) => isWithinRange(getDate(row), range));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/dateRange.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/lib/dateRange.ts src/lib/dateRange.test.ts
git commit -m "Add timezone-aware date bucketing and range filtering"
```

---

### Task 5: Task facts e mapeamento de departamentos

**Files:**
- Create: `src/lib/taskFacts.ts`
- Create: `src/lib/taskFacts.test.ts`

**Interfaces:**
- Consumes: `TaskChangeRow` from `@/lib/types` (Task 2).
- Produces: `TaskFacts` (`{ taskId, taskNumber, taskCreationDate, taskClosingDate, requestTypeClassificationName, requestTypeName }`), `taskFactsByTaskId(rows: TaskChangeRow[]): Map<string, TaskFacts>`, `departmentsByKey(rows: TaskChangeRow[], keyFn: (row: TaskChangeRow) => string | null): Map<string, Set<string>>`. Consumed by Tasks 7, 8, 9, and the Execution Time / Rework / Deliveries tabs (13–15).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/taskFacts.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import { taskFactsByTaskId, departmentsByKey } from './taskFacts';
import type { TaskChangeRow } from './types';

function taskRow(overrides: Partial<TaskChangeRow>): TaskChangeRow {
  return {
    ClientDisplayName: 'Cinemark',
    ClientID: '82063',
    DateCalendar: '2026-08-19T03:00:00+00:00',
    FunctionGroupID: null,
    FunctionGroupName: 'Criação',
    GroupID: null,
    GroupName: null,
    JobID: null,
    JobNumber: null,
    Jobtitle: null,
    Month: 8,
    ParentTaskID: null,
    ParentTaskNumber: null,
    ParentTaskTitle: null,
    PipelineStepID: null,
    PipelineStepName: null,
    ProductID: null,
    ProductName: null,
    RequestFirstDueDate: null,
    RequestTypeClassificationID: null,
    RequestTypeClassificationName: 'Solicitação padrão',
    RequestTypeID: null,
    RequestTypeName: 'Peças',
    SpentHours: 1,
    TaskClosingDate: null,
    TaskCreationDate: '2026-08-01T00:00:00Z',
    TaskID: 'task-1',
    TaskNumber: '100',
    TaskTags: '',
    TaskTitle: 'Tarefa',
    UserFunctionID: null,
    UserFunctionTitle: null,
    UserID: null,
    UserLogin: 'Fulano',
    RowID: 1,
    ...overrides,
  };
}

describe('taskFactsByTaskId', () => {
  test('keeps one entry per TaskID', () => {
    const rows = [
      taskRow({ TaskID: 'task-1', RowID: 1, UserLogin: 'A' }),
      taskRow({ TaskID: 'task-1', RowID: 2, UserLogin: 'B' }),
      taskRow({ TaskID: 'task-2', RowID: 3 }),
    ];
    const facts = taskFactsByTaskId(rows);
    expect(facts.size).toBe(2);
    expect(facts.get('task-1')?.taskId).toBe('task-1');
  });

  test('skips rows without a TaskID', () => {
    const rows = [taskRow({ TaskID: null, RowID: 1 })];
    expect(taskFactsByTaskId(rows).size).toBe(0);
  });
});

describe('departmentsByKey', () => {
  test('collects every distinct department a task touched', () => {
    const rows = [
      taskRow({ TaskID: 'task-1', FunctionGroupName: 'Atendimento' }),
      taskRow({ TaskID: 'task-1', FunctionGroupName: 'Conteúdo' }),
      taskRow({ TaskID: 'task-2', FunctionGroupName: 'Criação' }),
    ];
    const result = departmentsByKey(rows, (row) => row.TaskID);
    expect(result.get('task-1')).toEqual(new Set(['Atendimento', 'Conteúdo']));
    expect(result.get('task-2')).toEqual(new Set(['Criação']));
  });

  test('skips rows where the key function returns null', () => {
    const rows = [taskRow({ TaskNumber: null })];
    const result = departmentsByKey(rows, (row) => row.TaskNumber);
    expect(result.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/taskFacts.test.ts`
Expected: FAIL — `Cannot find module './taskFacts'`.

- [ ] **Step 3: Create `src/lib/taskFacts.ts`**

```typescript
import type { TaskChangeRow } from './types';

export interface TaskFacts {
  taskId: string;
  taskNumber: string | null;
  taskCreationDate: string | null;
  taskClosingDate: string | null;
  requestTypeClassificationName: string | null;
  requestTypeName: string | null;
}

export function taskFactsByTaskId(rows: TaskChangeRow[]): Map<string, TaskFacts> {
  const facts = new Map<string, TaskFacts>();
  for (const row of rows) {
    if (!row.TaskID || facts.has(row.TaskID)) continue;
    facts.set(row.TaskID, {
      taskId: row.TaskID,
      taskNumber: row.TaskNumber,
      taskCreationDate: row.TaskCreationDate,
      taskClosingDate: row.TaskClosingDate,
      requestTypeClassificationName: row.RequestTypeClassificationName,
      requestTypeName: row.RequestTypeName,
    });
  }
  return facts;
}

export function departmentsByKey(
  rows: TaskChangeRow[],
  keyFn: (row: TaskChangeRow) => string | null,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const department = row.FunctionGroupName ?? 'Não informado';
    const set = map.get(key) ?? new Set<string>();
    set.add(department);
    map.set(key, set);
  }
  return map;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/taskFacts.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/lib/taskFacts.ts src/lib/taskFacts.test.ts
git commit -m "Add task-level dedup and department mapping"
```

---

### Task 6: Métricas de horas por pessoa

**Files:**
- Create: `src/lib/hoursMetrics.ts`
- Create: `src/lib/hoursMetrics.test.ts`

**Interfaces:**
- Consumes: `TaskChangeRow` from `@/lib/types` (Task 2).
- Produces: `PersonHours` (`{ userLogin, totalHours }`), `hoursByPerson(rows: TaskChangeRow[]): PersonHours[]`, `PersonDepartmentHours` (`{ userLogin, department, totalHours }`), `hoursByPersonAndDepartment(rows: TaskChangeRow[]): PersonDepartmentHours[]`. Consumed by the Hours tab (Task 12).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/hoursMetrics.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import { hoursByPerson, hoursByPersonAndDepartment } from './hoursMetrics';
import type { TaskChangeRow } from './types';

function entry(overrides: Partial<TaskChangeRow>): TaskChangeRow {
  return {
    ClientDisplayName: 'Cinemark',
    ClientID: '82063',
    DateCalendar: '2026-08-19T03:00:00+00:00',
    FunctionGroupID: null,
    FunctionGroupName: 'Criação',
    GroupID: null,
    GroupName: null,
    JobID: null,
    JobNumber: null,
    Jobtitle: null,
    Month: 8,
    ParentTaskID: null,
    ParentTaskNumber: null,
    ParentTaskTitle: null,
    PipelineStepID: null,
    PipelineStepName: null,
    ProductID: null,
    ProductName: null,
    RequestFirstDueDate: null,
    RequestTypeClassificationID: null,
    RequestTypeClassificationName: 'Solicitação padrão',
    RequestTypeID: null,
    RequestTypeName: 'Peças',
    SpentHours: 1,
    TaskClosingDate: null,
    TaskCreationDate: '2026-08-01T00:00:00Z',
    TaskID: 'task-1',
    TaskNumber: '100',
    TaskTags: '',
    TaskTitle: 'Tarefa',
    UserFunctionID: null,
    UserFunctionTitle: null,
    UserID: null,
    UserLogin: 'Fulano',
    RowID: 1,
    ...overrides,
  };
}

describe('hoursByPerson', () => {
  test('sums SpentHours per UserLogin across multiple rows', () => {
    const rows = [
      entry({ UserLogin: 'Ana', SpentHours: 2 }),
      entry({ UserLogin: 'Ana', SpentHours: 3 }),
      entry({ UserLogin: 'Bruno', SpentHours: 1 }),
    ];
    expect(hoursByPerson(rows)).toEqual([
      { userLogin: 'Ana', totalHours: 5 },
      { userLogin: 'Bruno', totalHours: 1 },
    ]);
  });

  test('groups missing UserLogin under Não informado', () => {
    const rows = [entry({ UserLogin: null, SpentHours: 2 })];
    expect(hoursByPerson(rows)).toEqual([{ userLogin: 'Não informado', totalHours: 2 }]);
  });

  test('treats missing SpentHours as zero', () => {
    const rows = [entry({ UserLogin: 'Ana', SpentHours: null })];
    expect(hoursByPerson(rows)).toEqual([{ userLogin: 'Ana', totalHours: 0 }]);
  });
});

describe('hoursByPersonAndDepartment', () => {
  test('sums hours per person within each department', () => {
    const rows = [
      entry({ UserLogin: 'Ana', FunctionGroupName: 'Criação', SpentHours: 2 }),
      entry({ UserLogin: 'Ana', FunctionGroupName: 'Mídia', SpentHours: 1 }),
      entry({ UserLogin: 'Ana', FunctionGroupName: 'Criação', SpentHours: 3 }),
    ];
    const result = hoursByPersonAndDepartment(rows);
    expect(result).toContainEqual({ userLogin: 'Ana', department: 'Criação', totalHours: 5 });
    expect(result).toContainEqual({ userLogin: 'Ana', department: 'Mídia', totalHours: 1 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/hoursMetrics.test.ts`
Expected: FAIL — `Cannot find module './hoursMetrics'`.

- [ ] **Step 3: Create `src/lib/hoursMetrics.ts`**

```typescript
import type { TaskChangeRow } from './types';

export interface PersonHours {
  userLogin: string;
  totalHours: number;
}

export function hoursByPerson(rows: TaskChangeRow[]): PersonHours[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const userLogin = row.UserLogin ?? 'Não informado';
    const hours = row.SpentHours ?? 0;
    totals.set(userLogin, (totals.get(userLogin) ?? 0) + hours);
  }
  return Array.from(totals.entries())
    .map(([userLogin, totalHours]) => ({ userLogin, totalHours }))
    .sort((a, b) => b.totalHours - a.totalHours);
}

export interface PersonDepartmentHours {
  userLogin: string;
  department: string;
  totalHours: number;
}

export function hoursByPersonAndDepartment(rows: TaskChangeRow[]): PersonDepartmentHours[] {
  const totals = new Map<string, PersonDepartmentHours>();
  for (const row of rows) {
    const userLogin = row.UserLogin ?? 'Não informado';
    const department = row.FunctionGroupName ?? 'Não informado';
    const key = `${userLogin}::${department}`;
    const hours = row.SpentHours ?? 0;
    const existing = totals.get(key);
    if (existing) {
      existing.totalHours += hours;
    } else {
      totals.set(key, { userLogin, department, totalHours: hours });
    }
  }
  return Array.from(totals.values()).sort((a, b) => b.totalHours - a.totalHours);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/hoursMetrics.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/lib/hoursMetrics.ts src/lib/hoursMetrics.test.ts
git commit -m "Add hours-by-person and hours-by-person-and-department metrics"
```

---

### Task 7: Métricas de tempo médio de execução

**Files:**
- Create: `src/lib/executionTime.ts`
- Create: `src/lib/executionTime.test.ts`

**Interfaces:**
- Consumes: `TaskFacts` from `@/lib/taskFacts` (Task 5).
- Produces: `executionTimeInHours(fact: Pick<TaskFacts, 'taskCreationDate' | 'taskClosingDate'>): number | null`, `ExecutionTimeStats` (`{ averageHours, taskCount }`), `averageExecutionTime(facts: TaskFacts[]): ExecutionTimeStats`, `DepartmentExecutionTime` (`{ department, averageHours, taskCount }`), `executionTimeByDepartment(facts: Map<string, TaskFacts>, departments: Map<string, Set<string>>): DepartmentExecutionTime[]`, `RequestTypeExecutionTime` (`{ requestTypeName, averageHours, taskCount }`), `executionTimeByRequestType(facts: Map<string, TaskFacts>): RequestTypeExecutionTime[]`. Consumed by the Execution Time tab (Task 14).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/executionTime.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import {
  executionTimeInHours,
  averageExecutionTime,
  executionTimeByDepartment,
  executionTimeByRequestType,
} from './executionTime';
import type { TaskFacts } from './taskFacts';

function fact(overrides: Partial<TaskFacts>): TaskFacts {
  return {
    taskId: 'task-1',
    taskNumber: '100',
    taskCreationDate: '2026-08-01T00:00:00Z',
    taskClosingDate: '2026-08-02T00:00:00Z',
    requestTypeClassificationName: 'Solicitação padrão',
    requestTypeName: 'Peças',
    ...overrides,
  };
}

describe('executionTimeInHours', () => {
  test('computes hours between creation and closing', () => {
    expect(executionTimeInHours(fact({}))).toBe(24);
  });

  test('returns null when not closed', () => {
    expect(executionTimeInHours(fact({ taskClosingDate: null }))).toBeNull();
  });

  test('returns null when closing precedes creation', () => {
    expect(
      executionTimeInHours(
        fact({ taskCreationDate: '2026-08-02T00:00:00Z', taskClosingDate: '2026-08-01T00:00:00Z' }),
      ),
    ).toBeNull();
  });
});

describe('averageExecutionTime', () => {
  test('averages only closed tasks', () => {
    const facts = [fact({ taskId: 'a' }), fact({ taskId: 'b', taskClosingDate: null })];
    expect(averageExecutionTime(facts)).toEqual({ averageHours: 24, taskCount: 1 });
  });

  test('returns zero stats when nothing is closed', () => {
    expect(averageExecutionTime([fact({ taskClosingDate: null })])).toEqual({
      averageHours: 0,
      taskCount: 0,
    });
  });
});

describe('executionTimeByDepartment', () => {
  test('counts a task in every department it touched', () => {
    const facts = new Map([['task-1', fact({ taskId: 'task-1' })]]);
    const departments = new Map([['task-1', new Set(['Atendimento', 'Conteúdo'])]]);
    const result = executionTimeByDepartment(facts, departments);
    expect(result).toContainEqual({ department: 'Atendimento', averageHours: 24, taskCount: 1 });
    expect(result).toContainEqual({ department: 'Conteúdo', averageHours: 24, taskCount: 1 });
  });
});

describe('executionTimeByRequestType', () => {
  test('averages by requestTypeName', () => {
    const facts = new Map([
      ['a', fact({ taskId: 'a', requestTypeName: 'Peças' })],
      [
        'b',
        fact({ taskId: 'b', requestTypeName: 'Peças', taskClosingDate: '2026-08-03T00:00:00Z' }),
      ],
    ]);
    expect(executionTimeByRequestType(facts)).toEqual([
      { requestTypeName: 'Peças', averageHours: 36, taskCount: 2 },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/executionTime.test.ts`
Expected: FAIL — `Cannot find module './executionTime'`.

- [ ] **Step 3: Create `src/lib/executionTime.ts`**

```typescript
import type { TaskFacts } from './taskFacts';

export function executionTimeInHours(
  fact: Pick<TaskFacts, 'taskCreationDate' | 'taskClosingDate'>,
): number | null {
  if (!fact.taskCreationDate || !fact.taskClosingDate) return null;
  const created = new Date(fact.taskCreationDate).getTime();
  const closed = new Date(fact.taskClosingDate).getTime();
  if (Number.isNaN(created) || Number.isNaN(closed) || closed < created) return null;
  return (closed - created) / (1000 * 60 * 60);
}

export interface ExecutionTimeStats {
  averageHours: number;
  taskCount: number;
}

export function averageExecutionTime(facts: TaskFacts[]): ExecutionTimeStats {
  const durations = facts
    .map(executionTimeInHours)
    .filter((hours): hours is number => hours !== null);
  if (durations.length === 0) return { averageHours: 0, taskCount: 0 };
  const total = durations.reduce((sum, hours) => sum + hours, 0);
  return { averageHours: total / durations.length, taskCount: durations.length };
}

export interface DepartmentExecutionTime {
  department: string;
  averageHours: number;
  taskCount: number;
}

export function executionTimeByDepartment(
  facts: Map<string, TaskFacts>,
  departments: Map<string, Set<string>>,
): DepartmentExecutionTime[] {
  const durationsByDepartment = new Map<string, number[]>();
  for (const [taskId, fact] of facts) {
    const duration = executionTimeInHours(fact);
    if (duration === null) continue;
    const depts = departments.get(taskId) ?? new Set<string>(['Não informado']);
    for (const department of depts) {
      const list = durationsByDepartment.get(department) ?? [];
      list.push(duration);
      durationsByDepartment.set(department, list);
    }
  }
  return Array.from(durationsByDepartment.entries())
    .map(([department, durations]) => ({
      department,
      averageHours: durations.reduce((sum, h) => sum + h, 0) / durations.length,
      taskCount: durations.length,
    }))
    .sort((a, b) => b.averageHours - a.averageHours);
}

export interface RequestTypeExecutionTime {
  requestTypeName: string;
  averageHours: number;
  taskCount: number;
}

export function executionTimeByRequestType(
  facts: Map<string, TaskFacts>,
): RequestTypeExecutionTime[] {
  const durationsByType = new Map<string, number[]>();
  for (const fact of facts.values()) {
    const duration = executionTimeInHours(fact);
    if (duration === null) continue;
    const requestTypeName = fact.requestTypeName ?? 'Não informado';
    const list = durationsByType.get(requestTypeName) ?? [];
    list.push(duration);
    durationsByType.set(requestTypeName, list);
  }
  return Array.from(durationsByType.entries())
    .map(([requestTypeName, durations]) => ({
      requestTypeName,
      averageHours: durations.reduce((sum, h) => sum + h, 0) / durations.length,
      taskCount: durations.length,
    }))
    .sort((a, b) => b.averageHours - a.averageHours);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/executionTime.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/lib/executionTime.ts src/lib/executionTime.test.ts
git commit -m "Add execution-time metrics by department and request type"
```

---

### Task 8: Métricas de refação

**Files:**
- Create: `src/lib/reworkMetrics.ts`
- Create: `src/lib/reworkMetrics.test.ts`

**Interfaces:**
- Consumes: `TaskFacts` from `@/lib/taskFacts` (Task 5), `monthBucket` from `@/lib/dateRange` (Task 4).
- Produces: `ReworkClassification` (`'external' | 'internal' | 'standard'`), `classifyRework(classificationName: string | null): ReworkClassification`, `ReworkSummary` (`{ totalTasks, externalCount, internalCount, standardCount, externalPct, internalPct }`), `reworkSummary(facts: TaskFacts[]): ReworkSummary`, `DepartmentReworkSummary` (`{ department, totalTasks, externalCount, internalCount, externalPct, internalPct }`), `reworkByDepartment(facts: Map<string, TaskFacts>, departments: Map<string, Set<string>>): DepartmentReworkSummary[]`, `MonthlyReworkTrend` (`{ month, externalCount, internalCount, standardCount }`), `reworkTrend(facts: TaskFacts[]): MonthlyReworkTrend[]`. Consumed by the Rework tab (Task 15).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/reworkMetrics.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import { classifyRework, reworkSummary, reworkByDepartment, reworkTrend } from './reworkMetrics';
import type { TaskFacts } from './taskFacts';

function fact(overrides: Partial<TaskFacts>): TaskFacts {
  return {
    taskId: 'task-1',
    taskNumber: '100',
    taskCreationDate: '2026-08-01T00:00:00Z',
    taskClosingDate: null,
    requestTypeClassificationName: 'Solicitação padrão',
    requestTypeName: 'Peças',
    ...overrides,
  };
}

describe('classifyRework', () => {
  test('classifies known classification names', () => {
    expect(classifyRework('Ajuste externo')).toBe('external');
    expect(classifyRework('Ajuste interno')).toBe('internal');
    expect(classifyRework('Solicitação padrão')).toBe('standard');
  });

  test('treats unknown or missing classification as standard', () => {
    expect(classifyRework(null)).toBe('standard');
    expect(classifyRework('Algo novo')).toBe('standard');
  });
});

describe('reworkSummary', () => {
  test('computes counts and percentages', () => {
    const facts = [
      fact({ requestTypeClassificationName: 'Ajuste externo' }),
      fact({ requestTypeClassificationName: 'Ajuste interno' }),
      fact({ requestTypeClassificationName: 'Solicitação padrão' }),
      fact({ requestTypeClassificationName: 'Solicitação padrão' }),
    ];
    expect(reworkSummary(facts)).toEqual({
      totalTasks: 4,
      externalCount: 1,
      internalCount: 1,
      standardCount: 2,
      externalPct: 25,
      internalPct: 25,
    });
  });

  test('returns zero percentages for an empty list', () => {
    expect(reworkSummary([])).toEqual({
      totalTasks: 0,
      externalCount: 0,
      internalCount: 0,
      standardCount: 0,
      externalPct: 0,
      internalPct: 0,
    });
  });
});

describe('reworkByDepartment', () => {
  test('counts a task in every department it touched', () => {
    const facts = new Map([
      ['task-1', fact({ taskId: 'task-1', requestTypeClassificationName: 'Ajuste externo' })],
    ]);
    const departments = new Map([['task-1', new Set(['Atendimento', 'Conteúdo'])]]);
    const result = reworkByDepartment(facts, departments);
    const atendimento = result.find((r) => r.department === 'Atendimento');
    const conteudo = result.find((r) => r.department === 'Conteúdo');
    expect(atendimento?.externalCount).toBe(1);
    expect(atendimento?.totalTasks).toBe(1);
    expect(conteudo?.externalCount).toBe(1);
  });
});

describe('reworkTrend', () => {
  test('buckets tasks by creation month', () => {
    const facts = [
      fact({ taskCreationDate: '2026-08-05T00:00:00Z', requestTypeClassificationName: 'Ajuste externo' }),
      fact({ taskCreationDate: '2026-08-20T00:00:00Z', requestTypeClassificationName: 'Ajuste interno' }),
      fact({ taskCreationDate: '2026-09-01T00:00:00Z', requestTypeClassificationName: 'Solicitação padrão' }),
    ];
    expect(reworkTrend(facts)).toEqual([
      { month: '2026-08', externalCount: 1, internalCount: 1, standardCount: 0 },
      { month: '2026-09', externalCount: 0, internalCount: 0, standardCount: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/reworkMetrics.test.ts`
Expected: FAIL — `Cannot find module './reworkMetrics'`.

- [ ] **Step 3: Create `src/lib/reworkMetrics.ts`**

```typescript
import type { TaskFacts } from './taskFacts';
import { monthBucket } from './dateRange';

export type ReworkClassification = 'external' | 'internal' | 'standard';

export function classifyRework(classificationName: string | null): ReworkClassification {
  if (classificationName === 'Ajuste externo') return 'external';
  if (classificationName === 'Ajuste interno') return 'internal';
  return 'standard';
}

export interface ReworkSummary {
  totalTasks: number;
  externalCount: number;
  internalCount: number;
  standardCount: number;
  externalPct: number;
  internalPct: number;
}

export function reworkSummary(facts: TaskFacts[]): ReworkSummary {
  let externalCount = 0;
  let internalCount = 0;
  let standardCount = 0;
  for (const fact of facts) {
    const classification = classifyRework(fact.requestTypeClassificationName);
    if (classification === 'external') externalCount++;
    else if (classification === 'internal') internalCount++;
    else standardCount++;
  }
  const totalTasks = facts.length;
  return {
    totalTasks,
    externalCount,
    internalCount,
    standardCount,
    externalPct: totalTasks === 0 ? 0 : (externalCount / totalTasks) * 100,
    internalPct: totalTasks === 0 ? 0 : (internalCount / totalTasks) * 100,
  };
}

export interface DepartmentReworkSummary {
  department: string;
  totalTasks: number;
  externalCount: number;
  internalCount: number;
  externalPct: number;
  internalPct: number;
}

export function reworkByDepartment(
  facts: Map<string, TaskFacts>,
  departments: Map<string, Set<string>>,
): DepartmentReworkSummary[] {
  const byDepartment = new Map<string, TaskFacts[]>();
  for (const [taskId, fact] of facts) {
    const depts = departments.get(taskId) ?? new Set<string>(['Não informado']);
    for (const department of depts) {
      const list = byDepartment.get(department) ?? [];
      list.push(fact);
      byDepartment.set(department, list);
    }
  }
  return Array.from(byDepartment.entries())
    .map(([department, deptFacts]) => {
      const { totalTasks, externalCount, internalCount, externalPct, internalPct } = reworkSummary(deptFacts);
      return { department, totalTasks, externalCount, internalCount, externalPct, internalPct };
    })
    .sort((a, b) => b.totalTasks - a.totalTasks);
}

export interface MonthlyReworkTrend {
  month: string;
  externalCount: number;
  internalCount: number;
  standardCount: number;
}

export function reworkTrend(facts: TaskFacts[]): MonthlyReworkTrend[] {
  const byMonth = new Map<string, MonthlyReworkTrend>();
  for (const fact of facts) {
    const month = monthBucket(fact.taskCreationDate);
    if (!month) continue;
    const entry = byMonth.get(month) ?? { month, externalCount: 0, internalCount: 0, standardCount: 0 };
    const classification = classifyRework(fact.requestTypeClassificationName);
    if (classification === 'external') entry.externalCount++;
    else if (classification === 'internal') entry.internalCount++;
    else entry.standardCount++;
    byMonth.set(month, entry);
  }
  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/reworkMetrics.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/lib/reworkMetrics.ts src/lib/reworkMetrics.test.ts
git commit -m "Add rework classification and department/trend metrics"
```

---

### Task 9: Métricas de entregas

**Files:**
- Create: `src/lib/deliveryMetrics.ts`
- Create: `src/lib/deliveryMetrics.test.ts`

**Interfaces:**
- Consumes: `DeliveryRow` from `@/lib/types` (Task 2), `monthBucket` from `@/lib/dateRange` (Task 4).
- Produces: `DeliveryTypeTotal` (`{ requestTypeName, totalQuantity }`), `deliveriesByType(rows: DeliveryRow[]): DeliveryTypeTotal[]`, `EffortGroupTotal` (`{ effortUnitGroupName, totalQuantity }`), `deliveriesByEffortGroup(rows: DeliveryRow[]): EffortGroupTotal[]`, `MonthlyDeliveryTotal` (`{ month, totalQuantity }`), `deliveriesOverTime(rows: DeliveryRow[]): MonthlyDeliveryTotal[]`, `DepartmentDeliveryTotal` (`{ department, totalQuantity }`), `deliveriesByDepartment(rows: DeliveryRow[], departmentsByTaskNumber: Map<string, Set<string>>): DepartmentDeliveryTotal[]`. Consumed by the Deliveries tab (Task 13), which builds `departmentsByTaskNumber` via `departmentsByKey(taskRows, r => r.TaskNumber)` (Task 5).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/deliveryMetrics.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import {
  deliveriesByType,
  deliveriesByEffortGroup,
  deliveriesOverTime,
  deliveriesByDepartment,
} from './deliveryMetrics';
import type { DeliveryRow } from './types';

function delivery(overrides: Partial<DeliveryRow>): DeliveryRow {
  return {
    ClientDisplayName: 'Cinemark',
    CreationDate: '2026-08-05T00:00:00Z',
    EffortUnitGroupName: 'RTVC',
    EffortUnitGroupTypeName: 'Tipo padrão',
    JobTitle: 'Job',
    Quantity: 1,
    RequestTypeName: 'GERAL',
    TaskNumber: 100,
    TaskTitle: 'Tarefa',
    UnitName: 'Post estático',
    RequestDeliveryID: 1,
    ...overrides,
  };
}

describe('deliveriesByType', () => {
  test('sums quantity per RequestTypeName', () => {
    const rows = [
      delivery({ RequestTypeName: 'GERAL', Quantity: 2 }),
      delivery({ RequestTypeName: 'GERAL', Quantity: 3 }),
      delivery({ RequestTypeName: 'MOTION', Quantity: 1 }),
    ];
    expect(deliveriesByType(rows)).toEqual([
      { requestTypeName: 'GERAL', totalQuantity: 5 },
      { requestTypeName: 'MOTION', totalQuantity: 1 },
    ]);
  });
});

describe('deliveriesByEffortGroup', () => {
  test('sums quantity per EffortUnitGroupName', () => {
    const rows = [
      delivery({ EffortUnitGroupName: 'RTVC', Quantity: 2 }),
      delivery({ EffortUnitGroupName: 'Campanha', Quantity: 4 }),
    ];
    expect(deliveriesByEffortGroup(rows)).toEqual([
      { effortUnitGroupName: 'Campanha', totalQuantity: 4 },
      { effortUnitGroupName: 'RTVC', totalQuantity: 2 },
    ]);
  });
});

describe('deliveriesOverTime', () => {
  test('buckets quantity by creation month', () => {
    const rows = [
      delivery({ CreationDate: '2026-08-05T00:00:00Z', Quantity: 2 }),
      delivery({ CreationDate: '2026-08-20T00:00:00Z', Quantity: 3 }),
      delivery({ CreationDate: '2026-09-01T00:00:00Z', Quantity: 1 }),
    ];
    expect(deliveriesOverTime(rows)).toEqual([
      { month: '2026-08', totalQuantity: 5 },
      { month: '2026-09', totalQuantity: 1 },
    ]);
  });
});

describe('deliveriesByDepartment', () => {
  test('attributes a delivery to every department its task touched', () => {
    const rows = [delivery({ TaskNumber: 100, Quantity: 2 })];
    const departmentsByTaskNumber = new Map([['100', new Set(['Atendimento', 'Conteúdo'])]]);
    const result = deliveriesByDepartment(rows, departmentsByTaskNumber);
    expect(result).toContainEqual({ department: 'Atendimento', totalQuantity: 2 });
    expect(result).toContainEqual({ department: 'Conteúdo', totalQuantity: 2 });
  });

  test('falls back to Não informado when the task is not found', () => {
    const rows = [delivery({ TaskNumber: 999, Quantity: 1 })];
    const result = deliveriesByDepartment(rows, new Map());
    expect(result).toEqual([{ department: 'Não informado', totalQuantity: 1 }]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/deliveryMetrics.test.ts`
Expected: FAIL — `Cannot find module './deliveryMetrics'`.

- [ ] **Step 3: Create `src/lib/deliveryMetrics.ts`**

```typescript
import type { DeliveryRow } from './types';
import { monthBucket } from './dateRange';

export interface DeliveryTypeTotal {
  requestTypeName: string;
  totalQuantity: number;
}

export function deliveriesByType(rows: DeliveryRow[]): DeliveryTypeTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const requestTypeName = row.RequestTypeName ?? 'Não informado';
    const quantity = row.Quantity ?? 0;
    totals.set(requestTypeName, (totals.get(requestTypeName) ?? 0) + quantity);
  }
  return Array.from(totals.entries())
    .map(([requestTypeName, totalQuantity]) => ({ requestTypeName, totalQuantity }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}

export interface EffortGroupTotal {
  effortUnitGroupName: string;
  totalQuantity: number;
}

export function deliveriesByEffortGroup(rows: DeliveryRow[]): EffortGroupTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const group = row.EffortUnitGroupName ?? 'Não informado';
    const quantity = row.Quantity ?? 0;
    totals.set(group, (totals.get(group) ?? 0) + quantity);
  }
  return Array.from(totals.entries())
    .map(([effortUnitGroupName, totalQuantity]) => ({ effortUnitGroupName, totalQuantity }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}

export interface MonthlyDeliveryTotal {
  month: string;
  totalQuantity: number;
}

export function deliveriesOverTime(rows: DeliveryRow[]): MonthlyDeliveryTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const month = monthBucket(row.CreationDate);
    if (!month) continue;
    const quantity = row.Quantity ?? 0;
    totals.set(month, (totals.get(month) ?? 0) + quantity);
  }
  return Array.from(totals.entries())
    .map(([month, totalQuantity]) => ({ month, totalQuantity }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface DepartmentDeliveryTotal {
  department: string;
  totalQuantity: number;
}

export function deliveriesByDepartment(
  rows: DeliveryRow[],
  departmentsByTaskNumber: Map<string, Set<string>>,
): DepartmentDeliveryTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.TaskNumber === null) continue;
    const departments =
      departmentsByTaskNumber.get(String(row.TaskNumber)) ?? new Set<string>(['Não informado']);
    const quantity = row.Quantity ?? 0;
    for (const department of departments) {
      totals.set(department, (totals.get(department) ?? 0) + quantity);
    }
  }
  return Array.from(totals.entries())
    .map(([department, totalQuantity]) => ({ department, totalQuantity }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/user/antigravity/cinemark && bun test src/lib/deliveryMetrics.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/lib/deliveryMetrics.ts src/lib/deliveryMetrics.test.ts
git commit -m "Add delivery volume, trend, and department attribution metrics"
```

---

### Task 10: Hooks de dados (React Query)

**Files:**
- Create: `src/hooks/useTaskRows.ts`
- Create: `src/hooks/useDeliveryRows.ts`

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabase` (Task 2), `fetchAllPages` from `@/lib/fetchPaginated` (Task 3), `TaskChangeRow`/`DeliveryRow` from `@/lib/types` (Task 2).
- Produces: `useTaskRows(): UseQueryResult<TaskChangeRow[], Error>`, `useDeliveryRows(): UseQueryResult<DeliveryRow[], Error>`. Consumed by every tab (Tasks 12–15) and the App shell (Task 16).

- [ ] **Step 1: Create `src/hooks/useTaskRows.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchAllPages } from '@/lib/fetchPaginated';
import type { TaskChangeRow } from '@/lib/types';

async function fetchTaskRows(): Promise<TaskChangeRow[]> {
  return fetchAllPages<TaskChangeRow>((from, to) =>
    supabase
      .from('requesttypechange')
      .select('*')
      .eq('ClientDisplayName', 'Cinemark')
      .range(from, to),
  );
}

export function useTaskRows() {
  return useQuery({
    queryKey: ['cinemark', 'requesttypechange'],
    queryFn: fetchTaskRows,
    staleTime: 1000 * 60 * 60 * 4,
  });
}
```

- [ ] **Step 2: Create `src/hooks/useDeliveryRows.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchAllPages } from '@/lib/fetchPaginated';
import type { DeliveryRow } from '@/lib/types';

async function fetchDeliveryRows(): Promise<DeliveryRow[]> {
  return fetchAllPages<DeliveryRow>((from, to) =>
    supabase
      .from('requestdelivery')
      .select('*')
      .eq('ClientDisplayName', 'Cinemark')
      .range(from, to),
  );
}

export function useDeliveryRows() {
  return useQuery({
    queryKey: ['cinemark', 'requestdelivery'],
    queryFn: fetchDeliveryRows,
    staleTime: 1000 * 60 * 60 * 4,
  });
}
```

- [ ] **Step 3: Verify the build passes**

Run: `cd /Users/user/antigravity/cinemark && bun run build`
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/hooks/useTaskRows.ts src/hooks/useDeliveryRows.ts
git commit -m "Add React Query hooks for Cinemark task and delivery rows"
```

---

### Task 11: Contexto de filtros globais e componentes base

**Files:**
- Create: `src/context/FiltersContext.tsx`
- Create: `src/components/FilterBar.tsx`
- Create: `src/components/KpiCard.tsx`
- Create: `src/components/DataState.tsx`

**Interfaces:**
- Consumes: `DateRange` from `@/lib/dateRange` (Task 4).
- Produces: `FiltersState` (`{ dateRange: DateRange; department: string | null }`), `FiltersProvider({ children }): JSX.Element`, `useFilters(): { filters: FiltersState; setDateRange: (range: DateRange) => void; setDepartment: (department: string | null) => void }`, `<FilterBar />`, `<KpiCard label value />`, `<DataState isLoading error onRetry>{children}</DataState>`. Consumed by every tab (Tasks 12–15) and the App shell (Task 16).

- [ ] **Step 1: Create `src/context/FiltersContext.tsx`**

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DateRange } from '@/lib/dateRange';

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function endOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

export interface FiltersState {
  dateRange: DateRange;
  department: string | null;
}

interface FiltersContextValue {
  filters: FiltersState;
  setDateRange: (range: DateRange) => void;
  setDepartment: (department: string | null) => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfCurrentMonth(),
    end: endOfToday(),
  });
  const [department, setDepartment] = useState<string | null>(null);

  const value = useMemo<FiltersContextValue>(
    () => ({ filters: { dateRange, department }, setDateRange, setDepartment }),
    [dateRange, department],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersContextValue {
  const context = useContext(FiltersContext);
  if (!context) throw new Error('useFilters must be used within a FiltersProvider');
  return context;
}
```

- [ ] **Step 2: Create `src/components/FilterBar.tsx`**

```tsx
import { useFilters } from '@/context/FiltersContext';

const DEPARTMENTS = [
  'Atendimento',
  'Conteúdo',
  'Criação',
  'Finalização',
  'Mídia',
  'Planejamento',
  'Produção Gráfica',
  'RTVC',
];

function toInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function FilterBar() {
  const { filters, setDateRange, setDepartment } = useFilters();

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border bg-card px-6 py-4">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        De
        <input
          type="date"
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          value={toInputValue(filters.dateRange.start)}
          onChange={(event) => {
            const start = new Date(event.target.value);
            setDateRange({ ...filters.dateRange, start });
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Até
        <input
          type="date"
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          value={toInputValue(filters.dateRange.end)}
          onChange={(event) => {
            const end = new Date(event.target.value);
            setDateRange({ ...filters.dateRange, end });
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Departamento
        <select
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          value={filters.department ?? ''}
          onChange={(event) => setDepartment(event.target.value || null)}
        >
          <option value="">Todos</option>
          {DEPARTMENTS.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/KpiCard.tsx`**

```tsx
interface KpiCardProps {
  label: string;
  value: string;
}

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="glass-card px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/DataState.tsx`**

```tsx
import type { ReactNode } from 'react';

interface DataStateProps {
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  children: ReactNode;
}

export function DataState({ isLoading, error, onRetry, children }: DataStateProps) {
  if (isLoading) {
    return <p className="px-6 py-8 text-muted-foreground">Carregando dados...</p>;
  }
  if (error) {
    return (
      <div className="px-6 py-8 text-destructive">
        <p>Não foi possível carregar os dados: {error.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
```

- [ ] **Step 5: Verify the build passes**

Run: `cd /Users/user/antigravity/cinemark && bun run build`
Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/context/FiltersContext.tsx src/components/FilterBar.tsx src/components/KpiCard.tsx src/components/DataState.tsx
git commit -m "Add global filters context and shared KPI/error-state components"
```

---

### Task 12: Aba A — Equipe & Horas

**Files:**
- Create: `src/pages/HoursTab.tsx`

**Interfaces:**
- Consumes: `useTaskRows` (Task 10), `useFilters` (Task 11), `filterByDateRange` (Task 4), `hoursByPerson`/`hoursByPersonAndDepartment` (Task 6), `KpiCard`/`DataState` (Task 11).
- Produces: `<HoursTab />`. Consumed by the App shell (Task 16).

- [ ] **Step 1: Create `src/pages/HoursTab.tsx`**

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTaskRows } from '@/hooks/useTaskRows';
import { useFilters } from '@/context/FiltersContext';
import { filterByDateRange } from '@/lib/dateRange';
import { hoursByPerson, hoursByPersonAndDepartment } from '@/lib/hoursMetrics';
import { KpiCard } from '@/components/KpiCard';
import { DataState } from '@/components/DataState';

export function HoursTab() {
  const { data, isLoading, error, refetch } = useTaskRows();
  const { filters } = useFilters();

  const rows = data ?? [];
  const inRange = filterByDateRange(rows, filters.dateRange, (row) => row.DateCalendar);
  const scoped = filters.department
    ? inRange.filter((row) => (row.FunctionGroupName ?? 'Não informado') === filters.department)
    : inRange;

  const byPerson = hoursByPerson(scoped);
  const byPersonAndDepartment = hoursByPersonAndDepartment(scoped);
  const totalHours = byPerson.reduce((sum, person) => sum + person.totalHours, 0);
  const top15 = byPerson.slice(0, 15);

  return (
    <DataState isLoading={isLoading} error={error} onRetry={refetch}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <KpiCard label="Total de horas" value={totalHours.toFixed(1)} />
          <KpiCard label="Pessoas ativas" value={String(byPerson.length)} />
        </div>
        <div className="glass-card p-4" style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top15} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="userLogin" width={160} />
              <Tooltip />
              <Bar dataKey="totalHours" fill="hsl(244 94% 69%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-2 pr-4">Pessoa</th>
                <th className="py-2 pr-4">Departamento</th>
                <th className="py-2 pr-4">Horas</th>
              </tr>
            </thead>
            <tbody>
              {byPersonAndDepartment.map((row) => (
                <tr key={`${row.userLogin}-${row.department}`} className="border-t border-border">
                  <td className="py-2 pr-4 text-foreground">{row.userLogin}</td>
                  <td className="py-2 pr-4 text-foreground">{row.department}</td>
                  <td className="py-2 pr-4 text-foreground">{row.totalHours.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DataState>
  );
}
```

- [ ] **Step 2: Verify the build passes**

Run: `cd /Users/user/antigravity/cinemark && bun run build`
Expected: no TypeScript errors (the component is unused by `App.tsx` until Task 16, but it must still type-check).

- [ ] **Step 3: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/pages/HoursTab.tsx
git commit -m "Add Hours tab: hours by person and by department"
```

---

### Task 13: Aba B — Volume de entregas & produtividade

**Files:**
- Create: `src/pages/DeliveriesTab.tsx`

**Interfaces:**
- Consumes: `useTaskRows`/`useDeliveryRows` (Task 10), `useFilters` (Task 11), `filterByDateRange` (Task 4), `departmentsByKey` (Task 5), `deliveriesByType`/`deliveriesByEffortGroup`/`deliveriesOverTime`/`deliveriesByDepartment` (Task 9), `KpiCard`/`DataState` (Task 11).
- Produces: `<DeliveriesTab />`. Consumed by the App shell (Task 16).

- [ ] **Step 1: Create `src/pages/DeliveriesTab.tsx`**

```tsx
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTaskRows } from '@/hooks/useTaskRows';
import { useDeliveryRows } from '@/hooks/useDeliveryRows';
import { useFilters } from '@/context/FiltersContext';
import { filterByDateRange } from '@/lib/dateRange';
import { departmentsByKey } from '@/lib/taskFacts';
import {
  deliveriesByType,
  deliveriesByEffortGroup,
  deliveriesOverTime,
  deliveriesByDepartment,
} from '@/lib/deliveryMetrics';
import { KpiCard } from '@/components/KpiCard';
import { DataState } from '@/components/DataState';

export function DeliveriesTab() {
  const taskRowsQuery = useTaskRows();
  const deliveryRowsQuery = useDeliveryRows();
  const { filters } = useFilters();

  const isLoading = taskRowsQuery.isLoading || deliveryRowsQuery.isLoading;
  const error = taskRowsQuery.error ?? deliveryRowsQuery.error;

  const taskRows = taskRowsQuery.data ?? [];
  const deliveryRows = deliveryRowsQuery.data ?? [];

  const inRange = filterByDateRange(deliveryRows, filters.dateRange, (row) => row.CreationDate);
  const departmentMap = departmentsByKey(taskRows, (row) => row.TaskNumber);
  const scoped = filters.department
    ? inRange.filter((row) => {
        if (row.TaskNumber === null) return false;
        const departments = departmentMap.get(String(row.TaskNumber));
        return departments?.has(filters.department as string) ?? false;
      })
    : inRange;

  const byType = deliveriesByType(scoped);
  const byEffortGroup = deliveriesByEffortGroup(scoped);
  const overTime = deliveriesOverTime(scoped);
  const byDepartment = deliveriesByDepartment(scoped, departmentMap);
  const totalQuantity = byType.reduce((sum, item) => sum + item.totalQuantity, 0);

  return (
    <DataState
      isLoading={isLoading}
      error={error}
      onRetry={() => {
        taskRowsQuery.refetch();
        deliveryRowsQuery.refetch();
      }}
    >
      <div className="flex flex-col gap-6">
        <KpiCard label="Total de entregas" value={totalQuantity.toFixed(0)} />
        <div className="glass-card p-4" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="totalQuantity" stroke="hsl(244 94% 69%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card p-4" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="requestTypeName" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalQuantity" fill="hsl(190 100% 50%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-4" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDepartment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalQuantity" fill="hsl(160 100% 45%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-4" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byEffortGroup}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="effortUnitGroupName" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalQuantity" fill="hsl(42 100% 50%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DataState>
  );
}
```

- [ ] **Step 2: Verify the build passes**

Run: `cd /Users/user/antigravity/cinemark && bun run build`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/pages/DeliveriesTab.tsx
git commit -m "Add Deliveries tab: volume by type, effort group, trend, and department"
```

---

### Task 14: Aba C — Tempo médio de execução

**Files:**
- Create: `src/pages/ExecutionTimeTab.tsx`

**Interfaces:**
- Consumes: `useTaskRows` (Task 10), `useFilters` (Task 11), `filterByDateRange` (Task 4), `taskFactsByTaskId`/`departmentsByKey` (Task 5), `averageExecutionTime`/`executionTimeByDepartment`/`executionTimeByRequestType` (Task 7), `KpiCard`/`DataState` (Task 11).
- Produces: `<ExecutionTimeTab />`. Consumed by the App shell (Task 16).

- [ ] **Step 1: Create `src/pages/ExecutionTimeTab.tsx`**

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTaskRows } from '@/hooks/useTaskRows';
import { useFilters } from '@/context/FiltersContext';
import { filterByDateRange } from '@/lib/dateRange';
import { taskFactsByTaskId, departmentsByKey } from '@/lib/taskFacts';
import {
  averageExecutionTime,
  executionTimeByDepartment,
  executionTimeByRequestType,
} from '@/lib/executionTime';
import { KpiCard } from '@/components/KpiCard';
import { DataState } from '@/components/DataState';

export function ExecutionTimeTab() {
  const { data, isLoading, error, refetch } = useTaskRows();
  const { filters } = useFilters();

  const rows = data ?? [];
  const inRange = filterByDateRange(rows, filters.dateRange, (row) => row.TaskCreationDate);
  const scoped = filters.department
    ? inRange.filter((row) => (row.FunctionGroupName ?? 'Não informado') === filters.department)
    : inRange;

  const facts = taskFactsByTaskId(scoped);
  const departments = departmentsByKey(scoped, (row) => row.TaskID);
  const overall = averageExecutionTime(Array.from(facts.values()));
  const byDepartment = executionTimeByDepartment(facts, departments);
  const byRequestType = executionTimeByRequestType(facts).slice(0, 10);

  return (
    <DataState isLoading={isLoading} error={error} onRetry={refetch}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <KpiCard label="Tempo médio (h)" value={overall.averageHours.toFixed(1)} />
          <KpiCard label="Tarefas concluídas" value={String(overall.taskCount)} />
        </div>
        <div className="glass-card p-4" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDepartment}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" angle={-20} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="averageHours" fill="hsl(244 94% 69%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-4" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byRequestType} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="requestTypeName" width={160} />
              <Tooltip />
              <Bar dataKey="averageHours" fill="hsl(190 100% 50%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DataState>
  );
}
```

- [ ] **Step 2: Verify the build passes**

Run: `cd /Users/user/antigravity/cinemark && bun run build`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/pages/ExecutionTimeTab.tsx
git commit -m "Add Execution Time tab: average by department and request type"
```

---

### Task 15: Aba D — Refações

**Files:**
- Create: `src/pages/ReworkTab.tsx`

**Interfaces:**
- Consumes: `useTaskRows` (Task 10), `useFilters` (Task 11), `filterByDateRange` (Task 4), `taskFactsByTaskId`/`departmentsByKey` (Task 5), `reworkSummary`/`reworkByDepartment`/`reworkTrend` (Task 8), `KpiCard`/`DataState` (Task 11).
- Produces: `<ReworkTab />`. Consumed by the App shell (Task 16).

- [ ] **Step 1: Create `src/pages/ReworkTab.tsx`**

```tsx
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTaskRows } from '@/hooks/useTaskRows';
import { useFilters } from '@/context/FiltersContext';
import { filterByDateRange } from '@/lib/dateRange';
import { taskFactsByTaskId, departmentsByKey } from '@/lib/taskFacts';
import { reworkSummary, reworkByDepartment, reworkTrend } from '@/lib/reworkMetrics';
import { KpiCard } from '@/components/KpiCard';
import { DataState } from '@/components/DataState';

export function ReworkTab() {
  const { data, isLoading, error, refetch } = useTaskRows();
  const { filters } = useFilters();

  const rows = data ?? [];
  const inRange = filterByDateRange(rows, filters.dateRange, (row) => row.TaskCreationDate);
  const scoped = filters.department
    ? inRange.filter((row) => (row.FunctionGroupName ?? 'Não informado') === filters.department)
    : inRange;

  const facts = taskFactsByTaskId(scoped);
  const departments = departmentsByKey(scoped, (row) => row.TaskID);
  const factsList = Array.from(facts.values());
  const summary = reworkSummary(factsList);
  const byDepartment = reworkByDepartment(facts, departments);
  const trend = reworkTrend(factsList);

  return (
    <DataState isLoading={isLoading} error={error} onRetry={refetch}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total de tarefas" value={String(summary.totalTasks)} />
          <KpiCard label="% Ajuste cliente" value={`${summary.externalPct.toFixed(1)}%`} />
          <KpiCard label="% Ajuste interno" value={`${summary.internalPct.toFixed(1)}%`} />
        </div>
        <div className="glass-card p-4" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="externalCount" name="Ajuste cliente" stroke="hsl(348 100% 65%)" />
              <Line type="monotone" dataKey="internalCount" name="Ajuste interno" stroke="hsl(42 100% 50%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-4" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDepartment}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" angle={-20} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="externalCount" name="Ajuste cliente" stackId="a" fill="hsl(348 100% 65%)" />
              <Bar dataKey="internalCount" name="Ajuste interno" stackId="a" fill="hsl(42 100% 50%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DataState>
  );
}
```

- [ ] **Step 2: Verify the build passes**

Run: `cd /Users/user/antigravity/cinemark && bun run build`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/pages/ReworkTab.tsx
git commit -m "Add Rework tab: client/internal split, trend, and by department"
```

---

### Task 16: App shell final — abas, providers e verificação no browser

**Files:**
- Modify: `src/App.tsx` (replace the Task 1 placeholder)

**Interfaces:**
- Consumes: `FiltersProvider` (Task 11), `FilterBar` (Task 11), `HoursTab` (Task 12), `DeliveriesTab` (Task 13), `ExecutionTimeTab` (Task 14), `ReworkTab` (Task 15).
- Produces: the final `App` default export — no further tasks depend on this.

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FiltersProvider } from '@/context/FiltersContext';
import { FilterBar } from '@/components/FilterBar';
import { HoursTab } from '@/pages/HoursTab';
import { DeliveriesTab } from '@/pages/DeliveriesTab';
import { ExecutionTimeTab } from '@/pages/ExecutionTimeTab';
import { ReworkTab } from '@/pages/ReworkTab';

const qc = new QueryClient();

type TabKey = 'hours' | 'deliveries' | 'executionTime' | 'rework';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'hours', label: 'Equipe & Horas' },
  { key: 'deliveries', label: 'Entregas & Produtividade' },
  { key: 'executionTime', label: 'Tempo de Execução' },
  { key: 'rework', label: 'Refações' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('hours');

  return (
    <QueryClientProvider client={qc}>
      <FiltersProvider>
        <div className="min-h-screen bg-background">
          <header className="border-b border-border px-6 py-4">
            <h1 className="text-lg font-semibold text-foreground">Cinemark — Dashboard</h1>
          </header>
          <FilterBar />
          <nav className="flex gap-2 border-b border-border px-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm ${
                  activeTab === tab.key
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <main className="p-6">
            {activeTab === 'hours' && <HoursTab />}
            {activeTab === 'deliveries' && <DeliveriesTab />}
            {activeTab === 'executionTime' && <ExecutionTimeTab />}
            {activeTab === 'rework' && <ReworkTab />}
          </main>
        </div>
      </FiltersProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `cd /Users/user/antigravity/cinemark && bun test`
Expected: all `src/lib/*.test.ts` suites pass (Tasks 2–9).

- [ ] **Step 3: Verify the production build**

Run: `cd /Users/user/antigravity/cinemark && bun run build`
Expected: no TypeScript errors, `dist/` produced.

- [ ] **Step 4: Manual browser verification**

Run: `cd /Users/user/antigravity/cinemark && bun run dev`
Open `http://localhost:8090` and confirm:
- The four tabs render without errors and each shows non-empty data for Cinemark (KPIs, at least one chart, at least one table row).
- Changing the date range narrows the numbers (e.g. set "De" to a date after all data — every tab should show zeroed/empty state, not crash).
- Selecting a department in the filter narrows the Hours tab table and the Execution Time / Rework charts to that department only.
- Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 5: Commit**

```bash
cd /Users/user/antigravity/cinemark
git add src/App.tsx
git commit -m "Wire App shell: tab navigation over Hours, Deliveries, Execution Time, Rework"
```

---

## Fora de escopo (documentado no spec)

- Views/materialized views no Supabase.
- Deploy (Vercel ou outro).
- Push para GitHub remoto — o repositório permanece local até pedido explícito.
