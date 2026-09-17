import base64
import requests


GITHUB_API = "https://api.github.com"


BASE_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


def get_headers(access_token=None):
    headers = BASE_HEADERS.copy()

    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    return headers


def get_repository(owner, repo, access_token=None):
    url = f"{GITHUB_API}/repos/{owner}/{repo}"

    response = requests.get(
        url,
        headers=get_headers(access_token),
        timeout=10,
    )

    if response.status_code != 200:
        return {
            "error": "Repository not found",
            "status_code": response.status_code,
        }

    data = response.json()

    return {
        "name": data["name"],
        "full_name": data["full_name"],
        "default_branch": data["default_branch"],
        "language": data["language"],
    }


def get_repository_tree(owner, repo, branch, access_token=None):
    url = (
        f"{GITHUB_API}/repos/"
        f"{owner}/{repo}/git/trees/{branch}?recursive=1"
    )

    response = requests.get(
        url,
        headers=get_headers(access_token),
        timeout=20,
    )

    if response.status_code != 200:
        return []

    data = response.json()

    files = []

    for item in data.get("tree", []):
        if item["type"] == "blob":
            files.append(item["path"])

    return files


def get_file_content(owner, repo, path, branch, access_token=None):
    url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"

    response = requests.get(
        url,
        headers=get_headers(access_token),
        params={"ref": branch},
        timeout=20,
    )

    if response.status_code != 200:
        return None

    data = response.json()

    if data.get("type") != "file":
        return None

    try:
        content = base64.b64decode(data["content"]).decode("utf-8")
    except (KeyError, UnicodeDecodeError):
        return None

    return content


def filter_source_files(files):
    extensions = (
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
    )

    ignored = (
        "node_modules/",
        ".next/",
        "dist/",
        "build/",
    )

    return [
        file
        for file in files
        if file.endswith(extensions)
        and not file.startswith(ignored)
    ]


def get_pull_requests(
    owner,
    repo,
    state="open",
    access_token=None,
):
    """
    Get pull requests for a GitHub repository.
    """

    url = f"{GITHUB_API}/repos/{owner}/{repo}/pulls"

    response = requests.get(
        url,
        headers=get_headers(access_token),
        timeout=15,
        params={
            "state": state,
            "per_page": 100,
            "sort": "updated",
            "direction": "desc",
        },
    )

    if response.status_code != 200:
        return {
            "error": "Failed to fetch pull requests.",
            "status_code": response.status_code,
        }

    data = response.json()

    return [
        {
            "number": pull_request["number"],
            "title": pull_request["title"],
            "state": pull_request["state"],
            "author": pull_request["user"]["login"],
            "head_branch": pull_request["head"]["ref"],
            "base_branch": pull_request["base"]["ref"],
            "draft": pull_request["draft"],
        }
        for pull_request in data
    ]


def get_pull_request_files(
    owner,
    repo,
    pull_number,
    access_token=None,
):
    url = (
        f"{GITHUB_API}/repos/"
        f"{owner}/{repo}/pulls/{pull_number}/files"
    )

    response = requests.get(
        url,
        headers=get_headers(access_token),
        params={"per_page": 100},
        timeout=20,
    )

    if response.status_code != 200:
        return []

    data = response.json()

    return [
        {
            "filename": file["filename"],
            "status": file["status"],
            "additions": file["additions"],
            "deletions": file["deletions"],
            "changes": file["changes"],
            "patch": file.get("patch"),
        }
        for file in data
    ]


def get_pull_request(
    owner,
    repo,
    pull_number,
    access_token=None,
):
    """
    Get detailed information about a GitHub pull request.
    """

    url = (
        f"{GITHUB_API}/repos/"
        f"{owner}/{repo}/pulls/{pull_number}"
    )

    response = requests.get(
        url,
        headers=get_headers(access_token),
        timeout=15,
    )

    if response.status_code != 200:
        return {
            "error": "Failed to fetch pull request.",
            "status_code": response.status_code,
        }

    data = response.json()

    return {
        "number": data["number"],
        "title": data["title"],
        "state": data["state"],
        "head_branch": data["head"]["ref"],
        "head_sha": data["head"]["sha"],
        "base_branch": data["base"]["ref"],
        "base_sha": data["base"]["sha"],
        "author": data["user"]["login"],
    }


def get_repositories(owner, access_token=None):
    """
    Get repositories owned by a GitHub user.
    """

    url = f"{GITHUB_API}/users/{owner}/repos"

    response = requests.get(
        url,
        headers=get_headers(access_token),
        timeout=15,
        params={
            "per_page": 100,
            "sort": "updated",
        },
    )

    if response.status_code != 200:
        return {
            "error": "Failed to fetch repositories.",
            "status_code": response.status_code,
            "github_response": response.text,
        }

    repositories = []

    for repository in response.json():
        repositories.append(
            {
                "name": repository["name"],
                "full_name": repository["full_name"],
                "private": repository["private"],
                "default_branch": repository["default_branch"],
                "language": repository["language"],
            }
        )

    return repositories