import WebSocket from "ws";


const ws = new WebSocket("ws://localhost:5380");
const nodeId = "node-1";

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
    ws.send(JSON.stringify({
      type: "heartbeat",
      nodeId
    }));
  }, 5000);
});


// 📩 Listen for messages from server
ws.on("message", (msg) => {
  try {
    const data = JSON.parse(msg.toString());

    console.log("📩 Message received from server:", data);

    if (data.type === "task") {
      console.log("🧠 Processing task:", data.payload);

      const result = data.payload.value * 2;

      // 🔁 Send result back
      ws.send(JSON.stringify({
        type: "result",
        nodeId,
        taskId: data.taskId,
        result
      }));
    }

  } catch (err) {
    console.error("❌ Invalid JSON received:", err);
  }
});


// ❌ Handle errors (prevents crash)
ws.on("error", (err) => {
  console.error("WebSocket error:", err.message);
});


// 🔌 Handle disconnect
ws.on("close", () => {
  console.log("🔌 Disconnected from server");
});