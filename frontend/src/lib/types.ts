export type ListingType = "job" | "part_time" | "shift";

export type VacancyPhoto = {
  id: number;
  vacancy_id: number;
  photo_url: string;
  sort_order: number;
  is_cover: boolean;
};

export type CandidatePhoto = {
  id: number;
  candidate_id: number;
  photo_url: string;
};

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

export type VacancyDetail = {
  id: number;
  employer_id: number;
  role: string;
  venue_name: string;
  city: string;
  district?: string | null;
  salary_text?: string | null;
  schedule_text?: string | null;
  needed_start?: string | null;
  listing_type?: ListingType;
  shift_date?: string | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  urgent_flag?: boolean;
  slots_count?: number | null;
  status: string;
  photos?: VacancyPhoto[];
};

export type CandidateProfileDetail = {
  id: number;
  full_name: string;
  phone: string;
  telegram_username?: string | null;
  city: string;
  district?: string | null;
  primary_role: string;
  horeca_experience_months: number;
  ready_to_start: string;
  expected_income?: string | null;
  is_active: boolean;
  photos?: CandidatePhoto[];
};