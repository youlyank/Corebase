import { NextApiRequest, NextApiResponse } from "next";
import { getEvents, cleanupOldEvents } from "@/lib/events/bus";

export default async function handler(req: NextApiRequest, NextApiResponse) {
  const { projectId } = req.query;

  if (req.method === "GET") {
    try {
      const { limit = "50" } = req.query;
      const events = await getEvents(projectId as string, parseInt(limit as string));
      
      return res.status(200).json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error) {
      console.error("Failed to fetch events:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch events"
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      // Cleanup old events (admin only)
      await cleanupOldEvents();
      
      return res.status(200).json({
        success: true,
        message: "Old events cleaned up successfully"
      });
    } catch (error) {
      console.error("Failed to cleanup events:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to cleanup events"
      });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}