import os
import json
import time
import threading
import requests
import uuid
import contextlib
import traceback
import io
import websocket
from flask import Flask, jsonify
from dotenv import load_dotenv
from cust_func.get_specs import get_system_info

load_dotenv()

app = Flask(__name__)

kernel_globals = {}

NODE_ID = "node-1"
REGISTRY_URL = "https://computefabric.onrender.com/getConn/Capybara_34"

class AgentState:
    def __init__(self):
        self.is_connected = False
        self.server_url = None
        self.retry_count = 0
        self.last_heartbeat = None

state = AgentState()

def connect_host():
    """Fetch server URL from registry."""
    print(f"Fetching server info from {REGISTRY_URL}...")
    response = requests.get(REGISTRY_URL)
    response.raise_for_status()
    data = response.json()
    
    if data.get("status") != "found" or not data.get("data"):
        raise Exception("Server not found in registry")
    
    link = data["data"]["link"]
    # Convert http/https to ws/wss
    if link.startswith("http"):
        server_url = link.replace("http", "ws", 1)
    else:
        server_url = link
        
    return server_url

def start_agent():
    """Main background loop for the WebSocket agent."""
    global kernel_globals
    while True:
        try:
            if not state.server_url or state.retry_count >= 10:
                state.server_url = connect_host()
                state.retry_count = 0
            
            print(f"[Attempt {state.retry_count + 1}/10] Connecting to {state.server_url}...")
            
            def on_message(ws, message):
                try:
                    data = json.loads(message)
                    print(f"Received: {data.get('type')}")
                    
                    if data.get("type") == "task":
                        # Original logic: result = value * 2
                        payload = data.get("payload", {})
                        value = payload.get("value", 0)
                        result = value * 2
                        
                        ws.send(json.dumps({
                            "type": "result",
                            "nodeId": NODE_ID,
                            "taskId": data.get("taskId"),
                            "result": result
                        }))
                        
                    elif data.get("type") == "specs":
                        specs = get_system_info()
                        ws.send(json.dumps({
                            "type": "specs_result",
                            "nodeId": NODE_ID,
                            "taskId": data.get("taskId"),
                            "specs": specs
                        }))

                    elif data.get("type") == "execute":
                        stdout_capture = io.StringIO()
                        stderr_capture = io.StringIO()
                        error_msg = None
                        code = data.get("payload").get("code")
                        try:
                            with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
                                compiled_code = compile(code, "<string>", "exec")
                                exec(compiled_code, kernel_globals)
                        except Exception as e:
                            error_msg = traceback.format_exc()
                        
                        ws.send(json.dumps({
                            "type": "execute_result",
                            "nodeId": NODE_ID,
                            "taskId": data.get("taskId"),
                            "output": stdout_capture.getvalue(),
                            "error": stderr_capture.getvalue() or error_msg
                        }))
                except Exception as e:
                    print(f"Error processing message: {e}")

            def on_error(ws, error):
                print(f"WebSocket error: {error}")

            def on_close(ws, close_status_code, close_msg):
                state.is_connected = False
                print("Disconnected from server.")

            def on_open(ws):
                state.is_connected = True
                state.retry_count = 0
                print("Connected to server.")
                
                # Register node
                ws.send(json.dumps({
                    "type": "register",
                    "nodeId": NODE_ID
                }))
                
                # Heartbeat thread
                def send_heartbeat():
                    while state.is_connected:
                        try:
                            ws.send(json.dumps({
                                "type": "heartbeat",
                                "nodeId": NODE_ID
                            }))
                            state.last_heartbeat = time.time()
                        except Exception:
                            break
                        time.sleep(5)
                
                hb_thread = threading.Thread(target=send_heartbeat, daemon=True)
                hb_thread.start()

            ws = websocket.WebSocketApp(
                state.server_url,
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close
            )
            
            ws.run_forever()
            
        except Exception as e:
            print(f"Agent error: {e}")
            
        state.retry_count += 1
        print("Reconnecting in 3 seconds...")
        time.sleep(3)

@app.route('/status')
def get_status():
    return jsonify({
        "node_id": NODE_ID,
        "is_connected": state.is_connected,
        "server_url": state.server_url,
        "last_heartbeat": state.last_heartbeat
    })

@app.route('/specs')
def get_specs():
    return jsonify(get_system_info())

if __name__ == "__main__":
    # Start agent in background thread
    agent_thread = threading.Thread(target=start_agent, daemon=True)
    agent_thread.start()
    
    # Run Flask server
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
