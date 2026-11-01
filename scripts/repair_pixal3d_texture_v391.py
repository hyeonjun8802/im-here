#!/usr/bin/env python3
"""Repair Pixal3D UV-island bleed without recolouring valid dark materials.

Pixal3D's atlas contains hundreds of thousands of tiny UV islands. Black pixels
between those islands leak into browser mipmaps and appear as holes/scratches.
This tool rasterizes the *actual* GLB UV triangles, keeps every texel inside an
island, and fills unused atlas space from its nearest valid island texel. Small
near-black isolated bake defects inside islands are inpainted separately.
"""
from __future__ import annotations

import argparse
import io
import json
import struct
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


COMPONENT_DTYPES = {
    5121: np.uint8,
    5123: np.uint16,
    5125: np.uint32,
    5126: np.float32,
}
TYPE_COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--mask-output", type=Path)
    parser.add_argument("--padding", type=float, default=48.0)
    parser.add_argument("--defect-area", type=int, default=320)
    parser.add_argument("--despeckle-threshold", type=int, default=72)
    parser.add_argument("--despeckle-kernel", type=int, default=5)
    return parser.parse_args()


def read_glb(path: Path) -> tuple[dict, memoryview]:
    blob = path.read_bytes()
    if blob[:4] != b"glTF" or struct.unpack_from("<I", blob, 4)[0] != 2:
        raise ValueError(f"Not a GLB 2.0 file: {path}")
    json_length = struct.unpack_from("<I", blob, 12)[0]
    manifest = json.loads(blob[20 : 20 + json_length])
    binary_header = 20 + json_length
    binary_length = struct.unpack_from("<I", blob, binary_header)[0]
    binary = memoryview(blob)[binary_header + 8 : binary_header + 8 + binary_length]
    return manifest, binary


def accessor(manifest: dict, binary: memoryview, index: int) -> np.ndarray:
    item = manifest["accessors"][index]
    view = manifest["bufferViews"][item["bufferView"]]
    dtype = np.dtype(COMPONENT_DTYPES[item["componentType"]])
    components = TYPE_COMPONENTS[item["type"]]
    offset = view.get("byteOffset", 0) + item.get("byteOffset", 0)
    stride = view.get("byteStride", dtype.itemsize * components)
    raw = np.frombuffer(
        binary, dtype=np.uint8, count=stride * item["count"], offset=offset,
    ).reshape(item["count"], stride)
    values = np.ndarray(
        (item["count"], components), dtype=dtype, buffer=raw,
        offset=0, strides=(stride, dtype.itemsize),
    ).copy()
    return values.squeeze()


def embedded_image(manifest: dict, binary: memoryview, image_index: int) -> Image.Image:
    image = manifest["images"][image_index]
    view = manifest["bufferViews"][image["bufferView"]]
    start = view.get("byteOffset", 0)
    end = start + view["byteLength"]
    return Image.open(io.BytesIO(binary[start:end])).convert("RGBA")


def uv_coverage(manifest: dict, binary: memoryview, width: int, height: int) -> np.ndarray:
    primitive = manifest["meshes"][0]["primitives"][0]
    uv = accessor(manifest, binary, primitive["attributes"]["TEXCOORD_0"])
    triangles = accessor(manifest, binary, primitive["indices"]).reshape(-1, 3)
    points = uv[triangles].copy()
    # glTF texture coordinates and embedded images both use upper-left origin.
    points[:, :, 0] *= width - 1
    points[:, :, 1] *= height - 1
    points = np.rint(points).astype(np.int32)
    points[:, :, 0] = np.clip(points[:, :, 0], 0, width - 1)
    points[:, :, 1] = np.clip(points[:, :, 1], 0, height - 1)
    mask = np.zeros((height, width), np.uint8)
    for start in range(0, len(points), 5000):
        cv2.fillPoly(mask, [triangle for triangle in points[start : start + 5000]], 255)
    return mask


