import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
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

  // Rate limiting for ranking API
  // 7대 노트북 × 2분 간격 = 최대 분당 7회
  // 학교 행사용으로 충분히 여유있게 설정 (분당 1000회)
  // 개발 모드에서는 완전히 비활성화
  const isDevelopment = process.env.NODE_ENV === "development";
  const disableRateLimit = process.env.DISABLE_RATE_LIMIT === "true" || isDevelopment;
  
  // Rate limiting 미들웨어
  // 개발 모드: 완전히 비활성화
  // 프로덕션: 분당 1000회 (학교 행사용으로 충분)
  const rankingLimiter = disableRateLimit
    ? (req: any, res: any, next: any) => {
        // Rate limiting 완전히 비활성화 - 모든 요청 허용
        next();
      }
    : rateLimit({
        windowMs: 60 * 1000, // 1분
        max: 1000, // 프로덕션: 분당 1000회 (학교 행사용으로 충분)
        message: { message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." },
        standardHeaders: true,
        legacyHeaders: false,
      });

  // Ranking API
  app.post("/api/rankings", rankingLimiter, async (req, res) => {
    const startTime = Date.now();
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

      // Validate name length (max 10 characters for school festival) - check after trim
      const trimmedName = name.trim();
      if (trimmedName.length > 10) {
        console.error("[API] POST /api/rankings - Name too long:", trimmedName.length);
        return res.status(400).json({ message: "Name must be 1-10 characters" });
      }
      
      // Validate returnRate and finalValue ranges
      if (!isFinite(returnRate) || returnRate < -100 || returnRate > 10000) {
        console.error("[API] POST /api/rankings - Invalid returnRate range:", returnRate);
        return res.status(400).json({ message: "Invalid returnRate range" });
      }
      
      if (!isFinite(finalValue) || finalValue < 0 || finalValue > 100000000000) {
        console.error("[API] POST /api/rankings - Invalid finalValue range:", finalValue);
        return res.status(400).json({ message: "Invalid finalValue range" });
      }

      const ranking = await storage.createRanking({
        name: trimmedName,
        returnRate: Number(returnRate),
        finalValue: Number(finalValue),
      });

      const duration = Date.now() - startTime;
      console.log(`[API] POST /api/rankings - Successfully created ranking: ${ranking.id} (${duration}ms)`);
      res.json(ranking);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/rankings - Error after ${duration}ms:`, error);
      const errorMessage = error?.message || "Failed to create ranking";
      res.status(500).json({ message: errorMessage });
    }
  });

  // GET 요청은 더 많이 허용 (랭킹 조회는 자주 발생)
  const getRankingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1분
    max: 60, // 분당 최대 60회 요청
    message: { message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/api/rankings", getRankingLimiter, async (req, res) => {
    const startTime = Date.now();
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
      const duration = Date.now() - startTime;
      console.log(`[API] GET /api/rankings - Returning ${rankings.length} rankings (${duration}ms)`);
      res.json(rankings);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[API] GET /api/rankings - Error after ${duration}ms:`, error);
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
