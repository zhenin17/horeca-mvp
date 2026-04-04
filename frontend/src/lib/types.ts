export type CandidateMatchItem = {
    match_id: number;
    vacancy_id: number;
    employer_id: number;
    role: string;
    venue_name: string;
    city: string;
    district?: string | null;
    match_score?: number | null;
    status: string;
    comment?: string | null;
  };
  
  export type CandidateDashboard = {
    candidate_id: number;
    full_name: string;
    primary_role: string;
    city: string;
    district?: string | null;
    ready_to_start: string;
    total_matches: number;
    active_matches: number;
    hired_matches: number;
    rejected_matches: number;
    items: CandidateMatchItem[];
  };
  
  export type SuggestedVacancyItem = {
    vacancy_id: number;
    role: string;
    venue_name: string;
    city: string;
    district?: string | null;
    status: string;
    score: number;
  };
  
  export type CandidateSuggestions = {
    candidate_id: number;
    full_name: string;
    suggested_vacancies: SuggestedVacancyItem[];
  };