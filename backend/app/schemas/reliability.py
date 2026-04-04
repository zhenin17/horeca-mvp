from pydantic import BaseModel


class CandidateReliabilityRead(BaseModel):
    candidate_id: int
    total_matches: int
    invited_count: int
    interviewed_count: int
    hired_count: int
    rejected_count: int
    no_show_count: int
    reliability_score: int