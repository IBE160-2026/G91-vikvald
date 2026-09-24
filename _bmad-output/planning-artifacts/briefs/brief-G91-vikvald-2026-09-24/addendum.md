---
title: "Addendum: Studiekamerat product brief"
created: 2026-09-24
updated: 2026-09-24
---

# Addendum: Studiekamerat product brief

## Landscape research

Web digest from September 2026. Verify prices against vendor pages.

### Competing tools

- **Google NotebookLM**: source-grounded summaries, flashcards, quizzes, mind maps, audio/video overviews, Learning Guide tutor. All features are on the free tier; paid tiers raise the limits. No spaced-repetition scheduling, limited export.
- **ChatGPT Study Mode, Gemini Guided Learning, Claude Learning mode** (all from 2025, with free tiers): Socratic tutoring through chat. No saved decks, no spaced repetition.
- **Quizlet**: Magic Notes produces outlines, flashcards and tests; Memory Score schedules review. About $3–8/month. The Q-Chat tutor was shut down in June 2025.
- **Knowt**: free Quizlet alternative that generates notes, flashcards and quizzes from PDFs and video.
- **StudyFetch**: works from PDFs, video and lecture recordings, with a tutor. About $5–20/month.
- **Mindgrasp**: summaries, notes and quizzes. About $10/month, with no real free tier.
- **Revisely**: flashcards and quizzes with AI grading of free-text answers. Free tier limited to 5 pages per document.
- **Anki**: the reference for spaced repetition. No AI of its own; third-party tools generate decks from PDFs.
- **StuderSmartere.no**: Norwegian-language AI quizzes and flashcards with spaced repetition.
- **Sikt KI**: free for Norwegian students, data stays in the EU/EEA. Chat only.
- **Canvas IgniteAI**: quiz generation for teachers only.

**Common gaps across these tools**: Norwegian-language content, links to the course's learning outcomes, good grading of free-text answers, and spaced repetition inside chat tools.

### Learning science

- **Retrieval practice**: testing beats rereading (Roediger & Karpicke 2006). https://pubmed.ncbi.nlm.nih.gov/16507066/
- **Spacing**: spreading study out improves long-term retention (Cepeda et al. 2006). https://www.yorku.ca/ncepeda/publications/CPVWR2006.html
- **Generation effect**: producing material yourself beats reading it, d ≈ 0.40 (Bertsch et al. 2007). Ready-made AI material may lose some of this benefit. https://pubmed.ncbi.nlm.nih.gov/17645161/
- **Unguarded AI tutoring**: GPT-4 tutoring raised practice scores but lowered exam scores; a hint-only tutor avoided most of the drop (Bastani et al., PNAS 2025). https://www.pnas.org/doi/10.1073/pnas.2422633122

### Risks and constraints

- **Hallucinations**: about 4.8% of generated flashcards contained errors in a 2025 medical-education study. Generated material should cite its source and let students flag errors.
- **Copyright**: the Kopinor agreement does not yet allow uploading course literature to AI tools. Lecture slides belong to the lecturer. UiO allows uploads only to approved tools.
- **HiMolde guidelines (2026)**: students must declare AI use. No personal, confidential or copyrighted material may go into open tools; sector tools (Sikt KI, Copilot) are recommended.
- **GDPR**: a tool for students should store data in the EU/EEA, have a data processing agreement and not train on uploads.

## Course proposal (IBE160, suggestion #1: "AI Study Buddy")

The source text is the lecturer's list of project suggestions (Norwegian). This is a condensed version.
- **Description**: helps students work through course material by generating summaries, flashcards and quiz questions from uploaded notes. It also teaches students how AI can be used for text processing.
- **Difficulty**: Easy. Difficulty is an important part of grading. An easy project is more likely to get finished but "needs more form and colour" (more polish and depth) to reach the top grade.
- **Security/login**: required if user material is stored or shared.
- **Online purchase/sale**: none.
- **Data in**: uploaded lecture notes, slides and course literature (PDF or text), course code or subject, desired detail level, language and preferences.
- **Data out**: summaries, flashcards, quiz questions and answers, key concepts, and references to source pages.
- **Decision points named by the lecturer** (for the PRD and architecture):
  - which LLM to use, and confidence levels
  - how detailed summaries should be
  - how to handle tables and figures
  - local processing or cloud (ties to the HiMolde copyright and GDPR constraints above)
