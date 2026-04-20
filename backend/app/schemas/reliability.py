from pydantic import BaseModel


class CandidateReliabilityRead(BaseModel):
    candidate_id: int
    score: int
    worked_count: int
    no_show_count: int
    cancelled_count: int