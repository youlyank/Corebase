import { publish } from "../events/bus";

export async function reportContainerStatus(projectId: string, metrics: any) {
  await publish(`project:${projectId}`, {
    type: "container.status",
    projectId,
    data: metrics,
  });
}

export async function reportHealth(projectId: string, stats: any) {
  await publish(`project:${projectId}`, {
    type: "health.update",
    projectId,
    data: stats,
  });
}