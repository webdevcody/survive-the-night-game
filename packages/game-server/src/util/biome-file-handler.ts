import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// This module is only intended for development/local use
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Handle both ESM (dev mode) and detect production
const getBiomesDir = () => {
  // In production, we don't support the biome editor
  if (IS_PRODUCTION) {
    return null;
  }

  // Check if import.meta.url is available (ESM/dev mode)
  if (typeof import.meta.url !== 'undefined') {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    return path.join(currentDir, "..", "biomes");
  }

  // If import.meta.url is not available, we're likely bundled (production)
  return null;
};

const BIOMES_DIR = getBiomesDir();

// Helper to check if biome editor is available
function ensureBiomeEditorAvailable() {
  if (!BIOMES_DIR) {
    throw new Error("Biome editor is only available in development mode");
  }
}

export interface BiomeData {
  ground: number[][];
  collidables: number[][];
  items?: string[];
  decals?: Array<{
    id: string;
    position: { x: number; y: number };
    animation?: any;
    light?: any;
  }>;
}

export interface BiomeInfo {
  name: string;
  fileName: string;
  constantName: string;
}

/**
 * Get all available biome files in the biomes directory
 */
export async function listBiomes(): Promise<BiomeInfo[]> {
  ensureBiomeEditorAvailable();
  const files = await fs.readdir(BIOMES_DIR!);

  const biomeFiles = files.filter(
    (file) => file.endsWith(".ts") && file !== "index.ts"
  );

  return biomeFiles.map((fileName) => {
    const name = fileName.replace(".ts", "");
    const constantName = name
      .split("-")
      .map((part) => part.toUpperCase())
      .join("_");

    return {
      name,
      fileName,
      constantName,
    };
  });
}

/**
 * Read a biome file and extract its data
 */
export async function readBiomeData(biomeName: string): Promise<BiomeData> {
  ensureBiomeEditorAvailable();
  const filePath = path.join(BIOMES_DIR!, `${biomeName}.ts`);
  const content = await fs.readFile(filePath, "utf-8");

  // Extract the biome data object using regex
  // Match pattern: export const NAME: BiomeData = { ... };
  const biomeDataMatch = content.match(
    /export\s+const\s+\w+:\s*BiomeData\s*=\s*(\{[\s\S]*?\n\});/
  );

  if (!biomeDataMatch) {
    throw new Error(`Could not parse biome data from ${biomeName}.ts`);
  }

  // Import DECAL_REGISTRY dynamically to make it available during eval
  const { DECAL_REGISTRY } = await import("@shared/config/decals-config");

  // Use eval to parse the object literal (safe since we control the source)
  // Replace Entities references with strings for parsing
  let dataString = biomeDataMatch[1];
  dataString = dataString.replace(/Entities\.(\w+)/g, '"Entities.$1"');

  const biomeData = eval(`(${dataString})`);

  return biomeData;
}

/**
 * Write biome data back to the TypeScript file while preserving structure
 */
export async function writeBiomeData(
  biomeName: string,
  biomeData: BiomeData
): Promise<void> {
  ensureBiomeEditorAvailable();
  const filePath = path.join(BIOMES_DIR!, `${biomeName}.ts`);
  const content = await fs.readFile(filePath, "utf-8");

  // Extract the constant name from the file
  const constantMatch = content.match(/export\s+const\s+(\w+):\s*BiomeData/);
  if (!constantMatch) {
    throw new Error(`Could not find constant name in ${biomeName}.ts`);
  }

  const constantName = constantMatch[1];

  // Build the new data object string
  const newDataString = formatBiomeData(biomeData);

  // Replace the old biome data with the new one
  const pattern = new RegExp(
    `(export\\s+const\\s+${constantName}:\\s*BiomeData\\s*=\\s*)\\{[\\s\\S]*?\\n\\};`,
    "m"
  );

  let newContent = content.replace(pattern, `$1${newDataString};`);

  // Ensure Entities import is present if items are being used
  if (biomeData.items && biomeData.items.length > 0) {
    const hasEntitiesImport = /import.*Entities.*from.*@\/constants/.test(newContent);
    if (!hasEntitiesImport) {
      // Add import after the first import line
      const firstImportMatch = newContent.match(/^(import.*\n)/m);
      if (firstImportMatch) {
        newContent = newContent.replace(
          firstImportMatch[0],
          firstImportMatch[0] + 'import { Entities } from "@/constants";\n'
        );
      }
    }
  }

  // Ensure DECAL_REGISTRY import is present if decals are being used
  if (biomeData.decals && biomeData.decals.length > 0) {
    const hasDecalRegistryImport = /import.*DECAL_REGISTRY.*from.*@shared\/config\/decals-config/.test(newContent);
    if (!hasDecalRegistryImport) {
      // Add import after BiomeData import or at the top
      const biomeDataImportMatch = newContent.match(/^(import.*BiomeData.*\n)/m);
      if (biomeDataImportMatch) {
        newContent = newContent.replace(
          biomeDataImportMatch[0],
          biomeDataImportMatch[0] + 'import { DECAL_REGISTRY } from "@shared/config/decals-config";\n'
        );
      } else {
        // If no BiomeData import, add after first import
        const firstImportMatch = newContent.match(/^(import.*\n)/m);
        if (firstImportMatch) {
          newContent = newContent.replace(
            firstImportMatch[0],
            firstImportMatch[0] + 'import { DECAL_REGISTRY } from "@shared/config/decals-config";\n'
          );
        }
      }
    }
  }

  await fs.writeFile(filePath, newContent, "utf-8");
}

