import Link from "next/link";

import { DeleteClientDialog } from "@/components/clients/delete-client-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clientLabel, type ClientListItem } from "@/lib/data/clients";

export function ClientsTable({ clients }: { clients: ClientListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => {
          const label = clientLabel(client);

          return (
            <TableRow key={client.id} className="relative">
              <TableCell className="font-medium">
                {/* Stretched link: the whole row opens the edit form. */}
                <Link
                  href={`/clients/${client.id}/edit`}
                  className="absolute inset-0 rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                >
                  <span className="sr-only">Edit {label}</span>
                </Link>
                {client.full_name ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {client.company_name ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {client.email ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              {/* Above the stretched link so the trigger stays clickable. */}
              <TableCell className="relative z-10 text-right">
                <DeleteClientDialog clientId={client.id} clientLabel={label} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
