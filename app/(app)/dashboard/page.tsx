import type { Metadata } from "next";
import Link from "next/link";
import { RiAddLine, RiFileList3Line } from "@remixicon/react";

import { InvoicesTable } from "@/components/invoices/invoices-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireUser } from "@/lib/auth";
import { getDashboardSummary, type CurrencyTotal } from "@/lib/data/dashboard";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Amounts are grouped by currency and never summed across them (docs/DB.md §7),
 * so a tile can carry more than one line.
 */
function Amounts({ totals }: { totals: CurrencyTotal[] }) {
  if (totals.length === 0) {
    return <p className="font-heading text-2xl font-semibold">—</p>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {totals.map((total) => (
        <p
          key={total.currency}
          className="font-heading text-2xl font-semibold tabular-nums"
        >
          {formatCents(total.totalCents, total.currency)}
        </p>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const summary = await getDashboardSummary(user.id);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${user.email}.`}
        actions={
          <Button nativeButton={false} render={<Link href="/invoices/new" />}>
            <RiAddLine data-icon="inline-start" />
            New invoice
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Outstanding</CardDescription>
          </CardHeader>
          <CardContent>
            <Amounts totals={summary.outstanding} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Paid this month</CardDescription>
          </CardHeader>
          <CardContent>
            <Amounts totals={summary.paidThisMonth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Unpaid invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {summary.unpaidCount}
            </p>
            {summary.overdueCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 -ml-2"
                nativeButton={false}
                render={<Link href="/invoices?status=overdue" />}
              >
                {summary.overdueCount} overdue
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent invoices</CardTitle>
          <CardDescription>The last five you created.</CardDescription>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/invoices" />}
            >
              View all
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {summary.recent.length > 0 ? (
            <InvoicesTable invoices={summary.recent} />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiFileList3Line />
                </EmptyMedia>
                <EmptyTitle>No invoices yet</EmptyTitle>
                <EmptyDescription>
                  Your outstanding and paid totals fill in as soon as you bill
                  someone.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  nativeButton={false}
                  render={<Link href="/invoices/new" />}
                >
                  <RiAddLine data-icon="inline-start" />
                  New invoice
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </CardContent>
      </Card>
    </>
  );
}
