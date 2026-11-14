"""Generate seamless woven tiles as RGBA PNG overlays (no dependencies).
twill.png: 2/2 twill lanyard weave, overlay on the #2132D6 ground.
webbing.png: ribbed strap webbing, overlay on the #111216 strap."""
import random, struct, zlib, math, sys, os

def write_png(path, w, h, px):
    raw = b"".join(b"\x00" + bytes(px[y*w*4:(y+1)*w*4]) for y in range(h))
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    open(path, "wb").write(png)

def px_from_delta(d):
    # positive delta: white thread highlight; negative: deep shadow, as alpha over the ground
    if d >= 0: return [255, 255, 255, min(255, int(d * 255))]
    return [4, 6, 30, min(255, int(-d * 255))]

def twill(size=48, tw=2, seed=7):
    rnd = random.Random(seed); n = size // tw
    warp_var = [rnd.uniform(-0.018, 0.018) for _ in range(n)]
    weft_var = [rnd.uniform(-0.018, 0.018) for _ in range(n)]
    out = []
    for y in range(size):
        for x in range(size):
            u, v = x // tw, y // tw
            fx, fy = (x % tw + 0.5) / tw, (y % tw + 0.5) / tw
            if (u - v) % 4 < 2:   # warp float on top: lit along its length
                d = 0.055 * math.sin(math.pi * fx) + warp_var[u]
            else:                 # weft float: sits lower, shaded
                d = -0.07 * (0.6 + 0.4 * math.sin(math.pi * fy)) + weft_var[v]
            d += rnd.uniform(-0.012, 0.012)
            out += px_from_delta(d)
    return size, size, out

def webbing(w=32, h=32, rib=3, seed=11):
    rnd = random.Random(seed)
    out = []
    for y in range(h):
        r = (y % rib + 0.5) / rib
        for x in range(w):
            d = 0.07 * math.sin(math.pi * r) - 0.025
            if x % 4 == 0: d -= 0.03       # warp yarn separation
            d += rnd.uniform(-0.015, 0.015)
            out += px_from_delta(d)
    return w, h, out

here = os.path.dirname(os.path.abspath(__file__))
dst = os.path.join(here, "..", "assets", "textures")
w, h, p = twill(); write_png(os.path.join(dst, "twill.png"), w, h, p)
w, h, p = webbing(); write_png(os.path.join(dst, "webbing.png"), w, h, p)
print("ok")
