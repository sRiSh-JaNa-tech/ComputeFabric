import WebSocket from "ws";
import dotenv from "dotenv";
import getSystemInfo from "./cust_func/get_specs";

dotenv.config();

// Interfaces
interface ServerData {
  server_id: string;
  server_name: string;
  link: string;
}

interface SearchResponse {
  status: "found" | "not_found";
  data: ServerData | null;
}

const nodeId = "node-1";

// Fetch server URL from registry
async function connectHost(): Promise<string> {
  const res = await fetch(
    "https://computefabric.onrender.com/getConn/Capybara_34"
  );

  if (!res.ok) {
    throw new Error("Failed to fetch server info");
  }

  const main: SearchResponse = await res.json();

  if (main.status !== "found" || !main.data) {
    throw new Error("Server not found in registry");
  }

  // Convert http/https to ws/wss
  const server_url = main.data.link.replace(/^http/, "ws");

  return server_url;
}

// Main connection logic with auto-reconnect
async function startAgent() {
  try {
    const SERVER_URL = await connectHost();
    console.log(`Connecting to ${SERVER_URL}...`);

    const ws = new WebSocket(SERVER_URL);

    ws.on("open", () => {
      console.log("Connected to server");

      // Register node
      ws.send(
        JSON.stringify({
          type: "register",
          nodeId,
        })
      );

      // Heartbeat
      setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "heartbeat",
              nodeId,
            })
          );
        }
      }, 5000);
    });

    // Handle messages
    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg.toString());

        console.log("Received:", data);

        if (data.type === "task") {
          const result = data.payload.value * 2;

          ws.send(
            JSON.stringify({
              type: "result",
              nodeId,
              taskId: data.taskId,
              result,
            })
          );
        } else if (data.type === "specs") {
          const specs = await getSystemInfo();

          ws.send(
            JSON.stringify({
              type: "specs_result",
              nodeId,
              taskId: data.taskId,
              specs,
            })
          );
        }
      } catch (err) {
        console.error("Message processing error:", err);
      }
    });

    // Handle errors
    ws.on("error", (err) => {
      console.error("WebSocket error:", err.message);
    });

    // Auto reconnect
    ws.on("close", () => {
      console.log("Disconnected. Reconnecting in 3 seconds...");
      setTimeout(startAgent, 3000);
    });

  } catch (err) {
    console.error("Failed to connect:", err);
    console.log("Retrying in 5 seconds...");
    setTimeout(startAgent, 5000);
  }
}

// Start agent
startAgent();