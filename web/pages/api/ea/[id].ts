
import type { NextApiRequest, NextApiResponse } from "next";
import { analyzeEaByConfigId } from "../../../lib/eaAnalysisService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (Array.isArray(id) || !id) {
    res.status(400).json({ error: "Invalid EA id" });
    return;
  }

  const eaConfigId = Number(id);
  if (Number.isNaN(eaConfigId)) {
    res.status(400).json({ error: "EA id must be a number" });
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const result = await analyzeEaByConfigId(eaConfigId);

    res.status(200).json({
      eaConfig: result.eaConfig,
      insights: result.insights,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
}
