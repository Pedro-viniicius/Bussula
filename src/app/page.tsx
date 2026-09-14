import { redirect } from "next/navigation";

// The bare domain is what people type by hand; send them to the current event.
export default function Home() {
  redirect(`/f/${process.env.NEXT_PUBLIC_EVENTO_PADRAO ?? "fiat19"}`);
}
