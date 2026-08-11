# Chithramaya

Chithramaya is a full-stack academy management application for managing students, branches, batches, class schedules, attendance, fees, leave requests, announcements, chat, and reports in one place.

## ✨ Features

- 🔐 Admin and Student authentication
- 🏢 Branch and Batch management
- 👨‍🎓 Student registration and profile management
- 📅 Multiple recurring schedules for each batch
- 🔄 Automatic class-session generation from weekly schedules
- 🗓️ Calendar with regular, holiday, and compensation classes
- ✅ Attendance with draft and final submission
- 📊 Automatic monthly attendance percentage and star indicators
- 🏖️ Prior leave requests linked with attendance
- 💰 Fee submission, approval, and receipt management
- 📢 Branch and Batch-based announcements
- 💬 Batch-based chat and broadcasts
- 📥 Monthly attendance reports with Excel/JSON export
- 🔎 Branch → Batch dependent filtering
- 📱 Progressive Web App (PWA) support

## 📊 Attendance

Attendance is calculated automatically from actual class sessions and attendance records.

- Present and Leave are recorded
- Absence is inferred when no attendance record exists
- Holiday classes are excluded
- Compensation classes are included
- Monthly attendance is calculated automatically
- Attendance star indicators are generated from the calculated percentage
- Monthly reports are generated from live database data

## 📅 Scheduling

Each batch can have multiple recurring schedules.

Example:

```text
Monday     2:00 PM - 4:00 PM
Wednesday  10:00 AM - 12:00 PM
Friday     3:00 PM - 5:00 PM


These schedules automatically generate actual class sessions used by the Calendar and Attendance modules.

🗄️ Database

The application uses 11 main tables:

users
branches
batches
students
weekly_patterns
class_sessions
attendance
leave_requests
fees
announcements
chat_messages

Attendance percentages and star indicators are calculated dynamically and are not manually stored.

🛠️ Technology Stack
Backend
Python 3
FastAPI
SQLAlchemy 2.0
SQLite
Pydantic v2
Uvicorn
python-multipart
openpyxl
Python zoneinfo
Session-based authentication with HttpOnly cookies
Frontend
React 18
Vite
React Router v6
Material UI (MUI) v6
Axios
CSS
React Context / Hooks
Other
Custom-built calendar UI
Polling-based chat and notifications
Local file storage for uploaded photos and receipts
No WebSockets
No external authentication library
No task queue or background scheduler
No Tailwind CSS
🚀 Deployment

The project is prepared for:

GitHub → Vercel → Production Web Application → PWA

The PWA allows users to install Chithramaya on supported Android and iPhone devices from the deployed web application.

👨‍💻 Development

Chithramaya was developed from the original project idea and requirements with AI-assisted development using Claude. The current repository contains the latest frontend and backend implementation, including the completed modifications, corrections, scheduling improvements, attendance/reporting features, and other implemented functionality.

📌 Status

The core Chithramaya application is developed and functional. The project is being prepared for production deployment through GitHub and Vercel, followed by PWA installation support for Android and iPhone.

📄 License

No open-source license is currently specified.


This version is better for your GitHub repository because it tells someone **what Chithramaya does, what technologies it uses, how scheduling/attendance work, and what the deployment target is**, without turning the README into a long technical document.
Available at your primary URL https://chithramaya-school-of-arts-1.onrender.com
https://vercel.com/amru569s-projects/chithramaya-school-of-arts/3jW5c8o9zsf8LitXYbkugdVK9BjS
https://chithramaya-school-of-arts.vercel.app/
