#!/usr/bin/env python3
"""Derive display paths from the existing 2026 TopoJSON, keeping national and prefecture layers separate."""
import argparse
from collections import Counter, defaultdict
import json
import math
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
PAINT = (980, 660)
WEST, NORTH = 122, 46.2
SCALE = 27.2


def load(file):
    return json.loads(file.read_text(encoding="utf-8"))


def save(file, payload):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def project(x, y):
    return (round(135 + (x - WEST) * (.82 * SCALE), 4), round(23 + (NORTH - y) * SCALE, 4))


def decode(topo):
    transform = topo.get("transform")
    if not transform:
        return [[project(x, y) for x, y in arc] for arc in topo["arcs"]]
    sx, sy = transform["scale"]
    ox, oy = transform["translate"]
    result = []
    for arc in topo["arcs"]:
        x = y = 0
        points = []
        for dx, dy in arc:
            x += dx
            y += dy
            points.append(project(x * sx + ox, y * sy + oy))
        result.append(points)
    return result


def simplify(points, tolerance):
    if len(points) < 3:
        return points
    keep = {0, len(points) - 1}
    ranges = [(0, len(points) - 1)]
    while ranges:
        a, b = ranges.pop()
        x0, y0 = points[a]
        vx, vy = points[b][0] - x0, points[b][1] - y0
        denom = vx * vx + vy * vy
        furthest, largest = a, tolerance * tolerance
        for i in range(a + 1, b):
            x, y = points[i][0] - x0, points[i][1] - y0
            weight = min(1, max(0, (x * vx + y * vy) / denom)) if denom else 0
            dx, dy = x - weight * vx, y - weight * vy
            distance = dx * dx + dy * dy
            if distance > largest:
                furthest, largest = i, distance
        if furthest != a:
            keep.add(furthest)
            ranges.append((a, furthest))
            ranges.append((furthest, b))
    chosen = [points[i] for i in sorted(keep)]
    if points[0] == points[-1] and len(chosen) < 4 and len(points) >= 4:
        x0, y0 = points[0]
        interior = range(1, len(points) - 1)
        end = max(interior, key=lambda i: (points[i][0] - x0)**2 + (points[i][1] - y0)**2)
        x1, y1 = points[end]
        side = max((i for i in interior if i != end),
                   key=lambda i: abs((x1 - x0) * (points[i][1] - y0) - (y1 - y0) * (points[i][0] - x0)))
        return [points[i] for i in sorted({0, end, side, len(points) - 1})]
    return chosen


def arc_id(ref):
    return ref if ref >= 0 else ~ref


def ends(ref, arcs):
    line = arcs[arc_id(ref)]
    return (line[0], line[-1]) if ref >= 0 else (line[-1], line[0])


def bounds(paths):
    return [min(p[0] for p in paths), min(p[1] for p in paths),
            max(p[2] for p in paths), max(p[3] for p in paths)]


def extent(points):
    return [min(x for x, _ in points), min(y for _, y in points),
            max(x for x, _ in points), max(y for _, y in points)]


def size(box):
    return (box[2] - box[0]) * (box[3] - box[1])


def merge_rings(refs, arcs):
    by_start = defaultdict(list)
    for ref in refs:
        by_start[ends(ref, arcs)[0]].append(ref)
    rings = []
    while by_start:
        start = next(iter(by_start))
        here = start
        ring = []
        while True:
            choices = by_start.get(here)
            if not choices:
                return None
            ref = choices.pop()
            if not choices:
                del by_start[here]
            ring.append(ref)
            here = ends(ref, arcs)[1]
            if here == start:
                break
        rings.append(ring)
    return rings


