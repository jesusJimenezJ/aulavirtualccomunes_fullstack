#!/usr/bin/env bash
set -Eeuo pipefail

: "${FRAPPE_COMMIT:?FRAPPE_COMMIT is required for a release image}"
: "${FRAPPE_BRANCH:?FRAPPE_BRANCH is required for a release image}"
: "${FRAPPE_PATH:?FRAPPE_PATH is required for a release image}"
: "${PAYMENTS_COMMIT:?PAYMENTS_COMMIT is required for a release image}"
: "${PAYMENTS_BRANCH:?PAYMENTS_BRANCH is required for a release image}"
: "${LMS_COMMIT:?LMS_COMMIT is required for a release image}"
: "${LMS_REF:?LMS_REF is required for a release image}"

# Prepare local refs at the locked commits before bench init installs any code.
# Bench 5.31.1 does not classify file:// app URLs as Git URLs, so temporary Git
# URL rewrites keep Bench's inputs HTTPS while directing its clones to local refs.
# The secret is read only for URLs/refs; no credentials are accepted or logged.
python3 - <<'PY'
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile
from urllib.parse import urlparse


def fail(message):
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def git(args, *, cwd=None, quiet=False):
    result = subprocess.run(
        ["git", *map(str, args)],
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE if quiet else None,
        stderr=subprocess.PIPE if quiet else None,
    )
    if result.returncode:
        if quiet:
            raise RuntimeError("Git operation failed")
        raise subprocess.CalledProcessError(result.returncode, result.args)
    return result.stdout.strip() if quiet else ""


def prepare_source(temp_root, name, url, ref, ref_type, commit, bench_branch):
    if len(commit) != 40 or any(char not in "0123456789abcdef" for char in commit):
        fail(f"Invalid locked commit for {name}.")

    remote_ref = f"refs/{ref_type}/{ref}"
    bench_ref = f"refs/heads/{bench_branch}"
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._/-]*", ref):
        fail(f"Unsafe remote ref for {name}.")
    try:
        git(["check-ref-format", remote_ref], quiet=True)
        git(["check-ref-format", bench_ref], quiet=True)
    except RuntimeError:
        fail(f"Invalid remote or local reference for {name}.")

    parsed_url = urlparse(url)
    if parsed_url.scheme not in {"https", "http", "ssh", "git", "file"}:
        fail(f"Unsupported source URL scheme for {name}.")

    bare_repo = temp_root / f"{name}.git"
    git(["init", "--bare", "--quiet", bare_repo])
    git(["-C", bare_repo, "remote", "add", "upstream", url])
    try:
        git(
            [
                "-C", bare_repo, "fetch", "--no-tags", "upstream",
                f"+{remote_ref}:refs/pinned/source",
            ],
            quiet=True,
        )
    except RuntimeError:
        fail(f"Cannot fetch remote {ref_type} reference for {name}.")

    try:
        git(
            ["-C", bare_repo, "merge-base", "--is-ancestor", commit, "refs/pinned/source"],
            quiet=True,
        )
    except RuntimeError:
        fail(f"Locked commit for {name} is not reachable from remote {ref_type} ref {ref}.")

    resolved_ref = git(
        ["-C", bare_repo, "rev-parse", "--verify", "refs/pinned/source^{commit}"],
        quiet=True,
    )
    if ref_type == "tags" and resolved_ref != commit:
        fail(f"Locked commit for {name} does not match remote tag {ref}.")

    git(["-C", bare_repo, "update-ref", bench_ref, commit])
    return bare_repo.as_uri()


def validate_bench_url(name, url):
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    segments = path.lstrip("/").removesuffix(".git").split("/")
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or len(segments) != 2
        or any(not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", part) for part in segments)
    ):
        fail(f"Unsafe or unsupported Git URL for {name}.")
    return segments[1]


def normalize_git_url(url):
    parsed = urlparse(url)
    return (
        parsed.scheme.lower(),
        (parsed.hostname or "").lower(),
        parsed.path.rstrip("/").removesuffix(".git"),
    )


def verify_installed_source(bench_path, name, url, ref, ref_type, commit):
    apps_dir = bench_path / "apps"
    matching_repos = []
    for candidate in apps_dir.iterdir():
        if not (candidate / ".git").exists():
            continue
        try:
            remote_url = git(
                ["-C", candidate, "remote", "get-url", "upstream"],
                quiet=True,
            )
        except RuntimeError:
            continue
        if normalize_git_url(remote_url) == normalize_git_url(url):
            matching_repos.append(candidate)

    if len(matching_repos) != 1:
        fail(f"bench init did not create the expected {name} repository.")
    repo = matching_repos[0]

    head = git(["-C", repo, "rev-parse", "--verify", "HEAD"], quiet=True)
    if head != commit:
        fail(f"bench init installed {name} at {head}, expected the locked commit.")

    git(["-C", repo, "remote", "set-url", "upstream", url])
    remote_ref = f"refs/{ref_type}/{ref}"
    fetched_ref = "refs/pinned/verified"
    try:
        git(
            ["-C", repo, "fetch", "--no-tags", "upstream", f"+{remote_ref}:{fetched_ref}"],
            quiet=True,
        )
        if git(["-C", repo, "rev-parse", "--is-shallow-repository"], quiet=True) == "true":
            git(
                [
                    "-C", repo, "fetch", "--unshallow", "--no-tags", "upstream",
                    f"+{remote_ref}:{fetched_ref}",
                ],
                quiet=True,
            )
        git(["-C", repo, "merge-base", "--is-ancestor", commit, fetched_ref], quiet=True)
    except RuntimeError:
        fail(f"Installed {name} commit is not reachable from the current remote ref {ref}.")

    resolved_ref = git(
        ["-C", repo, "rev-parse", "--verify", f"{fetched_ref}^{{commit}}"],
        quiet=True,
    )
    if ref_type == "tags" and resolved_ref != commit:
        fail(f"Installed {name} commit no longer matches remote tag {ref}.")
    if git(["-C", repo, "rev-parse", "--verify", "HEAD"], quiet=True) != commit:
        fail(f"Installed {name} checkout changed during source verification.")


