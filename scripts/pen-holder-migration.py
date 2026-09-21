#!/usr/bin/env python3
"""
One-off migration: the journal products' third option "Pen Holder"
(None / Black / Brown / "<holder> + Gold Edge" / ...) becomes "Corner Edge"
(None / Gold / Silver), because the pen holder is now its own add-on product.

  plan       read-only. Fetches every journal product and writes plan.json (what would change).
  composite  builds the new Gold/Silver front photos locally (no Shopify writes).
  apply      (needs --yes) uploads the photos, sets front_image_override on the Gold/Silver
             variants, then restructures the option (renames, deletes the holder variants).

Photo recipe: the "None" variant photo (no holder, no corners) is the base; the four corners come
from the "Black + <Edge> Edge" photo, found as the pixels that differ between the "Black" photo and
the "Black + <Edge> Edge" photo (that difference is corners only -- verified).
"""
import json, os, sys, io, time, urllib.request, urllib.error, concurrent.futures as cf
from PIL import Image, ImageChops

ROOT = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(ROOT)
OUT = os.environ.get("MIGRATION_DIR") or os.path.join(ROOT, "pen-holder-migration-data")
os.makedirs(OUT, exist_ok=True)

env = {}
for line in open(os.path.join(APP, ".env.local")):
    if "=" in line and not line.startswith("#"):
        k, v = line.rstrip("\n").split("=", 1)
        env[k] = v.strip()
GQL = f"https://{env['SHOPIFY_STORE_DOMAIN']}/admin/api/{env['SHOPIFY_ADMIN_API_VERSION']}/graphql.json"
TOKEN = env["SHOPIFY_ADMIN_ACCESS_TOKEN"]

