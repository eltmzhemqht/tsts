import { type User, type InsertUser, type Ranking, type InsertRanking } from "@shared/schema";
import { randomUUID } from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Ranking methods
  createRanking(ranking: InsertRanking): Promise<Ranking>;
  getRankings(limit?: number): Promise<Ranking[]>;
  clearRankings(): Promise<void>;
}

// File-based storage for persistence across server restarts
const DATA_DIR = join(process.cwd(), ".data");
const RANKINGS_FILE = join(DATA_DIR, "rankings.json");

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function loadRankings(): Promise<Ranking[]> {
  await ensureDataDir();
  if (!existsSync(RANKINGS_FILE)) {
    return [];
  }
  try {
    const data = await readFile(RANKINGS_FILE, "utf-8");
    const rankings = JSON.parse(data);
    // Convert createdAt strings back to Date objects
    return rankings.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
    }));
  } catch (error) {
    console.error("Failed to load rankings:", error);
    return [];
  }
}

async function saveRankings(rankings: Ranking[]): Promise<void> {
  try {
    await ensureDataDir();
    const data = JSON.stringify(rankings, null, 2);
    await writeFile(RANKINGS_FILE, data, "utf-8");
    console.log(`[Storage] Saved ${rankings.length} rankings to file`);
  } catch (error) {
    console.error("[Storage] Failed to save rankings:", error);
    // Don't throw - allow ranking to be created even if file save fails
    // This ensures the ranking is still in memory
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rankings: Map<string, Ranking>;
  private rankingsLoaded: boolean = false;

  constructor() {
    this.users = new Map();
    this.rankings = new Map();
    // Load rankings from file on startup
    this.loadRankingsFromFile();
  }

  private async loadRankingsFromFile() {
    try {
      const rankings = await loadRankings();
      rankings.forEach((ranking) => {
        this.rankings.set(ranking.id, ranking);
      });
      this.rankingsLoaded = true;
      console.log(`Loaded ${rankings.length} rankings from file`);
    } catch (error) {
      console.error("Failed to load rankings from file:", error);
      this.rankingsLoaded = true; // Mark as loaded even if failed to prevent infinite retries
    }
  }

  private async waitForRankingsLoaded() {
    while (!this.rankingsLoaded) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createRanking(insertRanking: InsertRanking): Promise<Ranking> {
    try {
      await this.waitForRankingsLoaded();
      const id = randomUUID();
      const ranking: Ranking = {
        ...insertRanking,
        id,
        createdAt: new Date(),
      };
      this.rankings.set(id, ranking);
      console.log(`[Storage] Created ranking: ${id} for ${insertRanking.name} (${insertRanking.returnRate.toFixed(2)}%)`);
      
      // Limit rankings to last 1000 entries to prevent memory issues during long sessions
      const allRankings = Array.from(this.rankings.values());
      if (allRankings.length > 1000) {
        // Keep only top 1000 by return rate
        const sorted = allRankings.sort((a, b) => b.returnRate - a.returnRate).slice(0, 1000);
        this.rankings.clear();
        sorted.forEach(r => this.rankings.set(r.id, r));
        console.log(`[Storage] Limited rankings to top 1000`);
      }
      
      // Save to file (non-blocking - don't fail if file save fails)
      saveRankings(Array.from(this.rankings.values())).catch(err => {
        console.error("[Storage] Background save failed (ranking still in memory):", err);
      });
      
      return ranking;
    } catch (error) {
      console.error("[Storage] Failed to create ranking:", error);
      throw error;
    }
  }

  async getRankings(limit: number = 20): Promise<Ranking[]> {
    await this.waitForRankingsLoaded();
    const validLimit = Math.max(1, Math.min(100, limit)); // Clamp between 1 and 100
    return Array.from(this.rankings.values())
      .sort((a, b) => b.returnRate - a.returnRate) // Sort by return rate descending
      .slice(0, validLimit);
  }

  async clearRankings(): Promise<void> {
    await this.waitForRankingsLoaded();
    this.rankings.clear();
    // Save empty array to file
    await saveRankings([]);
  }
}

export const storage = new MemStorage();
