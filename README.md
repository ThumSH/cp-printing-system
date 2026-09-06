# 🖨️ CP Printing Management System

### Full-Stack Desktop Business Management & Production Workflow System

CP Printing Management System is a custom-built desktop application designed to digitalize and centralize the operational workflow of a screen-printing / printing business.

The system replaces disconnected manual processes with a structured workflow connecting **development, administration, stores, production, quality control, auditing, invoicing, gate passes, reporting, and worker operations** within one application.

The solution uses a modern **React + TypeScript desktop interface powered by Tauri**, connected to a dedicated **ASP.NET Core REST API** and **SQL Server database**.

---

## 🎯 The Problem

Printing businesses often depend on a combination of:

* Paper-based records
* Spreadsheets
* Manual stock tracking
* Separate department records
* Physical approval processes
* Manual production tracking
* Disconnected quality-control records
* Repetitive data entry

As operations grow, keeping departments synchronized becomes increasingly difficult.

CP Printing Management System was built to bring these workflows into a **single structured software environment**.

---

# 💡 The Solution

The system provides different interfaces and permissions depending on each employee's role.

Each department can interact with the same centralized operational data while only accessing the functionality relevant to their responsibilities.

The application currently supports workflows across:

**Development → Approval → Stores → Production → Quality Control → Delivery / Gate Pass → Audit → Invoice → Reporting**

---

# ✨ Core Features

## 🔐 Authentication & Role-Based Access

The application provides authenticated access with role-specific permissions.

Current operational roles include:

* Super Admin
* Admin
* Developer
* Stores
* Quality Control
* Audit
* Gate Pass
* Worker / Operator

Protected routes ensure users only access the modules relevant to their responsibilities.

Authentication is handled through the backend using **JWT-based authentication** with secure password hashing.

---

## 📊 Management Dashboard

A centralized dashboard provides users with an overview of operational information and system activity.

The dashboard serves as the main entry point into the different business workflows.

---

## 🎨 Development Management

The development module handles pre-production workflows.

Functionality includes:

* Development submissions
* Submission searching
* Sample/style creation
* Sample/style searching
* Artwork and sample management
* Development record tracking
* Submission approval workflows

This allows product development information to move through the system before production begins.

---

## ✅ Administrative Approval

Administrators can review and manage operational records through dedicated administrative workflows.

Features include:

* Development approval
* Approval search
* User management
* Customer registration
* Colour master management
* Activity logs
* Administrative controls

---

## 👥 Customer Management

Customer information can be stored and managed centrally within the system.

This provides other modules with access to consistent customer data instead of maintaining separate department-level records.

---

## 🎨 Colour Master Management

The system contains a dedicated colour-management area for maintaining printing-related colour information used during development and production workflows.

---

## 📦 Inventory & Stores Management

The Stores module handles inventory movement and production-related stock activity.

Features include:

* Store-in records
* Store-in search
* Production stock handling
* Production record search
* Inventory tracking

This creates traceability between material movement and production activities.

---

## 🏭 Production Workflow

Production records are integrated with the wider operational system rather than being managed separately.

Production information can be associated with development, inventory, quality-control and reporting workflows.

---

## 🔍 Quality Control

Dedicated Quality Control workflows allow QC staff to record and manage production quality information.

Features include:

* CPI records
* CPI search
* Delivery tracking
* Delivery tracker search
* Production-related quality records

---

## 🚚 Delivery Tracking

Delivery information can be recorded and searched through a dedicated tracking workflow.

This helps maintain visibility after production and quality-control stages are completed.

---

## 📄 Gate Pass / Advice Notes

The Gate Pass module manages outgoing goods documentation.

Features include:

* Advice note creation
* Advice note search
* Gate pass workflow tracking

---

## 🧾 Invoice Management

The system includes dedicated tax invoice functionality available to authorized administrative users.

Features include:

* Invoice creation
* Invoice search
* Invoice detail views
* Restricted invoice access
* Super Admin invoice security controls

