# tools/perf/imgdiff.py — เทียบภาพสองภาพทีละพิกเซล (เกณฑ์ผู้ใช้: เหมือนทุกพิกเซล หรือต่างเป็นจุดเดี่ยวตามขอบ ≤ 12/255 ไม่รวมเป็นกลุ่ม)
#   python tools/perf/imgdiff.py a.png b.png [diff.png]  → JSON หนึ่งบรรทัด
import sys, json
import numpy as np
from PIL import Image

def load(p):
    return np.asarray(Image.open(p).convert('RGBA'), dtype=np.int16)

a, b = load(sys.argv[1]), load(sys.argv[2])
if a.shape != b.shape:
    print(json.dumps({'same': False, 'error': f'size {a.shape} vs {b.shape}'})); sys.exit(0)
d = np.abs(a - b).max(axis=2)
mask = d > 0
n = int(mask.sum())
out = {'same': n == 0, 'diffPx': n, 'max': int(d.max()), 'px': int(d.size)}
if n:
    ys, xs = np.nonzero(mask)
    out['bbox'] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    out['over12'] = int((d > 12).sum())
    # กลุ่มที่ติดกัน (8 ทิศ) — จุดเดี่ยวตามขอบ vs ก้อน
    if n <= 300000:
        idx = {(int(y), int(x)): i for i, (y, x) in enumerate(zip(ys, xs))}
        parent = list(range(n))
        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]; i = parent[i]
            return i
        for (y, x), i in idx.items():
            for dy, dx in ((0, 1), (1, -1), (1, 0), (1, 1)):
                j = idx.get((y + dy, x + dx))
                if j is not None:
                    ri, rj = find(i), find(j)
                    if ri != rj: parent[ri] = rj
        sizes = {}
        for i in range(n): r = find(i); sizes[r] = sizes.get(r, 0) + 1
        out['groups'] = len(sizes)
        out['biggestGroup'] = max(sizes.values())
        out['isolated'] = sum(1 for s in sizes.values() if s == 1)
    out['pass'] = bool(out['max'] <= 12 and out.get('biggestGroup', 99) <= 1)
    if len(sys.argv) > 3:
        vis = np.zeros((*d.shape, 3), dtype=np.uint8)
        vis[..., 0] = np.clip(d * 20, 0, 255)
        base = (a[..., :3].mean(axis=2) * 0.25).astype(np.uint8)
        vis[..., 1] = base; vis[..., 2] = base
        vis[mask, 0] = 255
        Image.fromarray(vis).save(sys.argv[3])
else:
    out['pass'] = True
print(json.dumps(out))
