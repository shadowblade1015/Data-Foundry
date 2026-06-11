import { Router } from "express";
import { getSession } from "../lib/session-store";
import { buildCleanedCsv, buildExceptionsCsv, buildMappingCsv } from "../lib/exporter";
import { ExportFileParams } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

router.get("/session/:sessionId/export/:exportType", (req, res) => {
  try {
    const { sessionId, exportType } = ExportFileParams.parse(req.params);

    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }

    if (!session.rawFile || session.matches.length === 0) {
      res.status(400).json({ error: "No curing results available. Please run the curing process first." });
      return;
    }

    let csv = "";
    let filename = "";

    if (exportType === "cleaned") {
      csv = buildCleanedCsv(session.rawFile, session.matches, session.outputColumnName);
      filename = "cleaned-data.csv";
    } else if (exportType === "exceptions") {
      csv = buildExceptionsCsv(session.rawFile, session.matches);
      filename = "exceptions.csv";
    } else if (exportType === "mapping") {
      csv = buildMappingCsv(session.matches);
      filename = "mapping.csv";
    } else {
      res.status(400).json({ error: "Invalid export type. Use: cleaned, exceptions, or mapping." });
      return;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    logger.error({ err }, "Error exporting file");
    const message = err instanceof Error ? err.message : "Export failed";
    res.status(400).json({ error: message });
  }
});

export default router;
