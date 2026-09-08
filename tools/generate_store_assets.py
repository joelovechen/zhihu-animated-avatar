from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "icons"
STORE_DIR = ROOT / "store-listing" / "assets"
ICON_DIR.mkdir(parents=True, exist_ok=True)
STORE_DIR.mkdir(parents=True, exist_ok=True)

FONT_REGULAR = "C:/Windows/Fonts/msyh.ttc"
FONT_BOLD = "C:/Windows/Fonts/msyhbd.ttc"

def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)

def logo(size, background=(255, 255, 255, 0)):
    scale = 4
    canvas = Image.new("RGBA", (size * scale, size * scale), background)
    d = ImageDraw.Draw(canvas)
    s = size * scale
    blue = (21, 104, 220, 255)
    navy = (22, 45, 73, 255)
    pale = (223, 237, 255, 255)
    d.rounded_rectangle((s*.08, s*.08, s*.92, s*.92), radius=s*.22, fill=(248,251,255,255), outline=pale, width=max(2, int(s*.025)))
    d.arc((s*.20, s*.20, s*.80, s*.80), 205, 520, fill=blue, width=max(3, int(s*.07)))
    d.ellipse((s*.69, s*.16, s*.82, s*.29), fill=(47, 204, 151, 255))
    d.polygon([(s*.43,s*.35),(s*.70,s*.50),(s*.43,s*.65)], fill=navy)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)

for size in (16, 32, 48, 128):
    logo(size).save(ICON_DIR / f"icon{size}.png")

logo(300, (255,255,255,255)).save(STORE_DIR / "logo-300.png")

def tile(width, height, output, compact=False):
    im = Image.new("RGB", (width, height), (244, 248, 255))
    d = ImageDraw.Draw(im)
    d.ellipse((width*.68, -height*.45, width*1.12, height*.75), fill=(218,234,255))
    d.ellipse((width*.78, height*.48, width*1.05, height*1.08), fill=(222,249,240))
    icon_size = int(height * (.42 if compact else .52))
    im.paste(logo(icon_size, (255,255,255,255)), (int(width*.08), (height-icon_size)//2))
    x = int(width*(.43 if compact else .36))
    title_size = int(height*(.095 if compact else .105))
    d.text((x, height*.26), "知乎动态头像助手", font=font(title_size, True), fill=(22,45,73))
    d.text((x, height*.45), "GIF / 动态 WebP  ·  本地处理", font=font(int(title_size*.52)), fill=(71,96,128))
    d.rounded_rectangle((x, height*.62, x+int(width*.28), height*.76), radius=int(height*.025), fill=(21,104,220))
    label = "自动更换头像"
    box = d.textbbox((0,0), label, font=font(int(title_size*.48), True))
    d.text((x+int(width*.14)-(box[2]-box[0])/2, height*.64), label, font=font(int(title_size*.48), True), fill="white")
    im.save(output, optimize=True)

tile(440, 280, STORE_DIR / "small-promo-440x280.png", True)
tile(1400, 560, STORE_DIR / "large-promo-1400x560.png")

def author_screenshot():
    im = Image.new("RGB", (1280, 800), (241, 245, 251))
    d = ImageDraw.Draw(im)
    d.ellipse((880, -260, 1420, 280), fill=(222, 235, 255))
    d.text((72, 58), "作者与更新", font=font(18, True), fill=(67, 103, 145))
    d.text((72, 96), "远程内容，双源容错", font=font(46, True), fill=(23, 38, 58))
    d.text((72, 168), "Cloudflare 主源不可用时自动切换 GitHub，并保留缓存和内置内容。", font=font(18), fill=(92, 111, 137))
    d.rounded_rectangle((72, 228, 1208, 670), radius=24, fill="white", outline=(220, 228, 239), width=2)
    d.rounded_rectangle((112, 276, 194, 358), radius=20, fill=(28, 103, 220))
    d.text((138, 287), "J", font=font(38, True), fill="white")
    d.text((220, 273), "joelovechen", font=font(26, True), fill=(24, 40, 62))
    d.text((220, 319), "独立开发者，关注实用浏览器工具。", font=font(17), fill=(99, 116, 140))
    d.rounded_rectangle((938, 284, 1166, 326), radius=21, fill=(232, 246, 239))
    d.text((964, 293), "Cloudflare 已连接", font=font(14, True), fill=(39, 111, 76))
    d.line((112, 395, 1168, 395), fill=(232, 237, 244), width=2)
    d.text((112, 430), "最新消息", font=font(20, True), fill=(24, 40, 62))
    d.text((112, 478), "2.2.0 发布准备", font=font(18, True), fill=(37, 58, 83))
    d.text((112, 516), "新增可远程更新的作者与消息页面，并提供 Cloudflare 与 GitHub 双源容错。", font=font(16), fill=(93, 111, 137))
    for x, label, sub in [(112, "GitHub 主页", "查看公开项目"), (420, "原理文章", "Archimon · 知乎")]:
        d.rounded_rectangle((x, 578, x+280, 638), radius=12, fill=(244, 248, 253))
        d.text((x+18, 588), label, font=font(15, True), fill=(47, 94, 150))
        d.text((x+150, 591), sub, font=font(12), fill=(121, 138, 160))
    d.text((72, 726), "只读取经过校验的 JSON 文本 · 不加载远程脚本", font=font(14), fill=(111, 130, 154))
    im.save(STORE_DIR / "screenshot-3-1280x800.png", optimize=True)

author_screenshot()
print("Generated extension icons and Edge store artwork.")
