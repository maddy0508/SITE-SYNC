---
applyTo: "docs/**/*.md,**/*spec*.md,**/*plan*.md"
---

# Project documentation conventions

- Use `docs/superpowers/specs` for approved designs/specifications and `docs/superpowers/plans` for implementation plans.
- Treat existing relevant specifications as authoritative unless a newer decision explicitly supersedes them.
- Record decisions, rejected approaches, assumptions, verification evidence, unresolved issues, and definition of done when they materially affect future work.
- Do not duplicate large specifications into code comments or agent prompts; link to the authoritative document.
- Never mark a feature complete solely because a design, scaffold, mock, or partial wiring exists.