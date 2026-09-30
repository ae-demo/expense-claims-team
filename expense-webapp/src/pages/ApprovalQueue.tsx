import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chip,
  Grid,
  ListingTable,
  MenuItem,
  PageContent,
  PageTitle,
  StatCard,
  TextField,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { categoryLabel, formatMoney } from "../format";

type Claim = components["schemas"]["Claim"];

export function ApprovalQueuePage(): ReactElement {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [team, setTeam] = useState("all");

  useEffect(() => {
    let live = true;
    void expenseApi
      .GET("/me/team/claims", { params: { query: { limit: 100 } } })
      .then(({ data }) => {
        if (live && data) setClaims(data.data);
      });
    return () => {
      live = false;
    };
  }, []);

  const flaggedCount = useMemo(
    () => (claims ?? []).filter((c) => c.flags && c.flags.length > 0).length,
    [claims],
  );

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Approval Queue</PageTitle.Header>
        <PageTitle.Actions>
          <TextField select label="Team" value={team} onChange={(e) => setTeam(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="all">All</MenuItem>
          </TextField>
        </PageTitle.Actions>
      </PageTitle>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatCard label="Pending" value={claims?.length ?? 0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatCard label="Flagged" value={flaggedCount} />
        </Grid>
      </Grid>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Employee</ListingTable.Cell>
              <ListingTable.Cell>Merchant</ListingTable.Cell>
              <ListingTable.Cell>Total</ListingTable.Cell>
              <ListingTable.Cell>Category</ListingTable.Cell>
              <ListingTable.Cell>Flag</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(claims ?? []).map((claim) => (
              <ListingTable.Row
                key={claim.id}
                clickable
                onClick={() => navigate(`/approvals/${claim.id}`)}
              >
                <ListingTable.Cell>{claim.employeeId ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>{claim.merchant}</ListingTable.Cell>
                <ListingTable.Cell>{formatMoney(claim.total, claim.currency)}</ListingTable.Cell>
                <ListingTable.Cell>{categoryLabel(claim.category)}</ListingTable.Cell>
                <ListingTable.Cell>
                  {claim.flags && claim.flags.length > 0 ? (
                    <Chip label={claim.flags[0].reason} color="warning" size="small" />
                  ) : (
                    "—"
                  )}
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {claims !== null && claims.length === 0 ? (
          <ListingTable.EmptyState
            title="Nothing pending"
            description="Your team's pending claims will show up here."
          />
        ) : null}
      </ListingTable.Container>
    </PageContent>
  );
}
