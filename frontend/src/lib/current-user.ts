export function getCurrentCandidateId() {
    if (typeof window === "undefined") {
      return 1;
    }
  
    const possibleKeys = [
      "hubsty_candidate_id",
      "candidateId",
      "selectedCandidateId",
    ];
  
    for (const key of possibleKeys) {
      const value = window.localStorage.getItem(key);
      const id = Number(value);
  
      if (Number.isFinite(id) && id > 0) {
        return id;
      }
    }
  
    return 1;
  }
  
  export function getCurrentEmployerId() {
    if (typeof window === "undefined") {
      return 1;
    }
  
    const possibleKeys = [
      "hubsty_employer_id",
      "employerId",
      "selectedEmployerId",
    ];
  
    for (const key of possibleKeys) {
      const value = window.localStorage.getItem(key);
      const id = Number(value);
  
      if (Number.isFinite(id) && id > 0) {
        return id;
      }
    }
  
    return 1;
  }