def inpaint_isolated_defects(image: np.ndarray, used: np.ndarray, max_area: int) -> tuple[np.ndarray, int]:
    bgr = image[:, :, :3]
    grey = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    dark = ((grey < 20) & used).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(dark, 8)
    sizes = stats[:, cv2.CC_STAT_AREA]
    small_labels = np.where((sizes <= max_area) & (np.arange(count) > 0))[0]
    small = np.isin(labels, small_labels)
    local_mean = cv2.blur(grey, (9, 9))
    defects = (small & (local_mean > 38)).astype(np.uint8) * 255
    defects = cv2.dilate(defects, np.ones((3, 3), np.uint8), iterations=1)
    defects[~used] = 0
    repaired = cv2.inpaint(bgr, defects, 3, cv2.INPAINT_TELEA)
    result = image.copy()
    result[:, :, :3] = repaired
    return result, int(np.count_nonzero(defects))


def pad_uv_islands(image: np.ndarray, used: np.ndarray, padding: float) -> tuple[np.ndarray, int]:
    outside = (~used).astype(np.uint8)
    distance, labels = cv2.distanceTransformWithLabels(
        outside, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL,
    )
    maximum = int(labels.max())
    lookup = np.zeros((maximum + 1, 4), np.uint8)
    lookup[labels[used]] = image[used]
    band = (~used) & (distance <= padding)
    result = image.copy()
    result[band] = lookup[labels[band]]
    # Opaque padding prevents alpha-edge darkening in generated mip levels.
    result[:, :, 3] = 255
    return result, int(np.count_nonzero(band))


def despeckle_isolated_colour_outliers(
    image: np.ndarray, threshold: int, kernel: int,
) -> tuple[np.ndarray, int]:
    """Replace only sharp local bake outliers; preserve broad material detail."""
    if kernel < 3 or kernel % 2 == 0:
        raise ValueError("--despeckle-kernel must be an odd integer >= 3")
    colour = image[:, :, :3]
    median = cv2.medianBlur(colour, kernel)
    difference = np.max(
        np.abs(colour.astype(np.int16) - median.astype(np.int16)), axis=2,
    )
    outliers = difference > threshold
    result = image.copy()
    result[:, :, :3][outliers] = median[outliers]
    return result, int(np.count_nonzero(outliers))


def main() -> None:
    args = arguments()
    manifest, binary = read_glb(args.input)
    material = manifest["materials"][0]
    texture_index = material["pbrMetallicRoughness"]["baseColorTexture"]["index"]
    image_index = manifest["textures"][texture_index]["source"]
    rgba = np.asarray(embedded_image(manifest, binary, image_index), dtype=np.uint8)
    # OpenCV operates in BGRA; convert only while processing/saving.
    bgra = cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA)
    height, width = bgra.shape[:2]
    coverage = uv_coverage(manifest, binary, width, height)
    used = coverage > 0
    repaired, defect_pixels = inpaint_isolated_defects(bgra, used, args.defect_area)
    repaired, padding_pixels = pad_uv_islands(repaired, used, args.padding)
    repaired, despeckled_pixels = despeckle_isolated_colour_outliers(
        repaired, args.despeckle_threshold, args.despeckle_kernel,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(args.output), repaired, [cv2.IMWRITE_PNG_COMPRESSION, 6]):
        raise RuntimeError(f"Could not write {args.output}")
    if args.mask_output:
        args.mask_output.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(args.mask_output), coverage)
    print(json.dumps({
        "input": str(args.input), "output": str(args.output),
        "size": [width, height], "uv_coverage": round(float(used.mean()), 6),
        "inpainted_defect_pixels": defect_pixels,
        "padded_pixels": padding_pixels, "padding_radius": args.padding,
        "despeckled_pixels": despeckled_pixels,
        "despeckle_threshold": args.despeckle_threshold,
        "despeckle_kernel": args.despeckle_kernel,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
