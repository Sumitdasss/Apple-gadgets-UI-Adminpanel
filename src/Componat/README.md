# Apple Gadgets Report Section (Frontend)

## Files
- `ReportSection.jsx` — report page component
- `ReportSection.css` — responsive styling

## Requirements
This component uses `lucide-react`. Install it if it is not already installed:

```bash
npm install lucide-react
```

## Use in Next.js App Router
Copy both files into your admin panel, for example:
`app/(admin)/reports/ReportSection.jsx`
`app/(admin)/reports/ReportSection.css`

Then create `app/(admin)/reports/page.jsx`:

```jsx
import ReportSection from "./ReportSection";

export default function ReportsPage() {
  return <ReportSection />;
}
```

Set the backend URL in `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://apple-gadgets-ui-backend.vercel.app
```

## Use in Vite React
The component uses `"use client"` harmlessly, but change API_BASE to just:
```js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
```
Remove the `process.env` fallback if your bundler complains.

## Important: API endpoints
The overview uses the previously shared endpoint:
`GET /api/dashboard/summary?allTime=true`

The other report endpoints are configurable in `REPORT_ENDPOINTS` at the top of `ReportSection.jsx`:
- `/api/reports/sales`
- `/api/reports/orders`
- `/api/reports/profit-loss`
- `/api/reports/products`
- `/api/reports/customers`
- `/api/reports/employees`
- `/api/reports/payments`
- `/api/reports/courier`

If your existing backend uses different paths, update those strings to match the actual routes. The component sends `from`, `to`, and optional `search` query parameters to report endpoints. The overview sends the all-time dashboard query. It reads common response shapes (`data`, `result`, `rows`, `items`, `results`, `records`) and common summary fields, but the exact response keys should match your backend.

Auth: the component tries to read `token` or `accessToken` from localStorage and sends it as a Bearer token. If your admin panel stores auth under a different key or uses a different auth header, update the fetch headers in `loadReport`.

CSV export is implemented in the browser. PDF and Excel export can be added after confirming your preferred libraries and report data shape.
