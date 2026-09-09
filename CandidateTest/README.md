פרויקט סרבר - הפרויקט נכתב בשפת node בטכנולוגית Nest js
הסיבה להמרת הפרויקט לשפה זאת היא מסיבה טכנית בלבד של התקנות שחסרות במחשב שעליו בוצעה המשימה
תוך התחשבות מלאה בדרישות הפרויקט שאפשרו באופן מלא לעשות זאת.


## תיאור הפרויקט

ממשק API ב-NestJS עבור עיבוד וניווט של בקשות מועמדים, עם הרשאות לפי משתמש, סינון לפי פרמטרים שונים, וממשק Swagger לצפייה ובדיקה מהירה של ה-Endpoints.

### תכונות עיקריות

- הרשאת גישה באמצעות JWT
- סינון לפי סטטוס, סוג בקשה, תאריכים, בעל הבקשה, מוקצה למשתמש ועוד
- תמיכה בפאגינציה עם cursor
- Swagger להתנסות מיידית עם ה-API
- מאגר נתונים פנימי (in-memory) לצורך פיתוח ולוקאל

## טכנולוגיות

- Node.js
- TypeScript
- NestJS
- Express
- Swagger / OpenAPI
- class-validator
- class-transformer
- Jest

## התקנה והרצה

### דרישות מוקדמות

- Node.js 18+
- npm 9+
- Git

### התקנה

```bash
npm install
```

### משתני סביבה (אופציונלי לפיתוח לוקאלי)

| משתנה | ברירת מחדל | הערה |
|-------|-------------|------|
| `JWT_SECRET` | `local-dev-secret` | כשהמשתנה חסר, השרת משתמש בברירת המחדל התואמת לסוד שבו הקליינט חותם את ה-JWT ([`client/src/main.ts`](../client/src/main.ts)), כך שהזדהות מול `/api/requests` עובדת מהקופסה. **בפרודקשן חובה להגדיר** – והוא גובר. |
| `PORT` | `3000` | פורט ההאזנה |
| `NODE_ENV` | – | כאשר הערך `production`, נתיב ההדגמה `GET /api/requests/test` (שאינו דורש token) מושבת ומחזיר `404`. |

בפרודקשן (PowerShell):

```powershell
$env:JWT_SECRET = "<real-secret>"
$env:PORT = "3000"
```

### הפעלה לוקאלית

```bash
npm run start:dev
```

האפליקציה תופעל בברירת המחדל ב:

```
http://localhost:3000
```

Swagger זמין ב:

```
http://localhost:3000/api
```

### סקירה קצרה של התיקיות

- `src/main.ts` — אתחול ה-API והגדרת Swagger
- `src/app.module.ts` — המודול הראשי של האפליקציה
- `src/requests/` — כל לוגיקת ה-API של הבקשות
- `src/requests/requests.controller.ts` — ה-endpoints
- `src/requests/request.service.ts` — הלוגיקה העסקית
- `src/requests/request.repository.ts` — אחסון נתונים, סינון, מיון, עימוד cursor, אכיפת הרשאות
- `src/requests/request-query.dto.ts` — ולידציית פרמטרים (class-validator)
- `src/requests/authentication.middleware.ts` — אימות ה-JWT

## בדיקות

```bash
npm test
```

Jest + ts-jest. הבדיקות ([`src/requests/*.spec.ts`](src/requests/)) מכסות:

- מיון עולה/יורד לפי מספר פנייה
- הרשאות: משתמש רגיל רואה רק פניות שבבעלותו / מוקצות אליו; מנהל רואה הכל
- עימוד cursor לאורך כל המאגר ללא כפילויות/דילוגים (כולל גבולות עמוד עם `createdAt` זהה)
- מסנני `ownerId` / `assignedToUserId`
- `toDate` בפורמט תאריך = עד סוף היום כולל
- דחיית שדה מיון לא נתמך (קלט לא חוקי)
- בניית משתמש בדיקה מ-`userId` / `isAdmin` ומעבר ולידציה