#!/usr/bin/env python3
"""Generate a simplified TopoJSON file with shared arcs preserved."""
import argparse
import json
import math
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument("source", type=Path)
p.add_argument("output", type=Path)
p.add_argument("--meters", type=float, default=20)
args = p.parse_args()
if args.source.resolve() == args.output.resolve():
    p.error("source and output must differ")
if not (0 < args.meters <= 100):
    p.error("meters must be between 0 and 100")
data = json.loads(args.source.read_text(encoding="utf-8"))
transform = data.get("transform")

def decode(arc):
    x = y = 0
    result = []
    for px, py in arc:
        if transform:
            x += px
            y += py
            result.append([x * transform["scale"][0] + transform["translate"][0],
                           y * transform["scale"][1] + transform["translate"][1]])
        else:
            result.append([px, py])
    return result

def squared_distance(point, start, end, latitude):
    mx = 111320 * math.cos(math.radians(latitude))
    my = 111195
    ax, ay = start[0] * mx, start[1] * my
    bx, by = end[0] * mx, end[1] * my
    px, py = point[0] * mx, point[1] * my
    dx, dy = bx - ax, by - ay
    length = dx * dx + dy * dy
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / length)) if length else 0
    return (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2

def simplify(points):
    if len(points) <= 2 or points[0] == points[-1]:
        return points
    kept = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    latitude = (points[0][1] + points[-1][1]) / 2
    while stack:
        start, end = stack.pop()
        if end - start < 2:
            continue
        index = max(range(start + 1, end),
                    key=lambda i: squared_distance(points[i], points[start], points[end], latitude))
        if squared_distance(points[index], points[start], points[end], latitude) > args.meters ** 2:
            kept.add(index)
            stack.extend([(start, index), (index, end)])
    return [points[i] for i in sorted(kept)]

result = {"type": "Topology", "objects": data["objects"],
          "arcs": [simplify(decode(arc)) for arc in data["arcs"]]}
if "bbox" in data:
    result["bbox"] = data["bbox"]
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
assert len(result["arcs"]) == len(data["arcs"])
assert result["objects"] == data["objects"]
assert all(len(a) >= 2 for a in result["arcs"])
print(args.output, args.output.stat().st_size, "bytes")
print("arc count:", len(result["arcs"]), "vertices:", sum(map(len, result["arcs"])))
