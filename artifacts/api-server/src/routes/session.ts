import { Router } from "express";
import { getSession, updateSession } from "../lib/session-store";
import { matchRows, computeQualitySummary } from "../lib/matcher";
import {
  RunCuringBody,
  RunCuringParams,
  UpdateDecisionsBody,
  UpdateDecisionsParams,
  GetQualitySummaryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

router.post("/session/:sessionId/cure", (req, res) => {
  try {
    const { sessionId } = RunCuringParams.parse(req.params);
    const { rawColumn, masterColumn, outputColumnName } = RunCuringBody.parse(req.body);

    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }

    if (!session.rawFile) {
      res.status(400).json({ error: "Raw file has not been uploaded yet." });
      return;
    }

    if (!session.masterFile) {
      res.status(400).json({ error: "Master list file has not been uploaded yet." });
      return;
    }

    if (!session.rawFile.columns.includes(rawColumn)) {
      res.status(400).json({ error: `Column "${rawColumn}" not found in raw file.` });
      return;
    }

    if (!session.masterFile.columns.includes(masterColumn)) {
      res.status(400).json({ error: `Column "${masterColumn}" not found in master list.` });
      return;
    }

    const rawValues = session.rawFile.rows.map((row) => row[rawColumn] ?? "");
    const masterValues = session.masterFile.rows.map((row) => row[masterColumn] ?? "").filter(Boolean);

    const matches = matchRows(rawValues, masterValues);
    const colName = outputColumnName ?? "Standardized Value";

    updateSession(sessionId, {
      rawColumn,
      masterColumn,
      outputColumnName: colName,
      matches,
    });

    res.json({
      sessionId,
      matches,
      totalRows: matches.length,
      rawColumn,
      masterColumn,
      outputColumnName: colName,
    });
  } catch (err) {
    logger.error({ err }, "Error running curing");
    const message = err instanceof Error ? err.message : "Curing failed";
    res.status(400).json({ error: message });
  }
});

router.patch("/session/:sessionId/decisions", (req, res) => {
  try {
    const { sessionId } = UpdateDecisionsParams.parse(req.params);
    const { decisions } = UpdateDecisionsBody.parse(req.body);

    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }

    let updatedCount = 0;
    for (const decision of decisions) {
      const match = session.matches[decision.rowIndex];
      if (match) {
        match.status = decision.status;
        match.correctedValue = decision.correctedValue ?? null;
        updatedCount++;
      }
    }

    res.json({ sessionId, updatedCount });
  } catch (err) {
    logger.error({ err }, "Error updating decisions");
    const message = err instanceof Error ? err.message : "Failed to update decisions";
    res.status(400).json({ error: message });
  }
});

router.get("/session/:sessionId/summary", (req, res) => {
  try {
    const { sessionId } = GetQualitySummaryParams.parse(req.params);

    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }

    const rawValues = session.rawFile?.rows.map((row) => (session.rawColumn ? row[session.rawColumn] ?? "" : "")) ?? [];
    const summary = computeQualitySummary(session.matches, rawValues);

    res.json(summary);
  } catch (err) {
    logger.error({ err }, "Error getting quality summary");
    const message = err instanceof Error ? err.message : "Failed to get summary";
    res.status(400).json({ error: message });
  }
});

export default router;
