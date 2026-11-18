"""Device scenes for the portfolio work cards: a laptop (and optionally a phone) on concrete blocks in a room
painted the project's field colour.

Run: Blender -b --factory-startup --python scene.py -- '<json params>'

The screens render black. The script writes <out>.json with each screen's pose for CSS: the page lays the real
screenshots onto the screens with a perspective that matches this camera, so they keep turning.
"""
import bpy, bmesh, sys, json, math
from mathutils import Vector

P = json.loads(sys.argv[sys.argv.index("--") + 1])

def hex_lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------- materials ----------
def mat(name, color, rough=0.5, metal=0.0, spec=0.5, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Specular IOR Level"].default_value = spec
    b.inputs["Coat Weight"].default_value = coat
    return m

ALU = P.get("alu", "#26272b")
alu = mat("alu", hex_lin(ALU), rough=0.34, metal=1.0)
black = mat("black", hex_lin("#0b0b0d"), rough=0.45)
key_m = mat("keys", hex_lin("#08080a"), rough=0.6, spec=0.25)
bezel = mat("bezel", hex_lin("#050506"), rough=0.12, spec=0.2, coat=0.15)
pad_m = mat("pad", hex_lin(ALU), rough=0.18, metal=1.0)
screen_m = mat("screen", hex_lin("#030304"), rough=0.2, spec=0.0)
lens_m = mat("lens", hex_lin("#050608"), rough=0.05, spec=0.8, coat=1.0)
ring_m = mat("ring", hex_lin("#8a8d94"), rough=0.2, metal=1.0)

def concrete(name, lo, hi):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.9
    b.inputs["Specular IOR Level"].default_value = 0.3
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n1 = nt.nodes.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 9; n1.inputs["Detail"].default_value = 10; n1.inputs["Roughness"].default_value = 0.62
    n2 = nt.nodes.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 140; n2.inputs["Detail"].default_value = 4
    vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 60
    for n in (n1, n2, vor):
        nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = hex_lin(lo)
    ramp.color_ramp.elements[1].color = hex_lin(hi)
    nt.links.new(n1.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    pits = nt.nodes.new("ShaderNodeMath"); pits.operation = "LESS_THAN"; pits.inputs[1].default_value = 0.06
    nt.links.new(vor.outputs["Distance"], pits.inputs[0])
    hmix = nt.nodes.new("ShaderNodeMath"); hmix.operation = "MULTIPLY_ADD"; hmix.inputs[1].default_value = 0.35
    nt.links.new(n2.outputs["Fac"], hmix.inputs[0])
    nt.links.new(pits.outputs["Value"], hmix.inputs[2])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.inputs["Distance"].default_value = 0.002
    bump.invert = True
    nt.links.new(hmix.outputs["Value"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

con = concrete("concrete", P.get("concrete_lo", "#55534f"), P.get("concrete_hi", "#8e8b85"))
field = mat("field", hex_lin(P["field"]), rough=0.75, spec=0.3)
field_floor = mat("field_floor", hex_lin(P.get("floor", P["field"])), rough=0.6, spec=0.35)

# ---------- geometry helpers ----------
def rbox(name, size, loc, r_corner=0.0, r_edge=0.0, m=None, seg=10, parent=None):
    """Box with rounded corners around z (plan radius) and softened edges."""
    me = bpy.data.meshes.new(name)
    ob = bpy.data.objects.new(name, me)
    sc.collection.objects.link(ob)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    bw = bm.edges.layers.float.get("bevel_weight_edge") or bm.edges.layers.float.new("bevel_weight_edge")
    for e in bm.edges:
        d = (e.verts[0].co - e.verts[1].co)
        if abs(d.x) < 1e-6 and abs(d.y) < 1e-6:
            e[bw] = 1.0
    bm.to_mesh(me); bm.free()
    ob.location = loc
    if r_corner > 0:
        md = ob.modifiers.new("corner", "BEVEL"); md.limit_method = "WEIGHT"; md.width = r_corner; md.segments = seg
    if r_edge > 0:
        md = ob.modifiers.new("edge", "BEVEL"); md.limit_method = "ANGLE"; md.width = r_edge; md.segments = 3
        md.angle_limit = math.radians(50)
    for p in me.polygons:
        p.use_smooth = True
    md = ob.modifiers.new("wn", "WEIGHTED_NORMAL"); md.keep_sharp = True
    if m:
        me.materials.append(m)
    if parent:
        ob.parent = parent
    return ob

def empty(name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); sc.collection.objects.link(e)
    e.parent = parent; e.location = loc; e.rotation_euler = rot
    return e

def screen_plane(name, w, h, loc, rot, parent):
    bpy.ops.mesh.primitive_plane_add(size=1)
    s = bpy.context.active_object; s.name = name
    s.scale = (w, h, 1); s.rotation_euler = rot; s.location = loc
    s.data.materials.append(screen_m)
    s.parent = parent
    return s

SCREENS = {}

# ---------- laptop (MacBook Pro 14 proportions, metres) ----------
def laptop(at, yaw, open_deg):
    W, D, HB = 0.3125, 0.221, 0.0105
    LH, LT = 0.2150, 0.0050
    rig = empty("laptop", loc=at, rot=(0, 0, math.radians(yaw)))
    rbox("base", (W, D, HB), (0, 0, HB / 2), 0.012, 0.0016, alu, parent=rig)
    U, gap = 0.01855, 0.0026
    kb_w = 14.5 * U
    rbox("well", (kb_w + 0.004, 5.55 * U + 0.004, 0.0004), (0, D / 2 - 0.012 - (5.55 * U) / 2, HB + 0.0001), 0.004, 0, black, parent=rig)
    rows = [
        (0.55, [1.0357] * 14), (1, [1] * 13 + [1.5]), (1, [1.5] + [1] * 13),
        (1, [1.8] + [1] * 11 + [1.7]), (1, [2.3] + [1] * 10 + [2.2]), (1, [1, 1, 1, 1.25, 5.0, 1.25, 1, 3.0]),
    ]
    y = D / 2 - 0.012 - 0.002
    def key(w, h, x, cy):
        rbox("k", (w - gap, h - gap, 0.0016), (x, cy, HB + 0.0008), 0.0016, 0.0004, key_m, 4, parent=rig)
    for hgt, widths in rows:
        x = -kb_w / 2
        cy = y - hgt * U / 2
        for kw in widths:
            if hgt == 1 and kw == 3.0:  # arrows: left, up over down, right
                key(U, U, x + U / 2, cy)
                key(U, U / 2 + gap / 2, x + 1.5 * U, cy + U / 4)
                key(U, U / 2 + gap / 2, x + 1.5 * U, cy - U / 4)
                key(U, U, x + 2.5 * U, cy)
            else:
                key(kw * U, hgt * U, x + kw * U / 2, cy)
            x += kw * U
        y -= hgt * U
    rbox("pad", (0.150, 0.092, 0.0003), (0, -D / 2 + 0.010 + 0.046, HB + 0.00005), 0.006, 0, pad_m, parent=rig)
    for sx in (-1, 1):
        rbox("grille", (0.016, 5.2 * U, 0.0002), (sx * (kb_w / 2 + 0.0125), D / 2 - 0.012 - 2.75 * U, HB + 0.00005), 0.003, 0, black, parent=rig)
    hg = empty("hinge", rig, (0, D / 2 - LT / 2, HB), (math.radians(-open_deg), 0, 0))
    rbox("lid", (W, LT, LH), (0, 0, LH / 2 + 0.0008), 0.012, 0.0014, alu, parent=hg)
    rbox("bezel", (W - 0.003, 0.0004, LH - 0.003), (0, -LT / 2 - 0.0001, LH / 2 + 0.0008), 0.0105, 0, bezel, parent=hg)
    SW = 0.2955; SH = SW / 1.6
    SCREENS["laptop"] = (screen_plane("laptop_screen", SW, SH, (0, -LT / 2 - 0.00035, 0.0008 + 0.0165 + SH / 2), (math.radians(90), 0, 0), hg), SW, SH)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0042, depth=W - 0.052, vertices=48, rotation=(0, math.radians(90), 0), location=(0, D / 2 - 0.0048, HB + 0.0016))
    hb = bpy.context.active_object; hb.data.materials.append(black); hb.parent = rig
    bpy.ops.object.shade_smooth()

# ---------- phone (iPhone 15 Pro proportions) ----------
def phone(at, yaw, lean):
    PW, PH, PT = 0.0716, 0.1476, 0.0083
    # stands on its bottom edge, leaning back by `lean` degrees; built lying face up, then stood up
    # body space: face +z, top +y. Turning +90deg about x stands it up facing the front (-y); less `lean` tips it back.
    # The pivot is its bottom back edge, on the block.
    base = empty("phone_base", loc=at, rot=(0, 0, math.radians(yaw)))
    stand = empty("phone_stand", base, (0, 0, 0), (math.radians(90 - lean), 0, 0))
    body = empty("phone_body", stand, (0, PH / 2, PT / 2), (0, 0, 0))
    rbox("phone_frame", (PW, PH, PT), (0, 0, 0), 0.0105, 0.0012, alu, 14, parent=body)
    rbox("phone_glass", (PW - 0.0012, PH - 0.0012, 0.0004), (0, 0, PT / 2 + 0.0001), 0.0099, 0, bezel, 14, parent=body)
    SW = 0.0655; SH = SW * 2532 / 1170
    SCREENS["phone"] = (screen_plane("phone_screen", SW, SH, (0, 0, PT / 2 + 0.00035), (0, 0, 0), body), SW, SH)
    # camera bump on the back
    rbox("bump", (0.034, 0.034, 0.0016), (-PW / 2 + 0.021, PH / 2 - 0.021, -PT / 2 - 0.0007), 0.008, 0.0005, alu, 10, parent=body)
    for (lx, ly) in ((-0.0085, 0.0085), (0.0085, 0.0), (-0.0085, -0.0085)):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.0062, depth=0.0016, vertices=40, location=(-PW / 2 + 0.021 + lx, PH / 2 - 0.021 + ly, -PT / 2 - 0.0018))
        c = bpy.context.active_object; c.data.materials.append(lens_m); c.parent = body

L = P.get("laptop")
if L:
    laptop(L.get("at", (0, 0, 0)), L.get("yaw", 0), L.get("open", 22))
PH_ = P.get("phone")
if PH_:
    phone(PH_["at"], PH_.get("yaw", 0), PH_.get("lean", 12))

# ---------- blocks and room ----------
for i, B in enumerate(P.get("blocks", [{"size": (0.46, 0.34, 0.42), "at": (0.03, 0.02)}])):
    bw_, bd_, bh_ = B["size"]
    top = B.get("top", 0)
    rbox(f"block{i}", (bw_, bd_, bh_), (B["at"][0], B["at"][1], top - bh_ / 2), 0, 0.003, con).rotation_euler = (0, 0, math.radians(B.get("yaw", 0)))
FLOOR = P.get("floor_z", -0.42)
bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, FLOOR))
bpy.context.active_object.data.materials.append(field_floor)
WALL_Y = P.get("wall_y", 0.75)
WALL = P.get("wall", "flute")
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, WALL_Y + 0.05, FLOOR + 2), rotation=(math.radians(90), 0, 0))
w_ = bpy.context.active_object; w_.scale = (8, 4, 1); w_.data.materials.append(field)
if WALL == "flute":
    fl_r = P.get("flute", 0.045)
    n = int(5.0 / (fl_r * 2))
    for i in range(n):
        x = -2.5 + i * fl_r * 2 + fl_r
        bpy.ops.mesh.primitive_cylinder_add(radius=fl_r, depth=4.0, vertices=40, location=(x, WALL_Y + fl_r * 0.2, FLOOR + 2.0))
        c = bpy.context.active_object; c.data.materials.append(field)
        bpy.ops.object.shade_smooth()
