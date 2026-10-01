import { permanentRedirect } from "next/navigation";

// The old Hosts page is now Partners. Old links keep working.
export default function Hosts() {
  permanentRedirect("/partners");
}