---

## 🔒 Invoice Security

Sensitive invoice functionality includes an additional Super Admin-level security area to provide greater control over financial operations.

---

## 🧑‍🏭 Worker & Operator Management

Operational workers can interact with dedicated production functionality.

Features include:

* Operator selection
* Daily output recording
* Downtime reporting
* Worker history

This makes shop-floor activity part of the wider digital workflow.

---

## 🕐 Activity Logging

Important application activity can be recorded and reviewed through an administrative activity log.

This improves operational traceability and accountability.

---

## 🔎 Audit Management

Dedicated auditing functionality allows authorized staff to record and review operational information.

Features include:

* Audit records
* Audit searching
* Historical operational review

---

## 📊 Reconciliation & Reporting

The system provides reporting functionality for reviewing operational data.

Current functionality includes:

* Reconciliation reports
* Reconciliation report search
* Operational reporting
* Historical data retrieval

---

# 🏗️ System Architecture

The application is separated into two main repositories.

```text
┌─────────────────────────────────────────────┐
│          CP Printing Desktop App            │
│                                             │
│ React + TypeScript + Tauri + Rust           │
│ Zustand + React Router + Tailwind CSS       │
└──────────────────────┬──────────────────────┘
                       │
                       │ REST API / JWT
                       │
                       ▼
┌─────────────────────────────────────────────┐
│            ASP.NET Core Backend             │
│                                             │
│ C# + .NET 9 + Controllers + Services        │
│ DTOs + Models + Entity Framework Core       │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                 SQL Server                  │
│                                             │
│      Application & Operational Data         │
└─────────────────────────────────────────────┘
```

---

# 🖥️ Desktop Application

The desktop application provides the user-facing interface used across the organization.

### Technologies

* React
* TypeScript
* Tauri 2
* Rust
* Vite
* React Router
* Zustand
* Tailwind CSS
* Framer Motion
* Lucide Icons

### Repository

