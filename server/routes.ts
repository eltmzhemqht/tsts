import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { type InsertRanking } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Ranking API
  app.post("/api/rankings", async (req, res) => {
    try {
      const { name, returnRate, finalValue } = req.body as InsertRanking;
      console.log(`[API] POST /api/rankings - Received:`, { name, returnRate, finalValue });
      
      // Validate input
      if (!name || name.trim().length === 0) {
        console.error("[API] POST /api/rankings - Missing or empty name");
        return res.status(400).json({ message: "Name is required" });
      }

      if (typeof returnRate !== "number" || isNaN(returnRate)) {
        console.error("[API] POST /api/rankings - Invalid returnRate:", returnRate);
        return res.status(400).json({ message: "Invalid returnRate" });
      }

      if (typeof finalValue !== "number" || isNaN(finalValue)) {
        console.error("[API] POST /api/rankings - Invalid finalValue:", finalValue);
        return res.status(400).json({ message: "Invalid finalValue" });
      }

      // Validate name length (max 10 characters for school festival)
      if (name.length > 10) {
        console.error("[API] POST /api/rankings - Name too long:", name.length);
        return res.status(400).json({ message: "Name must be 1-10 characters" });
      }

      const ranking = await storage.createRanking({
        name: name.trim(),
        returnRate,
        finalValue,
      });

      console.log(`[API] POST /api/rankings - Successfully created ranking:`, ranking.id);
      res.json(ranking);
    } catch (error: any) {
      console.error("[API] POST /api/rankings - Error:", error);
      const errorMessage = error?.message || "Failed to create ranking";
      res.status(500).json({ message: errorMessage });
    }
  });

  app.get("/api/rankings", async (req, res) => {
    try {
      const limitParam = req.query.limit as string;
      let limit = 20;
      if (limitParam) {
        const parsed = parseInt(limitParam, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
          limit = parsed;
        }
      }
      const rankings = await storage.getRankings(limit);
      console.log(`[API] GET /api/rankings - Returning ${rankings.length} rankings`);
      res.json(rankings);
    } catch (error) {
      console.error("[API] GET /api/rankings - Error:", error);
      res.status(500).json({ message: "Failed to get rankings" });
    }
  });

  // Developer: Clear rankings (Ctrl+Shift+R)
  app.delete("/api/rankings", async (req, res) => {
    try {
      await storage.clearRankings();
      res.json({ message: "Rankings cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear rankings" });
    }
  });

  return httpServer;
}