def gql(query, variables=None, retries=6):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    for a in range(retries):
        req = urllib.request.Request(GQL, body, {"Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN})
        try:
            data = json.load(urllib.request.urlopen(req, timeout=120))
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503):
                time.sleep(2 * (a + 1)); continue
            raise
        if "errors" in data:
            if any("THROTTLED" in json.dumps(x) for x in data["errors"]):
                time.sleep(2 * (a + 1)); continue
            raise RuntimeError(json.dumps(data["errors"]))
        return data["data"]
    raise RuntimeError("gql retries exhausted")

PRODUCT_LIST = 'query { products(first: 30, query: "tag:journal") { nodes { id handle title options { id name optionValues { id name } } } } }'
VARIANTS = """query($id: ID!, $after: String) { node(id: $id) { ... on Product { variants(first: 250, after: $after) {
  pageInfo { hasNextPage endCursor }
  nodes { id title price selectedOptions { name value } image { url }
          front: metafield(namespace: "custom", key: "front_image_override") { value } } } } } }"""

def fetch_products():
    prods = gql(PRODUCT_LIST)["products"]["nodes"]
    for p in prods:
        vs, after = [], None
        while True:
            d = gql(VARIANTS, {"id": p["id"], "after": after})["node"]["variants"]
            vs += d["nodes"]
            if not d["pageInfo"]["hasNextPage"]: break
            after = d["pageInfo"]["endCursor"]
        p["variants"] = vs
    return prods

def opt(v, name):
    for o in v["selectedOptions"]:
        if o["name"] == name: return o["value"]

def front_url(v):
    return (v.get("front") or {}).get("value") or (v.get("image") or {}).get("url")

def plan_for(p):
    third = "Pen Holder" if any(o["name"] == "Pen Holder" for o in p["options"]) else None
    if not third:
        return {"handle": p["handle"], "skip": "already converted (no Pen Holder option)"}
    by = {}
    for v in p["variants"]:
        by[(opt(v, "String"), opt(v, third))] = v
    strings = sorted({k[0] for k in by})
    keep, delete, composites, missing = [], [], [], []
    for s in strings:
        none = by.get((s, "None"))
        for edge in ("Gold", "Silver"):
            gold_or_silver = by.get((s, f"Black + {edge} Edge"))
            black = by.get((s, "Black"))
            if not (none and gold_or_silver and black):
                if s != "No Cord": missing.append({"string": s, "edge": edge, "none": bool(none), "edgeVariant": bool(gold_or_silver), "black": bool(black)})
                continue
            composites.append({"string": s, "edge": edge, "variantId": gold_or_silver["id"],
                               "base": front_url(none), "black": front_url(black), "donor": front_url(gold_or_silver)})
            keep.append(gold_or_silver["id"])
    valid_values = {"None", "Black + Gold Edge", "Black + Silver Edge"}
    for v in p["variants"]:
        if opt(v, third) not in valid_values: delete.append(v["id"])
    return {"handle": p["handle"], "productId": p["id"], "title": p["title"], "optionId": next(o["id"] for o in p["options"] if o["name"] == third),
            "optionValues": {o["name"]: o["id"] for o in next(o for o in p["options"] if o["name"] == third)["optionValues"]},
            "variantsNow": len(p["variants"]), "variantsAfter": len(p["variants"]) - len(delete),
            "toDelete": len(delete), "composites": composites, "missing": missing}

def cmd_plan():
    prods = fetch_products()
    plans = [plan_for(p) for p in prods]
    json.dump(plans, open(os.path.join(OUT, "plan.json"), "w"), indent=1)
    tot = 0
    for pl in plans:
        if "skip" in pl: print(pl["handle"], pl["skip"]); continue
        tot += len(pl["composites"])
        print(f'{pl["handle"]:38} variants {pl["variantsNow"]:>3} -> {pl["variantsAfter"]:>3} | delete {pl["toDelete"]:>3} | composites {len(pl["composites"]):>3} | missing {len(pl["missing"])}')
    print("total composites:", tot)

import hashlib, threading
_cache_dir = os.path.join(OUT, "src")
os.makedirs(_cache_dir, exist_ok=True)

def download(url):
    """Disk-cached: the same base/black photo feeds both the Gold and the Silver composite."""
    path = os.path.join(_cache_dir, hashlib.sha1(url.encode()).hexdigest() + ".png")
    if not os.path.exists(path):
        for attempt in range(4):
            try:
                data = urllib.request.urlopen(url, timeout=40).read()
                tmp = f"{path}.{threading.get_ident()}.tmp"
                with open(tmp, "wb") as f: f.write(data)
                os.replace(tmp, path)
                break
            except Exception:
                if attempt == 3: raise
                time.sleep(2)
    return Image.open(path).convert("RGB")

def make_composite(c):
    base, black, donor = (download(c[k]) for k in ("base", "black", "donor"))
    mask = ImageChops.difference(black, donor).convert("L").point(lambda p: 255 if p > 6 else 0)
    return Image.composite(donor, base, mask)

def cmd_composite(limit_handle=None):
    plans = json.load(open(os.path.join(OUT, "plan.json")))
    os.makedirs(os.path.join(OUT, "composites"), exist_ok=True)
    jobs = []
    for pl in plans:
        if "skip" in pl or (limit_handle and pl["handle"] != limit_handle): continue
        for c in pl["composites"]:
            slug = f'{pl["handle"]}--{c["string"].lower().replace(" + ", "-").replace(" ", "-")}--{c["edge"].lower()}'
            jobs.append((slug, c))
    def run(j):
        slug, c = j
        path = os.path.join(OUT, "composites", slug + ".png")
        if os.path.exists(path): return slug, "cached"
        try:
            make_composite(c).save(path, optimize=True)
            return slug, "ok"
        except Exception as e:  # a slow/timed-out CDN read must not stop the whole run; rerun fills the gaps
            print("FAILED", slug, type(e).__name__, flush=True)
            return slug, "failed"
    n = 0
    with cf.ThreadPoolExecutor(max_workers=5) as ex:
        for slug, st in ex.map(run, jobs):
            n += 1
            if n % 25 == 0: print(n, "/", len(jobs), flush=True)
    print("done", len(jobs))


# ---------------------------------------------------------------- apply
STAGED = "mutation($i:[StagedUploadInput!]!){stagedUploadsCreate(input:$i){stagedTargets{url resourceUrl parameters{name value}} userErrors{message}}}"
FILE_CREATE = "mutation($f:[FileCreateInput!]!){fileCreate(files:$f){files{id fileStatus ... on MediaImage{image{url}}} userErrors{message}}}"
FILE_STATUS = "query($id:ID!){node(id:$id){... on MediaImage{fileStatus image{url}}}}"
META_SET = "mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{field message}}}"
OPTION_UPDATE = """mutation($p:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!],$d:[ID!]){
  productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$u,optionValuesToDelete:$d,variantStrategy:LEAVE_AS_IS){
    userErrors{field message code} product{options{name optionValues{name}}}}}"""

def upload_file(path, filename):
    import mimetypes, uuid
    data = open(path, "rb").read()
    d = gql(STAGED, {"i": [{"resource": "FILE", "filename": filename, "mimeType": "image/png", "httpMethod": "POST", "fileSize": str(len(data))}]})
    t = d["stagedUploadsCreate"]["stagedTargets"][0]
    boundary = uuid.uuid4().hex
    body = b""
    for prm in t["parameters"]:
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{prm["name"]}"\r\n\r\n{prm["value"]}\r\n'.encode()
    body += f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: image/png\r\n\r\n'.encode() + data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(t["url"], body, {"Content-Type": f"multipart/form-data; boundary={boundary}"})
    urllib.request.urlopen(req, timeout=180).read()
    f = gql(FILE_CREATE, {"f": [{"originalSource": t["resourceUrl"], "contentType": "IMAGE", "alt": filename}]})["fileCreate"]
    if f["userErrors"]: raise RuntimeError(f["userErrors"])
    fid = f["files"][0]["id"]
    for _ in range(40):
        n = gql(FILE_STATUS, {"id": fid})["node"]
        if n and n.get("fileStatus") == "READY" and n["image"]: return n["image"]["url"]
        if n and n.get("fileStatus") == "FAILED": raise RuntimeError("file processing failed " + filename)
        time.sleep(1)
    raise RuntimeError("file not ready " + filename)

def slug_of(pl, c):
    return f'{pl["handle"]}--{c["string"].lower().replace(" + ", "-").replace(" ", "-")}--{c["edge"].lower()}'

def cmd_apply(only=None, yes=False):
    if not yes: sys.exit("apply changes live Shopify data -- rerun with --yes")
    plans = json.load(open(os.path.join(OUT, "plan.json")))
    state_path = os.path.join(OUT, "apply-state.json")
    state = json.load(open(state_path)) if os.path.exists(state_path) else {"uploaded": {}, "overridden": {}, "restructured": []}
    def save(): json.dump(state, open(state_path, "w"), indent=1)
    for pl in plans:
        if "skip" in pl or (only and pl["handle"] != only): continue
        print("==", pl["handle"])
        # 1. upload the composites and point the Gold/Silver variants' override at them
        def one(c):
            slug = slug_of(pl, c)
            if slug not in state["uploaded"]:
                path = os.path.join(OUT, "composites", slug + ".png")
                if not os.path.exists(path): raise RuntimeError("missing composite " + slug)
                state["uploaded"][slug] = upload_file(path, slug + ".png")
            return c, state["uploaded"][slug]
        with cf.ThreadPoolExecutor(max_workers=4) as ex:
            results = list(ex.map(one, pl["composites"]))
        save()
        todo = [(c, u) for c, u in results if c["variantId"] not in state["overridden"]]
        for i in range(0, len(todo), 25):
            chunk = todo[i:i + 25]
            r = gql(META_SET, {"m": [{"ownerId": c["variantId"], "namespace": "custom", "key": "front_image_override", "type": "single_line_text_field", "value": u} for c, u in chunk]})["metafieldsSet"]
            if r["userErrors"]: raise RuntimeError(r["userErrors"])
            for c, u in chunk: state["overridden"][c["variantId"]] = u
            save()
        # 2. restructure the option: rename + drop the holder values (Shopify removes their variants)
        if pl["handle"] in state["restructured"]: continue
        # Shopify refuses to drop option values that still have variants, so delete those variants first.
        prod = next(x for x in fetch_products() if x["id"] == pl["productId"])
        keep_vals = {"None", "Black + Gold Edge", "Black + Silver Edge"}
        third = next(o["name"] for o in prod["options"] if o["id"] == pl["optionId"])
        doomed = [v["id"] for v in prod["variants"] if opt(v, third) not in keep_vals]
        for i in range(0, len(doomed), 100):
            r = gql("mutation($p:ID!,$v:[ID!]!){productVariantsBulkDelete(productId:$p,variantsIds:$v){userErrors{field message}}}", {"p": pl["productId"], "v": doomed[i:i + 100]})["productVariantsBulkDelete"]
            if r["userErrors"]: raise RuntimeError(r["userErrors"])
        print("   deleted holder variants:", len(doomed))
        ov = pl["optionValues"]
        upd = [{"id": ov["Black + Gold Edge"], "name": "Gold"}, {"id": ov["Black + Silver Edge"], "name": "Silver"}]
        dele = [ov[n] for n in ("Black", "Brown", "Brown + Gold Edge", "Brown + Silver Edge") if n in ov]
        r = gql(OPTION_UPDATE, {"p": pl["productId"], "o": {"id": pl["optionId"], "name": "Corner Edge"}, "u": upd, "d": dele})["productOptionUpdate"]
        if r["userErrors"]: raise RuntimeError(r["userErrors"])
        state["restructured"].append(pl["handle"]); save()
        print("   restructured:", json.dumps(r["product"]["options"])[:200])

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "plan"
    if cmd == "plan": cmd_plan()
    elif cmd == "composite": cmd_composite(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == "apply":
        args = [a for a in sys.argv[2:] if not a.startswith("--")]
        cmd_apply(args[0] if args else None, "--yes" in sys.argv)
    else: print("unknown command")
