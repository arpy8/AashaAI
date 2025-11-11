import subprocess
import time
import os
import signal

COMMAND = ["uv", "run", "main.py"]
RESTART_DELAY = 5

def run_server():
    print("🚀 Starting server...")
    process = subprocess.Popen(COMMAND)
    return process

def main():
    process = run_server()

    try:
        while True:
            retcode = process.poll()
            if retcode is not None:
                print(f"⚠️ Server stopped with exit code {retcode}. Restarting in {RESTART_DELAY} seconds...")
                time.sleep(RESTART_DELAY)
                process = run_server()
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n🛑 Stopping watchdog...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.kill(process.pid, signal.SIGKILL)
        print("✅ Server and watchdog stopped cleanly.")

if __name__ == "__main__":
    main()