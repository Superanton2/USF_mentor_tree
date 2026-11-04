# Контракт даних `graph.json`

Версія схеми: **1**. Файл будує `domain` (`graphDocument.ts`), публікує `sync-service`. Поля перелічені явно (whitelist): додати поле означає змінити контракт, `schemaVersion + 1`, ADR і тест.

## Структура

| Поле            | Опис                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion` | `1`                                                                                                                                      |
| `publishedAt`   | ISO-час публікації                                                                                                                       |
| `members[]`     | `memberId`, `fullName`, `cityKey`, `membershipLevel`, `leadershipProgramYear`, `mentorMemberId`, `treeId`, `descendantCount`, `isHidden` |
| `trees[]`       | `treeId` (= `memberId` засновника), `founderMemberId`, `memberCount`                                                                     |
| `cities[]`      | `cityKey`, `names.uk`, `names.en`, `region`                                                                                              |
| `settings`      | `formUrl`, `largestTreesCount`, `labelZoomThreshold`, `showMembersWithoutConnections`, `dimmedOpacity`, `colors`                         |

## Відступи від прикладу у SPEC 5.5 (уточнення)

- `fullName` — `null` для прихованих учасників; інтерфейс показує «Учасник УСС».
- `cities[].region` може бути `null` для міст, яких немає в довіднику (`UNKNOWN_CITY`): вони показуються як є. Їхній `cityKey` має вигляд `unknown-N`.
- Прихований учасник **без дерева** не публікується взагалі: він не шукається і не показується, тож інформації не несе.
- Приховані учасники в деревах мають `memberId` виду `hidden-N` (номер за порядком у джерелі). Якщо засновник прихований, `treeId` теж `hidden-N`.
- `settings` не містить службових ключів (`publishRequested`, `lastPublishedAt`, `memberCountDropAbortPercent` …).

## Релізи

`public-data/releases/<час>/{graph.json, meta.json}`; `public-data/current` — символічне посилання на актуальний реліз. Звіт імпорту лежить **поза** `public-data` (`reports/import-report.csv`), бо містить імена.
