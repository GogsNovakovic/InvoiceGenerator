import "server-only";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { formatDate } from "@/lib/dates";
import {
  formatCentsPlain,
  formatPercent,
  formatQuantity,
} from "@/lib/money";
import { partyLabel, type InvoicePartyView, type InvoiceView } from "@/lib/invoice-view";
import { PDF_FONT_FAMILY, registerPdfFonts } from "@/lib/pdf/fonts";

registerPdfFonts();

/**
 * The fixed invoice layout from docs/PRD.md §8, in the order the PRD lists:
 * header → sender and client blocks → invoice meta → line items → totals →
 * comments.
 *
 * Pagination is left to react-pdf's own primitives rather than manual page
 * maths: `fixed` on the table header repeats it, `fixed` on the footer stamps
 * every page, and `wrap={false}` plus `minPresenceAhead` keep the totals block
 * attached to the end of the table.
 */

const COLORS = {
  text: "#18181b",
  muted: "#71717a",
  line: "#e4e4e7",
  soft: "#f4f4f5",
};

const styles = StyleSheet.create({
  /**
   * `lineHeight` is deliberately NOT set on the page.
   *
   * In @react-pdf/renderer 4.5.1 a `lineHeight` inherited from the Page makes
   * every dynamic node — a `<Text render={…} />`, which is how the `Page X of
   * Y` footer works — lay out to zero height and silently disappear. Line
   * height is therefore applied on the individual text styles that want it,
   * all of which are below the footer in the tree.
   */
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9,
    color: COLORS.text,
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
  },

  title: { fontSize: 22, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.2 },
  number: { fontSize: 11, fontWeight: 600, marginTop: 4, lineHeight: 1.2 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerMeta: { alignItems: "flex-end" },
  metaRow: { flexDirection: "row", marginTop: 2 },
  metaLabel: { color: COLORS.muted, marginRight: 8 },
  metaValue: { fontWeight: 600 },

  parties: { flexDirection: "row", gap: 24, marginBottom: 24 },
  party: { flex: 1 },
  partyHeading: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: COLORS.muted,
    marginBottom: 4,
  },
  partyName: { fontWeight: 600 },
  partyLine: { color: COLORS.muted, marginTop: 1 },

  table: { marginBottom: 12 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.text,
    paddingBottom: 4,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingVertical: 5,
  },
  colDescription: { flex: 1, paddingRight: 8 },
  colQuantity: { width: 56, textAlign: "right" },
  colPrice: { width: 72, textAlign: "right" },
  colVat: { width: 48, textAlign: "right" },
  colAmount: { width: 76, textAlign: "right" },
  headCell: { fontSize: 8, fontWeight: 700, color: COLORS.muted },

  totals: { flexDirection: "row", justifyContent: "flex-end" },
  totalsBlock: { width: 236 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsLabel: { color: COLORS.muted },
  totalsValue: { fontWeight: 600 },
  totalsDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.text,
    marginTop: 4,
    paddingTop: 6,
  },
  grandTotal: { fontSize: 12, fontWeight: 700 },

  comments: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 10,
  },
  commentsHeading: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: COLORS.muted,
    marginBottom: 4,
  },
  commentsBody: { color: COLORS.muted, lineHeight: 1.4 },

  footerRule: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  footerNumber: {
    position: "absolute",
    bottom: 26,
    left: 40,
    fontSize: 8,
    color: COLORS.muted,
  },
  footerPages: {
    position: "absolute",
    bottom: 26,
    // Anchored on both sides rather than only the right: an absolutely
    // positioned Text with a single horizontal anchor resolves to zero width
    // here and never paints.
    left: 40,
    right: 40,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "right",
  },
});

