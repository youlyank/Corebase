import { io } from "socket.io-client";

export const useRuntimeSocket = (projectId: string) => {
  const socket = io("/runtime", { auth: { token: localStorage.getItem("token") } });
  socket.emit("join", { projectId });
  return socket;
};