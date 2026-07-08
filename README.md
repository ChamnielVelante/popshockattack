# MotoTrack

**Motorcycle Suspension Service and Operation Management System for Pops Shock Attack in San Pedro, Laguna.**

MotoTrack replaces the shop's paper-based process with a single web platform: digital service intake, a live five-stage workflow board, automatic warranty tracking, consumables inventory with auto-deduction, sales and expense analytics, and a customer portal where riders track their motorcycle in real time.

A capstone project for the degree of Bachelor of Science in Information Technology, College of Computing Studies, Pamantasan ng Cabuyao.

**Researchers:** Jan Brian M. Laderas · Josh Russelle R. Pamintuan · Prince Paolo T. Panganiban · Chamniel F. Velante

---

## Features

| Role | Capabilities |
|---|---|
| **Owner (admin)** | Business dashboard (sales, expenses, net profit, revenue trend, brand analytics, mechanic back-job rates), consumables management, sales reports with date filter and printing, user account management |
| **Staff** | Register intakes, move units through the Intake → Disassembly → Tuning → QA → Release workflow, log tuning specs with automatic billing and inventory deduction, assign mechanics, approve customer registrations |
| **Customer** | Live progress tracker for their own motorcycles, digital service history and tuning setup records, computed warranty status, printable receipt |

Cross-cutting: Sanctum token authentication, bcrypt-hashed passwords, server-enforced role-based access control, server-side bill computation, stage-change notifications to the owner and the affected customer.

## Tech Stack

- **Backend:** PHP 8.3 · Laravel 12 · Laravel Sanctum
- **Database:** SQLite (development) / MySQL-ready via `DB_CONNECTION`
- **Frontend:** HTML, CSS, vanilla JavaScript (modular), Chart.js

## Getting Started

```bash
composer install
cp .env.example .env          # Windows: copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Open <http://127.0.0.1:8000> — the root URL redirects to the app.

Optional: load realistic demo data (jobs across all stages, three months of sales, expenses) for presentations:

```bash
php artisan db:seed --class=DemoSeeder
```

### Demo Accounts

| Role | Username | Password |
|---|---|---|
| Owner | `admin` | `admin123` |
| Staff | `staff` | `staff123` |
| Customer | `juan_rider` | `pass123` |

## Project Structure

```
app/
├── Enums/               JobStage, UserRole
├── Http/
│   ├── Controllers/Api/ One controller per resource (Auth, User, ServiceJob, InventoryItem, Expense, Notification)
│   ├── Middleware/      EnsureUserHasRole (role:admin,staff route middleware)
│   └── Requests/        Form Request validation, one class per write endpoint
├── Models/              AppUser, ServiceJob, InventoryItem, Expense
├── Notifications/       JobStageChanged (database channel)
└── Services/            BillingService, InventoryDeductionService

public/
├── index.html           Single-page frontend shell + modals
├── style.css
└── js/                  state → ui → api → auth → views/* → notifications → actions → receipt → main

routes/api.php           Route map grouped by role
database/                Migrations, seeders (incl. opt-in DemoSeeder)
tests/Feature/           Authentication, RBAC, workflow, billing & notifications
```

## Running Tests

```bash
php artisan test
```

Feature tests cover authentication and token revocation, role-based access control, the job workflow (intake → specs → QA → release), server-side bill computation (tampered client totals are ignored), inventory auto-deduction, warranty activation, and notification dispatch.

## API Overview

All endpoints are under `/api` and return JSON. Protected routes require `Authorization: Bearer <token>` obtained from `POST /api/login`.

| Area | Endpoints |
|---|---|
| Auth | `POST /register`, `POST /login`, `POST /logout` |
| Jobs (staff/admin) | `GET/POST /jobs`, `PUT /jobs/{job}/stage`, `PUT /jobs/{job}/specs`, `PUT /jobs/{job}/mechanic`, `DELETE /jobs/{job}` |
| Customer portal | `GET /my-jobs` |
| Inventory | `GET /inventory`, `GET /inventory/low-stock` (staff/admin) · `POST /inventory`, `PUT /inventory/{item}`, `PUT /inventory/{item}/add-stock`, `DELETE /inventory/{item}` (admin) |
| Expenses (staff/admin) | `GET/POST /expenses` |
| Users | `GET /users`, `PUT /users/{user}/approve` (staff/admin) · `POST /users`, `PUT /users/{user}`, `DELETE /users/{user}` (admin) |
| Notifications | `GET /notifications`, `PUT /notifications/mark-read` |
