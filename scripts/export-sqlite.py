import sqlite3
import json
import os

db_path = os.path.join("prisma", "dev.db")
export_path = os.path.join("prisma", "db-export.json")

if not os.path.exists(db_path):
    print("Error: prisma/dev.db not found!")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

data = {}

tables = [
    "User",
    "FileItem",
    "Product",
    "Lead",
    "Customer",
    "Project",
    "SupportTicket",
    "WorkSchedule",
    "Announcement",
    "Attendance"
]

for table in tables:
    try:
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        data[table] = [dict(row) for row in rows]
        print(f"Exported {len(rows)} rows from {table}")
    except Exception as e:
        print(f"Skipping table {table} or error: {e}")

with open(export_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Successfully exported database to {export_path}")
conn.close()
