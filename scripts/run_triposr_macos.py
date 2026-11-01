#!/usr/bin/env python3
"""Apple-Silicon TripoSR runner for AFTERDAY.

This keeps neural inference on MPS and explicitly runs marching cubes on CPU,
which is required by the macOS torchmcubes build. It exports a textured OBJ
that scripts/build_triposr_survivor_v210.py turns into the game-ready GLB.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import rembg
import torch
import xatlas
from PIL import Image


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    parser.add_argument("--triposr-home", required=True, type=Path)
    parser.add_argument("--output-dir", type=Path, default=Path("triposr-output"))
    parser.add_argument("--crop-bottom", type=int, default=0)
    parser.add_argument("--foreground-ratio", type=float, default=0.90)
    parser.add_argument("--chunk-size", type=int, default=4096)
    parser.add_argument("--mc-resolution", type=int, default=256)
    parser.add_argument("--texture-resolution", type=int, default=1024)
    return parser.parse_args()


def main() -> None:
    args = arguments()
    if not args.image.is_file():
        raise FileNotFoundError(args.image)
    if not (args.triposr_home / "tsr").is_dir():
        raise FileNotFoundError(f"TripoSR source not found: {args.triposr_home}")
    sys.path.insert(0, str(args.triposr_home.resolve()))

    from tsr.bake_texture import make_atlas, rasterize_position_atlas
    from tsr.system import TSR
    from tsr.utils import remove_background, resize_foreground

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = TSR.from_pretrained(
        "stabilityai/TripoSR",
        config_name="config.yaml",
        weight_name="model.ckpt",
    )
    model.renderer.set_chunk_size(args.chunk_size)
    model.to(device).eval()

    # The macOS wheel exposes torchmcubes' CPU kernel. Keep MPS for the neural
    # network, but move only the scalar field used by marching cubes to CPU.
    cpu_marching_cubes = model.isosurface_helper.mc_func

    def marching_cubes_macos(level: torch.Tensor, threshold: float):
        return cpu_marching_cubes(level.detach().cpu(), threshold)

    model.isosurface_helper.mc_func = marching_cubes_macos

    image = Image.open(args.image)
    if args.crop_bottom:
        image = image.crop((0, 0, image.width, image.height - args.crop_bottom))
    image = remove_background(image, rembg.new_session())
    image = resize_foreground(image, args.foreground_ratio)
    rgba = np.asarray(image).astype(np.float32) / 255.0
    rgb = rgba[:, :, :3] * rgba[:, :, 3:4] + (1.0 - rgba[:, :, 3:4]) * 0.5
    prepared = Image.fromarray(np.clip(rgb * 255.0, 0, 255).astype(np.uint8))

    args.output_dir.mkdir(parents=True, exist_ok=True)
    prepared.save(args.output_dir / "input.png")
    with torch.no_grad():
        scene_codes = model([prepared], device=device)
        meshes = model.extract_mesh(
            scene_codes,
            has_vertex_color=False,
            resolution=args.mc_resolution,
        )

    mesh = meshes[0]
    padding = round(max(2, args.texture_resolution / 256))
    atlas = make_atlas(mesh, args.texture_resolution, padding)
    positions_texture = rasterize_position_atlas(
        mesh,
        atlas["vmapping"],
        atlas["indices"],
        atlas["uvs"],
        args.texture_resolution,
        padding,
    )
    positions = torch.tensor(
        positions_texture.reshape(-1, 4)[:, :3], device=scene_codes.device
    )
    with torch.no_grad():
        queried = model.renderer.query_triplane(model.decoder, positions, scene_codes[0])
    colors = queried["color"].cpu().numpy().reshape(-1, 3)
    alpha = positions_texture.reshape(-1, 4)[:, 3:4]
    rgba_texture = np.concatenate((colors, alpha), axis=1)
    rgba_texture[rgba_texture[:, 3] == 0.0] = (0, 0, 0, 0)
    rgba_texture = rgba_texture.reshape(args.texture_resolution, args.texture_resolution, 4)

    xatlas.export(
        str(args.output_dir / "mesh.obj"),
        mesh.vertices[atlas["vmapping"]],
        atlas["indices"],
        atlas["uvs"],
        mesh.vertex_normals[atlas["vmapping"]],
    )
    Image.fromarray(np.clip(rgba_texture * 255.0, 0, 255).astype(np.uint8)).transpose(
        Image.Transpose.FLIP_TOP_BOTTOM
    ).save(args.output_dir / "texture.png")
    print(f"TripoSR {device}: {args.output_dir / 'mesh.obj'}")


if __name__ == "__main__":
    main()