elif WALL == "panel":
    # tall panels with deep reveals
    pw = P.get("panel", 0.36)
    for i in range(int(5.0 / pw)):
        x = -2.5 + i * pw + pw / 2
        rbox("panel", (pw - 0.012, 0.03, 4.0), (x, WALL_Y, FLOOR + 2.0), 0, 0.004, field)
# window: a frame between the sun and the room so its light lands on the wall in bars
if P.get("window"):
    WIN = P["window"]
    wy = WIN.get("y", -1.4)
    occ = rbox("occluder", (8, 0.02, 8), (0, wy, 1.5), 0, 0, black)
    occ.visible_camera = False
    for i, (x0, x1, z0, z1) in enumerate(WIN["panes"]):
        cut = rbox(f"pane{i}", (x1 - x0, 0.2, z1 - z0), ((x0 + x1) / 2, wy, (z0 + z1) / 2), 0, 0)
        md = occ.modifiers.new(f"b{i}", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = cut; md.solver = "EXACT"
        cut.hide_render = True; cut.hide_viewport = True

# ---------- light ----------
world = bpy.data.worlds.new("w"); sc.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.85, 0.87, 0.92, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = P.get("ambient", 0.1)

def area(name, loc, target, size, power, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, "AREA"); ld.size = size; ld.energy = power; ld.color = color
    ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob); ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return ob

