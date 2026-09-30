import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Chip,
  ListingTable,
  MenuItem,
  PageContent,
  PageTitle,
  SearchBar,
  TextField,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { categoryLabel, formatMoney, statusColor, statusLabel } from "../format";

type Claim = components["schemas"]["Claim"];
type Status = Claim["status"];

const STATUSES: readonly Status[] = ["submitted", "approved", "rejected"];

export function AllClaimsPage(): ReactElement {
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");

  useEffect(() => {
    let live = true;
    void expenseApi
      .GET("/claims", { params: { query: { limit: 100, status: status === "all" ? undefined : status } } })
      .then(({ data }) => {
        if (live && data) setClaims(data.data);
      });
    return () => {
      live = false;
    };
  }, [status]);

  const rows = useMemo(() => {
    if (!claims) return [];
    const term = search.trim().toLowerCase();
    if (!term) return claims;
    return claims.filter(
      (c) =>
        c.merchant.toLowerCase().includes(term) ||
        (c.employeeId ?? "").toLowerCase().includes(term),
    );
  }, [claims, search]);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>All Claims</PageTitle.Header>
        <PageTitle.Actions>
          <SearchBar
            placeholder="Search by employee or merchant"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | "all")}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {statusLabel(s)}
              </MenuItem>
            ))}
          </TextField>
        </PageTitle.Actions>
      </PageTitle>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Employee</ListingTable.Cell>
              <ListingTable.Cell>Merchant</ListingTable.Cell>
              <ListingTable.Cell>Total</ListingTable.Cell>
              <ListingTable.Cell>Category</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {rows.map((claim) => (
              <ListingTable.Row key={claim.id}>
                <ListingTable.Cell>{claim.employeeId ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>{claim.merchant}</ListingTable.Cell>
                <ListingTable.Cell>{formatMoney(claim.total, claim.currency)}</ListingTable.Cell>
                <ListingTable.Cell>{categoryLabel(claim.category)}</ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip
                    label={statusLabel(claim.status)}
                    color={statusColor(claim.status)}
                    size="small"
                  />
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {claims !== null && rows.length === 0 ? (
          <ListingTable.EmptyState title="No claims found" description="Try a different search or status." />
        ) : null}
      </ListingTable.Container>
    </PageContent>
  );
}
