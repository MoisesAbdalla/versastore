# Versa Store — e-commerce built end to end with Spec-Driven Development

A complete fashion e-commerce (storefront + admin) built from scratch **entirely under
Spec-Driven Development** with **Spec Kit + Claude Code**: every feature goes through
`specify → plan → tasks → implement`, and no phase starts before the previous one is validated.

**Stack:** React 19 · Vite · Material UI · React Router · Firebase (Auth, Cloud Firestore, Hosting) · Cloudinary

## By the numbers

- **15 feature specs** in [`specs/`](specs/), **~280 traceable tasks**
- The admin dashboard module alone: **7 specification artifacts and 61 tasks**
- **16 composite Firestore indexes**, versioned and deployed before the queries that depend on them
- Specs are versioned next to the code, and commits separate spec artifacts from implementation
  phases — an auditable history of *why* each decision was made, not just what changed

## What's built

- **Storefront:** catalog and prefix search on normalized fields · cursor pagination with state
  preserved in the URL · product variations as a cartesian product of attributes · persistent
  per-user cart · product reviews
- **Customer account:** Google sign-in · addresses with ViaCEP lookup · versioned LGPD terms acceptance
- **Checkout:** CPF validation · regional shipping table and in-store pickup · discount coupons ·
  a `PaymentProvider` abstraction so a payment gateway plugs in without rewriting the checkout flow
- **Admin:** sales dashboard backed by denormalized aggregates · extended reports (KPIs, by
  category, product mix, coupons) · product management with soft delete
- **Data integrity & security:** atomic stock transactions · Firestore Security Rules with explicit
  protection against privilege escalation · role-based access and protected admin routes
- **Launch:** SEO and legal pages

## Spec-Driven Development in practice

Each folder in [`specs/`](specs/) holds the artifacts of one feature — spec, plan, research, data
model, contracts, checklists and `tasks.md`. Read them in order to follow how the product grew:

`001` home redesign → `003` admin dashboard → `005` storefront → `007` customer account →
`008` attribute variations → `009` checkout → `011` shipping → `013` coupons →
`015` reviews → `017` launch, SEO & legal → `018` extended reports

See also: [planner-speckit vs planner-gsd](https://github.com/MoisesAbdalla/planner-speckit) —
the same app built with two AI development methodologies.

## Running

```bash
cd frontend
npm install
npm run dev
```

Firebase project config lives in `frontend/src/firebase/config.js` (the web API key is public by
design; data access is enforced by `firestore.rules`).
