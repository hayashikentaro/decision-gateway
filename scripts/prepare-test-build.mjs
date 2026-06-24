import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const buildDir = path.resolve(".test-build");

async function rewriteFile(filePath) {
  const source = await readFile(filePath, "utf8");
  const rewritten = source.replace(
    /(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g,
    (match, prefix, specifier, suffix) => {
      if (path.extname(specifier)) {
        return match;
      }

      const resolved = path.resolve(path.dirname(filePath), `${specifier}.js`);
      return existsSync(resolved) ? `${prefix}${specifier}.js${suffix}` : match;
    },
  );

  if (rewritten !== source) {
    await writeFile(filePath, rewritten, "utf8");
  }
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(entryPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      await rewriteFile(entryPath);
    }
  }
}

await walk(buildDir);
