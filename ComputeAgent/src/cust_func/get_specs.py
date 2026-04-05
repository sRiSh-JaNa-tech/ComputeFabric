import psutil
import platform
import cpuinfo
import subprocess
import re
import speedtest

def get_system_info():
    """
    Gathers system information equivalent to the 'systeminformation' Node.js package.
    """
    try:
        cpu_info = cpuinfo.get_cpu_info()
        cpu_data = {
            'manufacturer': cpu_info.get('vendor_id_raw', 'Unknown'),
            'brand': cpu_info.get('brand_raw', 'Unknown'),
            'speed': cpu_info.get('hz_actual_friendly', 'Unknown'),
            'cores': psutil.cpu_count(logical=False),
            'physicalCores': psutil.cpu_count(logical=True),
            'processors': 1 # Simplified
        }

        mem = psutil.virtual_memory()
        mem_data = {
            'total': mem.total,
            'free': mem.available,
            'used': mem.used,
            'active': mem.active if hasattr(mem, 'active') else None,
            'available': mem.available
        }

        disk_data = []
        for part in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(part.mountpoint)
                disk_data.append({
                    'device': part.device,
                    'mount': part.mountpoint,
                    'total': usage.total,
                    'used': usage.used,
                    'available': usage.free
                })
            except Exception:
                continue

        os_data = {
            'platform': platform.system(),
            'distro': platform.release(),
            'release': platform.version(),
            'arch': platform.machine(),
            'hostname': platform.node()
        }

        # GPU info is harder in pure psutil
        gpu_data = []

        # WiFi Info (Windows specific)
        wifi_data = {
            'ssid': 'N/A',
            'signal': '0%',
            'type': 'Ethernet/Unknown'
        }
        if platform.system() == "Windows":
            try:
                output = subprocess.check_output("netsh wlan show interfaces", shell=True).decode('utf-8')
                ssid_match = re.search(r'^\s+SSID\s+:\s+(.*)$', output, re.MULTILINE)
                signal_match = re.search(r'^\s+Signal\s+:\s+(.*)$', output, re.MULTILINE)
                if ssid_match:
                    wifi_data['ssid'] = ssid_match.group(1).strip()
                    wifi_data['type'] = 'WiFi'
                if signal_match:
                    wifi_data['signal'] = signal_match.group(1).strip()
            except Exception:
                pass

        # Speed test (can be slow, using a basic check or placeholder if needed)
        # Using speedtest-cli (library)
        speed_info = {'download': 'Calculating...', 'upload': 'Calculating...'}
        try:
            st = speedtest.Speedtest()
            # For speed, we might want to skip the full test if it's too slow in real-time
            # But the user asked for it. 
            st.get_best_server()
            download_speed = st.download() / 1_000_000  # Mbps
            upload_speed = st.upload() / 1_000_000      # Mbps
            speed_info = {
                'download': f"{download_speed:.2f} Mbps",
                'upload': f"{upload_speed:.2f} Mbps"
            }
        except Exception as e:
            speed_info = {'error': str(e)}

        return {
            'CPU': cpu_data,
            'RAM': mem_data,
            'Disk': disk_data,
            'OS': os_data,
            'GPU': gpu_data,
            'WiFi': wifi_data,
            'Speed': speed_info
        }
    except Exception as e:
        return {'error': str(e)}

if __name__ == "__main__":
    import json
    print(json.dumps(get_system_info(), indent=4))
