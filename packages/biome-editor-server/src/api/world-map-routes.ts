import { Router, Request, Response } from "express";
import {
  readWorldMap,
  writeWorldMap,
  expandWorldMap,
  type WorldMapData,
} from "../util/world-map-file-handler.js";

const router = Router();

router.post("/world-map/expand", async (req: Request, res: Response) => {
  try {
    const mapSizeBiomes = (req.body as { mapSizeBiomes?: unknown })?.mapSizeBiomes;
    if (typeof mapSizeBiomes !== "number" || !Number.isInteger(mapSizeBiomes)) {
      res.status(400).json({ error: "Body must include integer mapSizeBiomes" });
      return;
    }
    const result = await expandWorldMap(mapSizeBiomes);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to expand world map";
    console.error("Error expanding world map:", error);
    res.status(400).json({ error: message });
  }
});

router.get("/world-map", async (_req: Request, res: Response) => {
  try {
    const data = await readWorldMap();
    res.json(data);
  } catch (error) {
    console.error("Error reading world map:", error);
    res.status(500).json({ error: "Failed to read world map" });
  }
});

router.post("/world-map", async (req: Request, res: Response) => {
  try {
    const body = req.body as WorldMapData;
    if (!body?.ground || !body?.collidables || !body?.spawns || !body?.decals) {
      res
        .status(400)
        .json({ error: "Invalid world map: ground, collidables, spawns, and decals required" });
      return;
    }
    await writeWorldMap({
      ...body,
      dialogueNpcs: body.dialogueNpcs,
      quests: body.quests,
      spawnerMeta: body.spawnerMeta,
    });
    res.json({ success: true, message: "World map saved successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save world map";
    console.error("Error saving world map:", error);
    res.status(400).json({ error: message });
  }
});

export default router;
