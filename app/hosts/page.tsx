import { permanentRedirect } from "next/navigation";

// The old Hosts page is now For businesses (/business). Old links keep working.
export default function Hosts() {
  permanentRedirect("/business");
}
