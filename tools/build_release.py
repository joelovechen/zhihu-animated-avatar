from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
VERSION = "2.2.0"
RELEASE_DIR = ROOT / "local-artifacts" / "releases" / "current" / f"v{VERSION}"
OUT = RELEASE_DIR / f"zhihu-animated-avatar-edge-v{VERSION}.zip"
KIT = RELEASE_DIR / f"zhihu-animated-avatar-edge-store-kit-v{VERSION}.zip"
FILES = [
    "manifest.json",
    "popup.html",
    "popup.css",
    "popup.js",
    "author.html",
    "author.css",
    "author.js",
    "media.js",
    "injector.js",
    "_locales/zh_CN/messages.json",
    "icons/icon16.png",
    "icons/icon32.png",
    "icons/icon48.png",
    "icons/icon128.png",
]

def fail(message):
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)

manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8-sig"))
messages = json.loads((ROOT / "_locales/zh_CN/messages.json").read_text(encoding="utf-8-sig"))

if manifest.get("manifest_version") != 3:
    fail("Only Manifest V3 is allowed")
if manifest.get("version") != VERSION:
    fail(f"Manifest version must be {VERSION}")
if manifest.get("default_locale") != "zh_CN":
    fail("default_locale must match the packaged locale")
if set(manifest.get("permissions", [])) != {"storage", "unlimitedStorage", "activeTab", "scripting"}:
    fail("Unexpected permission set")
expected_hosts = {
    "https://zhihu-avatar-author.qxzcmd.workers.dev/*",
    "https://raw.githubusercontent.com/*",
}
if set(manifest.get("host_permissions", [])) != expected_hosts:
    fail("Unexpected host permission set")
for forbidden in ("content_scripts", "background", "externally_connectable"):
    if forbidden in manifest:
        fail(f"Unexpected manifest field: {forbidden}")
for field in ("name", "description"):
    value = manifest[field]
    match = re.fullmatch(r"__MSG_([A-Za-z0-9_]+)__", value)
    if not match or match.group(1) not in messages:
        fail(f"Unresolved localized manifest field: {field}")

for item in FILES:
    if not (ROOT / item).is_file():
        fail(f"Missing package file: {item}")

for size in (16, 32, 48, 128):
    with Image.open(ROOT / f"icons/icon{size}.png") as image:
        if image.format != "PNG" or image.size != (size, size):
            fail(f"Invalid icon{size}.png")

store_sizes = {
    "logo-300.png": (300, 300),
    "small-promo-440x280.png": (440, 280),
    "large-promo-1400x560.png": (1400, 560),
    "screenshot-1-1280x800.png": (1280, 800),
    "screenshot-2-1280x800.png": (1280, 800),
    "screenshot-3-1280x800.png": (1280, 800),
}
for filename, expected in store_sizes.items():
    with Image.open(ROOT / "store-listing/assets" / filename) as image:
        if image.format != "PNG" or image.size != expected:
            fail(f"Invalid store asset: {filename}; expected {expected}, got {image.size}")

listing = (ROOT / "store-listing/STORE_LISTING_zh-CN.md").read_text(encoding="utf-8-sig")
description = listing.split("## 详细说明", 1)[1].split("## 搜索词", 1)[0].strip()
if not 250 <= len(description) <= 10000:
    fail(f"Store description length is {len(description)}, expected 250..10000")

source = "\n".join((ROOT / f).read_text(encoding="utf-8-sig") for f in FILES if f.endswith((".js", ".html", ".css")))
if re.search(r"\b(?:eval|new\s+Function)\s*\(", source):
    fail("Dynamic code execution detected")
if re.search(r"<script[^>]+src=[\"']https?://", source, re.I):
    fail("Remote script detected")
if "实验性" in source or "experimental" in source.lower():
    fail("Experimental label remains in the production package")

RELEASE_DIR.mkdir(parents=True, exist_ok=True)
if OUT.exists():
    OUT.unlink()
with ZipFile(OUT, "w", ZIP_DEFLATED) as archive:
    for item in FILES:
        archive.write(ROOT / item, item)
with ZipFile(OUT) as archive:
    if archive.testzip() is not None or archive.namelist() != FILES:
        fail("ZIP integrity or contents check failed")

kit_files = [
    "README.md",
    "store-listing/STORE_LISTING_zh-CN.md",
    "store-listing/STORE_SUBMISSION_FIELDS_zh-CN.md",
    "store-listing/REVIEWER_NOTES_zh-CN.txt",
    "store-listing/SUBMISSION_CHECKLIST.md",
    "store-listing/PRIVACY_POLICY.md",
    "store-listing/privacy-policy.html",
] + [f"store-listing/assets/{name}" for name in store_sizes]
kit_files += [
    "author-content/author-content.json",
    "author-content/README.md",
    "cloudflare/worker.js",
    "cloudflare/README.md",
]
if KIT.exists():
    KIT.unlink()
with ZipFile(KIT, "w", ZIP_DEFLATED) as archive:
    archive.write(OUT, OUT.name)
    for item in kit_files:
        archive.write(ROOT / item, item)

digest = hashlib.sha256(OUT.read_bytes()).hexdigest()
(RELEASE_DIR / f"zhihu-animated-avatar-edge-v{VERSION}.sha256.txt").write_text(
    f"{digest}  {OUT.name}\n", encoding="ascii"
)

print(f"Release ready: {OUT}")
print(f"Package files: {len(FILES)}; size: {OUT.stat().st_size} bytes")
print(f"Store submission kit: {KIT}")
print(f"SHA-256: {digest}")
