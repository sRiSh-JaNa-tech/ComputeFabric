import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 8080;

const nodes: Record<string, any> = {};

function sendToNode(nodeId: string, message: any) {
  const node = nodes[nodeId];

  if (!node) {
    console.log("Node not found:", nodeId);
    return;
  }

  if (node.ws.readyState === WebSocket.OPEN) {
    node.ws.send(JSON.stringify(message));
    console.log("Sent to", nodeId, message);
  } else {
    console.log("Connection not open for:", nodeId);
  }
}


app.get("/", (req, res) => {
  res.send("Heart Server Running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

wss.on("connection", (ws) => {
  console.log("Agent connected");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.type === "register") {
        nodes[data.nodeId] = { ws, lastSeen: Date.now() };
        console.log("Node registered:", data.nodeId);
      }

      if (data.type === "heartbeat") {
        if (nodes[data.nodeId]) {
          nodes[data.nodeId].lastSeen = Date.now();
        }
      }

      console.log("Received:", data);

    } catch (err) {
      console.error("Invalid JSON:", err);
    }
  });

  ws.on("close", () => {
    console.log("Agent disconnected");

    for (const id in nodes) {
      if (nodes[id].ws === ws) {
        delete nodes[id];
        console.log("Removed node:", id);
      }
    }
  });
});

setInterval(() => {
    sendToNode("node-1", {
        type: "task",
        taskId: "task-123",
        payload: {
            operation: "multiply",
            value: 5
        }
    });
  }, 5000);

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});