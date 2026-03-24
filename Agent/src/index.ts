import WebSocket from "ws";
import dotenv from 'dotenv';

import getSystemInfo from "./cust_func/get_specs";

dotenv.config();

const nodeId = "node-1";
const SERVER_URL = "ws://localhost:5380";

console.log(`🚀 Agent starting, connecting to ${SERVER_URL}...`);

// 🔌 Connect to server as a client
const ws = new WebSocket(SERVER_URL);

// 🔌 When connected
ws.on("open", () => {
  console.log("✅ Connected to server");

  // 🔹 Register node
  ws.send(JSON.stringify({
    type: "register",
    nodeId
  }));

  // 🔹 Heartbeat every 5 seconds
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "heartbeat",
        nodeId
      }));
    }
  }, 5000);
});

// 📩 Listen for messages from server
ws.on("message", async (msg) => {
  try {
    const data = JSON.parse(msg.toString());

    console.log("📩 Message received from server:", data);

    if (data.type === "task") {
      console.log("🧠 Processing task:", data.payload);

      // Example task processing: multiply the value
      const result = data.payload.value * 2;

      // 🔁 Send result back
      ws.send(JSON.stringify({
        type: "result",
        nodeId,
        taskId: data.taskId,
        result
      }));
      console.log("📤 Result sent back to server:", result);
    }
    else if(data.type === 'specs'){
      console.log("📊 Gathering system specs...");
      const specs = await getSystemInfo();
      ws.send(JSON.stringify({
        type: "specs_result",
        nodeId,
        taskId: data.taskId,
        specs
      }));
      console.log("📤 System specs sent to server.");
    }
  }
  catch (err) {
    console.error("❌ Invalid JSON received or processing error:", err);
  }
});

// ❌ Handle errors
ws.on("error", (err) => {
  console.error("❌ WebSocket error:", err.message);
});

// 🔌 Handle disconnect
ws.on("close", () => {
  console.log("🔌 Disconnected from server");
  // Optional: Add reconnection logic here
});
