Task: Internal Task & Management Dashboard
Objective
Build a small internal management and task-tracking application that demonstrates your ability to develop both the frontend and backend, work with APIs, structure a project properly, and create reusable components and services.

The application should allow a team to create, manage, track, and view tasks from a central dashboard.




Required Tech Stack

Frontend
React

Vite

Tailwind CSS

Backend
Python + FastAPI

Database
PostgreSQL preferred

SQLite is acceptable for the assignment




Requirements

1. Dashboard
Create a dashboard showing:

Total Tasks

Pending Tasks

In Progress Tasks

Completed Tasks

Overdue Tasks

Tasks assigned to the current user

The dashboard should provide a quick overview of the team's work.




2. Task Management

Users should be able to:

Create a task

Edit a task

Delete a task

Assign a task to a team member

Set task priority

Set due date

Change task status

Add task description

Add notes/comments

Suggested Statuses
Pending

In Progress

Completed

Blocked

Suggested Priorities
Low

Medium

High

Urgent




3. Task List

Create a task-management page containing:

Task name

Assigned user

Priority

Status

Due date

Created date

Last updated date

Add:

Search

Status filter

Priority filter

Assignee filter

Sorting

Pagination

The filtering and pagination should preferably be handled through the backend API rather than loading all records into the frontend.




4. Backend API

Create REST APIs for the application.

Example endpoints:

GET    /api/tasks

GET    /api/tasks/{id}

POST   /api/tasks

PUT    /api/tasks/{id}

DELETE /api/tasks/{id}


GET    /api/users

POST   /api/users


GET    /api/dashboard


The task API should support parameters such as:

/api/tasks?status=in_progress

/api/tasks?priority=high

/api/tasks?assignee=12

/api/tasks?search=shopify

/api/tasks?page=1&limit=20


The API should include:

Request validation

Proper HTTP status codes

Error handling

Pagination

Filtering

Search

Database integration




5. Database

Create an appropriate database structure.

At minimum, include:

Users
id

name

email

role

created_at


Tasks
id

title

description

status

priority

assigned_to

due_date

created_at

updated_at


Comments / Notes
id

task_id

user_id

comment

created_at


You should decide the appropriate relationships between these tables.




6. Reusable Code

This is an important part of the assignment.

The application should be structured so that code can easily be reused in future internal applications.

For example:

Frontend
Create reusable components such as:

Button

Modal

Input

Select

Table

Pagination

StatusBadge

PriorityBadge

TaskCard


Backend
Separate reusable functionality such as:

API routes

Services

Database models

Repositories

Validation schemas

Authentication

Utilities


Do not put the entire application inside one or two large files.




7. API Integration

Create at least one external API integration.

You can use any publicly available API.

For example:

GET /api/external/users


Fetch data from an external API and display it somewhere in the application.

The implementation should demonstrate that you understand:

API requests

Authentication/API keys where applicable

Error handling

Timeouts

API response processing

Rate-limit considerations




8. Task Details Page

Clicking a task should open a detailed view.

The page should display:

Task information

Current status

Priority

Assigned user

Due date

Description

Comments/notes

Activity/history if implemented

Users should be able to update the task from this page.




9. UI/UX

The application should look like a real internal business tool rather than a basic coding assignment.

Focus on:

Clean layout

Responsive design

Easy navigation

Clear status indicators

Good spacing

Consistent components

Loading states

Empty states

Error states

Confirmation before destructive actions

Use Tailwind CSS for styling.




10. Project Structure

The project should have a clean structure.

For example:

project/

│

├── frontend/

│   ├── src/

│   │   ├── components/

│   │   ├── pages/

│   │   ├── services/

│   │   ├── hooks/

│   │   ├── utils/

│   │   └── App.jsx

│   └── ...

│

├── backend/

│   ├── routes/

│   ├── services/

│   ├── models/

│   ├── schemas/

│   ├── repositories/

│   ├── utils/

│   └── main.py

│

├── README.md

└── ...


The exact structure is up to you, but the application should clearly separate responsibilities.




Bonus Features

These are optional and can be implemented if time permits:

Login/authentication

Role-based access

Kanban task board

Drag-and-drop tasks

Task activity history

File attachments

Notifications

Dark mode

WebSocket/live task updates

Docker setup

Automated tests

API documentation

Background jobs

Audit logs




Deliverables

Submit:

1. Source Code
Provide the complete frontend and backend source code.

2. README
The README should contain:

Project overview

Tech stack

Setup instructions

Environment variables

Database setup

How to run frontend

How to run backend

API documentation

Any assumptions made

3. Database
Provide:

Database schema/migrations

Seed data if required