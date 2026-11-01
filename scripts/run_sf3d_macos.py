#!/usr/bin/env python3
"""Run the official Stable Fast 3D CLI on one AFTERDAY source image.

The official repository and gated model must already be installed and accepted.
This wrapper deliberately sends one image per inference, as required by the art
brief, and enables the experimental Apple Silicon MPS fallback.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import subprocess
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--sf3d-home", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--texture-resolution", type=int, default=2048)
    parser.add_argument("--remesh-option", choices=("none", "triangle", "quad"), default="triangle")
    args = parser.parse_args()

    input_path = args.input.expanduser().resolve()
    sf3d_home = args.sf3d_home.expanduser().resolve()
    run_py = sf3d_home / "run.py"
    if not input_path.is_file():
        raise FileNotFoundError(f"Input image not found: {input_path}")
    if not run_py.is_file():
        raise FileNotFoundError(f"Official SF3D run.py not found: {run_py}")
    args.output_dir.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    env["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
    command = [
        sys.executable,
        str(run_py),
        str(input_path),
        "--output-dir",
        str(args.output_dir.resolve()),
        "--texture-resolution",
        str(args.texture_resolution),
        "--remesh_option",
        args.remesh_option,
    ]
    subprocess.run(command, cwd=sf3d_home, env=env, check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
