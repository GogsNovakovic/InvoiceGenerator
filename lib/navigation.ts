import {
  RiBankCardLine,
  RiDashboardLine,
  RiFileList3Line,
  RiGroupLine,
  RiUserSettingsLine,
  type RemixiconComponentType,
} from "@remixicon/react";

/**
 * The single source of truth for authenticated routes.
 *
 * The sidebar and the header breadcrumbs both read from this list, so adding a
 * screen means adding one entry here — never editing two components that then
 * drift apart.
 *
 * - `section` present  → the route appears in that sidebar group.
 * - `section` absent   → routed and breadcrumbed, but not a sidebar destination
 *                        (detail and form screens).
 * - `parent`           → the breadcrumb trail walks up through these.
 * - `[param]`          → a dynamic segment; it matches any single value.
 */
export type NavSection = "main" | "settings";

export type RouteEntry = {
  pattern: string;
  label: string;
  icon?: RemixiconComponentType;
  section?: NavSection;
  parent?: string;
};

export const ROUTES: RouteEntry[] = [
  {
    pattern: "/dashboard",
    label: "Dashboard",
    icon: RiDashboardLine,
    section: "main",
  },

  {
    pattern: "/invoices",
    label: "Invoices",
    icon: RiFileList3Line,
    section: "main",
  },
  { pattern: "/invoices/new", label: "New invoice", parent: "/invoices" },
  { pattern: "/invoices/[id]", label: "Invoice", parent: "/invoices" },
  {
    pattern: "/invoices/[id]/edit",
    label: "Edit",
    parent: "/invoices/[id]",
  },

  { pattern: "/clients", label: "Clients", icon: RiGroupLine, section: "main" },
  { pattern: "/clients/new", label: "New client", parent: "/clients" },
  { pattern: "/clients/[id]/edit", label: "Edit client", parent: "/clients" },

  {
    pattern: "/settings/profile",
    label: "Profile",
    icon: RiUserSettingsLine,
    section: "settings",
  },
  {
    pattern: "/settings/payments",
    label: "Payments",
    icon: RiBankCardLine,
    section: "settings",
  },
];

export const SIDEBAR_SECTIONS: { id: NavSection; label?: string }[] = [
  { id: "main" },
  { id: "settings", label: "Settings" },
];

export function sidebarItems(section: NavSection) {
  return ROUTES.filter((route) => route.section === section);
}

function segmentsOf(path: string) {
  return path.split("/").filter(Boolean);
}

function matches(pattern: string, pathname: string) {
  const patternParts = segmentsOf(pattern);
  const pathParts = segmentsOf(pathname);

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  return patternParts.every(
    (part, index) =>
      (part.startsWith("[") && part.endsWith("]")) || part === pathParts[index],
  );
}

/**
 * Rebuild a concrete href for a pattern by borrowing the dynamic values out of
 * the current pathname, so `/invoices/[id]` links to the invoice being viewed.
 */
function hrefFor(pattern: string, pathname: string) {
  const pathParts = segmentsOf(pathname);
  const resolved = segmentsOf(pattern).map((part, index) =>
    part.startsWith("[") && part.endsWith("]") ? pathParts[index] : part,
  );

  return `/${resolved.join("/")}`;
}

export type Crumb = { href: string; label: string; isCurrent: boolean };

/**
 * The breadcrumb trail for a pathname, root-first. Unknown paths return an
 * empty trail rather than guessing, so a missing registry entry is visible
 * instead of rendering a wrong-looking crumb.
 */
export function breadcrumbTrail(pathname: string): Crumb[] {
  const entry = ROUTES.find((route) => matches(route.pattern, pathname));

  if (!entry) {
    return [];
  }

  const trail: Crumb[] = [];

  for (
    let current: RouteEntry | undefined = entry;
    current;
    current = current.parent
      ? ROUTES.find((route) => route.pattern === current!.parent)
      : undefined
  ) {
    trail.unshift({
      href: hrefFor(current.pattern, pathname),
      label: current.label,
      isCurrent: current.pattern === entry.pattern,
    });
  }

  return trail;
}

export function isActiveRoute(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
