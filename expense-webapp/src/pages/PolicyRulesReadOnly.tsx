import { useEffect, useState, type ReactElement } from "react";
import { ListingTable, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { categoryLabel, formatMoney } from "../format";

type PolicyRule = components["schemas"]["PolicyRule"];

export function PolicyRulesReadOnlyPage(): ReactElement {
  const [rules, setRules] = useState<PolicyRule[] | null>(null);

  useEffect(() => {
    let live = true;
    void expenseApi.GET("/policy-rules", {}).then(({ data }) => {
      if (live && data) setRules(data.data.filter((r) => r.active));
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Policy Rules</PageTitle.Header>
      </PageTitle>
      <Typography sx={{ mb: 2 }}>
        These limits are maintained by Finance and apply to every claim.
      </Typography>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Category</ListingTable.Cell>
              <ListingTable.Cell>Monthly cap</ListingTable.Cell>
              <ListingTable.Cell>Description</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(rules ?? []).map((rule) => (
              <ListingTable.Row key={rule.id}>
                <ListingTable.Cell>{categoryLabel(rule.category)}</ListingTable.Cell>
                <ListingTable.Cell>{formatMoney(rule.monthlyCapAmount, "LKR")}</ListingTable.Cell>
                <ListingTable.Cell>{rule.description ?? "—"}</ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {rules !== null && rules.length === 0 ? (
          <ListingTable.EmptyState title="No active policy rules" />
        ) : null}
      </ListingTable.Container>
    </PageContent>
  );
}
