# Дерево Менторів УСС

Сайт `mentors.studfreedom.org`: дерева менторства в ГО «Українські Студенти за Свободу». Повне технічне завдання — [`SPEC.md`](SPEC.md), правила коду — [`CLAUDE.md`](CLAUDE.md), план — [`docs/plan.md`](docs/plan.md).

**Статус:** етапи 0–2 (фундамент, імпорт даних, граф із пошуком і карткою). «Мій родовід», налаштування й експорт — далі.

## Швидкий старт (потрібен Node.js 22)

```bash
npm ci
npm run sync            # демо-дані → public-data/current/graph.json
npm test
```

Усе разом у Docker (демо-дані, без `.env`):

```bash
docker compose up -d --build   # сайт на http://localhost:8080 (змінна WEB_PORT)
```

Реальні дані: покладіть CSV у `data/private/`, у `.env` вкажіть `CSV_DIRECTORY=/app/data/private` і перезапустіть `sync`
(`docker compose up -d --force-recreate sync`).

Реальні дані лежать у `data/private/` (у git не потрапляють). Запуск на них:

```bash
CSV_DIRECTORY=data/private npm run sync
```

Звіт імпорту: `reports/import-report.csv` (відкривається в Excel).

## Команди

| Команда                                | Що робить                                                        |
| -------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                          | web-app локально                                                 |
| `npm run sync`                         | імпорт → реліз (`-- --force` для етапу 6)                        |
| `npm run sync:rollback`                | повернути попередній реліз                                       |
| `npm test`                             | unit-тести з порогами покриття                                   |
| `npm run test:e2e`                     | Playwright (потрібно один раз `npx playwright install chromium`) |
| `npm run lint` / `typecheck` / `build` | перевірки якості                                                 |
| `npm run check:data`                   | перевірка, що реальні дані не у git                              |
| `npm run generate-demo-data`           | перегенерувати `data/demo/` (детерміновано)                      |

## Структура

- `packages/domain` — чиста логіка: валідація, дерева, контракт `graph.json`.
- `packages/sync-service` — джерела даних, конвеєр, звіти, релізи, CLI.
- `packages/web-app` — React-застосунок.
- `data/demo` — вигадані дані; `data/reference` — довідник міст; `data/private` — реальні дані (git ignore).
- `docs/` — [контракт даних](docs/data-contract.md), [ADR](docs/adr/).

## Змінні середовища

Див. `.env.example`. Без `.env` використовуються демо-дані.
