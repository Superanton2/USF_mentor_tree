# Журнал змін

Формат: [Keep a Changelog](https://keepachangelog.com/uk/). Версії: SemVer.

## [Unreleased]

### Додано

- Етап 0: monorepo (`domain`, `sync-service`, `web-app`), TypeScript strict, ESLint з правилами іменування, Prettier, Vitest, Playwright, CI, перевірка відсутності реальних даних.
- Етап 0: довідник міст `data/reference/cities.csv`, детермінований генератор демо-даних `data/demo/`.
- Етап 1: імпорт CSV, валідація (усі коди з SPEC 5.3), побудова дерев, приховані учасники, `graph.json` з whitelist, звіт імпорту, атомарні релізи з відкатом, CLI `npm run sync`.
