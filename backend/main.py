import json
import os

import requests
from dotenv import load_dotenv

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from database import Base, engine, get_db
from models import User, AnalysisHistory
from risk_engine import calculate_risk

from github_service import (
    get_repository,
    get_repository_tree,
    get_file_content,
    filter_source_files,
    get_pull_requests,
    get_pull_request_files,
    get_pull_request,
    get_repositories,
)

from analyzer import (
    build_dependency_graph,
    find_affected_files,
    build_dependency_graph_from_files,
    get_dependency_analysis,
)

from test_recommender import recommend_tests
from diff_analyzer import analyze_diff
from risk_explainer import explain_risk
from security_analyzer import analyze_security


# ==================================================
# ENVIRONMENT
# ==================================================

load_dotenv()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI")

SESSION_SECRET = os.getenv(
    "SESSION_SECRET",
    "prism-development-secret-change-this",
)


# ==================================================
# DATABASE
# ==================================================

Base.metadata.create_all(bind=engine)


# ==================================================
# APP
# ==================================================

app = FastAPI(title="PRISM API")


# ==================================================
# SESSION
# ==================================================

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("2WKKnfXtBUhCCuptlfx7l5ED-QGIC1GfOHMDzkM2QLvJG2pIAqLBsBsL4bEGTZb3"),
)


# ==================================================
# CORS
# ==================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("https://prism-armaan-b5da.vercel.app"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# REQUEST MODELS
# ==================================================

class AnalysisRequest(BaseModel):
    pull_request: int
    changed_file: str


# ==================================================
# AUTH HELPER
# ==================================================

def get_authenticated_user(
    request: Request,
    db: Session,
):
    user_id = request.session.get("user_id")

    if not user_id:
        return None

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    return user


# ==================================================
# BASIC ROUTES
# ==================================================

