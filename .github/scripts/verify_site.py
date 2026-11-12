#!/usr/bin/env python3
"""Lightweight integrity checks for the Apokolips static website."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
REQUIRED_FILES = (
    "index.html",
    "style.css",
    "script.js",
    "visitor-counter.js",
    "sitemap.xml",
    "robots.txt",
)

class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.references = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and attrs.get("href"):
            self.references.append(("link", attrs["href"]))
        elif tag == "script" and attrs.get("src"):
            self.references.append(("script", attrs["src"]))
        elif tag == "link" and attrs.get("href"):
            rel = set((attrs.get("rel") or "").lower().split())
            if "stylesheet" in rel or "manifest" in rel:
                self.references.append(("resource", attrs["href"]))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

def local_target(page, reference):
    parsed = urlsplit(reference.strip())
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    path = unquote(parsed.path)
    if path.startswith("/"):
        target = ROOT / path.lstrip("/")
    else:
        target = page.parent / path
    if target.is_dir():
        target = target / "index.html"
    return target

def main():
    errors = []
    for relative in REQUIRED_FILES:
        path = ROOT / relative
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f"Required file missing or empty: {relative}")

    html_files = sorted(ROOT.glob("*.html"))
    if not html_files:
        errors.append("No HTML pages found in repository root.")

    for page in html_files:
        try:
            source = page.read_text(encoding="utf-8")
            parser = SiteParser()
            parser.feed(source)
            parser.close()
        except Exception as exc:
            errors.append(f"Could not parse {page.name}: {exc}")
            continue

        for kind, reference in parser.references:
            target = local_target(page, reference)
            if target is not None and not target.exists():
                errors.append(
                    f"Broken local {kind} in {page.name}: {reference}"
                )

    sitemap = ROOT / "sitemap.xml"
    if sitemap.is_file():
        try:
            tree = ET.parse(sitemap)
            namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            for loc in tree.findall(".//sm:loc", namespace):
                value = (loc.text or "").strip()
                parsed = urlsplit(value)
                if parsed.hostname not in {"apokolips.xyz", "www.apokolips.xyz"}:
                    errors.append(f"Unexpected sitemap host: {value}")
                    continue
                path = unquote(parsed.path).lstrip("/") or "index.html"
                target = ROOT / path
                if target.is_dir():
                    target = target / "index.html"
                if not target.exists():
                    errors.append(f"Sitemap URL has no matching file: {value}")
        except ET.ParseError as exc:
            errors.append(f"Invalid sitemap.xml: {exc}")

    if errors:
        print("Apokolips verification failed:")
        for error in errors:
            print(f" - {error}")
        return 1

    print(f"Apokolips verification passed: {len(html_files)} HTML pages checked.")
    print("Required files, local navigation/resources, and sitemap are present.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