def area_paths(regions, full_arcs, parents, detail):
    tolerance = .034 if detail else .37
    min_area = .000045 if detail else .25
    decimals = 3 if detail else 2
    arc_bounds = [extent(arc) for arc in full_arcs]
    cropped = {}
    report = {"retainedComponents": 0, "omittedComponents": 0, "mergeFallback": [],
              "internalDistrictArcsOmitted": 0, "municipalArcs": 0, "cityArcs": 0}
    for code, polys in regions.items():
        boxes = [bounds([arc_bounds[arc_id(r)] for r in poly[0]]) for poly in polys]
        largest = max(range(len(polys)), key=lambda i: size(boxes[i]))
        retained = [p for i, p in enumerate(polys) if i == largest or size(boxes[i]) >= min_area]
        cropped[code] = retained
        report["retainedComponents"] += len(retained)
        report["omittedComponents"] += len(polys) - len(retained)

    used_arcs = defaultdict(set)
    for code, polys in cropped.items():
        for poly in polys:
            for ring in poly:
                for ref in ring:
                    used_arcs[arc_id(ref)].add(code)
    small_arcs = {i: simplify(full_arcs[i], tolerance) for i in used_arcs}

    def path_line(points, closed=False):
        if closed and points[0] == points[-1]:
            points = points[:-1]
        def fmt(n):
            return f"{n:.{decimals}f}".rstrip("0").rstrip(".")
        return "M" + " ".join(f"{fmt(x)},{fmt(y)}" for x, y in points) + ("Z" if closed else "")

    def line_for_ring(ring, arcs):
        points = []
        for ref in ring:
            part = arcs[arc_id(ref)]
            if ref < 0:
                part = part[::-1]
            points.extend(part if not points else part[1:])
        return points

    def shape(rings):
        pieces = []
        for ring in rings:
            points = line_for_ring(ring, small_arcs)
            if len(set(points)) < 3:
                points = line_for_ring(ring, full_arcs)
            pieces.append(path_line(points, True))
        return "".join(pieces)

    ward, city_ring_lists = {}, defaultdict(list)
    for code, polys in cropped.items():
        rings = [r for p in polys for r in p]
        box = bounds([arc_bounds[arc_id(ref)] for p in polys for ref in p[0]])
        ward[code] = [shape(rings), [round(n, 3) for n in box], len(polys)]
        if code in parents:
            city_ring_lists[parents[code]].extend(rings)

    city = {}
    for parent, rings in sorted(city_ring_lists.items()):
        children = [info for code, info in ward.items() if parents.get(code) == parent]
        external = []
        for ring in rings:
            for ref in ring:
                owners = used_arcs[arc_id(ref)]
                if len(owners) > 1 and all(parents.get(c) == parent for c in owners):
                    continue
                external.append(ref)
        stitched = merge_rings(external, full_arcs)
        if stitched:
            path = shape(stitched)
        else:
            report["mergeFallback"].append(parent)
            path = "".join(info[0] for info in children)
        city[parent] = [path, bounds([child[1] for child in children]), len(stitched or rings)]

    outer, internal_ward, internal_city = [], [], []
    for ident, owners in used_arcs.items():
        path = path_line(small_arcs[ident])
        if len(owners) == 1:
            outer.append(path)
            continue
        internal_ward.append(path)
        if len({parents.get(c, c) for c in owners}) > 1:
            internal_city.append(path)
    report["internalDistrictArcsOmitted"] = len(internal_ward) - len(internal_city)
    report["municipalArcs"] = len(internal_ward)
    report["cityArcs"] = len(internal_city)
    return {"ward": ward, "city": city, "outer": "".join(outer), "wardBorders": "".join(internal_ward),
            "cityBorders": "".join(internal_city),
            "bounds": bounds([a[1] for a in ward.values()])}, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=HERE.parents[2])
    parser.add_argument("--data", type=Path, default=HERE / "data")
    args = parser.parse_args()
    data = load(args.data / "index.json")
    parents = {code: a["parent"] for code, a in data["areas"].items() if a["parent"]}
    root = args.repo / "v2/data/national/2026-common"
    manifest = load(root / "national-2026-pilot/manifest.json")
    source = (args.repo / "maps/national-municipalities.html").read_text(encoding="utf-8")
    configured = re.search(r"sharedTrialPrefectures=new Set\(\[(.*?)\]\)", source)
    shared = set(re.findall(r"'([0-9]{2})'", configured[1]))
    overview, reports = {}, {}
    for entry in manifest["entries"]:
        pref = entry["pref"]
        source = args.repo / "v2/data/national/2026-shared-preview" / f"{pref}.topojson" if pref in shared else root / entry["source"]
        topo = load(source)
        regions = {}
        for shape in topo["objects"]["municipalities"]["geometries"]:
            code = shape["properties"]["N03_007"]
            if code in regions or code[:2] != pref:
                raise ValueError(f"Repeated or misfiled map code {code}")
            regions[code] = [shape["arcs"]] if shape["type"] == "Polygon" else shape["arcs"]
        expected = {code for code, a in data["areas"].items() if a["pref"] == pref and a["kind"] != "designatedCity"}
        if set(regions) != expected:
            raise ValueError(f"Wrong maps vs. index code set for {pref}: {sorted(regions.keys() ^ expected)}")
        arcs = decode(topo)
        overview[pref], national = area_paths(regions, arcs, parents, False)
        detail, district = area_paths(regions, arcs, parents, True)
        save(args.data / "geometry" / f"{pref}.json", detail)
        reports[pref] = {"source": source.relative_to(args.repo).as_posix(), "wardCodes": len(regions),
                         "cityParents": len(detail["city"]), "national": national, "detail": district}
        print(pref, flush=True)
    save(args.data / "geometry" / "overview.json", overview)
    save(args.data / "geometry" / "validation.json", {"prefectures": reports, "viewBox": PAINT})


if __name__ == "__main__":
    main()
