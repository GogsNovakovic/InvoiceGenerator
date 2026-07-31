"use client";

import Link from "next/link";
import {
  RiBankCardLine,
  RiLogoutBoxRLine,
  RiUserSettingsLine,
} from "@remixicon/react";

import { signOut } from "@/lib/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Identity and sign-out for the authenticated header.
 *
 * Lives in the header rather than the sidebar so it stays reachable when the
 * sidebar is collapsed to icons or hidden behind the mobile sheet.
 *
 * Sign out is offered two ways on purpose: a directly visible button (no
 * discovery required) and inside the account dropdown (the conventional
 * place, alongside Profile and Payments).
 */
export function UserMenu({ email }: { email: string }) {
  const initial = email.charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-1">
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <RiLogoutBoxRLine data-icon="inline-start" />
          Sign out
        </Button>
      </form>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Account menu"
            />
          }
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-xs font-normal text-muted-foreground">
              Signed in as
            </span>
            <span className="truncate">{email}</span>
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
          {/* A real form POST, so signing out still works before hydration. */}
          <form action={signOut}>
            <DropdownMenuItem
              variant="destructive"
              className="w-full"
              // Menu items default to a non-button element, so Base UI would
              // otherwise add synthetic keyboard handling on top of a real
              // <button> that already has it.
              nativeButton
              render={<button type="submit" />}
            >
              <RiLogoutBoxRLine />
              Sign out
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
