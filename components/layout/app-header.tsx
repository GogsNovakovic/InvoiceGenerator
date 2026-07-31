"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { UserMenu } from "@/components/layout/user-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { breadcrumbTrail } from "@/lib/navigation";

/**
 * The authenticated header. It carries what is true on every screen; anything
 * specific to one screen belongs in that page's <PageHeader> instead.
 *
 * Regions, left to right:
 *
 *   1. sidebar trigger      always present, collapses the nav on desktop and
 *                           opens the sheet on mobile
 *   2. breadcrumbs          derived from lib/navigation.ts — a new screen gets
 *                           its trail by registering there, not by editing here
 *   3. utility slot         marked below; global, screen-independent controls
 *                           land here (see the note)
 *   4. user menu            identity and sign out
 *
 * The utility slot is deliberately empty for now. Candidates as the app grows:
 * global search, unpaid-invoice notifications, a theme toggle. Each is a
 * component dropped into that flex row — the header itself does not change
 * shape, and nothing needs to move to make room.
 */
export function AppHeader({ email }: { email: string }) {
  const pathname = usePathname();
  const trail = breadcrumbTrail(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      {trail.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {trail.map((crumb) => (
              <Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {crumb.isCurrent ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink render={<Link href={crumb.href} />}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!crumb.isCurrent && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Utility slot — global controls go here. See the note above. */}
      <div className="ml-auto flex items-center gap-1" />

      <UserMenu email={email} />
    </header>
  );
}
