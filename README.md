# מערכת פניות – קליינט + סרבר

מגישה: רות שינדלר

מערכת לחיפוש, סינון ומיון של פניות (Requests), עם אכיפת הרשאות בצד השרת,
עימוד (pagination) מבוסס cursor, וממשק משתמש ב-Angular.

| רכיב | טכנולוגיה | תיקייה |
|------|-----------|--------|
| Backend | Node.js + NestJS + Express | [`CandidateTest/`](CandidateTest/) |
| Frontend | Angular (standalone components, signals) | [`client/`](client/) |

מסמך הארכיטקטורה (חלק ב') נמצא ב-[`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## הרצה מהירה

צריך שני טרמינלים – אחד לשרת, אחד לקליינט.

### 1. Backend (פורט 3000)

```bash
cd CandidateTest
npm install
$env:JWT_SECRET = "local-dev-secret"
$env:PORT = "3000"
npm run start:dev
```

- ה-API עולה ב-`http://localhost:3000`
- Swagger: `http://localhost:3000/api`
- **משתני סביבה (אופציונלי):**
  - `JWT_SECRET` – הסוד לאימות ה-JWT. אם לא מוגדר, נעשה שימוש בברירת מחדל
    לפיתוח (`local-dev-secret`) שתואמת לסוד שבו הקליינט חותם. בפרודקשן חובה להגדיר.
  - `PORT` – ברירת מחדל `3000`.

### 2. Frontend (פורט 4200)

```bash
cd client
npm install
ng s       # שווה ערך ל-npm start
```

הדפדפן ייפתח ב-`http://localhost:4200`. כתובת ה-API מקובעת ל-`http://localhost:3000`
(ראה [`client/src/app/requests.service.ts`](client/src/app/requests.service.ts)).

### מסך הכניסה

מסך הכניסה מאפשר לבחור אחת משלוש דמויות. **אין כאן מנגנון הזדהות אמיתי** – הקליינט
מנפיק JWT חתום מקומית כדי לדמות משתמש מזוהה:

| דמות | role | id | רואה |
|------|------|----|------|
| מנהל | administrator | 1 | את כל הפניות |
| משתמש | user | 1 | רק פניות שבבעלותו (`ownerId`) או מוקצות אליו (`assignedToUserId`) |
| דמו | administrator (דרך `/api/requests/test`) | 42 | את כל הפניות, ללא צורך ב-token |

---

## הרצת בדיקות

### Backend

```bash
cd CandidateTest
npm test
```

Jest + ts-jest. הבדיקות מכסות את המקרים המשמעותיים:

- מיון עולה/יורד לפי מספר פנייה
- הגבלת משתמש רגיל לפניות שבבעלותו / מוקצות אליו, ומנהל שרואה הכל
- עימוד cursor לאורך כל מאגר הנתונים ללא כפילויות או דילוגים (כולל גבולות עמוד עם `createdAt` זהה)
- החלת מסנני `ownerId` / `assignedToUserId`
- `toDate` בפורמט תאריך בלבד – כולל את כל היום
- דחיית שדה מיון לא נתמך (קלט לא חוקי)
- בניית משתמש בדיקה מ-`userId` / `isAdmin` ומעבר ולידציה


---

## טכנולוגיות שנבחרו ומדוע

**Backend – NestJS במקום ה-.NET 8 שסופק.**
במחשב שעליו בוצעה המשימה חסרו התקנות של סביבת .NET, והמרה ל-NestJS אפשרה עמידה
מלאה בדרישות בזמן הנתון. NestJS נבחר (ולא Express גולמי) כי הוא מספק מבנה מודולרי,
הזרקת תלויות, ו-pipeline ולידציה (`class-validator`) שמתאים לדרישת "טיפול בקלט לא חוקי".
המבנה נשאר קרוב ל-Clean Architecture של המקור: `controller` → `service` → `repository`.

**Frontend – Angular** (מתוך האפשרויות Angular / React בדרישות). Standalone
components + signals לניהול state פשוט וללא תלות ב-NgModules.

---

## הנחות שביצעתי

1. **הזדהות.** מערכות ממשלתיות משתמשות במנגנון הזדהות חיצוני (SSO ממשלתי), ולכן אין
   טעם לממש מנגנון הזדהות מלא. הקליינט מנפיק JWT חתום כדי לדמות את התוצר של הזדהות כזו,
   והשרת מאמת חתימה + תוקף. הסוד משותף כברירת מחדל לפיתוח בלבד.
2. **מודל הרשאות.** "בבעלותו" = `request.ownerId === user.id`; "מוקצה אליו" =
   `request.assignedToUserId === user.id`. מנהל עוקף את הסינון. האכיפה היא בשכבת ה-repository,
   לפני כל סינון אחר, כך שאי אפשר לעקוף אותה דרך פרמטרי query.
3. **סינון תאריכים** מתייחס ל-`createdAt` בלבד (טווח תאריכי *יצירה*). `toDate` בפורמט
   `YYYY-MM-DD` נחשב עד סוף היום כולל; `fromDate` מאוחר מ-`toDate` נחשב קלט לא חוקי (`400`).

---

## החלטה טכנית עם חלופות

**עימוד: cursor / keyset מול offset / page-number.**

| | offset (`?page=5&size=20`) | cursor (נבחר) |
|--|--|--|
| מימוש בקליינט | פשוט – גישה אקראית לעמודים, "עמוד 5" | מורכב יותר – שרשרת cursors, בלי קפיצה לעמוד שרירותי |
| ביצועים על מיליוני רשומות | `OFFSET n` סורק ומדלג n שורות – מתדרדר ליניארית | `WHERE (created_at, id) < (?, ?)` – שימוש ישיר באינדקס, קבוע בזמן |
| יציבות בזמן כתיבות מקבילות | רשומה חדשה מזיזה את כל העמודים ("shifting") | ה-cursor מצביע על מפתח יציב |

בחרתי cursor כי הדרישה מדגישה "יש להניח מיליוני רשומות". המחיר: ה-UI לא מציג "עמוד 5 מתוך 100"
ואין ניווט לעמוד שרירותי – רק הבא/הקודם. זה tradeoff מקובל במערכות בקנה מידה גדול
(GitHub, Slack, Stripe מעמדים כך).

בקליינט שמרתי מערך `cursorForPage[]` כדי לאפשר גם "הקודם"; כל שינוי מסנן/מיון מאפס אותו.

---

## מה לא הספקתי ואיך הייתי ממשיך

1. **בדיקות קליינט.** אין. **המשך:** בדיקות ל-`RequestsService` (מיפוי `Query`→`HttpParams`,
   נרמול תגובה מערך/אובייקט), ובדיקת component ל-`RequestsDashboardComponent` (מצבי
   טעינה/שגיאה/ריק, שרשרת ה-cursor) עם `HttpTestingController`.
2. **ניהול טוקן.** ה-JWT נשמר ב-`localStorage` עם תוקף שעה ומתחדש ברענון. **המשך:**
   `HttpInterceptor` להוספת ה-header ולטיפול מרוכז ב-401 (רה-לוגין/רענון).

---

## מבנה הפרויקט

```
project_test_mishpatim/
├── README.md                ← הקובץ הזה
├── ARCHITECTURE.md           ← חלק ב' (Microservices + תרחיש Notification) + תרשים
├── דרישות.docx / חלק ב.docx   ← מסמכי המשימה המקוריים
├── CandidateTest/            ← Backend (NestJS)
│   └── src/requests/
│       ├── requests.controller.ts      ← endpoints
│       ├── request.service.ts          ← לוגיקה עסקית
│       ├── request.repository.ts       ← נתונים + סינון/מיון/עימוד + אכיפת הרשאות
│       ├── request-query.dto.ts        ← ולידציית קלט
│       ├── authentication.middleware.ts← אימות JWT
│       └── *.spec.ts                   ← בדיקות Jest
└── client/                   ← Frontend (Angular)
    └── src/app/
        ├── requests.service.ts               ← קריאות ל-API
        ├── models.ts                         ← טיפוסים משותפים עם השרת
        └── components/{login,requests}/
```

---

## API

`GET /api/requests` (דורש `Authorization: Bearer <jwt>`)

| פרמטר | תיאור |
|-------|-------|
| `requestNumber` | חיפוש חלקי במספר הפנייה |
| `status` | סטטוס – בודד או מרובה (`?status=New&status=InProgress`). מקבל שם או קוד מספרי |
| `requestType` | סוג פנייה (`General` / `Legal` / `Payment` / `Appeal`) |
| `fromDate`, `toDate` | טווח תאריכי יצירה (ISO; `toDate` בפורמט תאריך = עד סוף היום) |
| `ownerId`, `assignedToUserId` | סינון לפי בעלים / מוקצה |
| `sortBy` | `createdAt` (ברירת מחדל) או `requestNumber` |
| `sortOrder` | `ASC` / `DESC` (ברירת מחדל `DESC`) |
| `limit` | 1–200 (ברירת מחדל 50) |
| `cursor` | ה-`nextCursor` מהתגובה הקודמת |

תגובה: `{ items: Request[], hasMore: boolean, nextCursor: string | null }`.
קלט לא חוקי → `400`; ללא token תקין → `401`.

`GET /api/requests/test?userId=<n>&isAdmin=<bool>` – זהה, ללא token, לצורכי הדגמה/בדיקה.
הנתיב מושבת (`404`) כאשר `NODE_ENV=production`.
