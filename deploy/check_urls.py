"""Verify each migrated public address against the private release registry via HTTP."""
import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def check_urls(root, origin):
    registry = json.loads((root / "source-manifest.json").read_text())
    paths = {p["path"]: (404 if p["kind"] == "notFound" else 200) for p in registry["pages"]}
    for index in (root / "kvizy").rglob("index.html"):
        paths["/" + str(index.parent.relative_to(root)) + "/"] = 200

    def check(item):
        path, expected = item
        try:
            with urlopen(Request(origin + path, method="HEAD"), timeout=25) as response:
                status = response.status
                if response.geturl() != origin + path:
                    return f"{path}: неожиданный редирект"
        except HTTPError as error:
            status = error.code
        except OSError as error:
            return f"{path}: {type(error).__name__}"
        if status != expected:
            return f"{path}: ожидался {expected}, получен {status}"
        return None

    with ThreadPoolExecutor(max_workers=3) as pool:
        errors = list(filter(None, pool.map(check, paths.items())))
    for error in errors:
        print(error)
    print(f"Проверено адресов: {len(paths)}, расхождений: {len(errors)}")
    return bool(errors)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("release", type=Path)
    parser.add_argument("origin")
    args = parser.parse_args()
    raise SystemExit(check_urls(args.release, args.origin.rstrip("/")))
