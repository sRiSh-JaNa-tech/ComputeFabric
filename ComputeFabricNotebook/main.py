from flask import Flask, request, render_template, jsonify
import sys
import io
import base64
import traceback
import contextlib
import uuid
import requests

app = Flask(__name__)

# In-memory state mimicking a Jupyter kernel
kernel_globals = {}


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


@app.route("/")
def read_root():
    return render_template("index.html")


@app.route("/api/execute/<node_id>", methods=["POST"])
def execute_code(node_id="current"):
    global kernel_globals
    data = request.get_json()
    code = data.get("code", "")
    
    if node_id != 'current':
        payload = {
            "type": "execute",
            "nodeId": node_id,
            "taskId": str(uuid.uuid4()),
            "payload": {
                "codeId": str(uuid.uuid4()),
                "code": code
            }
        }
        try:
            resp = requests.post("http://localhost:5380/execute", json=payload)
            resp.raise_for_status()
            return jsonify(resp.json())
        except Exception as e:
            return jsonify({"error": f"CommServer Error: {str(e)}"}), 500

    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    error_msg = None
    captured_images = []

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

    return jsonify({
        "output": stdout_capture.getvalue(),
        "error": stderr_capture.getvalue() or error_msg,
        "images": captured_images
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