function PartyBlock({
  heading,
  party,
}: {
  heading: string;
  party: InvoicePartyView;
}) {
  // Company is only repeated when it is not already doing duty as the name.
  const company = party.fullName ? party.companyName : null;

  return (
    <View style={styles.party}>
      <Text style={styles.partyHeading}>{heading}</Text>
      <Text style={styles.partyName}>{partyLabel(party)}</Text>
      {company && <Text style={styles.partyLine}>{company}</Text>}
      {party.address?.split("\n").map((line, index) => (
        <Text key={index} style={styles.partyLine}>
          {line}
        </Text>
      ))}
      {party.email && <Text style={styles.partyLine}>{party.email}</Text>}
      {party.website && <Text style={styles.partyLine}>{party.website}</Text>}
      {party.vatId && (
        <Text style={styles.partyLine}>VAT ID: {party.vatId}</Text>
      )}
    </View>
  );
}

export function InvoiceDocument({ invoice }: { invoice: InvoiceView }) {
  const { currency } = invoice;

  return (
    <Document
      title={`Invoice ${invoice.invoiceNumber}`}
      author={partyLabel(invoice.sender)}
      language="en"
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.number}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.headerMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice date</Text>
              <Text style={styles.metaValue}>
                {formatDate(invoice.invoiceDate)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due date</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Currency</Text>
              <Text style={styles.metaValue}>{currency}</Text>
            </View>
          </View>
        </View>

        <View style={styles.parties}>
          <PartyBlock heading="FROM" party={invoice.sender} />
          <PartyBlock heading="BILL TO" party={invoice.client} />
        </View>

        <View style={styles.table}>
          {/* `fixed` repeats this row at the top of every page. */}
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.colDescription, styles.headCell]}>
              DESCRIPTION
            </Text>
            <Text style={[styles.colQuantity, styles.headCell]}>QTY</Text>
            <Text style={[styles.colPrice, styles.headCell]}>PRICE</Text>
            <Text style={[styles.colVat, styles.headCell]}>VAT</Text>
            <Text style={[styles.colAmount, styles.headCell]}>AMOUNT</Text>
          </View>

          {invoice.lines.map((line, index) => (
            <View
              key={line.id}
              style={styles.row}
              wrap={false}
              // Keeps the last few rows from landing alone at a page break,
              // which is what would orphan the totals block overleaf.
              minPresenceAhead={
                index >= invoice.lines.length - 3 ? 90 : undefined
              }
            >
              <Text style={styles.colDescription}>{line.description}</Text>
              <Text style={styles.colQuantity}>
                {formatQuantity(line.quantity, line.unitType)}
              </Text>
              <Text style={styles.colPrice}>
                {formatCentsPlain(line.unitPriceCents)}
              </Text>
              <Text style={styles.colVat}>
                {formatPercent(line.vatRateBps)}
              </Text>
              <Text style={styles.colAmount}>
                {formatCentsPlain(line.lineSubtotalCents)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsBlock} wrap={false}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>
                {formatCentsPlain(invoice.subtotalCents)} {currency}
              </Text>
            </View>

            {invoice.vatBreakdown.map((row) => (
              <View key={row.vatRateBps} style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  VAT {formatPercent(row.vatRateBps)}
                </Text>
                <Text style={styles.totalsValue}>
                  {formatCentsPlain(row.taxCents)} {currency}
                </Text>
              </View>
            ))}

            <View style={[styles.totalsRow, styles.totalsDivider]}>
              <Text style={styles.grandTotal}>Total</Text>
              <Text style={styles.grandTotal}>
                {formatCentsPlain(invoice.totalCents)} {currency}
              </Text>
            </View>
          </View>
        </View>

        {invoice.comments && (
          <View style={styles.comments} wrap={false}>
            <Text style={styles.commentsHeading}>COMMENTS</Text>
            <Text style={styles.commentsBody}>{invoice.comments}</Text>
          </View>
        )}

        {/* Each piece is positioned and `fixed` in its own right: react-pdf
            repeats a fixed element on every page, and a `render` callback is
            only re-evaluated per page when it sits on a fixed element itself. */}
        <View style={styles.footerRule} fixed />
        <Text style={styles.footerNumber} fixed>
          {invoice.invoiceNumber}
        </Text>
        <Text
          style={styles.footerPages}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
