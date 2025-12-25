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
  // 학교 축제 환경: 7대 노트북 × 2분 게임 = 최대 분당 3.5회
  // 여유있게 30회/분으로 설정 (약 8.5배 여유)
  // Render 무료 플랜: 과도한 요청 시 서버 재시작 위험 방지
  const isDevelopment = process.env.NODE_ENV === "development";
  const disableRateLimit = process.env.DISABLE_RATE_LIMIT === "true" || isDevelopment;
  
  // Rate limiting 미들웨어
  // 개발 모드: 완전히 비활성화
  // 프로덕션: 분당 30회 (학교 축제 환경에 맞춤)
  const rankingLimiter = disableRateLimit
    ? (req: any, res: any, next: any) => {
        // Rate limiting 완전히 비활성화 - 모든 요청 허용
        next();
      }
    : rateLimit({
        windowMs: 60 * 1000, // 1분
        max: 30, // 프로덕션: 분당 30회 (학교 축제 환경)
        message: { success: false, message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          res.status(200).json({ success: false, message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." });
        },
      });

  // Ranking API
  app.post("/api/rankings", rankingLimiter, async (req, res) => {
    const startTime = Date.now();
    try {
      const { name, returnRate, finalValue } = req.body as InsertRanking;
      // 프로덕션에서는 상세 로깅 최소화 (성능 최적화)
      if (process.env.NODE_ENV === "development") {
        console.log(`[API] POST /api/rankings - Received:`, { name, returnRate, finalValue });
      }
      
      // Validate input
      if (!name || name.trim().length === 0) {
        console.error("[API] POST /api/rankings - Missing or empty name");
        return res.status(200).json({ success: false, message: "Name is required" });
      }

      if (typeof returnRate !== "number" || isNaN(returnRate)) {
        console.error("[API] POST /api/rankings - Invalid returnRate:", returnRate);
        return res.status(200).json({ success: false, message: "Invalid returnRate" });
      }

      if (typeof finalValue !== "number" || isNaN(finalValue)) {
        console.error("[API] POST /api/rankings - Invalid finalValue:", finalValue);
        return res.status(200).json({ success: false, message: "Invalid finalValue" });
      }

      // Validate name length (max 10 characters for school festival) - check after trim
      const trimmedName = name.trim();
      if (trimmedName.length > 10) {
        console.error("[API] POST /api/rankings - Name too long:", trimmedName.length);
        return res.status(200).json({ success: false, message: "Name must be 1-10 characters" });
      }
      
      // Validate returnRate and finalValue ranges
      if (!isFinite(returnRate) || returnRate < -100 || returnRate > 10000) {
        console.error("[API] POST /api/rankings - Invalid returnRate range:", returnRate);
        return res.status(200).json({ success: false, message: "Invalid returnRate range" });
      }
      
      if (!isFinite(finalValue) || finalValue < 0 || finalValue > 100000000000) {
        console.error("[API] POST /api/rankings - Invalid finalValue range:", finalValue);
        return res.status(200).json({ success: false, message: "Invalid finalValue range" });
      }

      const ranking = await storage.createRanking({
        name: trimmedName,
        returnRate: Number(returnRate),
        finalValue: Number(finalValue),
      });

      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === "development") {
        console.log(`[API] POST /api/rankings - Successfully created ranking: ${ranking.id} (${duration}ms)`);
      }
      res.status(200).json({ success: true, data: ranking });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[API] POST /api/rankings - Error after ${duration}ms:`, error);
      const errorMessage = error?.message || "Failed to create ranking";
      res.status(200).json({ success: false, message: errorMessage });
    }
  });

  // GET 요청은 더 많이 허용 (랭킹 조회는 자주 발생)
  const getRankingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1분
    max: 60, // 분당 최대 60회 요청
    message: { success: false, message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(200).json({ success: false, message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." });
    },
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
      res.status(200).json({ success: true, data: rankings });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[API] GET /api/rankings - Error after ${duration}ms:`, error);
      res.status(200).json({ success: false, message: "Failed to get rankings" });
    }
  });

  // Developer: Clear rankings (보호됨)
  // 환경 변수 CLEAR_RANKINGS_KEY와 query key 일치해야 함
  app.delete("/api/rankings", async (req, res) => {
    try {
      const requiredKey = process.env.CLEAR_RANKINGS_KEY || "r-f";
      const providedKey = req.query.key as string;
      
      if (!providedKey || providedKey !== requiredKey) {
        console.error("[API] DELETE /api/rankings - Unauthorized: Invalid or missing key");
        return res.status(200).json({ success: false, message: "Unauthorized" });
      }
      
      await storage.clearRankings();
      if (process.env.NODE_ENV === "development") {
        console.log("[API] DELETE /api/rankings - Rankings cleared successfully");
      }
      res.status(200).json({ success: true, message: "Rankings cleared" });
    } catch (error) {
      console.error("[API] DELETE /api/rankings - Error:", error);
      res.status(200).json({ success: false, message: "Failed to clear rankings" });
    }
  });

  return httpServer;
}
