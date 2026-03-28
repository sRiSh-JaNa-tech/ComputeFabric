import express from 'express';
import { Request, Response } from 'express';
import http from 'http';
import WebSocket from 'ws';
import fs from 'fs';
import dotenv from 'dotenv';
import cors from 'cors';

import ITask from './schema/Task';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });
const PORT=5380;

const nodes: Record<string, any> = {};

function sendToNode(nodeId: string, message: ITask) {
  const node = nodes[nodeId];

  if (!node) {
    console.log("Node not found:", nodeId);
    return;
  }

  if (node.ws.readyState === WebSocket.OPEN) {
    node.ws.send(JSON.stringify(message));
    console.log("Sent to", nodeId, message);
    return true;
  } else {
    console.log("Connection not open for:", nodeId);
    return false;
  }
}


app.get("/", (req, res) => {
  res.send("Heart Server Running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/available", async (req: Request, res: Response) => {
  try {
    const activeNodes = Object.keys(nodes);
    
    if (activeNodes.length === 0) {
      res.json({ status: "success", agents: [] });
      return;
    }

    const fetchId = "live-" + Date.now() + "-" + Math.random().toString(36).substring(7);

    // Broadcast live spec request to all connected agents
    activeNodes.forEach(id => {
      if (nodes[id]) {
        nodes[id].expectedSpecTask = fetchId;
        nodes[id].liveSpecsResult = null;
        sendToNode(id, {
          type: "specs",
          taskId: fetchId,
          payload: null
        });
      }
    });

    // Wait asynchronously for agents to compute and return live specs (max 3500ms)
    const timeout = 3500;
    const interval = 50;
    let elapsed = 0;

    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        elapsed += interval;
        let allDone = true;
        
        for (const id of activeNodes) {
          if (nodes[id] && !nodes[id].liveSpecsResult) {
            allDone = false;
            break;
          }
        }

        if (allDone || elapsed >= timeout) {
          clearInterval(timer);
          resolve();
        }
      }, interval);
    });

    // Compile results
    const availableNodes = activeNodes.map(id => ({
      nodeId: id,
      lastSeen: nodes[id]?.lastSeen || Date.now(),
      // Prioritize the freshly minted live specs, fallback to registration cache if they timed out
      specs: nodes[id]?.liveSpecsResult || nodes[id]?.specs || null
    }));

    res.json({
      status: "success",
      agents: availableNodes
    });
    return;
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});


app.post("/execute", async (req: Request, res: Response) => {
  try {
    const { type, nodeId, taskId, payload } = req.body;
    const message = {
      type: type,
      taskId: taskId,
      payload: payload
    };

    if (!nodes[nodeId]) {
      res.status(404).json({ error: "Node not found" });
      return;
    }

    nodes[nodeId].expectedExecuteTask = taskId;
    nodes[nodeId].executeResult = null;

    const sent = sendToNode(nodeId, message);
    if (!sent) {
      res.status(500).json({ error: "Failed to send to node" });
      return;
    }

    // Wait for result
    const timeout = 10000; // 10s for execution
    const interval = 100;
    let elapsed = 0;

    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        elapsed += interval;
        if ((nodes[nodeId] && nodes[nodeId].executeResult) || elapsed >= timeout) {
          clearInterval(timer);
          resolve();
        }
      }, interval);
    });

    if (nodes[nodeId] && nodes[nodeId].executeResult) {
      res.json(nodes[nodeId].executeResult);
      nodes[nodeId].executeResult = null; // Clear after use
    } else {
      res.status(408).json({ error: "Execution timed out" });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

wss.on("connection", (ws) => {
  console.log("Agent connected");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.type === "register") {
        nodes[data.nodeId] = { ws, lastSeen: Date.now(), specs: null };
        console.log("Node registered:", data.nodeId);
        
        // Automatically request specs on connection
        sendToNode(data.nodeId, {
          type: "specs",
          taskId: "get-specs-on-register",
          payload: null
        });
      }

      if (data.type === "heartbeat") {
        if (nodes[data.nodeId]) {
          nodes[data.nodeId].lastSeen = Date.now();
        }
      }

      if (data.type === "specs_result") {
        if (nodes[data.nodeId]) {
          nodes[data.nodeId].specs = data.specs; // Update long-term cache
          
          // If this result matches a live API request block, attach it for immediate response
          if (data.taskId && nodes[data.nodeId].expectedSpecTask === data.taskId) {
            nodes[data.nodeId].liveSpecsResult = data.specs;
          }
          
          console.log(`Live specs synced for ${data.nodeId}`);
        }
      }

      if (data.type === "execute_result") {
        if (nodes[data.nodeId] && nodes[data.nodeId].expectedExecuteTask === data.taskId) {
          nodes[data.nodeId].executeResult = {
            output: data.output,
            error: data.error,
            images: data.images
          };
          console.log(`Execution result received for ${data.nodeId}`);
        }
      }

      console.log("Received:", data.type);

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

// setInterval(() => {
//     sendToNode("node-1", {
//         type: "task",
//         taskId: "task-123",
//         payload: {
//             operation: "multiply",
//             value: 5
//         }
//     });
//   }, 5000);

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});