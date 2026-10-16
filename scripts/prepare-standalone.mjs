import { cp, mkdir } from "node:fs/promises";

// Next's standalone output intentionally omits static assets. Package only the
// compiled public assets, never local environment files or the project tree.
await mkdir(".next/standalone/.next/static", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
