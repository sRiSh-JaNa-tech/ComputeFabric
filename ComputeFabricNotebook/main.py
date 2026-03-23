from flask import Flask, request, render_template, jsonify
import sys
import io
import traceback
import contextlib

app = Flask(__name__)

# In-memory state mimicking a Jupyter kernel
kernel_globals = {}

@app.route("/")
def read_root():
    return render_template("index.html")

@app.route("/api/execute", methods=["POST"])
def execute_code():
    global kernel_globals
    data = request.get_json()
    code = data.get("code", "")
    
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    error_msg = None
    
    try:
        with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
            compiled_code = compile(code, "<string>", "exec")
            exec(compiled_code, kernel_globals)
    except Exception as e:
        error_msg = traceback.format_exc()
        
    return jsonify({
        "output": stdout_capture.getvalue(),
        "error": stderr_capture.getvalue() or error_msg
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
