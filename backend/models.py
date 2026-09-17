from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(String, unique=True, index=True, nullable=False)
    github_login = Column(String, unique=True, index=True, nullable=False)
    github_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    access_token = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)

    github_login = Column(String, index=True, nullable=False)

    repository = Column(String, nullable=False)

    pull_request = Column(Integer, nullable=False)

    title = Column(String, nullable=True)

    author = Column(String, nullable=True)

    branch = Column(String, nullable=True)

    base_branch = Column(String, nullable=True)

    head_sha = Column(String, nullable=True)

    risk_score = Column(Integer, nullable=False)

    risk_level = Column(String, nullable=False)

    result = Column(Text, nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )