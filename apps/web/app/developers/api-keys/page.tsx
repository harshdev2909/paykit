import { redirect } from "next/navigation";

export default function LegacyDevelopersApiKeysPage() {
  redirect("/dashboard/api-keys");
}
