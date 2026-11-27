"""Serialise Compose replacements while allowing concurrent read-only verification."""
import fcntl
import subprocess
import sys
from pathlib import Path


def run(mode, command):
    state = Path(__file__).resolve().parent.parent / ".local.nosync"
    state.mkdir(exist_ok=True)
    with (state / "compose.lock").open("a") as lock:
        fcntl.flock(lock.fileno(), {"read": fcntl.LOCK_SH, "write": fcntl.LOCK_EX}[mode])
        return subprocess.run(command).returncode


if __name__ == "__main__":
    raise SystemExit(run(sys.argv[1], sys.argv[2:]))