frappe_path = os.environ["FRAPPE_PATH"]
frappe_branch = os.environ["FRAPPE_BRANCH"]
frappe_commit = os.environ["FRAPPE_COMMIT"]
payments_branch = os.environ["PAYMENTS_BRANCH"]
payments_commit = os.environ["PAYMENTS_COMMIT"]
lms_ref = os.environ["LMS_REF"]
lms_commit = os.environ["LMS_COMMIT"]
apps_json_path = pathlib.Path(os.environ.get("APPS_JSON_PATH", "/opt/frappe/apps.json"))
bench_path = pathlib.Path(os.environ.get("BENCH_PATH", "/home/frappe/frappe-bench"))
validate_bench_url("frappe", frappe_path)

try:
    with apps_json_path.open(encoding="utf-8") as apps_file:
        apps = json.load(apps_file)
except (OSError, json.JSONDecodeError):
    fail("The BuildKit apps_json secret is missing or invalid JSON.")

if not isinstance(apps, list) or len(apps) != 2:
    fail("apps_json must define exactly the Payments and LMS repositories.")

source_apps = {}
for app in apps:
    if not isinstance(app, dict) or set(app) != {"url", "branch"}:
        fail("Each apps_json entry must contain only url and branch fields.")
    url = app["url"]
    branch = app["branch"]
    if not isinstance(url, str) or not isinstance(branch, str) or not branch:
        fail("apps_json contains an invalid repository URL or ref.")
    repo_name = validate_bench_url("apps_json entry", url)
    app_name = "payments" if repo_name == "payments" else "lms"
    if app_name in source_apps:
        fail(f"apps_json defines the {app_name} repository more than once.")
    source_apps[app_name] = (url, branch)

if set(source_apps) != {"payments", "lms"}:
    fail("apps_json must contain one Payments repository and one LMS repository.")
if source_apps["payments"][1] != payments_branch or source_apps["lms"][1] != lms_ref:
    fail("apps_json refs do not match the release source lock.")

with tempfile.TemporaryDirectory(prefix="lms-release-sources-") as temp_dir:
    temp_root = pathlib.Path(temp_dir)
    sources = {
        "frappe": (frappe_path, frappe_branch, "heads", frappe_commit),
        "payments": (*source_apps["payments"], "heads", payments_commit),
        "lms": (*source_apps["lms"], "tags", lms_commit),
    }
    local_repos = {}
    for name, (url, ref, ref_type, commit) in sources.items():
        local_repos[name] = prepare_source(
            temp_root,
            name,
            url,
            ref,
            ref_type,
            commit,
            ref,
        )

    local_apps_json = temp_root / "apps.json"
    with local_apps_json.open("w", encoding="utf-8") as apps_file:
        json.dump(
            [
                {"url": source_apps[name][0], "branch": source_apps[name][1]}
                for name in ("payments", "lms")
            ],
            apps_file,
        )

    bench_env = os.environ.copy()
    try:
        config_count = int(bench_env.get("GIT_CONFIG_COUNT", "0"))
    except ValueError:
        fail("Invalid Git config environment while preparing pinned sources.")
    rewrites = [
        (frappe_path, local_repos["frappe"]),
        (source_apps["payments"][0], local_repos["payments"]),
        (source_apps["lms"][0], local_repos["lms"]),
    ]
    for offset, (remote_url, local_url) in enumerate(rewrites):
        index = config_count + offset
        # GIT_CONFIG_KEY_n is a literal config key; quotes accepted in a config
        # file must not be included here or Git treats them as URL characters.
        bench_env[f"GIT_CONFIG_KEY_{index}"] = f"url.{local_url}.insteadOf"
        bench_env[f"GIT_CONFIG_VALUE_{index}"] = remote_url
    bench_env["GIT_CONFIG_COUNT"] = str(config_count + len(rewrites))

    subprocess.run(
        [
            "bench", "init", f"--apps_path={local_apps_json}",
            f"--frappe-branch={frappe_branch}",
            f"--frappe-path={frappe_path}",
            "--no-procfile", "--no-backups", "--skip-redis-config-generation",
            "--verbose", str(bench_path),
        ],
        env=bench_env,
        check=True,
    )

    for name, (url, ref, ref_type, commit) in sources.items():
        verify_installed_source(bench_path, name, url, ref, ref_type, commit)
PY