area("key", P.get("key_at", (-1.1, -0.9, 1.2)), (0, 0, 0.05), 1.4, P.get("key", 120), (1.0, 0.97, 0.93))
area("fill", P.get("fill_at", (1.2, -0.6, 0.4)), (0, 0, 0.05), 1.0, P.get("fill", 40), (0.92, 0.95, 1.0))
area("rim", P.get("rim_at", (0.6, 1.0, 0.9)), (0, 0, 0.1), 0.6, P.get("rim", 90))
if P.get("sun", 1.2) > 0:
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = P.get("sun", 1.2); sun.angle = math.radians(P.get("sun_angle", 1.5))
    so = bpy.data.objects.new("sun", sun); sc.collection.objects.link(so)
    so.rotation_euler = tuple(math.radians(a) for a in P.get("sun_rot", (52, 0, -38)))

# ---------- camera ----------
cd = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cd); sc.collection.objects.link(cam)
C = P["cam"]
cam.location = C["loc"]
d = Vector(C["target"]) - Vector(C["loc"])
cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
if C.get("roll"):
    cam.rotation_euler.rotate_axis("Z", math.radians(C["roll"]))
cd.lens = C.get("lens", 50); cd.sensor_width = 36; cd.sensor_fit = "HORIZONTAL"
cd.dof.use_dof = True; cd.dof.focus_distance = C.get("focus", d.length); cd.dof.aperture_fstop = C.get("fstop", 5)
sc.camera = cam

