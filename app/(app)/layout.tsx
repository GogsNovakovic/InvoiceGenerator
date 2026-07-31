import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Layouts do not re-render on client-side navigation, so this is the shell's
  // check, not the app's. Every page and action calls requireUser() again.
  const user = await requireUser();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader email={user.email ?? ""} />
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
