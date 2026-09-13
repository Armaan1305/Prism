from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from github_service import get_repository

from analyzer import build_dependency_graph, find_affected_files


app = FastAPI(title="PRISM API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalysisRequest(BaseModel):
    pull_request: int
    changed_file: str


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

@app.get("/github/repository")
def github_repository(owner: str, repo: str):
    return get_repository(owner, repo)

@app.post("/analyze")
def analyze(request: AnalysisRequest):

    repo_path = "sample_repo"

    graph = build_dependency_graph(repo_path)

    affected_files = find_affected_files(
        graph,
        request.changed_file,
    )

    affected_count = len(affected_files)

    risk_score = min(40 + (affected_count * 14), 100)

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
        "recommended_tests": min(affected_count * 2, 10),
        "risk_level": risk_level,
        "affected_files": affected_files,
        "recommendation": (
            f"Review {affected_count} affected components "
            "before merging."
        ),
    }