@app.get("/")
def root():
    return {
        "message": "PRISM API is running",
        "status": "online",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


# ==================================================
# GITHUB REPOSITORY
# ==================================================

@app.get("/github/repository")
def github_repository(
    owner: str,
    repo: str,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(request, db)

    access_token = (
        user.access_token
        if user
        else None
    )

    return get_repository(
        owner,
        repo,
        access_token,
    )


# ==================================================
# GITHUB REPOSITORY TREE
# ==================================================

@app.get("/github/tree")
def github_tree(
    owner: str,
    repo: str,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(request, db)

    access_token = (
        user.access_token
        if user
        else None
    )

    repo_info = get_repository(
        owner,
        repo,
        access_token,
    )

    if "error" in repo_info:
        return repo_info

    branch = repo_info["default_branch"]

    files = get_repository_tree(
        owner,
        repo,
        branch,
        access_token,
    )

    return {
        "repository": repo_info["full_name"],
        "branch": branch,
        "total_files": len(files),
        "files": files[:100],
    }


# ==================================================
# GITHUB SOURCE FILES
# ==================================================

@app.get("/github/files")
def github_files(
    owner: str,
    repo: str,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(request, db)

    access_token = (
        user.access_token
        if user
        else None
    )

    repo_info = get_repository(
        owner,
        repo,
        access_token,
    )

    if "error" in repo_info:
        return repo_info

    branch = repo_info["default_branch"]

    all_files = get_repository_tree(
        owner,
        repo,
        branch,
        access_token,
    )

    source_files = filter_source_files(
        all_files
    )

    results = []

    for path in source_files[:30]:
        content = get_file_content(
            owner,
            repo,
            path,
            branch,
            access_token,
        )

        if content is not None:
            results.append(
                {
                    "path": path,
                    "content": content,
                }
            )

    return {
        "repository": repo_info["full_name"],
        "branch": branch,
        "total_source_files": len(source_files),
        "fetched_files": len(results),
        "files": results,
    }


# ==================================================
# GITHUB PULL REQUESTS
# ==================================================

@app.get("/github/pulls")
def github_pulls(
    owner: str,
    repo: str,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(request, db)

    access_token = (
        user.access_token
        if user
        else None
    )

    repo_info = get_repository(
        owner,
        repo,
        access_token,
    )

    if "error" in repo_info:
        return repo_info

    pulls = get_pull_requests(
        owner,
        repo,
        "open",
        access_token,
    )

    return {
        "repository": repo_info["full_name"],
        "pull_requests": pulls,
    }


# ==================================================
# GITHUB PULL REQUEST DETAILS
# ==================================================

@app.get("/github/pulls/{pull_number}")
def github_pull_details(
    owner: str,
    repo: str,
    pull_number: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(request, db)

    access_token = (
        user.access_token
        if user
        else None
    )

    repo_info = get_repository(
        owner,
        repo,
        access_token,
    )

    if "error" in repo_info:
        return repo_info

    files = get_pull_request_files(
        owner,
        repo,
        pull_number,
        access_token,
    )

    return {
        "repository": repo_info["full_name"],
        "pull_request": pull_number,
        "total_changed_files": len(files),
        "files": files,
    }


# ==================================================
# ANALYZE GITHUB PULL REQUEST
# ==================================================

@app.post("/github/analyze-pr/{pull_number}")
def analyze_github_pull_request(
    owner: str,
    repo: str,
    pull_number: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(request, db)

    access_token = (
        user.access_token
        if user
        else None
    )

    # ------------------------------------------------
    # Get repository information
    # ------------------------------------------------

    repo_info = get_repository(
        owner,
        repo,
        access_token,
    )

    if "error" in repo_info:
        return repo_info

    pull_request = get_pull_request(
        owner,
        repo,
        pull_number,
        access_token,
    )

    if "error" in pull_request:
        return pull_request

    branch = pull_request["head_branch"]
    head_sha = pull_request["head_sha"]

    # ------------------------------------------------
    # Get PR changed files
    # ------------------------------------------------

    pull_files = get_pull_request_files(
        owner,
        repo,
        pull_number,
        access_token,
    )

    if not pull_files:
        return {
            "error": "No changed files found in this pull request."
        }

    # ------------------------------------------------
    # Get repository source files
    # ------------------------------------------------

    all_files = get_repository_tree(
        owner,
        repo,
        branch,
        access_token,
    )

    source_files = filter_source_files(
        all_files
    )

    files = []

    for path in source_files[:30]:
        content = get_file_content(
            owner,
            repo,
            path,
            branch,
            access_token,
        )

        if content is not None:
            files.append(
                {
                    "path": path,
                    "content": content,
                }
            )

    # ------------------------------------------------
    # Build dependency graph
    # ------------------------------------------------

    graph = build_dependency_graph_from_files(
        files
    )

    # ------------------------------------------------
    # Analyze every changed file
    # ------------------------------------------------

    analysis_results = []

    for pull_file in pull_files:
        changed_file = pull_file["filename"]

        # ------------------------------------------------
        # Dependency analysis
        # ------------------------------------------------

        dependency_analysis = get_dependency_analysis(
            graph,
            changed_file,
        )

        affected_files = dependency_analysis[
            "affected_files"
        ]

        affected_count = dependency_analysis[
            "affected_areas"
        ]

        dependency_depths = dependency_analysis[
            "dependency_depths"
        ]

        dependency_relationships = dependency_analysis[
            "relationships"
        ]

        max_dependency_depth = dependency_analysis[
            "max_dependency_depth"
        ]

        # ------------------------------------------------
        # Diff analysis
        # ------------------------------------------------

        diff_analysis = analyze_diff(
            pull_file.get("patch")
        )

        # ------------------------------------------------
        # Security analysis
        # ------------------------------------------------

        security_findings = analyze_security(
            pull_file.get("patch", ""),
            changed_file,
        )

        # ------------------------------------------------
        # Risk calculation
        # ------------------------------------------------

        risk = calculate_risk(
            additions=pull_file["additions"],
            deletions=pull_file["deletions"],
            affected_files=affected_files,
            dependency_depths=dependency_depths,
            diff_analysis=diff_analysis,
            security_findings=security_findings,
        )

        # ------------------------------------------------
        # Risk explanation
        # ------------------------------------------------

        risk_explanation = explain_risk(
            risk=risk,
            additions=pull_file["additions"],
            deletions=pull_file["deletions"],
            affected_files=affected_files,
            diff_analysis=diff_analysis,
        )

        # ------------------------------------------------
        # Test recommendations
        # ------------------------------------------------

        repository_file_paths = [
            file["path"]
            for file in files
        ]

        test_recommendations = recommend_tests(
            changed_file=changed_file,
            affected_files=affected_files,
            repository_files=repository_file_paths,
        )

        # ------------------------------------------------
        # Store result
        # ------------------------------------------------

        analysis_results.append(
            {
                "file": changed_file,
                "status": pull_file["status"],
                "additions": pull_file["additions"],
                "deletions": pull_file["deletions"],
                "changes": pull_file["changes"],
                "diff_analysis": diff_analysis,
                "security_findings": security_findings,
                "affected_files": affected_files,
                "affected_areas": affected_count,
                "dependency_relationships": dependency_relationships,
                "max_dependency_depth": max_dependency_depth,
                "dependency_depths": dependency_depths,
                "risk_score": risk["score"],
                "risk_level": risk["level"],
                "risk_factors": risk["factors"],
                "risk_explanation": risk_explanation,
                "test_recommendations": test_recommendations,
            }
        )

    # ------------------------------------------------
    # Final response object
    # ------------------------------------------------

    result = {
        "repository": repo_info["full_name"],
        "pull_request": pull_number,
        "title": pull_request["title"],
        "author": pull_request["author"],
        "branch": branch,
        "head_sha": head_sha,
        "base_branch": pull_request["base_branch"],
        "changed_files": len(pull_files),
        "analysis": analysis_results,
    }

    # ------------------------------------------------
    # Calculate overall risk for history
    # ------------------------------------------------

    if analysis_results:
        overall_risk_score = max(
            item["risk_score"]
            for item in analysis_results
        )

        risk_levels = [
            item["risk_level"]
            for item in analysis_results
        ]

        if "HIGH" in risk_levels:
            overall_risk_level = "HIGH"
        elif "MEDIUM" in risk_levels:
            overall_risk_level = "MEDIUM"
        else:
            overall_risk_level = "LOW"

    else:
        overall_risk_score = 0
        overall_risk_level = "LOW"

    # ------------------------------------------------
    # Save analysis to database
    # ------------------------------------------------

    history = AnalysisHistory(
        github_login=owner,
        repository=repo_info["full_name"],
        pull_request=pull_number,
        title=pull_request["title"],
        author=pull_request["author"],
        branch=branch,
        base_branch=pull_request["base_branch"],
        head_sha=head_sha,
        risk_score=overall_risk_score,
        risk_level=overall_risk_level,
        result=json.dumps(result),
    )

    db.add(history)
    db.commit()
    db.refresh(history)

    return result


# ==================================================
# ANALYSIS HISTORY
# ==================================================

@app.get("/history/{github_login}")
def get_analysis_history(
    github_login: str,
    db: Session = Depends(get_db),
):
    history = (
        db.query(AnalysisHistory)
        .filter(
            AnalysisHistory.github_login == github_login
        )
        .order_by(
            AnalysisHistory.created_at.desc()
        )
        .all()
    )

    return {
        "github_login": github_login,
        "total": len(history),
        "history": [
            {
                "id": item.id,
                "repository": item.repository,
                "pull_request": item.pull_request,
                "title": item.title,
                "author": item.author,
                "branch": item.branch,
                "base_branch": item.base_branch,
                "head_sha": item.head_sha,
                "risk_score": item.risk_score,
                "risk_level": item.risk_level,
                "created_at": item.created_at.isoformat(),
            }
            for item in history
        ],
    }


# ==================================================
# SINGLE ANALYSIS HISTORY
# ==================================================

@app.get("/history/{github_login}/{analysis_id}")
def get_analysis_history_item(
    github_login: str,
    analysis_id: int,
    db: Session = Depends(get_db),
):
    history = (
        db.query(AnalysisHistory)
        .filter(
            AnalysisHistory.id == analysis_id,
            AnalysisHistory.github_login == github_login,
        )
        .first()
    )

    if not history:
        return {
            "error": "Analysis history item not found."
        }

    return {
        "id": history.id,
        "github_login": history.github_login,
        "repository": history.repository,
        "pull_request": history.pull_request,
        "title": history.title,
        "author": history.author,
        "branch": history.branch,
        "base_branch": history.base_branch,
        "head_sha": history.head_sha,
        "risk_score": history.risk_score,
        "risk_level": history.risk_level,
        "created_at": history.created_at.isoformat(),
        "result": json.loads(history.result),
    }


# ==================================================
# GITHUB SINGLE FILE ANALYSIS
# ==================================================

@app.post("/github/analyze")
def github_analyze(
    owner: str,
    repo: str,
    changed_file: str,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(request, db)

    access_token = (
        user.access_token
        if user
        else None
    )

    repo_info = get_repository(
        owner,
        repo,
        access_token,
    )

    if "error" in repo_info:
        return repo_info

    branch = repo_info["default_branch"]

    all_files = get_repository_tree(
        owner,
        repo,
        branch,
        access_token,
    )

    source_files = filter_source_files(
        all_files
    )

    files = []

    for path in source_files[:30]:
        content = get_file_content(
            owner,
            repo,
            path,
            branch,
            access_token,
        )

        if content is not None:
            files.append(
                {
                    "path": path,
                    "content": content,
                }
            )

    graph = build_dependency_graph_from_files(
        files
    )

    affected_files = find_affected_files(
        graph,
        changed_file,
    )

    affected_count = len(
        affected_files
    )

    risk_score = min(
        40 + (affected_count * 14),
        100,
    )

    if risk_score >= 75:
        risk_level = "HIGH"
    elif risk_score >= 50:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "repository": repo_info["full_name"],
        "branch": branch,
        "changed_file": changed_file,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "affected_areas": affected_count,
        "recommended_tests": min(
            affected_count * 2,
            10,
        ),
        "affected_files": affected_files,
    }


# ==================================================
# LOCAL SAMPLE REPOSITORY ANALYSIS
# ==================================================

@app.post("/analyze")
def analyze(
    request: AnalysisRequest,
):
    repo_path = "sample_repo"

    graph = build_dependency_graph(
        repo_path
    )

    affected_files = find_affected_files(
        graph,
        request.changed_file,
    )

    affected_count = len(
        affected_files
    )

    risk_score = min(
        40 + (affected_count * 14),
        100,
    )

    if risk_score >= 75:
        risk_level = "HIGH"
    elif risk_score >= 50:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "pull_request": request.pull_request,
        "changed_file": request.changed_file,
        "risk_score": risk_score,
        "affected_areas": affected_count,
        "recommended_tests": min(
            affected_count * 2,
            10,
        ),
        "risk_level": risk_level,
        "affected_files": affected_files,
        "recommendation": (
            f"Review {affected_count} affected components "
            "before merging."
        ),
    }


# ==================================================
# GITHUB REPOSITORY DISCOVERY
# ==================================================

@app.get("/github/repositories/{owner}")
def github_repositories(
    owner: str,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    if not user:
        return {
            "error": "Not authenticated.",
            "repositories": [],
        }

    if user.github_login.lower() != owner.lower():
        return {
            "error": "You can only access repositories for the authenticated GitHub account.",
            "repositories": [],
        }

    repositories = get_repositories(
        owner,
        user.access_token,
    )

    return {
        "owner": owner,
        "repositories": repositories,
    }


# ==================================================
# GITHUB PULL REQUEST DISCOVERY
# ==================================================

@app.get("/github/pull-requests/{owner}/{repo}")
def github_pull_requests(
    owner: str,
    repo: str,
    state: str = "open",
    request: Request = None,
    db: Session = Depends(get_db),
):
    user = get_authenticated_user(
        request,
        db,
    )

    access_token = (
        user.access_token
        if user
        else None
    )

    return {
        "repository": f"{owner}/{repo}",
        "pull_requests": get_pull_requests(
            owner,
            repo,
            state,
            access_token,
        ),
    }


# ==================================================
# GITHUB OAUTH LOGIN
# ==================================================

@app.get("/auth/github")
def github_login():
    github_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
        "&scope=repo"
    )

    return RedirectResponse(
        url=github_url
    )


# ==================================================
# GITHUB OAUTH CALLBACK
# ==================================================

@app.get("/auth/github/callback")
def github_callback(
    request: Request,
    code: str,
    db: Session = Depends(get_db),
):
    token_response = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={
            "Accept": "application/json",
        },
        data={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": GITHUB_REDIRECT_URI,
        },
        timeout=15,
    )

    if token_response.status_code != 200:
        return {
            "error": "GitHub authentication failed.",
        }

    token_data = token_response.json()

    access_token = token_data.get(
        "access_token"
    )

    if not access_token:
        return {
            "error": "GitHub did not return an access token.",
            "details": token_data,
        }

    user_response = requests.get(
        "https://api.github.com/user",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {access_token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        timeout=15,
    )

    if user_response.status_code != 200:
        return {
            "error": "Failed to fetch GitHub user.",
        }

    user = user_response.json()

    github_id = str(
        user["id"]
    )

    github_login = user["login"]

    existing_user = (
        db.query(User)
        .filter(
            User.github_id == github_id
        )
        .first()
    )

    if existing_user:
        existing_user.github_login = github_login
        existing_user.github_name = user.get(
            "name"
        )
        existing_user.avatar_url = user.get(
            "avatar_url"
        )
        existing_user.access_token = access_token

        user_id = existing_user.id

    else:
        new_user = User(
            github_id=github_id,
            github_login=github_login,
            github_name=user.get("name"),
            avatar_url=user.get("avatar_url"),
            access_token=access_token,
        )

        db.add(new_user)

        db.commit()
        db.refresh(new_user)

        user_id = new_user.id

    db.commit()

    request.session["user_id"] = user_id

    return RedirectResponse(
        url=f"{FRONTEND_URL}/dashboard"
    )


# ==================================================
# CURRENT AUTHENTICATED USER
# ==================================================

@app.get("/auth/me")
def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
):
    user_id = request.session.get(
        "user_id"
    )

    if not user_id:
        return {
            "authenticated": False,
            "user": None,
        }

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:
        request.session.clear()

        return {
            "authenticated": False,
            "user": None,
        }

    return {
        "authenticated": True,
        "user": {
            "id": user.id,
            "github_login": user.github_login,
            "github_name": user.github_name,
            "avatar_url": user.avatar_url,
        },
    }


# ==================================================
# LOGOUT
# ==================================================

@app.post("/auth/logout")
def logout(
    request: Request,
):
    request.session.clear()

    return {
        "message": "Logged out successfully."
    }