👉 [CP Printing Desktop Application](https://github.com/ThumSH/cp-printing-system)

---

# ⚙️ Backend API

The backend provides the business logic, authentication, database access and REST endpoints used by the desktop application.

### Technologies

* C#
* ASP.NET Core
* .NET 9
* Entity Framework Core
* SQL Server
* JWT Authentication
* BCrypt
* REST APIs
* MVC-style separation using Controllers, Models, DTOs and Services

### Backend Areas

The API contains functionality for areas including:

* Authentication
* Users / Administration
* Customers
* Development
* Colour Management
* Inventory
* Quality Control
* Delivery Tracking
* Gate Passes
* Audit
* Activity Logs
* Workers / Operators
* Reconciliation
* Invoicing
* Invoice Security
* Dashboard data

### Repository

👉 [CP Printing Backend API](https://github.com/ThumSH/CpPrinting.Api)

---

# 🛠️ Technology Stack

| Layer            | Technologies             |
| ---------------- | ------------------------ |
| Desktop UI       | React, TypeScript        |
| Desktop Runtime  | Tauri, Rust              |
| State Management | Zustand                  |
| Routing          | React Router             |
| Styling          | Tailwind CSS             |
| Animation        | Framer Motion            |
| Backend          | C#, ASP.NET Core, .NET 9 |
| API              | REST                     |
| Authentication   | JWT, BCrypt              |
| ORM              | Entity Framework Core    |
| Database         | Microsoft SQL Server     |
| Build Tools      | Vite                     |

---

# 🔄 Example Business Workflow

A simplified workflow through the application may look like:

```text
Customer
   ↓
Development Submission
   ↓
Sample / Style Development
   ↓
Administrative Approval
   ↓
Stores / Inventory
   ↓
Production
   ↓
Quality Control
   ↓
Delivery Tracking
   ↓
Gate Pass / Advice Note
   ↓
Invoice
   ↓
Audit & Reporting
```

Each stage is handled through dedicated application modules while sharing centralized business data.

---

# 👤 Role-Based Workflow

```text
Super Admin
    └── High-level system & invoice security

Admin
    ├── Approvals
    ├── Users
    ├── Customers
    ├── Colours
    ├── Invoices
    └── Activity Logs

Developer
    ├── Development Records
    ├── Samples
    └── Submissions

Stores
    ├── Store-In
    └── Production Inventory

QC
    ├── CPI
    └── Delivery Tracking

Audit
    └── Audit Records

Gate Pass
    └── Advice Notes

Worker / Operator
    ├── Daily Output
    ├── Downtime
    └── Work History
```

---

# 📸 Screenshots

> Screenshots and workflow demonstrations will be added here.

1. Login Screen
   <img width="1920" height="956" alt="image" src="https://github.com/user-attachments/assets/9c316d98-a554-4566-a1c9-79c8bf5281a7" />

3. Main Dashboard
   <img width="1920" height="1025" alt="image" src="https://github.com/user-attachments/assets/6877d6d0-12e9-43fd-b5e0-fd323232f511" />

5. Development Module
   <img width="1920" height="1018" alt="image" src="https://github.com/user-attachments/assets/fb3524dc-a371-40f0-a888-87553fd37dfb" />

7. Inventory / Stores Module
   <img width="1920" height="1012" alt="image" src="https://github.com/user-attachments/assets/a6b6bc59-b10c-4bb2-a31d-fbdc70aa0a48" />

9. Quality Control Module
    <img width="1920" height="1011" alt="image" src="https://github.com/user-attachments/assets/bf84f30d-2925-4525-8214-13a60f5509b0" />

10. User Management
    <img width="1542" height="974" alt="image" src="https://github.com/user-attachments/assets/049c775c-68df-4108-96f4-692e782f50f4" />

11. Worker Daily Output
    <img width="1920" height="996" alt="image" src="https://github.com/user-attachments/assets/62e8ca44-bc0a-4f20-9f96-6cf106bfdf0c" />

12. Activity Log
    <img width="1920" height="1014" alt="image" src="https://github.com/user-attachments/assets/7321a1b1-f84b-4a67-8667-4a08d8680c4d" />


---

# 🔐 Security

The system includes:

* JWT-based authentication
* Password hashing using BCrypt
* Protected frontend routes
* Role-based frontend authorization
* Backend authentication middleware
* Restricted administrative functionality
* Dedicated Super Admin functionality
* Controlled invoice access

---

# 🚀 Project Goals

The project was designed around several core objectives:

* Reduce reliance on paper-based processes
* Centralize operational data
* Improve communication between departments
* Create better workflow traceability
* Reduce duplicate data entry
* Improve production visibility
* Provide structured reporting
* Digitize internal business processes

---

# 📈 Future Improvements

Potential future development includes:

* More advanced analytics
* Additional production reporting
* Automated notifications
* Improved inventory forecasting
* Expanded audit reporting
* Automated backups
* Additional role permissions
* Cloud synchronization options
* Additional workflow automation

---

# 👨‍💻 Development

This project demonstrates full-stack development across:

* Desktop software development
* Modern React architecture
* REST API development
* C# / ASP.NET Core backend development
* Relational database design
* Authentication and authorization
* Role-based systems
* Business process modelling
* Production workflow development
* Cross-department software architecture

---

# 📂 Repositories

### Desktop Application

🔗 https://github.com/ThumSH/cp-printing-system

### Backend API

🔗 https://github.com/ThumSH/CpPrinting.Api

---

## 📌 Project Status

**Active Development**

The core system and major operational modules are implemented, while additional improvements and features continue to be developed.

---

## 👨‍💻 Developer

**Sithum Hemash**

Full-Stack Developer & Software Engineering Undergraduate

[GitHub](https://github.com/ThumSH)

---

> Built to turn complex printing-business workflows into one structured digital system.
