#!/usr/bin/env python3
"""Generate the high-detail AFTERDAY source GLB with TencentARC Pixal3D Space."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import uuid

import httpx
from gradio_client import Client, handle_file


def arguments() -> argparse.Namespace:
    workspace = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--image",
        type=Path,
        default=workspace / "GLB_Minimal_Assets/01_GLB_Input/01_A_Pose_Front.png",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "artifacts/pixal3d-v390",
    )
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--resolution", type=int, default=1536, choices=(1024, 1536))
    parser.add_argument("--fov", type=float, default=0.2)
    return parser.parse_args()


def main() -> None:
    args = arguments()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    session_id = uuid.uuid4().hex
    download_client = Client("TencentARC/Pixal3D")
    raw_client = Client("TencentARC/Pixal3D", download_files=False)

    preprocessed = download_client.predict(
        handle_file(str(args.image.resolve())), api_name="/preprocess"
    )
    generated = raw_client.predict(
        handle_file(preprocessed),
        args.seed,
        args.resolution,
        7.5,
        0.7,
        12,
        5.0,
        7.5,
        0.5,
        12,
        3.0,
        1.0,
        0.0,
        12,
        3.0,
        args.fov,
        "rad",
        session_id,
        api_name="/generate_3d",
    )
    if not isinstance(generated, dict) or not generated.get("state_path"):
        raise RuntimeError(f"Pixal3D did not return a latent state: {generated!r}")

    extracted = raw_client.predict(
        generated["state_path"],
        1_000_000,
        4096,
        session_id,
        api_name="/extract_glb_api",
    )
    if isinstance(extracted, dict):
        remote_path = extracted.get("path") or extracted.get("url")
    else:
        remote_path = str(extracted)
    if not remote_path:
        raise RuntimeError(f"Pixal3D did not return a GLB path: {extracted!r}")

    final_glb = args.output_dir / "afterday_pixal3d_front_source_v390.glb"
    if str(remote_path).startswith(("http://", "https://")):
        glb_url = str(remote_path)
    else:
        glb_url = f"https://tencentarc-pixal3d.hf.space/tmp/{Path(str(remote_path)).name}"
    with httpx.stream("GET", glb_url, follow_redirects=True, timeout=300.0) as response:
        response.raise_for_status()
        with final_glb.open("wb") as output_file:
            for chunk in response.iter_bytes():
                output_file.write(chunk)

    manifest = {
        "generator": "TencentARC/Pixal3D official Hugging Face Space",
        "input": str(args.image.resolve()),
        "output": str(final_glb.resolve()),
        "seed": args.seed,
        "resolution": args.resolution,
        "manual_fov_radians": args.fov,
        "decimation_target": 1_000_000,
        "texture_size": 4096,
        "camera_angle_x": generated.get("camera_angle_x"),
        "distance": generated.get("distance"),
    }
    (args.output_dir / "generation.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(final_glb)


if __name__ == "__main__":
    main()
