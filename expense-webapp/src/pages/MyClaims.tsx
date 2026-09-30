import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Chip, ListingTable, PageContent, PageTitle, Tab, Tabs } from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { Can } from "../authz/gates";
import { categoryLabel, formatMoney, statusColor, statusLabel } from "../format";

type Claim = components["schemas"]["Claim"];

const TABS = ["all", "submitted", "approved", "rejected"] as const;
type TabValue = (typeof TABS)[number];

export function MyClaimsPage(): ReactElement {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [tab, setTab] = useState<TabValue>("all");

  useEffect(() => {
    let live = true;
    void expenseApi.GET("/me/claims", { params: { query: { limit: 100 } } }).then(({ data }) => {
      if (live && data) setClaims(data.data);
    });
    return () => {
      live = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!claims) return [];
    if (tab === "all") return claims;
    return claims.filter((c) => c.status === tab);
  }, [claims, tab]);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My Claims</PageTitle.Header>
        <PageTitle.Actions>
          <Can op="POST /me/claims">
            <Button variant="contained" onClick={() => navigate("/claims/new")}>
              New claim
            </Button>
          </Can>
        </PageTitle.Actions>
      </PageTitle>

      <Tabs value={tab} onChange={(_, v) => setTab(v as TabValue)} sx={{ mb: 2 }}>
        <Tab label="All" value="all" />
        <Tab label="Submitted" value="submitted" />
        <Tab label="Approved" value="approved" />
        <Tab label="Rejected" value="rejected" />
      </Tabs>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Merchant</ListingTable.Cell>
              <ListingTable.Cell>Date</ListingTable.Cell>
              <ListingTable.Cell>Total</ListingTable.Cell>
              <ListingTable.Cell>Category</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {rows.map((claim) => (
              <ListingTable.Row
                key={claim.id}
                clickable
                onClick={() => navigate(`/claims/${claim.id}`)}
              >
                <ListingTable.Cell>{claim.merchant}</ListingTable.Cell>
                <ListingTable.Cell>{claim.claimDate}</ListingTable.Cell>
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
          <ListingTable.EmptyState
            title="No claims yet"
            description="Claims you submit will show up here."
          />
        ) : null}
      </ListingTable.Container>
    </PageContent>
  );
}
