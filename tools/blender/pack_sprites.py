from PIL import Image
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
RAW = os.path.join(REPO, ".sprites-raw")
PUBLIC = os.path.join(REPO, "public", "sprites")
os.makedirs(PUBLIC, exist_ok=True)

CHARACTERS = [
    ("hero", 84, 94, 9, 12),
    ("bug", 62, 52, 10, 12),
    ("virus", 78, 70, 12, 14),
    ("trojan", 112, 126, 6, 9),
]

manifest = {}

for name, max_w, max_h, idle_fps, attack_fps in CHARACTERS:
    folder = os.path.join(RAW, name)
    idle_files = [os.path.join(folder, f"idle_{i:02d}.png") for i in range(8)]
    attack_files = [os.path.join(folder, f"attack_{i:02d}.png") for i in range(6)]
    frames = [Image.open(path).convert("RGBA") for path in idle_files + attack_files]

    alpha = [frame.getchannel("A") for frame in frames]
    boxes = [a.getbbox() for a in alpha]
    min_x = min(b[0] for b in boxes)
    min_y = min(b[1] for b in boxes)
    max_x = max(b[2] for b in boxes)
    max_y = max(b[3] for b in boxes)

    pad = 3
    min_x = max(0, min_x - pad)
    min_y = max(0, min_y - pad)
    max_x = min(frames[0].width, max_x + pad)
    max_y = min(frames[0].height, max_y + pad)
    width = max_x - min_x
    height = max_y - min_y

    cols = 8
    rows = 2
    sheet = Image.new("RGBA", (width * cols, height * rows), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        cropped = frame.crop((min_x, min_y, max_x, max_y))
        row = 0 if index < 8 else 1
        col = index if index < 8 else index - 8
        sheet.paste(cropped, (col * width, row * height))

    sheet_path = os.path.join(PUBLIC, f"{name}.png")
    sheet.save(sheet_path, "PNG", optimize=True)

    manifest[name] = {
        "image": f"/sprites/{name}.png",
        "frameWidth": width,
        "frameHeight": height,
        "anchorX": 0.5,
        "anchorY": 1.0,
        "maxWidth": max_w,
        "maxHeight": max_h,
        "animations": {
            "idle": {"row": 0, "frames": 8, "fps": idle_fps, "loop": True},
            "attack": {"row": 1, "frames": 6, "fps": attack_fps, "loop": False},
        },
    }
    print(f"{name}: frame {width}x{height} sheet {sheet.width}x{sheet.height}")

with open(os.path.join(PUBLIC, "manifest.json"), "w", encoding="utf-8") as fh:
    json.dump(manifest, fh, indent=2)

print("manifest written")
