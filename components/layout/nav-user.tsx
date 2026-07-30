"use client";

import Link from "next/link";
import {
  RiBankCardLine,
  RiExpandUpDownLine,
  RiLogoutBoxRLine,
  RiUserSettingsLine,
} from "@remixicon/react";

import { signOut } from "@/lib/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser({ email }: { email: string }) {
  const { isMobile } = useSidebar();
  const initial = email.charAt(0).toUpperCase() || "?";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{email}</span>
              <span className="truncate text-xs text-muted-foreground">
                Signed in
              </span>
            </div>
            <RiExpandUpDownLine className="ml-auto size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
              {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings/profile" />}>
              <RiUserSettingsLine />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings/payments" />}>
              <RiBankCardLine />
              Payments
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* A form POST so signing out works even before hydration. */}
            <form action={signOut}>
              <DropdownMenuItem
                variant="destructive"
                className="w-full"
                render={<button type="submit" />}
              >
                <RiLogoutBoxRLine />
                Sign out
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
