import { Router, Request, Response } from "express";
import {
  listBiomes,
  readBiomeData,
  writeBiomeData,
  createBiome,
  BiomeData,
} from "../util/biome-file-handler.js";
import { SPAWNABLE_ENTITY_TYPES } from "@shared/constants";

const router = Router();

/**
 * GET /api/biomes
 * List all available biomes
 */
router.get("/biomes", async (req: Request, res: Response) => {
  try {
    const biomes = await listBiomes();
    res.json({ biomes });
  } catch (error) {
    console.error("Error listing biomes:", error);
    res.status(500).json({ error: "Failed to list biomes" });
  }
});

/**
 * POST /api/biomes
 * Create a new biome
 */
router.post("/biomes", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Biome name is required" });
      return;
    }

    // Validate name format (should be kebab-case)
    if (!/^[a-z0-9-]+$/.test(name)) {
      res.status(400).json({
        error: "Invalid biome name. Use lowercase letters, numbers, and hyphens only.",
      });
      return;
    }

    await createBiome(name);
    res.json({ success: true, message: "Biome created successfully", name });
  } catch (error: any) {
    console.error("Error creating biome:", error);
    if (error.message?.includes("already exists")) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to create biome" });
    }
  }
});

/**
 * GET /api/biomes/:name
 * Get a specific biome's data
 */
router.get("/biomes/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const biomeData = await readBiomeData(name);
    res.json(biomeData);
  } catch (error) {
    console.error(`Error reading biome ${req.params.name}:`, error);
    res.status(500).json({ error: "Failed to read biome data" });
  }
});

/**
 * POST /api/biomes/:name
 * Save biome data to file
 */
router.post("/biomes/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const biomeData: BiomeData = req.body;

    // Validate biome data
    if (!biomeData.ground || !biomeData.collidables) {
      res.status(400).json({ error: "Invalid biome data" });
      return;
    }

    // Validate array dimensions (16x16)
    if (
      biomeData.ground.length !== 16 ||
      biomeData.collidables.length !== 16
    ) {
      res.status(400).json({
        error: "Invalid dimensions: biome must be 16x16",
      });
      return;
    }

    for (const row of biomeData.ground) {
      if (row.length !== 16) {
        res.status(400).json({
          error: "Invalid dimensions: all rows must have 16 tiles",
        });
        return;
      }
    }

    for (const row of biomeData.collidables) {
      if (row.length !== 16) {
        res.status(400).json({
          error: "Invalid dimensions: all rows must have 16 tiles",
        });
        return;
      }
    }

    // Validate decals if present
    if (biomeData.decals) {
      for (const decal of biomeData.decals) {
        if (!decal.id || !decal.position) {
          res.status(400).json({
            error: "Invalid decal: must have id and position",
          });
          return;
        }
        if (
          decal.position.x < 0 ||
          decal.position.x >= 16 ||
          decal.position.y < 0 ||
          decal.position.y >= 16
        ) {
          res.status(400).json({
            error: "Invalid decal position: must be within 16x16 grid",
          });
          return;
        }
      }
    }

    await writeBiomeData(name, biomeData);
    res.json({ success: true, message: "Biome saved successfully" });
  } catch (error) {
    console.error(`Error saving biome ${req.params.name}:`, error);
    res.status(500).json({ error: "Failed to save biome data" });
  }
});

/**
 * GET /api/entities/spawnable
 * Get list of all spawnable entity types
 */
router.get("/entities/spawnable", (req: Request, res: Response) => {
  try {
    res.json({ entities: SPAWNABLE_ENTITY_TYPES });
  } catch (error) {
    console.error("Error getting spawnable entities:", error);
    res.status(500).json({ error: "Failed to get spawnable entities" });
  }
});

export default router;

