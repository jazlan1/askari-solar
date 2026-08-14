/**
 * Date and Time utilities locked to the Asia/Karachi (PKT, UTC+5) timezone.
 */

export function getPKTDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // Outputs: "YYYY-MM-DD"
}

export function getPKTTimeString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return formatter.format(date); // Outputs: "HH:MM:SS"
}

export function formatPKTDateDisplay(date: Date | string | null | undefined): string {
  if (!date) return "--";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "--";
  
  // Format as e.g. "09-Aug-2026"
  const day = d.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "2-digit" });
  const month = d.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", month: "short" });
  const year = d.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", year: "numeric" });
  return `${day}-${month}-${year}`;
}

export function formatPKTDateTimeDisplay(date: Date | string | null | undefined): string {
  if (!date) return "--";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "--";
  
  // Format as e.g. "09-Aug-2026 02:46 PM"
  const dateStr = formatPKTDateDisplay(d);
  const timeStr = d.toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr} ${timeStr}`;
}

export function format12HourTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "--";
  if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
  
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  
  if (isNaN(hours)) return timeStr;
  
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  return `${hours}:${minutes} ${ampm}`;
}
