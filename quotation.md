# ITR Manager — Front-End Project Quotation

**Project:** ITR Manager Web Application — Front-End
**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Docker
**Engagement window:** 1 May 2026 → 13 June 2026 (~6.3 weeks)
**Tooling:** AI-accelerated development (Claude) for code generation, with senior engineer integration, review, debugging & polish
**Scope:** Front-end only (backend integration via existing API contracts)

---

## 1. Effort Summary (from version control)

| Metric | Value |
|---|---|
| Total commits | ~88 |
| Active commit days | 25 |
| Calendar duration | ~44 days |
| Frontend code shipped | ~17,000 LoC across 148 TS/TSX/JS files |
| Page routes built | 50 routes across 5 role portals + auth + landing |
| Reusable components | 40+ (shadcn/ui) + 8 shared app components |
| Net additions (insertions − deletions) | ~46,000 net lines added |

---

## 2. Feature-by-Feature Breakdown

Pricing reflects AI-accelerated implementation with senior engineering oversight: prompt design, integration, debugging, accessibility/responsive QA, and production hardening.

| # | Feature / Module | Complexity | Effort (days) | Amount (INR) |
|---|---|---|---:|---:|
| 1 | **Project foundation** — Next 14 App Router, TypeScript config, Tailwind, shadcn/ui setup, Docker, `entrypoint.sh`, middleware, `[[...path]]` API proxy | Medium | 2.0 | 30,000 |
| 2 | **Landing site** — Hero, Features, HowItWorks, RoleCards, CTA Banner, Splash, Navbar, Footer, sitemap, privacy policy | Medium | 3.0 | 40,000 |
| 3 | **Auth flow** — Login, Register, Reset Password, Recovery Codes UI, AuthHeader, session/middleware guards | Medium-High | 3.0 | 45,000 |
| 4 | **Shared component library** — AppShell, NotificationBell, FileViewer, FilingProgressBar, EmptyState, StatusBadge, GlobalFooter | Medium | 2.0 | 30,000 |
| 5 | **API & auth integration layer** — `lib/api.ts`, `lib/auth.ts`, error handling, token refresh, `[[...path]]` proxy | Medium-High | 2.0 | 35,000 |
| 6 | **Client Portal (6 pages)** — dashboard, documents, filings list, filing detail, notifications, onboarding wizard, profile | High | 4.0 | 55,000 |
| 7 | **Executive Portal (6 pages)** — dashboard, clients list, client detail, action items, notifications, profile | Medium-High | 3.0 | 40,000 |
| 8 | **Manager Portal (8 pages)** — dashboard, clients (+detail), executives, document-types, form-builder consumer, action items, notifications, profile | High | 4.0 | 55,000 |
| 9 | **Partner Portal (15 pages — largest)** — dashboard, clients (+detail), managers, executives + tags (location/manager/partner summaries), document-types, form-builder, email-config, recovery-codes, feedback, audit log, action items, notifications, profile | Very High | 6.0 | 90,000 |
| 10 | **Summary Portal** — summary dashboard + leaderboard | Medium | 1.5 | 20,000 |
| 11 | **Dynamic Form Builder** — drag-and-drop schema builder shared by Manager & Partner | Very High | 3.0 | 50,000 |
| 12 | **Notification system** — bell dropdown, real-time updates, per-role notification pages | Medium-High | 1.5 | 22,000 |
| 13 | **Responsive design, accessibility, theming, UX polish** — across 50 routes | Medium | 2.0 | 25,000 |
| 14 | **Bug fixes, integration testing, deployment & handover** | Medium | 2.0 | 25,000 |
|   | **Subtotal** |   | **39.0 days** | **₹5,62,000** |

---

## 3. Pricing Summary

| Item | Amount (INR) |
|---|---:|
| Subtotal (feature delivery) | 5,62,000 |
| Goodwill / loyalty discount (~5%) | − 27,000 |
| **Project Total (Front-End only)** | **₹5,35,000** |

> Approx. **USD equivalent: ~$6,400** (at ₹83.5/USD; final FX at invoice date).

**Effective blended rate:** ~₹13,700/day for AI-accelerated senior front-end engineering, which is **substantially below** the standard market rate of ₹20,000–₹30,000/day for an equivalent greenfield Next.js build, in recognition of:

- Use of AI tooling (Claude) to accelerate scaffolding
- Existing client relationship
- Backend being out of scope (no API design effort billed)

---

## 4. Why This Is Fair Value

| If built without AI (manual greenfield) | This quote |
|---|---|
| 50 routes × ~1.5 days = 75 days | 39 days |
| ₹20,000/day × 75 = **₹15,00,000** | **₹5,35,000** |
| 12-week timeline | 6.3-week timeline |

The client receives a production-grade, multi-portal, role-based application **at ~35% of standard market cost**, delivered in **half the time**.

---

## 5. What's Included

- All source code, MIT-style transferable rights to client
- Dockerfile + `entrypoint.sh` for containerised deployment
- Tailwind theme + shadcn/ui component library, fully customised
- Mobile-responsive design across all 50 routes
- Privacy policy + sitemap + SEO basics
- Handover documentation in `README.md`
- Bug-fix support window: **15 days post-delivery**

## 6. What's Excluded (Quote Separately)

- Backend / API development
- Mobile native apps (iOS / Android)
- Penetration testing & security audit
- SLA-based production support beyond 15-day window
- Infrastructure / hosting costs (AWS, Vercel, etc.)
- Content writing, copywriting, brand assets

---

## 7. Payment Terms

| Milestone | % | Amount (INR) |
|---|---:|---:|
| Already paid (advance during May) | per receipts | as recorded |
| On delivery / final hand-over (13 Jun 2026) | 100% balance | balance to clear ₹5,35,000 total |

- Payment via UPI / NEFT / IMPS to registered account
- Invoices raised against this quotation
- GST extra at applicable rates if claimed under GSTIN

---

## 8. Quotation Validity

This quotation is valid for **15 days** from the date of issue.

---

**Prepared:** 13 June 2026
**For:** ITR Manager — Client
**Engagement type:** Fixed-price, deliverable-based
