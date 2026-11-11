# Regenerate sitemap.xml from the chapters marked status: "ready" in course.js.
import re, subprocess, datetime, pathlib
BASE = "https://idriskb.github.io/ML_course/"
js = pathlib.Path("assets/js/course.js").read_text()
slugs = [m.group(1) for m in re.finditer(r'slug: "([^"]+)"[^}]*?status: "ready"', js)]
def lastmod(f):
    d = subprocess.run(["git","log","-1","--format=%cs","--",f],capture_output=True,text=True).stdout.strip()
    return d or datetime.date.today().isoformat()
urls = [(BASE, lastmod("index.html"))] + [(f"{BASE}chapters/{s}.html", lastmod(f"chapters/{s}.html")) for s in slugs]
out = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
out += [f"  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>" for u, d in urls]
out.append("</urlset>")
pathlib.Path("sitemap.xml").write_text("\n".join(out) + "\n")
print("\n".join(out))
