# Frontend – Angular

ממשק חיפוש וסינון פניות. Standalone components + signals, ללא NgModules.

## הרצה

```bash
npm install
npm start        # ng serve – http://localhost:4200
```

השרת (NestJS) צריך לרוץ במקביל ב-`http://localhost:3000` – ראה [`../CandidateTest`](../CandidateTest).

## בנייה

```bash
npm run build    # פלט ל-dist/demo/browser
```

## מבנה

| קובץ | תפקיד |
|------|-------|
| [`src/main.ts`](src/main.ts) | bootstrap + מסך כניסה/דשבורד + הנפקת JWT מקומי (דמו הזדהות) |
| [`src/app/models.ts`](src/app/models.ts) | טיפוסים משותפים עם השרת (`Request`, `PageResult`, `Query`) |
| [`src/app/requests.service.ts`](src/app/requests.service.ts) | מיפוי מסננים ל-`HttpParams`, קריאה ל-API, נרמול התגובה |
| [`src/app/components/login/`](src/app/components/login/) | בחירת דמות (מנהל / משתמש / דמו) |
| [`src/app/components/requests/`](src/app/components/requests/) | פאנל סינון, טבלת תוצאות, מיון, עימוד, מצבי טעינה/שגיאה/ריק |

## הערות

- **מיון:** השרת תומך ב-`createdAt` ו-`requestNumber` בלבד – וזה מה שה-UI מציג.
- **עימוד:** השרת מחזיר `cursor` אטום ולא מספרי עמוד. הרכיב שומר שרשרת cursors
  כדי לאפשר "הבא"/"הקודם"; כל שינוי מסנן או מיון מאפס אותה.
- **הזדהות:** אין מנגנון אמיתי. הקליינט חותם JWT ב-`local-dev-secret` שתואם לברירת
  המחדל של השרת. אין בדיקות אוטומטיות לקליינט (ראה README ראשי).
