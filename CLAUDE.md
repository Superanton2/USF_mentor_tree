# CLAUDE.md — правила проєкту «Дерево Менторів УСС»

Повне ТЗ у `SPEC.md`. Цей файл містить правила, які діють **завжди**, на кожному етапі і в кожному коміті.

## Про проєкт одним абзацом
Сайт `mentors.studfreedom.org` показує дерева менторства в ГО «Українські Студенти за Свободу» (УСС). Граф у стилі Obsidian, перегляд «Мій родовід» у стилі Neurotree, пошук себе, експорт. Дані беруться з Google-таблиці (зараз з CSV). `sync-service` будує статичні релізи, nginx їх віддає. Monorepo: `packages/domain` (чиста логіка), `packages/sync-service` (Node), `packages/web-app` (React + Vite). Проєкт буде передано іншій людині, тому зрозумілість важливіша за кмітливість.

## Команди
```bash
npm ci                     # встановлення
npm run dev                # web-app локально на демо-даних
npm run sync               # імпорт → реліз (DATA_SOURCE з .env, за замовчуванням demo)
npm run sync -- --force    # не чекати галочки «Опублікувати зміни»
npm run sync:rollback      # повернути попередній реліз
npm test                   # unit-тести (Vitest) з порогами покриття
npm run test:e2e           # Playwright на демо-даних
npm run lint && npm run typecheck
npm run check:data        # у git немає реальних даних
npm run generate-demo-data # перегенерувати data/demo (детерміновано)
npm run build
docker compose up -d --build
```
Тримай цей список актуальним. Нова команда, якої немає в README і тут, вважається незавершеною роботою.

## Скіли
Використовуй скіли з https://github.com/addyosmani/agent-skills.

Встановлення в Claude Code:
```
/plugin marketplace add https://github.com/addyosmani/agent-skills.git
/plugin install agent-skills@addy-agent-skills
```

Порядок роботи:
1. `spec-driven-development`: спершу звір задачу зі `SPEC.md`. Якщо чогось там немає, спитай власника.
2. `planning-and-task-breakdown`: план у `docs/plan.md`, задачі маленькі й перевірювані.
3. `incremental-implementation` + `test-driven-development`: тонкі вертикальні шматки, спершу тест (red → green → refactor).
4. `frontend-ui-engineering`: для всього UI (доступність, адаптивність).
5. `performance-optimization`: для графа і бюджетів із SPEC 12.3.
6. `security-and-hardening`: для імпорту, Google API, заголовків nginx.
7. `ci-cd-and-automation`: для GitHub Actions і Docker.
8. `code-simplification` → `code-review-and-quality`: перед кожним мержем.
9. `documentation-and-adrs`: кожне архітектурне рішення записується в ADR, документація оновлюється в тому ж PR.
10. `shipping-and-launch`: перед продакшн-релізом (етап 7).

## Іменування — обов'язково
За відео CodeAesthetic «Naming Things in Code».

1. **Жодних однолітерних назв.** Навіть у циклах і лямбдах: `members.map((member) => …)`, а не `m`. Винятки: лише поля, які вимагає стороння бібліотека (`node.x`, `node.y` у force-graph). Вони не виходять за межі адаптера.
2. **Жодних скорочень.** `member`, а не `mbr`; `index`, а не `idx`; `button`, а не `btn`; `configuration`, а не `cfg`; `error`, а не `err`; `event`, а не `e`. Дозволені загальновідомі: `id`, `url`, `csv`, `json`, `html`, `api`, `png`.
3. **Тип не пишемо в назві.** `members`, а не `memberArray` чи `memberList`; `isHidden`, а не `hiddenBool`; інтерфейси без префікса `I` (`MembershipDataSource`, а не `IMembershipDataSource`).
4. **Жодних `Base`, `Abstract` у назвах класів.** Якщо треба спільна поведінка, дай назву, яка пояснює роль.
5. **Жодних «звалищ».** Немає файлів і класів `utils`, `helpers`, `common`, `misc`, `Manager`. Кожна функція живе в модулі, названому за своїм призначенням (`searchNormalization.ts`, `treeLayout.ts`).
6. **Назва описує, що це, а не як зроблено.** `findTreeFounder`, а не `walkUpLoop`. Булеві змінні: `is…`, `has…`, `should…`.
7. **Глосарій.** Доменні назви беремо лише з `SPEC.md`, розділ 2 (`mentor`, `mentee`, `mentorshipTree`, `treeFounder`, `leadershipProgramYear`, …). Нове доменне поняття спершу додається в глосарій.
8. Одиниці виміру в назвах не обов'язкові.

