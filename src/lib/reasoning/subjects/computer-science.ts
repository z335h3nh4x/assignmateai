import type { SubjectProfile } from "../types";

export const computerScienceProfile: SubjectProfile = {
  id: "computer_science",
  label: "Computer Science",
  match: /computer\s+science|operating\s+system|dbms|database|network|compiler|theory\s+of\s+computation|automata|software\s+engineering|ai\b|machine\s+learning/,
  guidance: `SUBJECT — COMPUTER SCIENCE
Reasoning strategy: identify the sub-field (OS, DBMS, networks, theory, ML), model the problem with the right abstraction (process/thread, relation, packet, automaton, model), then reason formally.
Answer structure per question: problem restatement → chosen model or approach with one-line justification → the artefact (SQL query, ER diagram in Mermaid, state diagram, algorithm) → a small worked example or trace → complexity or trade-offs.
Terminology: use precise CS vocabulary — "ACID", "throughput vs latency", "context switch", "normal form", "deterministic vs non-deterministic".
Formatting: SQL in \`\`\`sql\`, ER / state / sequence diagrams as Mermaid, tables for schedules / normalisation / routing.
Avoid: hand-wavy comparisons without a criterion, ignoring edge cases (empty input, single element, cycles), confusing OS concepts (process vs thread, page vs frame).`,
};

export const programmingProfile: SubjectProfile = {
  id: "programming",
  label: "Programming",
  match: /programming|python|java\b|c\+\+|coding|software\s+development/,
  guidance: `SUBJECT — PROGRAMMING
Reasoning strategy: understand the spec, list inputs / outputs / constraints, choose a data structure, then write the code.
Answer structure per question: (1) one-paragraph approach, (2) fenced code in the target language with meaningful names, (3) a dry-run on a small example with expected output, (4) one line each on time and space complexity, (5) a brief note on edge cases handled.
Terminology: language-idiomatic ("list comprehension" for Python, "vector" for C++), not translated.
Formatting: fenced code blocks with the correct language tag, indentation preserved. Use \`\`\`text\` for pseudocode with numbered steps.
Avoid: pseudocode when the question asks for code, code that would not compile, ignoring input validation when the question requires robustness.`,
};

export const dsaProfile: SubjectProfile = {
  id: "dsa",
  label: "Data Structures & Algorithms",
  match: /data\s+structure|algorithm|dsa\b|graph\s+theory|dynamic\s+programming/,
  guidance: `SUBJECT — DATA STRUCTURES & ALGORITHMS
Reasoning strategy: classify the problem (search, sort, greedy, DP, graph, divide & conquer), pick the data structure that makes the invariant obvious, prove correctness informally, then code.
Answer structure per question: intuition paragraph → algorithm in numbered steps or pseudocode → fenced implementation → dry-run on a small input showing the data structure's state → time and space complexity with a one-line justification.
Terminology: Big-O, amortised, invariant, recurrence \`$T(n) = 2T(n/2) + O(n)$\`, "in-place", "stable sort".
Formatting: recurrences and complexity in math delimiters, trees / graphs as Mermaid where a diagram helps.
Avoid: stating complexity without justifying it, confusing average and worst case, forgetting the recursion base case.`,
};
