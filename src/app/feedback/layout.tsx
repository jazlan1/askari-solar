import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Feedback Form — Askari Solar Energy",
  description:
    "We value your experience! Submit your service feedback to help us improve our services.",
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
