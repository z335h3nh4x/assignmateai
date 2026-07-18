// Central registry of subject profiles. Add new subjects by creating a file
// in this folder and appending it to SUBJECT_PROFILES — no other file changes.

import type { SubjectProfile } from "../types";
import { mathematicsProfile } from "./mathematics";
import { physicsProfile } from "./physics";
import { chemistryProfile } from "./chemistry";
import { biologyProfile } from "./biology";
import { computerScienceProfile, programmingProfile, dsaProfile } from "./computer-science";
import { electronicsProfile } from "./electronics";
import { businessProfile } from "./business";
import { englishProfile } from "./english";
import { generalAcademicProfile } from "./general";

// Order matters — first match wins. Put more specific patterns before broader ones.
export const SUBJECT_PROFILES: SubjectProfile[] = [
  dsaProfile,
  programmingProfile,
  computerScienceProfile,
  electronicsProfile,
  mathematicsProfile,
  physicsProfile,
  chemistryProfile,
  biologyProfile,
  businessProfile,
  englishProfile,
];

export const FALLBACK_SUBJECT_PROFILE = generalAcademicProfile;

export function selectSubjectProfile(subjectDomain: string | undefined): SubjectProfile {
  const domain = (subjectDomain ?? "").toLowerCase();
  if (!domain) return FALLBACK_SUBJECT_PROFILE;
  for (const p of SUBJECT_PROFILES) {
    if (p.match.test(domain)) return p;
  }
  return FALLBACK_SUBJECT_PROFILE;
}
