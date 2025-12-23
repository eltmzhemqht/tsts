import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // 정적 파일 서빙 (JS, CSS, 이미지 등 - 해시가 있는 파일)
  // 해시가 있는 파일은 안전하게 오래 캐시 가능
  app.use(
    express.static(distPath, {
      maxAge: "1y", // 1년 캐시 (해시가 있으므로 안전)
      immutable: true, // 파일이 변경되지 않음을 명시
      etag: true, // ETag 사용으로 변경 감지
      lastModified: true, // Last-Modified 헤더 사용
    }),
  );

  // index.html은 항상 최신 버전을 가져오도록 설정
  // SPA의 경우 index.html이 변경되면 새로운 JS/CSS 파일을 참조하므로 중요
  app.get("/", (_req, res, next) => {
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  // SPA 라우팅을 위한 fallback (모든 경로에서 index.html 반환)
  app.use("*", (req, res) => {
    // index.html도 캐시하지 않음
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
