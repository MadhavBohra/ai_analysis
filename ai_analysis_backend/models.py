from sqlalchemy import Column, Integer, String, Float, Text
from sqlalchemy.dialects.postgresql import JSON
from database import Base

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    premise_text = Column(Text, nullable=False)
    hypothesis_text = Column(Text, nullable=False)
    hallucination_score = Column(Float, nullable=False)
    emotion_scores = Column(JSON, nullable=True)  # Store as JSON

    def __repr__(self):
        return f"<AnalysisResult(id={self.id}, premise_text={self.premise_text}, hallucination_score={self.hallucination_score})>"
