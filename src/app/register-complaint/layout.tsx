import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register a Complaint — Askari Solar Energy",
  description:
    "Submit a complaint or service request to Askari Solar Energy. We will respond promptly to resolve your issue.",
};

export default function ComplaintsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
