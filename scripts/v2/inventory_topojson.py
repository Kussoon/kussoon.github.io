#!/usr/bin/env python3
"""Inventory V2 TopoJSON inputs without modifying any map data."""
import json
from pathlib import Path

root = Path("v2")
files = sorted(root.rglob("*.topojson"))
report = []
for file in files:
    row = {"path": str(file), "bytes": file.stat().st_size}
    try:
        data = json.loads(file.read_text(encoding="utf-8"))
        if data.get("type") != "Topology":
            row["error"] = "not Topology"
        else:
            row["arcs"] = len(data.get("arcs", []))
            row["vertices"] = sum(len(a) for a in data.get("arcs", []))
            row["objects"] = {
                key: len(obj.get("geometries", [])) if obj.get("type") == "GeometryCollection" else 1
                for key, obj in data.get("objects", {}).items()
            }
    except (OSError, ValueError, TypeError) as exc:
        row["error"] = str(exc)
    report.append(row)
print(json.dumps({"count": len(report), "files": report}, ensure_ascii=False, indent=2))
