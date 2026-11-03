import bpy
import math
import os
import json
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT_DIR = os.path.join(REPO, ".sprites-raw")
RES = 256
TAU = math.pi * 2
os.makedirs(OUT_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgb(value):
    raw = value.lstrip("#")
    return tuple(srgb_to_linear(int(raw[i:i + 2], 16) / 255.0) for i in (0, 2, 4))


def make_mat(name, color, metallic=0.0, roughness=0.4, emission=None, strength=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*hex_rgb(color), 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*hex_rgb(emission), 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    return material


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_scale(obj):
    select_only(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def move_to_collection(obj, collection):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)


def parent_keep(child, parent):
    bpy.context.view_layer.update()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


def set_origin(obj, point):
    bpy.context.scene.cursor.location = Vector(point)
    select_only(obj)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")


def smooth(obj):
    select_only(obj)
    bpy.ops.object.shade_smooth()


def flat(obj):
    select_only(obj)
    bpy.ops.object.shade_flat()


def add_empty(name, location, collection):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_size = 0.15
    obj.location = location
    collection.objects.link(obj)
    return obj


def add_sphere(name, location, scale, material, collection, segments=48, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=1.0, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_scale(obj)
    obj.data.materials.append(material)
    smooth(obj)
    move_to_collection(obj, collection)
    return obj


def add_ico(name, location, scale, material, collection, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions, radius=1.0, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_scale(obj)
    obj.data.materials.append(material)
    flat(obj)
    move_to_collection(obj, collection)
    return obj


def add_box(name, location, size, material, collection, rotation=(0, 0, 0), bevel=0.03):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    apply_scale(obj)
    if bevel > 0:
        width = min(bevel, min(size) * 0.45)
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = width
        mod.segments = 3
        mod.limit_method = "ANGLE"
        select_only(obj)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.materials.append(material)
    flat(obj)
    move_to_collection(obj, collection)
    return obj


def add_cylinder(name, location, radius, depth, material, collection, rotation=(0, 0, 0), vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    smooth(obj)
    move_to_collection(obj, collection)
    return obj


def add_cone(name, location, radius, depth, material, collection, rotation=(0, 0, 0), vertices=24):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices, radius1=radius, radius2=0.0, depth=depth,
        location=location, rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    smooth(obj)
    move_to_collection(obj, collection)
    return obj


def add_torus(name, location, major, minor, material, collection, rotation=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major, minor_radius=minor,
        major_segments=48, minor_segments=10,
        location=location, rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    smooth(obj)
    move_to_collection(obj, collection)
    return obj


def add_curve(name, points, bevel, material, collection):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = bevel
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, co in zip(spline.bezier_points, points):
        point.co = co
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def mesh_object(name, verts, faces, material, collection, smooth_shading=False):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.data.materials.append(material)
    if smooth_shading:
        for poly in mesh.polygons:
            poly.use_smooth = True
    return obj


# ---------------------------------------------------------------------------
# Escena, cámara e iluminación
# ---------------------------------------------------------------------------

def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = RES
    scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.eevee.taa_render_samples = 48

    world = bpy.data.worlds.new("SpriteWorld")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs[0].default_value = (*hex_rgb("#0a1424"), 1)
    background.inputs[1].default_value = 0.55

    cam_data = bpy.data.cameras.new("SpriteCam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("SpriteCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    lights = []
    specs = [
        ("Key", (-2.8, -3.6, 5.4), 780, "#fff2df", 5.0),
        ("Rim", (3.4, 2.8, 4.2), 620, "#66f5df", 3.5),
        ("Fill", (3.6, -3.0, 2.2), 260, "#9bc4ff", 4.0),
        ("Top", (0.0, 0.5, 6.5), 300, "#ffffff", 4.5),
    ]
    for name, location, energy, color, size in specs:
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.color = hex_rgb(color)
        data.size = size
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = location
        lights.append(obj)
    return scene, cam, lights


def aim_camera(cam, lights, ortho_scale, target_z, elevation=30.0, distance=6.0):
    target = Vector((0, 0, target_z))
    cam.data.ortho_scale = ortho_scale
    cam.location = (
        0,
        -distance,
        target_z + distance * math.tan(math.radians(elevation)),
    )
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    for light in lights:
        light.rotation_euler = (
            target - light.location
        ).to_track_quat("-Z", "Y").to_euler()


# ---------------------------------------------------------------------------
# Entidades digitales abstractas
# ---------------------------------------------------------------------------

def add_between(name, a, b, radius, material, collection, vertices=16):
    start = Vector(a)
    end = Vector(b)
    direction = end - start
    length = direction.length
    if length < 0.0001:
        length = 0.0001
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=length,
        location=(start + end) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(material)
    smooth(obj)
    move_to_collection(obj, collection)
    return obj


def add_cone_between(name, a, b, radius, material, collection, vertices=12):
    start = Vector(a)
    end = Vector(b)
    direction = end - start
    length = direction.length
    if length < 0.0001:
        length = 0.0001
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius,
        radius2=0.0,
        depth=length,
        location=(start + end) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(material)
    smooth(obj)
    move_to_collection(obj, collection)
    return obj


def add_tetra(name, location, scale, material, collection, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(
        vertices=3,
        radius1=1.0,
        radius2=0.0,
        depth=2.0,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_scale(obj)
    obj.data.materials.append(material)
    flat(obj)
    move_to_collection(obj, collection)
    return obj


def add_wire(source, name, thickness, material, collection):
    """Duplica un mesh y lo convierte en una malla de alambre emisiva."""
    obj = source.copy()
    obj.data = source.data.copy()
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(material)
    collection.objects.link(obj)
    obj.location = source.location.copy()
    obj.rotation_euler = source.rotation_euler.copy()
    obj.scale = source.scale.copy()
    select_only(obj)
    mod = obj.modifiers.new("Wireframe", "WIREFRAME")
    mod.thickness = thickness
    mod.use_replace = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


# ---------------------------------------------------------------------------
# Avatar de ejecución (héroe)
# ---------------------------------------------------------------------------

def build_hero(collection):
    mats = {
        "dark": make_mat("AvatarDark", "#0b1420", 0.55, 0.42),
        "plate": make_mat("AvatarPlate", "#1a2a3f", 0.7, 0.32),
        "steel": make_mat("AvatarSteel", "#829bb8", 0.9, 0.22),
        "cyan": make_mat("AvatarCyan", "#4de2c5", 0.0, 0.25, "#4de2c5", 2.2),
        "blue": make_mat("AvatarBlue", "#2e7dff", 0.0, 0.3, "#2e7dff", 0.8),
        "gold": make_mat("AvatarGold", "#f5c451", 0.9, 0.25),
        "mantle": make_mat("AvatarMantle", "#12233b", 0.3, 0.38, "#2e7dff", 0.35),
    }

    root = add_empty("AvatarRoot", (0, 0, 0), collection)
    body = add_empty("AvatarBody", (0, 0, 0.86), collection)
    parent_keep(body, root)

    # Piernas y botas.
    for side in (-1, 1):
        hip = add_box(
            "AvatarHip", (side * 0.14, 0, 0.58), (0.24, 0.28, 0.16),
            mats["plate"], collection, bevel=0.05,
        )
        parent_keep(hip, root)
        greave = add_box(
            "AvatarGreave", (side * 0.15, 0, 0.35), (0.19, 0.24, 0.44),
            mats["dark"], collection, bevel=0.04,
        )
        parent_keep(greave, root)
        knee = add_box(
            "AvatarKnee", (side * 0.15, -0.11, 0.47), (0.15, 0.06, 0.12),
            mats["steel"], collection, bevel=0.025,
        )
        parent_keep(knee, root)
        boot = add_box(
            "AvatarBoot", (side * 0.15, -0.06, 0.12), (0.22, 0.36, 0.17),
            mats["plate"], collection, bevel=0.05,
        )
        parent_keep(boot, root)
        shin = add_box(
            "AvatarShinGlow", (side * 0.15, -0.125, 0.33), (0.05, 0.015, 0.24),
            mats["cyan"], collection, bevel=0.004,
        )
        parent_keep(shin, root)

    # Pelvis, torso y abdomen.
    pelvis = add_box(
        "AvatarPelvis", (0, 0, 0.61), (0.4, 0.3, 0.18),
        mats["dark"], collection, bevel=0.04,
    )
    parent_keep(pelvis, body)
    torso = add_box(
        "AvatarTorso", (0, 0, 0.9), (0.46, 0.3, 0.44),
        mats["dark"], collection, bevel=0.09,
    )
    parent_keep(torso, body)
    abdomen = add_box(
        "AvatarAbdomen", (0, 0, 0.69), (0.36, 0.28, 0.18),
        mats["plate"], collection, bevel=0.04,
    )
    parent_keep(abdomen, body)
    chest = add_box(
        "AvatarChest", (0, -0.17, 0.93), (0.36, 0.08, 0.28),
        mats["plate"], collection, bevel=0.04,
    )
    parent_keep(chest, body)
    core = add_box(
        "AvatarCore", (0, -0.225, 0.93), (0.12, 0.02, 0.12),
        mats["cyan"], collection, rotation=(0, math.radians(45), 0), bevel=0.006,
    )
    parent_keep(core, body)
    for x in (-0.14, 0.14):
        strip = add_box(
            "AvatarCircuit", (x, -0.216, 0.91), (0.025, 0.012, 0.2),
            mats["cyan"], collection, bevel=0.003,
        )
        parent_keep(strip, body)
    belt = add_box(
        "AvatarBelt", (0, 0, 0.62), (0.42, 0.31, 0.055),
        mats["gold"], collection, bevel=0.012,
    )
    parent_keep(belt, body)
    collar = add_torus(
        "AvatarCollar", (0, 0, 1.15), 0.17, 0.014,
        mats["gold"], collection, rotation=(0, 0, 0),
    )
    parent_keep(collar, body)

    # Hombreras redondeadas.
    for side in (-1, 1):
        pauldron = add_box(
            "AvatarPauldron", (side * 0.29, 0, 1.04), (0.18, 0.24, 0.14),
            mats["plate"], collection, rotation=(0, side * 0.15, 0), bevel=0.06,
        )
        parent_keep(pauldron, body)
        edge = add_box(
            "AvatarPauldronEdge", (side * 0.29, -0.095, 1.04), (0.15, 0.012, 0.02),
            mats["cyan"], collection, bevel=0.003,
        )
        parent_keep(edge, body)
        light = add_sphere(
            "AvatarShoulderLight", (side * 0.37, -0.02, 1.06), (0.035, 0.035, 0.035),
            mats["cyan"], collection, segments=16, rings=10,
        )
        parent_keep(light, body)

    # Brazos y guanteletes.
    for side, hand, bracer_z in (
        (1, (0.42, -0.14, 0.76), 0.8),
        (-1, (-0.48, -0.14, 0.86), 0.87),
    ):
        arm = add_between(
            "AvatarArm", (side * 0.28, -0.02, 1.0), hand, 0.06,
            mats["dark"], collection,
        )
        parent_keep(arm, body)
        bracer = add_box(
            "AvatarBracer", (side * 0.4, hand[1], bracer_z), (0.09, 0.1, 0.16),
            mats["plate"], collection, bevel=0.02,
        )
        parent_keep(bracer, body)
        fist = add_box(
            "AvatarHand", hand, (0.075, 0.075, 0.075),
            mats["steel"], collection, rotation=(0, math.radians(45), 0), bevel=0.01,
        )
        parent_keep(fist, body)

    # Escudo de firewall hexagonal, más compacto y sujeto al brazo.
    shield_outer = add_cylinder(
        "AvatarShieldOuter", (-0.56, -0.16, 0.9), 0.25, 0.05,
        mats["gold"], collection, rotation=(math.pi / 2, 0, 0), vertices=6,
    )
    parent_keep(shield_outer, body)
    shield_ring = add_cylinder(
        "AvatarShieldRing", (-0.56, -0.2, 0.9), 0.2, 0.03,
        mats["cyan"], collection, rotation=(math.pi / 2, 0, 0), vertices=6,
    )
    parent_keep(shield_ring, body)
    shield_plate = add_cylinder(
        "AvatarShieldPlate", (-0.56, -0.22, 0.9), 0.15, 0.02,
        mats["dark"], collection, rotation=(math.pi / 2, 0, 0), vertices=6,
    )
    parent_keep(shield_plate, body)
    shield_core = add_box(
        "AvatarShieldCore", (-0.56, -0.238, 0.9), (0.055, 0.012, 0.055),
        mats["cyan"], collection, rotation=(0, math.radians(45), 0), bevel=0.004,
    )
    parent_keep(shield_core, body)
    grip = add_between(
        "AvatarShieldGrip", (-0.46, -0.13, 0.84), (-0.54, -0.15, 0.88),
        0.035, mats["dark"], collection,
    )
    parent_keep(grip, body)
    for obj in (shield_outer, shield_ring, shield_plate):
        flat(obj)

    # Cabeza: casco suave, visor y cresta.
    neck = add_cylinder(
        "AvatarNeck", (0, 0, 1.19), 0.07, 0.1,
        mats["dark"], collection,
    )
    parent_keep(neck, body)
    helmet = add_sphere(
        "AvatarHelmet", (0, -0.02, 1.4), (0.18, 0.17, 0.2),
        mats["plate"], collection, segments=40, rings=24,
    )
    parent_keep(helmet, body)
    visor = add_box(
        "AvatarVisor", (0, -0.185, 1.41), (0.22, 0.03, 0.05),
        mats["cyan"], collection, bevel=0.005,
    )
    parent_keep(visor, body)
    jaw = add_box(
        "AvatarJaw", (0, -0.15, 1.3), (0.16, 0.05, 0.09),
        mats["steel"], collection, bevel=0.012,
    )
    parent_keep(jaw, body)
    for side in (-1, 1):
        ear = add_box(
            "AvatarEar", (side * 0.17, -0.01, 1.4), (0.045, 0.1, 0.13),
            mats["steel"], collection, bevel=0.012,
        )
        parent_keep(ear, body)
    crest = add_box(
        "AvatarCrest", (0, 0.01, 1.62), (0.055, 0.16, 0.1),
        mats["gold"], collection, rotation=(0, math.radians(45), 0), bevel=0.006,
    )
    parent_keep(crest, body)

    # Capa holográfica con borde luminoso.
    cols, rows = 5, 6
    verts = []
    for r in range(rows):
        t = r / (rows - 1)
        z = 1.12 - t * 0.56
        half = 0.24 + t * 0.14
        for c in range(cols):
            u = c / (cols - 1)
            x = -half + u * half * 2
            y = 0.18 + t * 0.14 + 0.02 * math.sin(u * math.pi) * t
            verts.append((x, y, z))
    faces = []
    for r in range(rows - 1):
        for c in range(cols - 1):
            a = r * cols + c
            faces.append((a, a + 1, a + cols + 1, a + cols))
    cape = mesh_object("AvatarCape", verts, faces, mats["mantle"], collection, True)
    solidify = cape.modifiers.new("Solidify", "SOLIDIFY")
    solidify.thickness = 0.02
    select_only(cape)
    bpy.ops.object.modifier_apply(modifier=solidify.name)
    subsurf = cape.modifiers.new("Subsurf", "SUBSURF")
    subsurf.levels = 1
    subsurf.render_levels = 1
    bpy.ops.object.modifier_apply(modifier=subsurf.name)
    set_origin(cape, (0, 0.18, 1.12))

    mantle = add_empty("AvatarMantle", (0, 0.18, 1.12), collection)
    parent_keep(mantle, body)
    parent_keep(cape, mantle)

    # Borde inferior luminoso.
    bottom = [
        (-0.38, 0.325, 0.56),
        (-0.19, 0.335, 0.55),
        (0.0, 0.34, 0.55),
        (0.19, 0.335, 0.55),
        (0.38, 0.325, 0.56),
    ]
    for i in range(len(bottom) - 1):
        edge = add_between(
            f"AvatarCapeEdge{i}", bottom[i], bottom[i + 1], 0.008,
            mats["cyan"], collection, vertices=8,
        )
        parent_keep(edge, mantle)

    # Fragmentos flotantes de la capa.
    for i, (x, y, z, sx, sy, sz, rot) in enumerate(
        (
            (-0.44, 0.3, 0.68, 0.05, 0.02, 0.14, 0.3),
            (0.44, 0.3, 0.64, 0.05, 0.02, 0.12, -0.3),
        )
    ):
        shard = add_tetra(
            f"AvatarCapeShard{i}", (x, y, z), (sx, sy, sz),
            mats["blue"], collection, rotation=(0, rot, 0),
        )
        parent_keep(shard, mantle)

    return {"root": root, "body": body, "cape": mantle}


def animate_hero(scene, refs):
    root = refs["root"]
    body = refs["body"]
    mantle = refs["cape"]

    def pose(t, attack):
        if not attack:
            s = math.sin(TAU * t)
            root.location.z = 0.012 * s
            body.location.z = 0.86 + 0.008 * math.sin(TAU * t + 0.4)
            body.rotation_euler.x = 0.018 * s
            body.rotation_euler.y = 0.01 * math.sin(TAU * t + 1.1)
            mantle.rotation_euler.x = 0.03 * math.sin(TAU * t + 0.7)
            mantle.rotation_euler.y = 0.03 * math.sin(TAU * t + 0.3)
        else:
            windup = math.sin(min(1.0, t / 0.42) * math.pi / 2)
            strike = max(0.0, min(1.0, (t - 0.28) / 0.36))
            recover = max(0.0, min(1.0, (t - 0.64) / 0.36))
            lean = -0.24 * windup + 0.34 * strike - 0.1 * recover
            root.location.z = 0.02 * math.sin(t * math.pi)
            body.location.z = 0.86 + 0.03 * windup - 0.05 * strike
            body.rotation_euler.x = lean
            body.rotation_euler.y = -0.08 * strike
            mantle.rotation_euler.x = 0.08 + 0.28 * strike
            mantle.rotation_euler.y = 0.06 * strike

    for frame, t in [(1 + i, i / 8) for i in range(9)]:
        pose(t, False)
        root.keyframe_insert("location", frame=frame)
        body.keyframe_insert("location", frame=frame)
        body.keyframe_insert("rotation_euler", frame=frame)
        mantle.keyframe_insert("rotation_euler", frame=frame)

    for frame, t in [(20 + i, i / 5) for i in range(6)]:
        pose(t, True)
        root.keyframe_insert("location", frame=frame)
        body.keyframe_insert("location", frame=frame)
        body.keyframe_insert("rotation_euler", frame=frame)
        mantle.keyframe_insert("rotation_euler", frame=frame)


# ---------------------------------------------------------------------------
# Glitch (bug)
# ---------------------------------------------------------------------------

def build_bug(collection):
    dark = make_mat("GlitchDark", "#06110c", 0.45, 0.45)
    green = make_mat("GlitchGreen", "#6dff8a", 0.0, 0.3, "#6dff8a", 1.8)
    dim = make_mat("GlitchDim", "#1b5b39", 0.0, 0.6, "#2d8a52", 0.5)
    red = make_mat("GlitchRed", "#ff1e3c", 0.0, 0.2, "#ff1e3c", 3.2)
    black = make_mat("GlitchBlack", "#020604", 0.2, 0.65)

    root = add_empty("GlitchRoot", (0, 0, 0), collection)
    body = add_empty("GlitchBody", (0, 0, 0.48), collection)
    parent_keep(body, root)

    core = add_ico(
        "GlitchCore", (0, 0, 0.48), (0.38, 0.34, 0.42),
        dark, collection, subdivisions=1,
    )
    wire = add_wire(core, "GlitchWire", 0.008, green, collection)
    parent_keep(core, body)
    parent_keep(wire, body)

    # Ojo/socket frontal.
    socket = add_sphere(
        "GlitchSocket", (0, -0.32, 0.56), (0.17, 0.06, 0.16),
        black, collection, segments=24, rings=16,
    )
    parent_keep(socket, body)
    eye = add_box(
        "GlitchEye", (0, -0.362, 0.56), (0.1, 0.025, 0.1),
        red, collection, rotation=(0, math.radians(45), 0), bevel=0.005,
    )
    parent_keep(eye, body)
    pupil = add_box(
        "GlitchPupil", (0, -0.38, 0.56), (0.075, 0.01, 0.014),
        black, collection, bevel=0.002,
    )
    parent_keep(pupil, body)

    # Fragmentos flotantes.
    shard_specs = [
        (-0.43, 0.02, 0.68, 0.09, 0.06, 0.24, 0.4, dim),
        (0.44, -0.04, 0.62, 0.08, 0.06, 0.2, -0.35, dark),
        (-0.32, -0.17, 0.8, 0.06, 0.04, 0.17, 0.9, green),
        (0.34, 0.18, 0.36, 0.075, 0.05, 0.22, -0.6, dim),
        (0.12, -0.3, 0.28, 0.05, 0.03, 0.14, 0.2, green),
        (-0.16, 0.26, 0.78, 0.06, 0.04, 0.18, 0.5, dark),
    ]
    for i, (x, y, z, sx, sy, sz, rot, material) in enumerate(shard_specs):
        shard = add_tetra(
            f"GlitchShard{i}", (x, y, z), (sx, sy, sz),
            material, collection, rotation=(0, rot, 0),
        )
        parent_keep(shard, body)

    # Líneas de glitch.
    for i, z in enumerate((0.46, 0.36)):
        line = add_box(
            f"GlitchLine{i}", (0, -0.37, z), (0.44, 0.008, 0.012),
            green, collection, rotation=(0, 0, 0.3 - i * 0.6), bevel=0.002,
        )
        parent_keep(line, body)

    # Zarcillos de datos hasta el suelo.
    tendrils = [
        ((-0.18, -0.08, 0.3), (-0.46, -0.22, 0.02)),
        ((0.18, -0.05, 0.32), (0.5, -0.2, 0.02)),
        ((-0.12, 0.18, 0.32), (-0.36, 0.38, 0.02)),
        ((0.14, 0.16, 0.32), (0.38, 0.34, 0.02)),
    ]
    for i, (a, b) in enumerate(tendrils):
        tendril = add_between(
            f"GlitchTendril{i}", a, b, 0.012,
            green, collection, vertices=8,
        )
        parent_keep(tendril, root)
        tip = add_box(
            f"GlitchTendrilTip{i}", b, (0.045, 0.045, 0.012),
            dim, collection, bevel=0.003,
        )
        parent_keep(tip, root)

    # Bloques de error.
    for i, (x, y, z, w) in enumerate(((-0.4, -0.2, 0.92, 0.12), (0.36, 0.1, 0.9, 0.1))):
        block = add_box(
            f"GlitchBlock{i}", (x, y, z), (w, 0.03, 0.07),
            black, collection, bevel=0.006,
        )
        parent_keep(block, body)
        edge = add_box(
            f"GlitchBlockEdge{i}", (x, y - 0.017, z), (w * 0.8, 0.006, 0.008),
            green, collection, bevel=0.002,
        )
        parent_keep(edge, body)

    return {"root": root, "body": body}


def animate_bug(scene, refs):
    root = refs["root"]
    body = refs["body"]

    def pose(t, attack):
        if not attack:
            s = math.sin(TAU * t)
            body.scale = (1 + 0.035 * s, 1 + 0.02 * s, 1 - 0.05 * s)
            body.rotation_euler.z = 0.03 * math.sin(TAU * t + 0.5)
            body.rotation_euler.y = 0.02 * math.sin(TAU * t + 1.2)
            root.location.z = 0.012 * s
            root.location.y = 0.0
        else:
            windup = min(1.0, t / 0.38)
            strike = max(0.0, min(1.0, (t - 0.25) / 0.35))
            recover = max(0.0, min(1.0, (t - 0.6) / 0.4))
            squash = 0.25 * windup - 0.4 * strike + 0.12 * recover
            body.scale = (1 + squash, 1 + squash * 0.7, 1 - squash)
            body.rotation_euler.z = 0.1 * strike
            root.location.z = 0.02 * windup - 0.03 * strike
            root.location.y = -0.16 * strike

    for frame, t in [(1 + i, i / 8) for i in range(9)]:
        pose(t, False)
        root.keyframe_insert("location", frame=frame)
        body.keyframe_insert("scale", frame=frame)
        body.keyframe_insert("rotation_euler", frame=frame)

    for frame, t in [(20 + i, i / 5) for i in range(6)]:
        pose(t, True)
        root.keyframe_insert("location", frame=frame)
        body.keyframe_insert("scale", frame=frame)
        body.keyframe_insert("rotation_euler", frame=frame)


# ---------------------------------------------------------------------------
# Daemon (virus)
# ---------------------------------------------------------------------------

def build_virus(collection):
    dark = make_mat("DaemonDark", "#0a0614", 0.5, 0.4)
    violet = make_mat("DaemonViolet", "#b44cff", 0.0, 0.3, "#b44cff", 2.4)
    magenta = make_mat("DaemonMagenta", "#ff4dd2", 0.0, 0.25, "#ff4dd2", 2.6)
    cyan = make_mat("DaemonCyan", "#4de2c5", 0.0, 0.3, "#4de2c5", 1.6)
    red = make_mat("DaemonRed", "#ff3355", 0.0, 0.2, "#ff3355", 5.0)
    black = make_mat("DaemonBlack", "#030107", 0.2, 0.6)

    root = add_empty("DaemonRoot", (0, 0, 0), collection)
    body = add_empty("DaemonBody", (0, 0, 0.95), collection)
    parent_keep(body, root)

    core = add_ico(
        "DaemonCore", (0, 0, 0.95), (0.34, 0.32, 0.36),
        dark, collection, subdivisions=1,
    )
    wire = add_wire(core, "DaemonWire", 0.012, violet, collection)
    parent_keep(core, body)
    parent_keep(wire, body)
    inner = add_ico(
        "DaemonInner", (0, 0, 0.95), (0.14, 0.13, 0.14),
        magenta, collection, subdivisions=1,
    )
    parent_keep(inner, body)

    # Anillos orbitales.
    ring_specs = [
        (0.56, 0.018, (math.pi / 2, 0, 0), cyan),
        (0.66, 0.012, (0, 0, 0), magenta),
        (0.46, 0.014, (math.pi / 3, math.pi / 4, 0), violet),
    ]
    rings = []
    for i, (major, minor, rot, material) in enumerate(ring_specs):
        ring = add_torus(
            f"DaemonRing{i}", (0, 0, 0.95), major, minor,
            material, collection, rotation=rot,
        )
        parent_keep(ring, body)
        rings.append({"obj": ring, "base": tuple(ring.rotation_euler)})

    # Fragmentos de datos.
    shard_specs = [
        (-0.52, -0.1, 1.06, 0.06, 0.04, 0.24, 0.4, violet),
        (0.54, 0.04, 0.9, 0.06, 0.04, 0.22, -0.3, dark),
        (-0.4, 0.25, 0.78, 0.05, 0.03, 0.18, 0.8, magenta),
        (0.36, -0.25, 1.18, 0.05, 0.03, 0.16, -0.8, cyan),
        (0.1, 0.3, 1.28, 0.04, 0.03, 0.14, 0.2, violet),
        (-0.24, -0.3, 0.7, 0.04, 0.03, 0.14, 0.6, magenta),
    ]
    for i, (x, y, z, sx, sy, sz, rot, material) in enumerate(shard_specs):
        shard = add_tetra(
            f"DaemonShard{i}", (x, y, z), (sx, sy, sz),
            material, collection, rotation=(0, rot, 0),
        )
        parent_keep(shard, body)

    # Ojo vertical.
    socket = add_sphere(
        "DaemonEyeSocket", (0, -0.31, 0.98), (0.13, 0.04, 0.18),
        black, collection, segments=24, rings=16,
    )
    parent_keep(socket, body)
    eye = add_box(
        "DaemonEye", (0, -0.342, 0.98), (0.035, 0.02, 0.13),
        red, collection, bevel=0.008,
    )
    parent_keep(eye, body)

    # Glifos flotantes.
    for i, (x, y, z) in enumerate(
        ((0.36, -0.12, 1.3), (-0.42, 0.08, 0.62), (0.24, 0.2, 1.36))
    ):
        glyph = add_box(
            f"DaemonGlyph{i}", (x, y, z), (0.045, 0.03, 0.045),
            cyan, collection, rotation=(0, math.radians(45), 0), bevel=0.004,
        )
        parent_keep(glyph, body)

    return {"root": root, "body": body, "rings": rings}


def animate_virus(scene, refs):
    root = refs["root"]
    body = refs["body"]
    rings = refs["rings"]

    def pose(t, attack):
        if not attack:
            s = math.sin(TAU * t)
            body.location.z = 0.95 + 0.06 * s
            body.location.y = 0.0
            body.rotation_euler.z = 0.14 * t * TAU
            body.scale = (1 + 0.035 * s, 1 + 0.035 * s, 1 + 0.035 * s)
            for i, ring in enumerate(rings):
                base = ring["base"]
                ring["obj"].rotation_euler = (
                    base[0] + t * TAU * (0.5 + i * 0.2),
                    base[1] + t * TAU * (0.3 + i * 0.15),
                    base[2] + t * TAU * 0.4,
                )
        else:
            strike = max(0.0, min(1.0, (t - 0.22) / 0.4))
            recover = max(0.0, min(1.0, (t - 0.62) / 0.38))
            body.location.z = 0.95 + 0.16 * strike - 0.04 * recover
            body.location.y = -0.22 * strike
            body.rotation_euler.z = 0.35 * strike
            body.scale = (1 + 0.16 * strike, 1 + 0.16 * strike, 1 + 0.16 * strike)
            for i, ring in enumerate(rings):
                base = ring["base"]
                ring["obj"].rotation_euler = (
                    base[0] + strike * 2.2,
                    base[1] + strike * (1.4 + i * 0.5),
                    base[2] + strike * 1.2,
                )

    for frame, t in [(1 + i, i / 8) for i in range(9)]:
        pose(t, False)
        body.keyframe_insert("location", frame=frame)
        body.keyframe_insert("rotation_euler", frame=frame)
        body.keyframe_insert("scale", frame=frame)
        for ring in rings:
            ring["obj"].keyframe_insert("rotation_euler", frame=frame)

    for frame, t in [(20 + i, i / 5) for i in range(6)]:
        pose(t, True)
        body.keyframe_insert("location", frame=frame)
        body.keyframe_insert("rotation_euler", frame=frame)
        body.keyframe_insert("scale", frame=frame)
        for ring in rings:
            ring["obj"].keyframe_insert("rotation_euler", frame=frame)


# ---------------------------------------------------------------------------
# Payload (troyano)
# ---------------------------------------------------------------------------

def build_trojan(collection):
    dark = make_mat("PayloadDark", "#0d131d", 0.6, 0.38)
    graphite = make_mat("PayloadGraphite", "#232d3d", 0.5, 0.42)
    gold = make_mat("PayloadGold", "#d8a94a", 0.9, 0.3)
    red = make_mat("PayloadRed", "#ff3b2f", 0.0, 0.25, "#ff3b2f", 3.0)
    cyan = make_mat("PayloadCyan", "#4de2c5", 0.0, 0.3, "#4de2c5", 1.2)
    black = make_mat("PayloadBlack", "#020407", 0.2, 0.6)

    root = add_empty("PayloadRoot", (0, 0, 0), collection)
    body = add_empty("PayloadBody", (0, 0, 0), collection)
    parent_keep(body, root)

    # Patas/pilones.
    for side in (-1, 1):
        for y in (-0.22, 0.22):
            pylon = add_box(
                "PayloadPylon", (side * 0.32, y, 0.28), (0.16, 0.18, 0.56),
                dark, collection, rotation=(0, side * 0.08, 0), bevel=0.02,
            )
            parent_keep(pylon, body)
            cap = add_box(
                "PayloadPylonCap", (side * 0.32, y, 0.035), (0.2, 0.22, 0.06),
                gold, collection, bevel=0.01,
            )
            parent_keep(cap, body)

    plinth = add_box(
        "PayloadPlinth", (0, 0, 0.07), (1.0, 0.62, 0.08),
        graphite, collection, bevel=0.02,
    )
    parent_keep(plinth, body)

    # Monolito sellado.
    monolith = add_box(
        "PayloadMonolith", (0, 0, 1.15), (0.86, 0.5, 1.4),
        graphite, collection, bevel=0.05,
    )
    parent_keep(monolith, body)
    for z in (0.46, 1.84):
        band = add_box(
            "PayloadBand", (0, 0, z), (1.0, 0.56, 0.06),
            gold, collection, bevel=0.015,
        )
        parent_keep(band, body)
    for side in (-1, 1):
        seam = add_box(
            "PayloadSeam", (side * 0.31, -0.265, 1.15), (0.04, 0.02, 1.3),
            gold, collection, bevel=0.004,
        )
        parent_keep(seam, body)
        cyan_seam = add_box(
            "PayloadCyanSeam", (side * 0.44, -0.255, 1.15), (0.015, 0.012, 1.28),
            cyan, collection, bevel=0.003,
        )
        parent_keep(cyan_seam, body)

    # Paneles frontales que se abren.
    panels = []
    for side in (-1, 1):
        panel = add_box(
            "PayloadPanel", (side * 0.2, -0.28, 1.15), (0.34, 0.03, 1.02),
            dark, collection, bevel=0.015,
        )
        parent_keep(panel, body)
        edge = add_box(
            "PayloadPanelEdge", (side * 0.2, -0.297, 1.15), (0.03, 0.01, 0.94),
            gold, collection, bevel=0.004,
        )
        parent_keep(edge, panel)
        outer_edge = add_box(
            "PayloadPanelOuter", (side * 0.36, -0.297, 1.15), (0.02, 0.01, 1.0),
            gold, collection, bevel=0.003,
        )
        parent_keep(outer_edge, panel)
        panels.append({"obj": panel, "base_x": side * 0.2})

    # Núcleo rojo y ojo superior.
    socket = add_box(
        "PayloadSocket", (0, -0.245, 1.15), (0.23, 0.04, 0.34),
        black, collection, bevel=0.015,
    )
    parent_keep(socket, body)
    core = add_box(
        "PayloadCore", (0, -0.255, 1.15), (0.18, 0.02, 0.18),
        red, collection, rotation=(0, math.radians(45), 0), bevel=0.006,
    )
    parent_keep(core, body)
    eye = add_box(
        "PayloadEye", (0, -0.27, 1.73), (0.3, 0.02, 0.035),
        red, collection, bevel=0.006,
    )
    parent_keep(eye, body)

    # Fragmentos del cascarón.
    shard_specs = [
        (0.58, -0.08, 1.35, 0.06, 0.04, 0.28, 0.3, gold),
        (-0.6, 0.02, 0.95, 0.06, 0.04, 0.24, -0.4, dark),
        (0.52, 0.18, 0.75, 0.05, 0.04, 0.2, 0.7, graphite),
        (-0.5, -0.18, 1.55, 0.05, 0.04, 0.22, -0.6, gold),
        (0.12, 0.3, 1.72, 0.04, 0.03, 0.16, 0.2, cyan),
    ]
    for i, (x, y, z, sx, sy, sz, rot, material) in enumerate(shard_specs):
        shard = add_tetra(
            f"PayloadShard{i}", (x, y, z), (sx, sy, sz),
            material, collection, rotation=(0, rot, 0),
        )
        parent_keep(shard, body)

    crown = add_box(
        "PayloadCrown", (0, 0, 2.03), (0.09, 0.09, 0.09),
        gold, collection, rotation=(0, math.radians(45), 0), bevel=0.006,
    )
    parent_keep(crown, body)

    return {
        "root": root,
        "body": body,
        "panels": panels,
        "core_node": red.node_tree.nodes.get("Principled BSDF"),
    }


def animate_trojan(scene, refs):
    root = refs["root"]
    body = refs["body"]
    panels = refs["panels"]
    core_node = refs["core_node"]

    def pose(t, attack):
        if not attack:
            s = math.sin(TAU * t)
            root.location.z = 0.012 * s
            body.rotation_euler.x = 0.01 * s
            body.rotation_euler.z = 0.008 * math.sin(TAU * t + 0.5)
            for i, panel in enumerate(panels):
                panel["obj"].location.x = panel["base_x"] + 0.004 * math.sin(TAU * t + i)
            core_node.inputs["Emission Strength"].default_value = 2.4 + 0.8 * s
        else:
            windup = min(1.0, t / 0.38)
            strike = max(0.0, min(1.0, (t - 0.28) / 0.32))
            recover = max(0.0, min(1.0, (t - 0.6) / 0.4))
            lean = -0.12 * windup + 0.2 * strike - 0.05 * recover
            opening = max(0.0, windup - recover)
            root.location.z = 0.05 * windup - 0.09 * strike
            body.location.y = -0.06 * strike
            body.rotation_euler.x = lean
            body.rotation_euler.z = 0.04 * strike
            for i, panel in enumerate(panels):
                direction = 1 if panel["base_x"] > 0 else -1
                panel["obj"].location.x = panel["base_x"] + direction * 0.14 * opening
            core_node.inputs["Emission Strength"].default_value = 2.4 + 10.0 * strike

    for frame, t in [(1 + i, i / 8) for i in range(9)]:
        pose(t, False)
        root.keyframe_insert("location", frame=frame)
        body.keyframe_insert("location", frame=frame)
        body.keyframe_insert("rotation_euler", frame=frame)
        for panel in panels:
            panel["obj"].keyframe_insert("location", frame=frame)
        core_node.inputs["Emission Strength"].keyframe_insert("default_value", frame=frame)

    for frame, t in [(20 + i, i / 5) for i in range(6)]:
        pose(t, True)
        root.keyframe_insert("location", frame=frame)
        body.keyframe_insert("location", frame=frame)
        body.keyframe_insert("rotation_euler", frame=frame)
        for panel in panels:
            panel["obj"].keyframe_insert("location", frame=frame)
        core_node.inputs["Emission Strength"].keyframe_insert("default_value", frame=frame)


# ---------------------------------------------------------------------------
# Render
# ---------------------------------------------------------------------------

def render_character(scene, name, build_fn, anim_fn, ortho, target_z, display_height):
    collection = bpy.data.collections.new(f"{name}Col")
    scene.collection.children.link(collection)
    refs = build_fn(collection)
    anim_fn(scene, refs)
    aim_camera(scene.camera, [o for o in scene.objects if o.type == "LIGHT"], ortho, target_z)

    folder = os.path.join(OUT_DIR, name)
    os.makedirs(folder, exist_ok=True)

    for frame in range(1, 9):
        scene.frame_set(frame)
        scene.render.filepath = os.path.join(folder, f"idle_{frame - 1:02d}.png")
        bpy.ops.render.render(write_still=True)
    for frame in range(20, 26):
        scene.frame_set(frame)
        scene.render.filepath = os.path.join(folder, f"attack_{frame - 20:02d}.png")
        bpy.ops.render.render(write_still=True)

    # Limpiar la colección y sus datos para el siguiente personaje.
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)

    return {
        "name": name,
        "displayHeight": display_height,
        "animations": {
            "idle": {"row": 0, "frames": 8, "fps": 10, "loop": True},
            "attack": {"row": 1, "frames": 6, "fps": 12, "loop": False},
        },
    }


def main():
    scene, cam, lights = setup_scene()
    manifest = []
    specs = [
        ("hero", build_hero, animate_hero, 2.45, 0.9, 94),
        ("bug", build_bug, animate_bug, 1.5, 0.42, 52),
        ("virus", build_virus, animate_virus, 2.05, 0.95, 70),
        ("trojan", build_trojan, animate_trojan, 3.2, 1.2, 126),
    ]
    for name, build, animate, ortho, target, height in specs:
        print(f"=== RENDER {name} ===")
        manifest.append(render_character(scene, name, build, animate, ortho, target, height))

    with open(os.path.join(OUT_DIR, "meta.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print("DONE", OUT_DIR)


main()
