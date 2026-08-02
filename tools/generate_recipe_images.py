from pathlib import Path
import hashlib
import math
import random
import re

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
RECIPES = ROOT / "recipes.js"
OUT = ROOT / "assets"
SIZE = (900, 360)

PALETTES = [
    ((231, 220, 202), (247, 242, 232), (107, 151, 85), (226, 195, 91), (214, 101, 71)),
    ((216, 202, 184), (250, 244, 233), (80, 143, 93), (241, 183, 70), (190, 83, 66)),
    ((218, 226, 210), (250, 246, 236), (73, 137, 79), (232, 218, 111), (161, 87, 63)),
    ((236, 221, 205), (255, 249, 238), (95, 151, 106), (245, 204, 107), (198, 103, 80)),
]


def parse_recipes():
    source = RECIPES.read_text()
    blocks = re.findall(r"\{\n    id: .*?\n  \}", source, flags=re.S)
    recipes = []
    for block in blocks:
        recipe_id = re.search(r'id: "([^"]+)"', block)
        title = re.search(r'title: "([^"]+)"', block)
        tags = re.search(r"tags: \[([^\]]*)\]", block)
        category = re.search(r'category: "([^"]+)"', block)
        if not recipe_id or not title:
            continue
        tag_text = tags.group(1).lower() if tags else ""
        recipes.append(
            {
                "id": recipe_id.group(1),
                "title": title.group(1).lower(),
                "tags": tag_text,
                "category": category.group(1) if category else "main",
            }
        )
    return recipes


def lerp(a, b, t):
    return int(a + (b - a) * t)


def gradient(draw, top, bottom):
    width, height = SIZE
    for y in range(height):
        t = y / max(height - 1, 1)
        color = tuple(lerp(top[i], bottom[i], t) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)


def ellipse_shadow(base):
    shadow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse((130, 18, 770, 348), fill=(70, 48, 35, 55))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    base.alpha_composite(shadow)


def draw_leaf(draw, x, y, color, angle=0, scale=1):
    w, h = 22 * scale, 44 * scale
    points = []
    for i in range(20):
        t = i / 19
        yy = -h / 2 + h * t
        radius = math.sin(t * math.pi) * w
        points.append((x + math.cos(angle) * radius - math.sin(angle) * yy,
                       y + math.sin(angle) * radius + math.cos(angle) * yy))
    for i in range(19, -1, -1):
        t = i / 19
        yy = -h / 2 + h * t
        radius = -math.sin(t * math.pi) * w
        points.append((x + math.cos(angle) * radius - math.sin(angle) * yy,
                       y + math.sin(angle) * radius + math.cos(angle) * yy))
    draw.polygon(points, fill=color)


def draw_noodles(draw, rng, bounds, color):
    left, top, right, bottom = bounds
    for _ in range(20):
        y = rng.randint(top + 30, bottom - 30)
        points = []
        for x in range(left + 40, right - 30, 24):
            points.append((x, y + math.sin(x / 32 + rng.random() * 5) * rng.randint(8, 18)))
        draw.line(points, fill=color, width=rng.randint(6, 9), joint="curve")


def draw_food(recipe, index):
    seed = int(hashlib.sha256(recipe["id"].encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    palette = PALETTES[index % len(PALETTES)]

    image = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    gradient(draw, palette[0], palette[1])

    for _ in range(18):
        x, y = rng.randint(-30, 900), rng.randint(-30, 360)
        r = rng.randint(14, 46)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, rng.randint(18, 38)))

    ellipse_shadow(image)
    draw = ImageDraw.Draw(image)
    plate = (118, 5, 782, 350)
    draw.ellipse(plate, fill=(253, 250, 243, 255), outline=(236, 229, 216, 255), width=9)
    draw.ellipse((165, 35, 735, 324), fill=(244, 236, 220, 255))

    title = recipe["title"]
    tags = recipe["tags"]
    is_pasta = "pasta" in title or "pasta" in tags
    is_bowl = "bowl" in title or "bowl" in tags
    is_sweet = "sweet" in tags or "oats" in title or "muffin" in title or "ice" in title
    is_soup = "soup" in title

    if is_soup:
        draw.ellipse((185, 48, 715, 314), fill=(225, 126, 64, 255))
        for _ in range(32):
            x, y = rng.randint(250, 650), rng.randint(90, 270)
            draw.ellipse((x - 10, y - 10, x + 10, y + 10), fill=palette[2] + (230,))
    elif is_pasta:
        draw_noodles(draw, rng, (185, 60, 715, 300), (235, 218, 152, 255))
        for _ in range(28):
            x, y = rng.randint(225, 675), rng.randint(80, 285)
            color = rng.choice([palette[2], palette[3], palette[4], (242, 243, 209)])
            if rng.random() < .45:
                draw_leaf(draw, x, y, color + (255,), rng.random() * math.pi, rng.uniform(.35, .65))
            else:
                draw.ellipse((x - 13, y - 10, x + 13, y + 10), fill=color + (255,))
    elif is_sweet:
        draw.ellipse((205, 64, 695, 300), fill=(236, 222, 191, 255))
        for _ in range(38):
            x, y = rng.randint(235, 665), rng.randint(82, 278)
            color = rng.choice([(114, 71, 52), (212, 86, 88), (247, 226, 132), (255, 250, 238)])
            r = rng.randint(8, 20)
            draw.ellipse((x - r, y - r, x + r, y + r), fill=color + (255,))
    else:
        draw.ellipse((195, 56, 705, 305), fill=(239, 227, 201, 255))
        for _ in range(46 if is_bowl else 34):
            x, y = rng.randint(225, 675), rng.randint(78, 282)
            color = rng.choice([palette[2], palette[3], palette[4], (245, 238, 214), (105, 80, 62)])
            if rng.random() < .28:
                draw_leaf(draw, x, y, color + (255,), rng.random() * math.pi, rng.uniform(.32, .68))
            else:
                r = rng.randint(10, 25)
                draw.rounded_rectangle((x - r, y - r, x + r, y + r), radius=rng.randint(5, 12), fill=color + (255,))

    for _ in range(55):
        x, y = rng.randint(170, 730), rng.randint(50, 318)
        draw.ellipse((x, y, x + 3, y + 3), fill=(67, 54, 42, rng.randint(60, 120)))

    image = image.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1, percent=115, threshold=3))
    return image


def main():
    OUT.mkdir(exist_ok=True)
    for index, recipe in enumerate(parse_recipes()):
        draw_food(recipe, index).save(OUT / f"{recipe['id']}.png", optimize=True)


if __name__ == "__main__":
    main()