ESLint допомагає з цим: `id-length` (мінімум 2, винятки `id`, `x`, `y`), `@typescript-eslint/naming-convention` і заборона імен файлів `utils*`/`helpers*` через `no-restricted-imports` або власне правило.

## Стиль і структура коду
- TypeScript `strict` + `noUncheckedIndexedAccess`. Жодних `any` (лише `unknown` з перевіркою). Жодних `// @ts-ignore` без коментаря-причини.
- Маленькі функції з однією відповідальністю. Ранній вихід замість глибокої вкладеності (не більше 3 рівнів).
- Чиста логіка лежить у `packages/domain`: без I/O, без React, без Node API. Те, що має бізнес-правило, тестується там.
- Залежності йдуть в один бік: `web-app` → `domain` ← `sync-service`. `domain` нічого не імпортує з інших пакетів.
- Зовнішні бібліотеки ховаються за адаптерами (`GraphRenderer`, `MembershipDataSource`, `ImportReportWriter`). Компоненти й конвеєр імпорту не викликають API бібліотек напряму.
- Коментарі пояснюють **чому**, а не **що**. Якщо треба пояснювати «що», краще перейменуй.
- Без «магічних» чисел і кольорів: кольори лише з дизайн-токенів або конфігу, числа — з іменованих констант.
- Помилки не ковтаються. Помилка імпорту стає `ImportIssue`, неочікувана помилка логується зі структурованим контекстом.
- Тексти інтерфейсу лише в `locales/uk.ts` і `locales/en.ts`, жодних рядків у JSX.

## Мови
- **Код, назви, коміти, коментарі** англійською.
- **Документація** (`README.md`, `docs/*`, ADR) і **тексти інтерфейсу** українською (плюс англійська локалізація інтерфейсу).

## Дані і приватність — червоні лінії
- Репозиторій **публічний**. НІКОЛИ не комітити реальні дані (`data/private/`), `.env`, ключі сервісного акаунта, відповіді форми.
- Для тестів і розробки є лише `data/demo/` (синтетичні імена) і `data/reference/` (довідник міст).
- Тести з реальними даними запускаються тільки локально і не потрапляють у CI.
- `graph.json` будується лише з whitelist-полів (SPEC 5.5). Нове поле означає зміну контракту, ADR і тест.
- Вкладку «Відповіді форми» не читати ніколи. Діапазони запитів до Sheets API задаються явним allowlist.

## Дизайн
- Мінімалізм графа Obsidian у фірмових кольорах УСС: чорний `#000000`, жовтий `#FFD600`, білий `#FFFFFF`. Шрифт Apercu Pro (Light, Regular, Bold + курсиви) з `assets/fonts/apercu-pro/`.
- Без тіней і зайвих рамок. Анімації 150–600 мс, з повагою до `prefers-reduced-motion`.
- Деталі в `SPEC.md`, розділ 8.

## Визначення «готово» для задачі
- [ ] Тести написані першими і проходять. Пороги покриття дотримані.
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` зелені.
- [ ] Для UI перевірено в браузері (десктоп + мобільна емуляція), є скріншот.
- [ ] Документація і `CHANGELOG.md` оновлені. Для архітектурного рішення є ADR.
- [ ] Самоперевірка за `code-review-and-quality` і правилами іменування вище.
- [ ] Жодних реальних даних чи секретів у диффі.

## Git
- Гілка на задачу (`feature/…`, `fix/…`), мерж у `main` лише після зеленого CI.
- Атомарні коміти у стилі Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).

## Коли сумніваєшся
Спитай власника. Не вигадуй вимоги, не розширюй обсяг (див. SPEC 3.2 «не входить») і не підганяй цифри приймання.
