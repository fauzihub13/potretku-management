# VendorDesk - Progress Memory

## Project Info
- **Repo**: https://github.com/fauzihub13/potretku-management
- **Backend**: Express.js + Prisma + MySQL (port 4000)
- **Frontend**: Next.js 16 + shadcn/ui + Tailwind (port 3000)
- **DB**: MySQL `db_potretku` on localhost
- **Login**: `admin@example.com` / `password123`

## Tech Notes
- Next.js 16: `params` & `searchParams` must be awaited, `middleware.ts` → `proxy.ts`
- shadcn Select `onValueChange` passes `string | null`, need `(v) => setX(v || '')`
- MySQL TEXT columns cannot have DEFAULT values
- Rate limit: 1000 req/15min, skip `/api/auth/me` & `/api/dashboard`

---

## Fitur SUDAH Dikerjakan ✅

### Backend (15 routes)
| Route | Endpoint |
|-------|----------|
| auth | login, register, logout, me, update profile, change-password |
| bookings | CRUD, stats, calendar, export XLSX, invoice PDF |
| services | CRUD, reorder |
| team | CRUD |
| team-payments | CRUD, pay/unpay, summary per member |
| finance | summary, monthly, by-event, by-package, by-status, recent |
| templates | CRUD |
| settings | get/update (whitelist fields) |
| dashboard | stats overview |
| google-calendar | OAuth2, sync single, sync-all, disconnect |
| vendor-public | profile by slug, public booking, tracking |
| upload | single/multiple file upload |

### Frontend (17 pages)
| Page | Path | Features |
|------|------|----------|
| Login | /login | Form validation, password show/hide |
| Register | /register | Form validation |
| Dashboard | /dashboard | 8 stat cards, recent & upcoming bookings |
| Bookings List | /bookings | Table/card views, pagination, search, filter, sort, export XLSX, sync all |
| Create Booking | /bookings/create | 30-min time slots, package duration calc, drive links |
| Booking Detail | /bookings/[id] | Status mgmt, DP/final toggle, invoice PDF, WhatsApp, Google Calendar sync, drive links |
| Edit Booking | /bookings/[id]/edit | Same as create with pre-fill |
| Calendar | /calendar | Month view, booking bars, date detail sidebar |
| Services | /services | Table/card views, full form (price, discount, duration, photo edits, event types, city, additional costs) |
| Team | /team | Table/card views, active toggle |
| Finance | /finance | 4 charts (bar, pie, horizontal bar, ranked list), stat table |
| Invoices | /invoices | Templates CRUD, PDF download, WhatsApp send, table/card views |
| Templates | /templates | CRUD |
| Team Payments | /team-payments | Summary per member, expandable bookings list, pay/unpay |
| Settings | /settings | 4 tabs: Umum, Pembayaran, Google, SEO |
| Profile | /profile | Account, studio info, password change |
| Form Booking Setup | /form-booking | Vendor URL, branding, colors, custom fields, terms |
| Public Vendor | /[slug] | Landing page + 4-step booking form |

### Components
| Component | File |
|-----------|------|
| ViewToggle | view-controls.tsx |
| Pagination | view-controls.tsx |
| SortableTh + useSortableData | sortable-table.tsx |
| ConfirmDialog + ConfirmActionDialog | confirm-dialog.tsx |
| Sidebar | sidebar.tsx |
| Topbar | topbar.tsx |

### Utilities
- `lib/api.ts` — Axios client with auth interceptor
- `lib/auth-context.tsx` — AuthProvider + useAuth hook
- `lib/utils-helpers.ts` — formatCurrency, formatDate, statusColors, statusLabels
- `lib/validations.ts` — validateEmail, validatePhone (awalan 62), validateName, etc.

---

## Fitur BELUM Dikerjakan

### Public Pages
1. Public Settlement Form (pelunasan klien)
2. Client Tracking Page (publik)
3. Pricing Page (langganan)
4. Landing Page (marketing)

### Dashboard
5. Batch Import Excel
6. Onboarding Wizard
7. Kanban Board

### Integrasi
8. Google Drive Integration
9. Telegram Bot Notif
10. Fastpik Integration
11. Payment Gateway (Midtrans/DOKU)

### Multi-Tenant
12. Multi-Brand
13. Admin Role
14. Custom Domain
15. Mini Website
16. Rating & Review

### Lainnya
17. Email Notifikasi
18. WhatsApp Business API
19. Changelog Page
20. Tutorial Page

---

## Database Schema (MySQL)
- User, Session, Booking, Service, TeamMember, PaymentProof, Settlement, Template, Setting, TeamPayment

## File Structure
```
backend/
  prisma/schema.prisma, seed.js
  src/server.js
  src/config/db.js
  src/middleware/auth.js, upload.js
  src/routes/ (12 files)

frontend/
  src/app/
    layout.tsx, page.tsx, globals.css
    login/, register/
    (dashboard)/
      layout.tsx, dashboard/, bookings/, calendar/
      services/, team/, finance/, invoices/
      templates/, settings/, profile/
      form-booking/, team-payments/
    [slug]/page.tsx  (public vendor)
  src/components/
    sidebar.tsx, topbar.tsx, confirm-dialog.tsx,
    sortable-table.tsx, view-controls.tsx
    ui/ (20+ shadcn components)
  src/lib/
    api.ts, auth-context.tsx, utils.ts,
    utils-helpers.ts, validations.ts
```

## Last Commit
- `2cde302` feat: banner displayed on vendor public page + dashboard preview