/**
 * Create a new biome file with empty ground and collidables
 */
export async function createBiome(biomeName: string): Promise<void> {
  ensureBiomeEditorAvailable();
  const filePath = path.join(BIOMES_DIR!, `${biomeName}.ts`);

  // Check if file already exists
  try {
    await fs.access(filePath);
    throw new Error(`Biome ${biomeName} already exists`);
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  // Convert kebab-case to CONSTANT_CASE
  const constantName = biomeName
    .toUpperCase()
    .replace(/-/g, "_");

  // Create empty 16x16 grids
  const emptyGround = Array(16).fill(0).map(() => Array(16).fill(0));
  const emptyCollidables = Array(16).fill(0).map(() => Array(16).fill(-1));

  // Generate file content
  const fileContent = `import { EntityType } from "@shared/types/entity";

export interface BiomeData {
  ground: number[][];
  collidables: number[][];
  items?: EntityType[];
}

export const ${constantName}: BiomeData = {
  ground: [
${emptyGround.map(row => `    [${row.join(", ")}]`).join(",\n")}
  ],
  collidables: [
${emptyCollidables.map(row => `    [${row.join(", ")}]`).join(",\n")}
  ],
};
`;

  // Write the file
  await fs.writeFile(filePath, fileContent, "utf-8");

  // Update the index.ts file
  await updateBiomesIndex();
}

/**
 * Update the biomes/index.ts file to include all biomes
 */
async function updateBiomesIndex(): Promise<void> {
  ensureBiomeEditorAvailable();
  const indexPath = path.join(BIOMES_DIR!, "index.ts");
  const files = await fs.readdir(BIOMES_DIR!);

  const biomeFiles = files
    .filter((file) => file.endsWith(".ts") && file !== "index.ts")
    .sort();

  const exports: string[] = [];

  // Add the BiomeData export from the first file (campsite if it exists)
  if (biomeFiles.length > 0) {
    const firstName = biomeFiles[0].replace(".ts", "");
    const firstConstantName = firstName.toUpperCase().replace(/-/g, "_");

    // First export includes the BiomeData type
    exports.push(`export { ${firstConstantName}, type BiomeData } from "./${firstName}";`);

    // Add other exports
    for (const file of biomeFiles.slice(1)) {
      const name = file.replace(".ts", "");
      const constantName = name.toUpperCase().replace(/-/g, "_");
      exports.push(`export { ${constantName} } from "./${name}";`);
    }
  }

  const indexContent = exports.join("\n") + "\n";
  await fs.writeFile(indexPath, indexContent, "utf-8");
}

/**
 * Format biome data as a TypeScript object literal string
 */
function formatBiomeData(data: BiomeData): string {
  const lines: string[] = [];
  lines.push("{");

  // Format ground array
  lines.push("  ground: [");
  data.ground.forEach((row, index) => {
    const isLast = index === data.ground.length - 1;
    lines.push(`    [${row.join(", ")}]${isLast ? "" : ","}`);
  });
  lines.push("  ],");

  // Format collidables array
  lines.push("  collidables: [");
  data.collidables.forEach((row, index) => {
    const isLast = index === data.collidables.length - 1;
    lines.push(`    [${row.join(", ")}]${isLast ? "" : ","}`);
  });
  lines.push("  ],");

  // Format decals array if present
  if (data.decals && data.decals.length > 0) {
    lines.push("  decals: [");
    data.decals.forEach((decal, index) => {
      const isLast = index === data.decals!.length - 1;
      lines.push("    {");
      lines.push(`      id: '${decal.id}',`);
      lines.push(`      position: { x: ${decal.position.x}, y: ${decal.position.y} },`);
      if (decal.animation) {
        lines.push(`      animation: DECAL_REGISTRY.${decal.id}.animation,`);
      }
      if (decal.light) {
        lines.push(`      light: DECAL_REGISTRY.${decal.id}.light,`);
      }
      lines.push(`    }${isLast ? "" : ","}`);
    });
    lines.push("  ],");
  }

  // Format items array if present
  if (data.items && data.items.length > 0) {
    lines.push("  items: [");
    data.items.forEach((item, index) => {
      const isLast = index === data.items!.length - 1;
      // Restore Entities prefix if it was there
      const itemStr = item.startsWith("Entities.") ? item : `Entities.${item}`;
      lines.push(`    ${itemStr}${isLast ? "" : ","}`);
    });
    lines.push("  ],");
  }

  lines.push("}");

  return lines.join("\n");
}