# ---------- render ----------
r = sc.render
r.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "METAL"; prefs.get_devices()
for dv in prefs.devices:
    dv.use = dv.type == "METAL"
sc.cycles.device = "GPU"
sc.cycles.samples = P.get("samples", 128)
sc.cycles.use_denoising = True
r.resolution_x = P["w"]; r.resolution_y = P["h"]; r.resolution_percentage = 100
r.image_settings.file_format = "PNG"
sc.view_settings.view_transform = P.get("vt", "Standard")
sc.view_settings.look = P.get("look", "None")
sc.view_settings.exposure = P.get("exposure", -0.9)
r.filepath = P["out"]
bpy.context.view_layer.update()

# ---------- screen poses for CSS ----------
# CSS sees the field as a box 100cqw wide with perspective f = lens/36*100 cqw from its centre. A camera-space point
# (X, Y, Z) (Blender: Y up, the camera looks down -Z) sits at CSS (kX, -kY, f + kZ): it projects to f*X/-Z, which is
# where Blender draws it. k puts the screen's centre at CSS depth 0, so it draws near 1:1.
f = cd.lens / 36 * 100
cinv = cam.matrix_world.inverted()
poses = {"aspect": P["w"] / P["h"], "perspective": round(f, 4), "screens": {}}
for name, (s, sw, sh) in SCREENS.items():
    mw = s.matrix_world
    tl = cinv @ (mw @ Vector((-0.5, 0.5, 0)))
    tr = cinv @ (mw @ Vector((0.5, 0.5, 0)))
    bl = cinv @ (mw @ Vector((-0.5, -0.5, 0)))
    ctr = cinv @ (mw @ Vector((0, 0, 0)))
    k = f / -ctr.z
    eu = (tr - tl).normalized(); ev = (bl - tl).normalized()
    eu = Vector((eu.x, -eu.y, eu.z)); ev = Vector((ev.x, -ev.y, ev.z)); nz = eu.cross(ev)
    t = (k * tl.x, -k * tl.y, f + k * tl.z)
    m = [eu.x, eu.y, eu.z, 0, ev.x, ev.y, ev.z, 0, nz.x, nz.y, nz.z, 0, 0, 0, 0, 1]
    # projected corners, as a check and for placing things beside the screen (fractions of width / height)
    from bpy_extras.object_utils import world_to_camera_view
    quad = []
    for c in ((-0.5, 0.5), (0.5, 0.5), (0.5, -0.5), (-0.5, -0.5)):
        p = world_to_camera_view(sc, cam, mw @ Vector((c[0], c[1], 0)))
        quad.append((round(p.x, 5), round(1 - p.y, 5)))
    poses["screens"][name] = {
        "w": round(k * (tr - tl).length, 4), "h": round(k * (bl - tl).length, 4),
        "t": [round(v, 4) for v in t], "m": [round(v, 6) for v in m], "quad": quad,
    }
with open(P["out"].rsplit(".", 1)[0] + ".json", "w") as fh:
    json.dump(poses, fh)
print("POSES", json.dumps(poses))
if not P.get("dry"):
    bpy.ops.render.render(write_still=True)
