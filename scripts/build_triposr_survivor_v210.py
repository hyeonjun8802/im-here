#!/usr/bin/env python3
"""Build the AFTERDAY v2.1 game GLB from a textured TripoSR OBJ.

Run with Blender, not the system Python:
  blender --background --python scripts/build_triposr_survivor_v210.py -- \
    --obj /path/to/mesh.obj --texture /path/to/texture.png

The TripoSR reconstruction is re-oriented, normalized to the existing game's
3-metre character scale, textured, and bound to the nine named joints consumed
by src/beardedSurvivorV190.js.
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "public/assets/models/afterday/afterday_bearded_survivor_v190.glb"


def arguments() -> argparse.Namespace:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--obj", required=True, type=Path)
    parser.add_argument("--texture", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--height", type=float, default=3.0)
    return parser.parse_args(args)


def bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (
        Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points))),
        Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points))),
    )


def import_character(obj_path: Path, texture_path: Path, height: float) -> bpy.types.Object:
    bpy.ops.wm.obj_import(
        filepath=str(obj_path.resolve()),
        forward_axis="NEGATIVE_Y",
        up_axis="Z",
        use_split_objects=False,
        use_split_groups=False,
    )
    character = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")
    character.name = "TripoSR_Survivor_Surface"
    character.data.name = "TripoSR_Survivor_Mesh"

    # TripoSR's reconstructed face points toward +X. AFTERDAY's Blender source
    # points toward -Y, which the glTF exporter maps to Three.js +Z.
    character.rotation_euler.z = math.radians(-90)
    bpy.context.view_layer.objects.active = character
    character.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    low, high = bounds(character)
    scale = height / (high.z - low.z)
    character.scale = (scale, scale, scale)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    low, high = bounds(character)
    character.location += Vector((-(low.x + high.x) / 2, -(low.y + high.y) / 2, -low.z))
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    material = bpy.data.materials.new("TripoSR baked survivor PBR")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    shader = nodes.get("Principled BSDF")
    image_node = nodes.new("ShaderNodeTexImage")
    image_node.name = "Hugging Face TripoSR baked albedo"
    image_node.image = bpy.data.images.load(str(texture_path.resolve()))
    image_node.image.pack()
    links.new(image_node.outputs["Color"], shader.inputs["Base Color"])
    shader.inputs["Metallic"].default_value = 0.0
    shader.inputs["Roughness"].default_value = 0.82
    character.data.materials.clear()
    character.data.materials.append(material)
    return character


def create_rig() -> bpy.types.Object:
    armature_data = bpy.data.armatures.new("AFTERDAY_TripoSR_Rig")
    armature = bpy.data.objects.new("AFTERDAY_TripoSR_Rig", armature_data)
    bpy.context.collection.objects.link(armature)
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    specs = {
        "RigRoot": ((0, 0, 0.03), (0, 0, 0.22), None, False),
        "Torso": ((0, 0, 1.02), (0, 0, 2.12), "RigRoot", True),
        "Head": ((0, -0.015, 2.03), (0, -0.015, 2.80), "RigRoot", True),
        "UpperArm_L": ((-0.58, 0, 1.83), (-0.58, 0, 1.24), "RigRoot", True),
        "UpperArm_R": ((0.58, 0, 1.83), (0.58, 0, 1.24), "RigRoot", True),
        "UpperLeg_L": ((-0.28, 0, 1.08), (-0.28, 0, 0.59), "RigRoot", True),
        "UpperLeg_R": ((0.28, 0, 1.08), (0.28, 0, 0.59), "RigRoot", True),
        "Knee_L": ((-0.28, 0, 0.59), (-0.28, 0, 0.11), "UpperLeg_L", True),
        "Knee_R": ((0.28, 0, 0.59), (0.28, 0, 0.11), "UpperLeg_R", True),
    }
    bones = {}
    for name, (head, tail, parent, deform) in specs.items():
        bone = armature.data.edit_bones.new(name)
        bone.head, bone.tail, bone.use_deform = head, tail, deform
        bones[name] = bone
        if parent:
            bone.parent = bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    return armature


def bind_anatomical_weights(character: bpy.types.Object, armature: bpy.types.Object) -> None:
    groups = {name: character.vertex_groups.new(name=name) for name in (
        "Torso", "Head", "UpperArm_L", "UpperArm_R",
        "UpperLeg_L", "UpperLeg_R", "Knee_L", "Knee_R",
    )}
    buckets = {name: {} for name in groups}

    def smooth(a: float, b: float, value: float) -> float:
        t = min(1.0, max(0.0, (value - a) / (b - a)))
        return t * t * (3.0 - 2.0 * t)

    def record(name: str, index: int, weight: float) -> None:
        if weight < 0.01:
            return
        quantized = min(1.0, round(weight * 50) / 50)
        buckets[name].setdefault(quantized, []).append(index)

    for vertex in character.data.vertices:
        x, _y, z = vertex.co
        head = smooth(1.90, 2.10, z)
        legs = (1.0 - head) * (1.0 - smooth(1.00, 1.20, z))
        middle = max(0.0, 1.0 - head - legs)
        arms = middle * smooth(0.30, 0.53, abs(x))
        torso = max(0.0, middle - arms)
        right = smooth(-0.08, 0.08, x)
        left = 1.0 - right
        knees = 1.0 - smooth(0.47, 0.69, z)

        weights = {
            "Head": head,
            "Torso": torso,
            "UpperArm_L": arms * left,
            "UpperArm_R": arms * right,
            "UpperLeg_L": legs * left * (1.0 - knees),
            "UpperLeg_R": legs * right * (1.0 - knees),
            "Knee_L": legs * left * knees,
            "Knee_R": legs * right * knees,
        }
        total = sum(weights.values()) or 1.0
        for name, weight in weights.items():
            record(name, vertex.index, weight / total)
    for name, weight_buckets in buckets.items():
        for weight, indices in weight_buckets.items():
            groups[name].add(indices, weight, "REPLACE")

    modifier = character.modifiers.new("AFTERDAY nine-joint skin", "ARMATURE")
    modifier.object = armature
    character.parent = armature


def export_glb(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(output.resolve()),
        export_format="GLB",
        export_yup=True,
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_skins=True,
        export_morph=False,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )


def main() -> None:
    args = arguments()
    for path in (args.obj, args.texture):
        if not path.is_file():
            raise FileNotFoundError(path)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    character = import_character(args.obj, args.texture, args.height)
    armature = create_rig()
    bind_anatomical_weights(character, armature)
    export_glb(args.output)
    low, high = bounds(character)
    print(
        f"AFTERDAY TripoSR GLB: {args.output} | "
        f"size=({high.x-low.x:.3f}, {high.y-low.y:.3f}, {high.z-low.z:.3f}) | "
        f"vertices={len(character.data.vertices)} polygons={len(character.data.polygons)}"
    )


if __name__ == "__main__":
    main()
