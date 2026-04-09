# Journal Project Overview


## Overview
A simple Spring Boot journal app for writing, editing, and managing personal notes.

## Core Features
- User registration and login
- Secure note access per user
- Dashboard with collapsible sidebar
- Autosave while typing
- Note create, update, delete
- Pagination for note lists
- Responsive UI for desktop and mobile

## Functionality
The application currently supports user registration, login, and secure note management.  
Users can create, edit, autosave, browse, and delete notes from a responsive dashboard with a collapsible sidebar.

## Scope
The current scope of the project is a personal journal MVP focused on:
- authentication and access control
- private note ownership
- a clean writing dashboard
- responsive UI for desktop and mobile

It is intended as a functional foundation for future security improvements, richer note features, and deployment.

## Tech Stack
- Java 21
- Spring Boot
- Spring MVC + Thymeleaf
- Spring Security
- Spring Data JPA
- H2 Database
- HTML, CSS, Vanilla JavaScript (Rest endpoints are in place and will migrate to React once DB is migrated)

## Limitations
At the moment, the project still has a few limitations:
- it uses an in-memory `H2` database, so data is not yet production-ready
- `CSRF` is currently disabled
- there is no search, tagging, or archive system yet
- testing and deployment setup are still minimal
- the frontend is server-rendered with Thymeleaf and not yet migrated to a larger frontend framework


## Project Structure
```text
src/main/java/com/dioneo/journal/
├── config/              # security configuration
├── controllers/         # MVC page controllers
├── rest_controllers/    # REST endpoints
├── dto/                 # request models
├── entities/            # JPA entities
├── repositories/        # data access layer
└── service/             # business logic

src/main/resources/
├── templates/           # Thymeleaf views
├── static/css/          # stylesheets
├── static/js/           # frontend scripts
└── application.properties
```

## Main Pages
- `login.html` — sign in page
- `register.html` — account creation page
- `dashboard.html` — note editor and sidebar navigation


# Project Future Plans
1. Security
- [X] user registration and login
- [X] password hashing with BCrypt
- [X] route protection with Spring Security
- [X] user-specific note ownership/access
- [X] static asset access configured correctly
- [ ] enable CSRF protection
- [ ] tighten authorization rules
- [ ] validate/sanitize note input
- [ ] add password rules and account protections
- [ ] move from in-memory DB to persistent PostgreSQL/MySQL

2. Product features
- [X] account creation and authentication flow
- [X] responsive dashboard UI
- [X] collapsible sidebar navigation
- [X] create, edit, autosave, and delete notes
- [X] pagination for notes
- [X] styled login and register pages
- [X] note length limits and live feedback
- [ ] search and filter notes
- [ ] tags / categories
- [ ] note pinning / favorites
- [ ] rich text or markdown support
- [ ] note archive / restore
- [ ] profile/settings page

3. Reliability and deployment
- [X] backend validation for note size limits
- [X] autosave feedback and error handling in the UI
- [ ] add proper tests for auth and note flows
- [ ] utilize the RestAPI and use a reliable Frontend framework
- [ ] improve error handling and user feedback
- [ ] add Docker support
- [ ] deploy to a cloud platform
- [ ] add logging and monitoring
