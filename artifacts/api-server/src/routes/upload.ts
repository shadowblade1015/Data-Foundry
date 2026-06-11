import { Router, Request, Response } from "express";
import multer from "multer";
import { parseCSV, previewRows } from "../lib/csv-parser";
import { createSession, getSession, updateSession } from "../lib/session-store";
import { logger } from "../lib/logger";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed. Please upload a .csv file."));
    }
  },
});

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 255);
}

function runUpload(req: Request, res: Response, cb: () => void) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const message = err instanceof Error ? err.message : "File upload failed";
      res.status(400).json({ error: message });
      return;
    }
    cb();
  });
}

router.post("/upload/raw", (req, res) => {
  runUpload(req, res, () => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded. Please select a CSV file." });
        return;
      }

      const filename = sanitizeFilename(req.file.originalname);
      const parsed = parseCSV(req.file.buffer, filename);

      if (parsed.columns.length === 0) {
        res.status(400).json({ error: "CSV file has no columns." });
        return;
      }

      const session = createSession();
      updateSession(session.sessionId, { rawFile: parsed });

      res.json({
        sessionId: session.sessionId,
        filename: parsed.filename,
        rowCount: parsed.rows.length,
        columns: parsed.columns,
        preview: previewRows(parsed.rows),
      });
    } catch (err) {
      logger.error({ err }, "Error uploading raw file");
      const message = err instanceof Error ? err.message : "Failed to parse CSV file";
      res.status(400).json({ error: message });
    }
  });
});

router.post("/upload/master", (req, res) => {
  runUpload(req, res, () => {
    try {
      const sessionId = req.body?.sessionId as string | undefined;

      if (!sessionId) {
        res.status(400).json({ error: "sessionId is required" });
        return;
      }

      const session = getSession(sessionId);
      if (!session) {
        res.status(404).json({ error: "Session not found. Please upload the raw file first." });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No file uploaded. Please select a CSV file." });
        return;
      }

      const filename = sanitizeFilename(req.file.originalname);
      const parsed = parseCSV(req.file.buffer, filename);

      if (parsed.columns.length === 0) {
        res.status(400).json({ error: "Master list CSV file has no columns." });
        return;
      }

      updateSession(sessionId, { masterFile: parsed });

      res.json({
        sessionId,
        filename: parsed.filename,
        rowCount: parsed.rows.length,
        columns: parsed.columns,
        preview: previewRows(parsed.rows),
      });
    } catch (err) {
      logger.error({ err }, "Error uploading master file");
      const message = err instanceof Error ? err.message : "Failed to parse CSV file";
      res.status(400).json({ error: message });
    }
  });
});

export default router;
