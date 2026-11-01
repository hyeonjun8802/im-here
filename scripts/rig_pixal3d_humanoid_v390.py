#!/usr/bin/env python3
"""Rig the approved Pixal3D reconstruction with AFTERDAY's humanoid clips.

The 4K/500k-face Pixal3D source remains untouched in artifacts/.  This script
creates a game copy, reuses the proven 20-bone armature and six actions from the
current character, and binds the A-pose reconstruction with automatic weights.

Run with Blender:
  blender --background --python scripts/rig_pixal3d_humanoid_v390.py -- \
    --source artifacts/pixal3d-v390/afterday_pixal3d_front_source_v390.glb \
    --rig-source public/assets/models/afterday/afterday_bearded_survivor_v190.glb \
    --output artifacts/pixal3d-v390/afterday_pixal3d_rigged_v390.glb
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


ROOT = Path(__file__).resolve().parent.parent
JOINTS = (
    "RigRoot", "Pelvis", "Spine", "Chest", "Neck", "Head",
    "Shoulder_L", "UpperArm_L", "ForeArm_L", "Hand_L",
    "Shoulder_R", "UpperArm_R", "ForeArm_R", "Hand_R",
    "UpperLeg_L", "LowerLeg_L", "Foot_L",
    "UpperLeg_R", "LowerLeg_R", "Foot_R",
)
CLIPS = ("Idle", "Walk", "Run", "Wave", "Point", "Radio")


def arguments() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--rig-source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--height", type=float, default=3.0)
    # Direct collapse decimation reopens Pixal3D's fragmented UV/normal seams.
    # Full detail is therefore the safe default; non-zero is experimental only.
    parser.add_argument("--target-faces", type=int, default=0)
    parser.add_argument("--base-color-clean", type=Path)
    return parser.parse_args(values)


def world_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (
        Vector(tuple(min(point[i] for point in points) for i in range(3))),
        Vector(tuple(max(point[i] for point in points) for i in range(3))),
    )


def delete_object(obj: bpy.types.Object) -> None:
    bpy.data.objects.remove(obj, do_unlink=True)


def import_animation_rig(path: Path) -> tuple[bpy.types.Object, bpy.types.Object]:
    bpy.ops.import_scene.gltf(filepath=str(path.resolve()))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one animation armature, got {len(armatures)}")
    armature = armatures[0]
    transfer_surface = bpy.data.objects.get("SF3D_Humanoid_Survivor_Surface")
    if transfer_surface is None:
        raise RuntimeError("Rig source has no skinned SF3D transfer surface")
    missing_joints = sorted(set(JOINTS) - {bone.name for bone in armature.data.bones})
    missing_clips = sorted(set(CLIPS) - {action.name for action in bpy.data.actions})
    if missing_joints or missing_clips:
        raise RuntimeError(f"Rig source incomplete: joints={missing_joints}, clips={missing_clips}")

    # Temporarily retain the validated skinned body as a spatial weight map.
    # Pixal3D replaces it after transfer and already contains its own backpack.
    for obj in list(bpy.context.scene.objects):
        if obj not in {armature, transfer_surface}:
            delete_object(obj)
    armature.parent = None
    armature.name = "AFTERDAY_Pixal3D_Humanoid_Rig"
    armature.data.name = "AFTERDAY_Pixal3D_Humanoid_Skeleton"
    armature.data.pose_position = "REST"
    transfer_surface.hide_render = True
    return armature, transfer_surface


def import_pixal3d(path: Path, height: float, target_faces: int) -> bpy.types.Object:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path.resolve()))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    meshes = [obj for obj in imported if obj.type == "MESH" and obj.name.startswith("geometry_0")]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected Pixal3D geometry_0 mesh, got {[obj.name for obj in meshes]}")
    character = meshes[0]
    for obj in imported:
        if obj is not character:
            delete_object(obj)

    character.name = "Pixal3D_Humanoid_Survivor_Surface"
    character.data.name = "Pixal3D_Humanoid_Survivor_Mesh"
    low, high = world_bounds(character)
    scale = height / (high.z - low.z)
    character.scale = (scale, scale, scale)
    bpy.context.view_layer.objects.active = character
    character.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    low, high = world_bounds(character)
    character.location += Vector((-(low.x + high.x) / 2, -(low.y + high.y) / 2, -low.z))
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    source_faces = len(character.data.polygons)

    # Pixal3D exports coincident position vertices along its extremely dense
    # UV/normal islands. Decimating those disconnected copies first tears the
    # surface open. Weld exact coincident positions BEFORE reduction; UV data
    # remains per-loop, while collapse decimation now sees connected topology.
    mesh = character.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
    loose = [vertex for vertex in bm.verts if not vertex.link_edges]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.validate(clean_customdata=False)
    mesh.update()
    welded_faces = len(mesh.polygons)

    if target_faces > 0 and welded_faces > target_faces:
        modifier = character.modifiers.new("Game-safe detail reduction", "DECIMATE")
        modifier.ratio = target_faces / welded_faces
        modifier.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = character
        bpy.ops.object.modifier_apply(modifier=modifier.name)

    # Collapse can retain vertices no longer referenced. Remove only those
    # loose vertices and validate topology before skin export.
    bm = bmesh.new()
    bm.from_mesh(mesh)
    loose = [vertex for vertex in bm.verts if not vertex.link_edges]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.validate(clean_customdata=False)
    mesh.update()

    for polygon in character.data.polygons:
        polygon.use_smooth = True
    character["generator"] = "TencentARC Pixal3D via pixal3d-mlx"
    character["source_texture"] = "4096px PBR texture bake"
    character["source_faces"] = source_faces
    character["welded_faces"] = welded_faces
    character["game_faces"] = len(character.data.polygons)
    return character


def replace_base_color(character: bpy.types.Object, texture_path: Path | None) -> None:
    if texture_path is None:
        return
    if not texture_path.is_file():
        raise FileNotFoundError(texture_path)
    replacement = bpy.data.images.load(str(texture_path.resolve()), check_existing=False)
    replacement.name = "Pixal3D_BaseColor_UV_Padded_v391"
    replacement.colorspace_settings.name = "sRGB"
    replacement.pack()
    replaced = 0
    for material in character.data.materials:
        if not material or not material.use_nodes:
            continue
        shader = next((node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
        if shader is None:
            continue
        base_input = shader.inputs.get("Base Color")
        for link in list(base_input.links if base_input else []):
            if link.from_node.type == "TEX_IMAGE":
                link.from_node.image = replacement
                replaced += 1
    if replaced != 1:
        raise RuntimeError(f"Expected one Pixal3D base-color node, replaced {replaced}")


def transfer_skin_weights(
    character: bpy.types.Object,
    armature: bpy.types.Object,
    transfer_surface: bpy.types.Object,
) -> None:
    """Interpolate the proven SF3D A-pose skin onto the Pixal3D surface."""
    for name in JOINTS:
        character.vertex_groups.new(name=name)
    transfer = character.modifiers.new("Validated A-pose skin transfer", "DATA_TRANSFER")
    transfer.object = transfer_surface
    transfer.use_vert_data = True
    transfer.data_types_verts = {"VGROUP_WEIGHTS"}
    transfer.vert_mapping = "POLYINTERP_NEAREST"
    transfer.layers_vgroup_select_src = "ALL"
    transfer.layers_vgroup_select_dst = "NAME"
    bpy.context.view_layer.objects.active = character
    character.select_set(True)
    bpy.ops.object.modifier_apply(modifier=transfer.name)

    # The dense reconstruction has much finer topology than the transfer mesh.
    # Smooth only across connected edges so detached glove/boot/pack shells do
    # not bleed into neighbouring body parts, then enforce glTF's four-joint
    # influence limit before export.
    bpy.ops.object.select_all(action="DESELECT")
    character.select_set(True)
    bpy.context.view_layer.objects.active = character
    bpy.ops.object.mode_set(mode="WEIGHT_PAINT")
    bpy.ops.object.vertex_group_smooth(
        group_select_mode="ALL", factor=0.55, repeat=5, expand=0.08,
    )
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)

    unweighted = sum(1 for vertex in character.data.vertices if not vertex.groups)
    if unweighted:
        raise RuntimeError(f"Skin transfer left {unweighted} vertices unweighted")
    modifier = character.modifiers.new("AFTERDAY 20-bone humanoid skin", "ARMATURE")
    modifier.object = armature
    character.parent = armature
    delete_object(transfer_surface)
    armature.data.pose_position = "POSE"


def add_compatibility_nodes(armature: bpy.types.Object) -> None:
    # The backpack is now part of the reconstructed/skinned surface. Named
    # anchors preserve diagnostics and any downstream node lookups.
    for name in ("Backpack_Main", "Backpack_Handle", "Backpack_Pouch_L", "Backpack_Pouch_R"):
        anchor = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(anchor)
        anchor.parent = armature
        anchor.parent_type = "BONE"
        anchor.parent_bone = "Chest"
        anchor["integrated_surface"] = True


def export_glb(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(output.resolve()),
        export_format="GLB",
        export_yup=True,
        use_selection=True,
        export_apply=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_skins=True,
        export_morph=False,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_image_quality=95,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_unused_images=False,
    )


def main() -> None:
    args = arguments()
    for path in (args.source, args.rig_source):
        if not path.is_file():
            raise FileNotFoundError(path)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    armature, transfer_surface = import_animation_rig(args.rig_source)
    character = import_pixal3d(args.source, args.height, args.target_faces)
    replace_base_color(character, args.base_color_clean)
    transfer_skin_weights(character, armature, transfer_surface)
    add_compatibility_nodes(armature)
    export_glb(args.output)
    low, high = world_bounds(character)
    print(
        "AFTERDAY_PIXAL3D_RIGGED "
        f"output={args.output.resolve()} size=({high.x-low.x:.3f},{high.y-low.y:.3f},{high.z-low.z:.3f}) "
        f"vertices={len(character.data.vertices)} faces={len(character.data.polygons)} "
        f"bones={len(armature.data.bones)} clips={len(CLIPS)}"
    )


if __name__ == "__main__":
    main()
