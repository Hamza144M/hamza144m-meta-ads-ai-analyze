import type { Metadata } from "next";
import { PrintReport } from "./PrintReport";

export const metadata: Metadata = { title: "Print report", robots: { index: false } };

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PrintReport id={id} />;
}
