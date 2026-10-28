"""Downsize existing authentic restaurant photos without cropping, edits or upscaling."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path("assets/images")
for original in sorted(ROOT.glob("*.webp")):
    if original.stem.endswith(("-480", "-960")):
        continue
    with Image.open(original) as source:
        image = ImageOps.exif_transpose(source)
        for target_width in (480, 960):
            if image.width <= target_width:
                continue
            target = ROOT / f"{original.stem}-{target_width}.webp"
            height = round(image.height * target_width / image.width)
            resized = image.resize((target_width, height), Image.Resampling.LANCZOS)
            resized.save(target, format="WEBP", quality=78, method=6)
            print(f"{target} {target_width}x{height} {target.stat().st_size} bytes")
