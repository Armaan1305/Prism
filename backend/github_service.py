import requests


GITHUB_API = "https://api.github.com"


def get_repository(owner: str, repo: str):
    url = f"{GITHUB_API}/repos/{owner}/{repo}"

    response = requests.get(url, timeout=10)

    if response.status_code != 200:
        return {
            "error": "Repository not found"
        }

    data = response.json()

    return {
        "name": data["name"],
        "full_name": data["full_name"],
        "description": data["description"],
        "default_branch": data["default_branch"],
        "stars": data["stargazers_count"],
        "language": data["language"],
    }
