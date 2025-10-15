import { NextApiRequest, NextApiResponse } from "next";
import { reportContainerStatus, reportHealth } from "@/lib/runtime/runtime-service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  if (req.method === "POST") {
    const { type, data } = req.body;

    if (type === "container.status") await reportContainerStatus(projectId as string, data);
    if (type === "health.update") await reportHealth(projectId as string, data);

    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}