"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiFileList3Line } from "@remixicon/react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SIDEBAR_SECTIONS, isActiveRoute, sidebarItems } from "@/lib/navigation";

/**
 * Destinations only. Identity and sign-out live in the header's <UserMenu>, so
 * they stay reachable when this is collapsed to icons or closed on mobile.
 *
 * The entries come from lib/navigation.ts — add a screen there and it appears
 * here and in the breadcrumbs at once.
 */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <RiFileList3Line className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-heading font-semibold">
                  Invoice Generator
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {SIDEBAR_SECTIONS.map((section) => (
          <SidebarGroup key={section.id}>
            {section.label && (
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarItems(section.id).map((item) => (
                  <SidebarMenuItem key={item.pattern}>
                    <SidebarMenuButton
                      isActive={isActiveRoute(item.pattern, pathname)}
                      tooltip={item.label}
                      render={<Link href={item.pattern} />}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
