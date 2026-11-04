# ADR-0001: Стек — TypeScript, React + Vite, npm workspaces

Статус: прийнято · 4 листопада 2026

## Контекст

Проєкт буде передано іншій людині, тому потрібна одна мова на весь код і найпоширеніші інструменти.

## Рішення

- TypeScript 5 (`strict`, `noUncheckedIndexedAccess`) у всіх пакетах; Node.js 22 LTS; npm workspaces.
- Пакети `domain` (чиста логіка), `sync-service` (Node), `web-app` (React 19 + Vite).
- `domain` віддається як TypeScript-джерела (`exports` → `src/index.ts`), без окремого кроку збірки; його споживають Vite і `tsx`.
- `sync-service` у продакшні також запускається через `tsx` (без компіляції в `dist`): менше рухомих частин для наступника.

## Наслідки

Зміна `domain` не потребує публікації пакета. Рантайм-залежність `tsx` лишається в образі `sync`.
