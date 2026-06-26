# Client Desk - Vendor Management Platform (Full Analysis)

> **URL**: https://clientdesk.ryanekoapp.web.id
> **Tech Stack**: Next.js App Router + React Server Components + Turbopack
> **Tenant**: Client Desk (`clientdesk.ryanekoapp.web.id`)
> **Primary Color**: `#7c3aed` (Purple)
> **Description**: Minimalist and modern client management for freelancers/vendors
> **Locales**: English (`en`), Bahasa Indonesia (`id`)
> **Theme**: Light / Dark / System (via `next-themes`)
> **Bot Protection**: Cloudflare Turnstile CAPTCHA
> **Analytics**: Umami

---

## Table of Contents

1. [Tech Architecture](#1-tech-architecture)
2. [Route Structure](#2-route-structure)
3. [Authentication Flow](#3-authentication-flow)
4. [Sidebar Navigation](#4-sidebar-navigation)
5. [Public Pages (Landing)](#5-public-pages-landing)
6. [Dashboard](#6-dashboard)
7. [Bookings Management](#7-bookings-management)
8. [Calendar](#8-calendar)
9. [Services / Packages](#9-services--packages)
10. [Team / Freelancers](#10-team--freelancers)
11. [Finance](#11-finance)
12. [Invoices & Settlement](#12-invoices--settlement)
13. [Team Payments](#13-team-payments)
14. [Client Status / Tracking](#14-client-status--tracking)
15. [Booking Form Settings](#15-booking-form-settings)
16. [Settlement Form Settings](#16-settlement-form-settings)
17. [Special Booking Form](#17-special-booking-form)
18. [Freelance Portal](#18-freelance-portal)
19. [Settings](#19-settings)
20. [Profile & Subscription](#20-profile--subscription)
21. [Onboarding Wizard](#21-onboarding-wizard)
22. [Batch Import (Excel)](#22-batch-import-excel)
23. [Public Booking Form (Client-Facing)](#23-public-booking-form-client-facing)
24. [Public Settlement Form (Client-Facing)](#24-public-settlement-form-client-facing)
25. [Client Tracking Page (Public)](#25-client-tracking-page-public)
26. [Pricing & Plans](#26-pricing--plans)
27. [API Errors & Validation](#27-api-errors--validation)
28. [UI Components & Patterns](#28-ui-components--patterns)

---

## 1. Tech Architecture

### Frontend
- **Framework**: Next.js (App Router)
- **React**: Server Components (RSC) + Client Components
- **Bundler**: Turbopack
- **Styling**: Tailwind CSS + Radix UI primitives
- **State**: React hooks + Server Actions
- **i18n**: `next-intl` (locale-based routing `/{locale}/{page}`)
- **Theme**: `next-themes` (class-based light/dark/system)
- **Icons**: Lucide React
- **Charts**: (implied from dashboard revenue charts)

### Backend (inferred from i18n/API errors)
- **Auth**: Email/password + Cloudflare Turnstile CAPTCHA
- **Database**: (inferred) relational DB for multi-tenant vendor management
- **File Storage**: Google Drive integration
- **Calendar**: Google Calendar sync
- **Payment Gateway**: Midtrans, DOKU
- **QRIS**: Indonesian QR payment
- **WhatsApp**: Template-based messaging
- **Analytics**: Umami
- **Telegram**: Bot notifications

### Multi-Tenancy
- Tenant config embedded in RSC payload
- Each tenant has: `id`, `slug`, `name`, `domain`, `logoUrl`, `primaryColor`
- Current tenant: `slug: "clientdesk"`, `domain: "clientdesk.ryanekoapp.web.id"`

---

## 2. Route Structure

### Auth Routes (Public)
| Route | Page |
|-------|------|
| `/en/login` | Login page |
| `/en/register` | Registration page |
| `/en/forgot-password` | Forgot password |
| `/en/reset-password` | Reset password (via email link) |

### Dashboard Routes (Authenticated)
| Route | Page | Title |
|-------|------|-------|
| `/{locale}/dashboard` | Dashboard Overview | Dashboard |
| `/{locale}/bookings` | Bookings List | Bookings |
| `/{locale}/bookings/create` | Create Booking | Create Booking |
| `/{locale}/bookings/[id]` | Booking Detail | Booking Detail |
| `/{locale}/bookings/[id]/edit` | Edit Booking | Edit Booking |
| `/{locale}/calendar` | Calendar | Calendar |
| `/{locale}/services` | Services/Packages | Services |
| `/{locale}/team` | Team/Freelancers | Team |
| `/{locale}/finance` | Finance Summary | Finance |
| `/{locale}/invoices` | Invoices & Settlement | Invoice Settlement |
| `/{locale}/team-payments` | Team Payments | Team Payments |
| `/{locale}/status` | Booking Status | Status Booking |
| `/{locale}/settings` | Settings | Settings |
| `/{locale}/profile` | Profile | Profile |
| `/{locale}/form-booking` | Booking Form Settings | Form Booking |
| `/{locale}/form-settlement` | Settlement Form Settings | Form Settlement |
| `/{locale}/form-special-booking` | Special Booking Links | Form Special Booking |
| `/{locale}/freelance-portal` | Freelance Portal | Freelance Portal |
| `/{locale}/tutorial` | Tutorial | Tutorial |
| `/{locale}/changelog` | Changelog | Changelog |
| `/{locale}/coming-soon` | Coming Soon | Coming Soon |

### Public Pages (No Auth)
| Route | Page |
|-------|------|
| `/` | Landing page (marketing) |
| `/en/pricing` | Pricing page |
| `/en/features` | Features showcase |
| `/en/faq` | FAQ |
| `/en/privacy` | Privacy Policy |
| `/en/terms` | Terms of Service |
| `/{slug}/{locale}/[trackingCode]` | Client tracking page |

---

## 3. Authentication Flow

### Login
- **Fields**: Email, Password, Remember Me checkbox
- **Protection**: Cloudflare Turnstile CAPTCHA
- **Error messages**: "Invalid email or password"
- **Post-login**: Redirect to `/{locale}/dashboard`

### Registration
- **Fields**: Full Name, Email, Password, Confirm Password
- **Validation**:
  - Name required
  - Password min 6 characters
  - Password confirmation match
  - Email uniqueness check
- **Post-register**: Email verification link sent
- **Error**: "This email is already registered. Please login."

### Forgot Password
- Enter email -> reset link sent
- Redirect to `/en/reset-password` via link

### Reset Password
- New password + confirm password
- Password updated confirmation

### Session
- Next.js server-side session management
- Protected routes redirect to login

---

## 4. Sidebar Navigation

### Group: Operational
| Item | Route |
|------|-------|
| Dashboard | `/{locale}/dashboard` |
| Bookings | `/{locale}/bookings` |
| Calendar | `/{locale}/calendar` |
| Services / Packages | `/{locale}/services` |
| Team / Freelance | `/{locale}/team` |
| Booking Status | `/{locale}/status` |

### Group: Financial
| Item | Route |
|------|-------|
| Finance Summary | `/{locale}/finance` |
| Invoices & Settlement | `/{locale}/invoices` |
| Team Payments | `/{locale}/team-payments` |

### Group: Forms & Portals
| Item | Route |
|------|-------|
| Booking Form | `/{locale}/form-booking` |
| Settlement Form | `/{locale}/form-settlement` |
| Special Booking Form | `/{locale}/form-special-booking` |
| Freelance Portal | `/{locale}/freelance-portal` |

### Other
| Item | Route |
|------|-------|
| Settings | `/{locale}/settings` |
| Profile | `/{locale}/profile` |
| Tutorial | `/{locale}/tutorial` |
| Logout | (action) |

---

## 5. Public Pages (Landing)

### Landing Page (`/`)
- Hero section with CTA
- 6 Problem statements
- 12 Feature showcase
- 14 Screenshots
- 3 Workflow steps
- Pricing CTA
- FAQ section
- Social proof
- Footer with links
- Navigation: Home, Features, Pricing, FAQ, Sign In, Register

### Features Page (`/en/features`)
12 features displayed:
1. Booking & Session Management
2. Invoices, Deposits & Settlement
3. WhatsApp Templates & Follow-ups
4. Client Status Tracking
5. Google Calendar Sync
6. Online Booking Form
7. Special Booking Link
8. Google Drive & Delivery Links
9. Team & Freelancer Assignment
10. Bulk Excel Import
11. Services, Packages & Add-ons
12. Branding, Custom Domain & SEO

### Pricing Page (`/en/pricing`)
3 tiers:
| Feature | Basic (49k/mo) | Plus (149k/mo) | Pro (249k/mo) |
|---------|----------------|-----------------|---------------|
| Booking & session management | ✅ | ✅ | ✅ |
| Online booking form | ✅ | ✅ | ✅ |
| Custom booking form | ✅ | ✅ | ✅ |
| Invoices, deposits & settlement | ✅ | ✅ | ✅ |
| Settlement form | ✅ | ✅ | ✅ |
| WhatsApp templates | ✅ | ✅ | ✅ |
| Client status tracking | ✅ | ✅ | ✅ |
| Custom booking status | ✅ | ✅ | ✅ |
| Google Drive & result links | ✅ | ✅ | ✅ |
| Team & freelancer assignment | ✅ | ✅ | ✅ |
| Team/freelancer payments | ✅ | ✅ | ✅ |
| Standard finance summary | ✅ | ✅ | ✅ |
| Batch booking | ✅ | ✅ | ✅ |
| Google Calendar Sync | ✅ | ✅ | ✅ |
| Team/freelance portal | ✅ | ✅ | ✅ |
| Complete finance summary | ❌ | ✅ | ✅ |
| Client status kanban board | ❌ | ✅ | ✅ |
| Midtrans & DOKU Payment Gateway | ❌ | ✅ | ✅ |
| Auto Spreadsheet Sync | ❌ | ✅ | ✅ |
| Admin Role | ❌ | ❌ | ✅ |
| Multi Brand/Vendor (max 2) | ❌ | ❌ | ✅ |
| Rating & Review | ❌ | ❌ | ✅ |
| Automatic email updates | ❌ | ❌ | ✅ |
| AI Booking Assistant | ❌ | ❌ | ✅ |

Pricing periods: Monthly, 3-month (save), Yearly (2 months free)
Extra brand: +99k/month per additional brand
Mini Website: custom service add-on

### FAQ Page (`/en/faq`)
4 categories, 12 Q&A:
- **General**: What is Client Desk? Free? Who should use? Data safety? Getting started?
- **Features**: Main features? Multi-language? Mobile access?
- **Pricing**: Cost? Payment methods? Money-back guarantee?
- **Technical**: Need to install app?

---

## 6. Dashboard

### Stats Cards
- Today's summary
- Revenue metrics (pemasukan, pemasukan 30 hari, pemasukan bulanan)
- Revenue trend
- Booking counts
- Session info

### Sections
- Quick actions
- Today's bookings summary
- Revenue metrics
- Upcoming bookings
- Recent transactions
- Status indicators
- Calendar link

---

## 7. Bookings Management

### Bookings List (`/{locale}/bookings`)

#### Features
- **Filtering**: All event types, all freelancers, all statuses, date range
- **Sorting**: 7 sort options
- **Column management**: Show/hide columns
- **Search**: Client name, booking code
- **Actions per booking**:
  - View detail
  - Edit
  - Delete (with confirmation)
  - WhatsApp message
  - Google Calendar sync
  - Google Drive link
  - Copy template
  - Status change
  - Freelancer assignment

#### Table Columns (configurable)
- Booking code
- Client name
- Event type
- Session date
- Package name
- Freelancer assigned
- Status
- DP status
- Final payment status
- WhatsApp actions
- Google Calendar
- Google Drive

#### Bulk Actions
- Export to file
- Batch import (Excel)
- Delete selected

### Create Booking (`/{locale}/bookings/create`)

#### Form Fields
- Client name (with autocomplete)
- Client WhatsApp
- Client email
- Event type
- Package selection
- Add-on selection
- Session date & time
- Location
- Freelancer assignment
- Custom fields (admin-configurable)
- DP amount
- Notes

### Booking Detail (`/{locale}/bookings/[id]`)

#### Tabs
1. **Info** - Client info, session details, package
2. **Client Status** - Status tracking, client-facing updates
3. **Final Results** - Google Drive links, Fastpik links, file delivery
4. **Finance** - Payment status, invoices, settlement

#### Sections
- Client information
- Session details
- Package & add-ons
- Payment proofs (initial DP, final payment)
- Google Calendar sync
- Google Drive management
- Fastpik integration
- Settlement status
- WhatsApp messages (freelancer/client)
- Custom field values
- Deadline management
- File management

### Edit Booking (`/{locale}/bookings/[id]/edit`)
Same form as create, pre-filled with existing data.

---

## 8. Calendar

### View Modes
- Day (`hari`)
- Week (`minggu`)
- Month (`bulan`)
- Agenda

### Features
- Google Calendar sync (push/pull)
- Booking event display with status colors
- Navigation (next/previous)
- Status labels
- Connection management
- Click booking to view detail

---

## 9. Services / Packages

### Service Types
1. **Main Packages** - Primary service offerings
2. **Add-ons** - Additional items

### Fields
- Package name
- Price
- Description
- Duration
- Category
- Location (with copy/paste)
- Status (active/inactive/archived)

### Management
- CRUD operations
- Reorder/drag-and-drop
- Search
- Duplicate
- Delete with confirmation
- Category management

---

## 10. Team / Freelancers

### Fields
- Name
- Role (photographer, videographer, editor, etc.)
- WhatsApp number
- Tags (with colors)
- Status (active/inactive)

### Management
- CRUD operations
- Reorder/drag-and-drop
- Role color configuration
- Tag color configuration
- Column management
- Search
- Filter by role, status, tags

---

## 11. Finance

### Finance Summary (`/{locale}/finance`)

#### Metrics
- Total revenue (gross)
- Net revenue
- Outstanding balance
- Operating costs
- Monthly trend chart
- Top packages
- Payment sources breakdown

#### Filters
- Date range
- Payment status (lunas/belum lunas/DP dibayar/batal hangus/batal refund)
- Event type
- Freelancer

### Finance Dashboard

#### Charts & Metrics
- Monthly revenue chart
- Top packages ranking
- Payment source breakdown (bank, QRIS, cash, Midtrans)
- Outstanding balance tracking
- Period filtering

---

## 12. Invoices & Settlement

### Invoice Types
1. **DP Invoice** - Initial deposit invoice
2. **Final Invoice** - Final payment invoice

### Features
- Template copying between bookings
- DP/final payment marking
- WhatsApp invoice messages with variables:
  - `{bookingCode}`
  - `{clientName}`
  - `{packageName}`
  - `{amount}`
- Payment proof viewing
- Settlement links
- Print invoice (PDF)

### Invoice PDF
- Client details
- Service info
- Schedule
- Totals
- Payment status

### Operational Costs
- Edit operational costs
- Cost categories

---

## 13. Team Payments

### Features
- Payment amount tracking
- Paid/unpaid status
- Bulk operations

### Filters
- Booking status
- Event type
- Role
- Date range

### Sorting
- Multiple sort options

### Pricelist Integration
- Auto-calculation based on package prices

### Export
- Export to file

---

## 14. Client Status / Tracking

### Booking Status Management (`/{locale}/status`)
- Status labels configuration
- Tracking link management
- Print toggle
- Search

### Client Tracking Page (Public)
`/{slug}/{locale}/[trackingCode]`

#### Sections
- Booking status steps (progress indicator)
- Invoice display
- Settlement display
- File results (photos/videos)
- Fastpik info
- Photo/video links
- Deadline info
- Schedule info
- Queue position
- Payment status
- Download links
- Settlement banners

---

## 15. Booking Form Settings

### Configuration (`/{locale}/form-booking`)
- Greeting text
- QRIS image upload
- Terms & conditions editor
- Payment method configuration (Bank/QRIS/Cash)
- Form language
- Custom form builder
  - Section management
  - Field types: Text, Number, Checkbox, Dropdown, Long Text
  - Dividers
  - Drag-and-drop reorder
- URL management
- Reset to default

### URL Sharing
- Public booking form URL
- Copy to clipboard
- Custom slug option

---

## 16. Settlement Form Settings

### Configuration (`/{locale}/form-settlement`)
- Greeting text
- Bank account list
- QRIS image
- URL management

---

## 17. Special Booking Form

### Features (`/{locale}/form-special-booking`)
- Create special booking links
- Lock/unlock packages
- Lock/unlock add-ons
- Lock/unlock event types
- Discount configuration
- Accommodation settings
- Token management (one-time use)
- Link status (active/inactive)
- Edit/delete links

---

## 18. Freelance Portal

### Access
- Access code login (no full account needed)

### Sections
- Schedule calendar
- Payment summary
- Upload confirmation
- Client contact info
- Notes & files
- Navigation sections

### Features
- Sort/filter bookings
- Upload proof of work
- View assigned bookings
- Calendar view
- Payment tracking

---

## 19. Settings

### 12 Settings Sections

#### 1. General
- Studio name
- Logo upload
- Address
- Booking URL
- WhatsApp number

#### 2. Google Integration
- Google Calendar connection
- Google Drive connection
- Calendar format configuration

#### 3. Integrations
- Fastpik sync
- Telegram bot
- Midtrans (coming soon)
- DOKU (coming soon)

#### 4. Booking Status
- Status configuration (add/edit/reorder/delete)
- Trigger settings:
  - Trigger deadline
  - Trigger auto queue
  - Trigger DP verified
  - Trigger session time
- Custom event types

#### 5. Templates
- WhatsApp templates
- Invoice templates
- Template variables
- CRUD operations

#### 6. Booking List
- WhatsApp action configuration
- Table color settings

#### 7. Event Types
- Built-in event types
- Custom event types

#### 8. Finance
- Invoice accounts
- Operational costs configuration

#### 9. Freelance Portal
- Visibility settings

#### 10. SEO
- Meta title per page
- Meta description per page
- Keywords per page

#### 11. Fastpik
- Sync settings
- Presets
- Link display configuration

#### 12. Telegram Bot
- Chat ID
- Notification settings

---

## 20. Profile & Subscription

### Profile (`/{locale}/profile`)
- User name
- Email
- Photo upload
- Membership status
- Subscription management
- Password reset

### Subscription (`ProfilePackage`)
- Current package display
- Subscription history
- Plan changes
- Remaining credit
- Upgrade details

---

## 21. Onboarding Wizard

### 8-Step Setup
1. Profile setup
2. Studio settings
3. Services configuration
4. Team setup
5. Form booking customization
6. Booking status configuration
7. Settlement form setup
8. Google integration

### Features
- Overlay guide
- Review modal
- Tour steps with descriptions
- Skip option

---

## 22. Batch Import (Excel)

### Steps
1. **Upload** - Choose file or paste data
2. **Preview** - Validate and review
3. **Confirm** - Commit import

### Fields (30+)
- Client name
- Client WhatsApp
- Client email
- Event type
- Session date
- Package name
- DP paid
- Status
- Freelancer
- Location
- Notes
- And more...

### Validation
- Valid count
- Error count
- Warning count

### Commit
- Success summary
- Error details

---

## 23. Public Booking Form (Client-Facing)

### Multi-Step Form
1. **Client Info** - Name, WhatsApp, email
2. **Package & Add-ons** - Selection
3. **Summary** - Review booking details
4. **Payment Confirmation** - Upload proof

### Payment Methods
- Bank transfer
- QRIS
- Cash

### Features
- File upload for payment proof
- Terms & conditions
- University autocomplete
- Custom fields
- Success confirmation
- WhatsApp notification

---

## 24. Public Settlement Form (Client-Facing)

### Features
- Payment method selection
- File upload for proof
- Invoice display
- DP info
- Totals calculation
- Schedule display
- Success/error states

---

## 25. Client Tracking Page (Public)

### Sections
1. Booking status steps (progress bar)
2. Invoice display
3. Settlement display
4. File results (photos/videos)
5. Fastpik integration info
6. Photo/video delivery links
7. Deadline info
8. Schedule info
9. Queue position
10. Payment status
11. Download links

### Features
- Real-time status updates
- Settlement banners
- File delivery management

---

## 26. Pricing & Plans

### Plan Tiers
| Plan | Monthly | 3-Month | Yearly |
|------|---------|---------|--------|
| Basic | 49k | 129k | 489k |
| Plus | 149k | 399k | 1,489k |
| Pro | 249k | 699k | 2,489k |

### Plan Change Rules
- Upgrades: Immediate, remaining value converted to bonus time
- Renewals: Extends after current expiration
- Downgrades: Scheduled after current plan ends

### Add-ons
- Extra brand: +99k/month per brand (after 2)
- Mini Website: Custom service

### Payment Methods
- QRIS
- Midtrans
- DOKU

---

## 27. API Errors & Validation

### Error Categories (79 keys)
- Authentication: unauthorized, emailNotFound, invalidCredentials
- File operations: failedUploadFile, failedDeleteFile, maxFile5mb
- Booking: bookingNotFound, bookingCodeOrTrackingRequired
- Google: calendarNotConnected, driveNotConnected
- Payment proofs
- University
- Invoice
- QRIS
- Fastpik sync
- Captcha
- Validation errors

---

## 28. UI Components & Patterns

### Common UI Elements
- **Tables**: Configurable columns, sortable, filterable, paginated
- **Forms**: Multi-step, validation, file upload
- **Modals**: Confirmation dialogs, detail views
- **Toasts**: Success/error notifications
- **Dropdowns**: Language switcher, theme toggle, profile menu
- **Search**: Global search with autocomplete
- **Filters**: Date range, status, multi-select
- **Buttons**: Primary, secondary, destructive, ghost
- **Cards**: Stats, feature display, pricing
- **Tabs**: Multi-section detail views
- **Drag & Drop**: Reorder, column management
- **Calendar**: Date picker, event display

### Design System
- Radix UI primitives
- Tailwind CSS utility classes
- Responsive design (mobile-first)
- Dark mode support
- Custom CSS variables for tenant branding

### Component Architecture
- Server Components (RSC) for data fetching
- Client Components for interactivity
- Provider pattern (ThemeProvider, TenantProvider, NextIntlProvider)
- Error boundaries (ClientErrorObserver)
- Loading states (AppLoading)

---

## Coming Soon Features (Roadmap)
1. **Kanban Board** - Visual booking pipeline
2. **Midtrans Payment Gateway** - Online payments
3. **DOKU Payment Gateway** - Alternative payments
4. **Admin Roles** - Role-based access control
5. **Spreadsheet Sync** - Auto Google Sheets sync
6. **Mini Website** - Public vendor website
7. **Multi Brand/Vendor** - Manage multiple brands
8. **Rating & Review** - Client feedback system
9. **Automatic Email Updates** - Client notifications
10. **AI Booking Assistant** - AI-powered booking help

---

## Holiday Features
- **Global Holiday Announcement**: Eid holiday notice with date range and greeting

---

*Analysis completed on 2026-06-26*
*Total i18n keys: ~2,800+ across 58 namespaces*
*Total routes: 30+ pages*
