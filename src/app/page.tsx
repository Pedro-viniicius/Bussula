import { redirect } from "next/navigation";

// The bare domain is what people type by hand; show them the landing page.
// NFC cards and QR codes point straight to /f/<slug> and never pass through here.
export default function Home() {
  redirect("/lp");
}
