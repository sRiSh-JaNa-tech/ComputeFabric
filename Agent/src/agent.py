import os
import json
import time
import threading
import requests
import uuid
import contextlib
import traceback
import io
import base64
import websocket
from flask import Flask, jsonify
from dotenv import load_dotenv
from cust_func.get_specs import get_system_info

load_dotenv()

app = Flask(__name__)

kernel_globals = {}

#Hello World

NODE_ID = "node-1"
REGISTRY_URL = "https://computefabric.onrender.com/getConn/Capybara_34"

def _style_fig_for_dark_bg(fig):
    """Apply dark-theme styling so text is visible on dark backgrounds."""
    fig.patch.set_facecolor('#0f172a')
    for ax in fig.get_axes():
        ax.set_facecolor('#1e293b')
        ax.tick_params(colors='#e2e8f0', which='both')
        ax.xaxis.label.set_color('#e2e8f0')
        ax.yaxis.label.set_color('#e2e8f0')
        ax.title.set_color('#e2e8f0')
        for spine in ax.spines.values():
            spine.set_edgecolor('#475569')



def _capture_matplotlib_figures():
    """Capture all open matplotlib figures as base64 PNG strings and close them."""
    images = []
    try:
        import matplotlib
        matplotlib.use('Agg')  # Non-interactive backend
        import matplotlib.pyplot as plt

        for fig_num in plt.get_fignums():
            fig = plt.figure(fig_num)
            _style_fig_for_dark_bg(fig)
            buf = io.BytesIO()
            fig.savefig(buf, format='png', dpi=100, bbox_inches='tight',
                        facecolor='#0f172a', edgecolor='none')
            buf.seek(0)
            images.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
            buf.close()
        plt.close('all')
    except ImportError:
        pass  # matplotlib not installed, skip
    return images


def _patch_plt_show(image_list):
    """
    Replace plt.show() so it captures figures into image_list
    instead of trying to open a GUI window.
    """
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt

        original_show = plt.show

        def patched_show(*args, **kwargs):
            for fig_num in plt.get_fignums():
                fig = plt.figure(fig_num)
                _style_fig_for_dark_bg(fig)
                buf = io.BytesIO()
                fig.savefig(buf, format='png', dpi=100, bbox_inches='tight',
                            facecolor='#0f172a', edgecolor='none')
                buf.seek(0)
                image_list.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
                buf.close()
            plt.close('all')

        plt.show = patched_show
        return original_show
    except ImportError:
        return None


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
                        captured_images = []
                        code = data.get("payload").get("code")

                        # Patch plt.show() before execution
                        original_show = _patch_plt_show(captured_images)

                        try:
                            with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
                                compiled_code = compile(code, "<string>", "exec")
                                exec(compiled_code, kernel_globals)
                        except Exception as e:
                            error_msg = traceback.format_exc()
                        
                        # Auto-capture any remaining open figures not captured by plt.show()
                        remaining = _capture_matplotlib_figures()
                        captured_images.extend(remaining)

                        # Restore original plt.show()
                        if original_show is not None:
                            try:
                                import matplotlib.pyplot as plt
                                plt.show = original_show
                            except ImportError:
                                pass

                        ws.send(json.dumps({
                            "type": "execute_result",
                            "nodeId": NODE_ID,
                            "taskId": data.get("taskId"),
                            "output": stdout_capture.getvalue(),
                            "error": stderr_capture.getvalue() or error_msg,
                            "images": captured_images
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
