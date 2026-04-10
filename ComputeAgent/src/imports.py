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
import secrets
import string
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import websocket
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from flask import Flask, jsonify, render_template_string
from dotenv import load_dotenv
from cust_func.get_specs import get_system_info
from waitress import serve