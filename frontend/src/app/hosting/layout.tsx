import { HostingShell } from "@/components/hosting/HostingShell";

export default function HostingLayout({ children }: { children: React.ReactNode }) {
  return <HostingShell>{children}</HostingShell>;
}
