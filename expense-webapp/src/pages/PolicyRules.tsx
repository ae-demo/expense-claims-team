import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Chip, ListingTable, PageContent, PageTitle } from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { categoryLabel, formatMoney } from "../format";

type PolicyRule = components["schemas"]["PolicyRule"];

export function PolicyRulesPage(): ReactElement {
  const navigate = useNavigate();
  const [rules, setRules] = useState<PolicyRule[] | null>(null);

  useEffect(() => {
    let live = true;
    void expenseApi.GET("/policy-rules", {}).then(({ data }) => {
      if (live && data) setRules(data.data);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Policy Rules</PageTitle.Header>
        <PageTitle.Actions>
          <Button variant="outlined" onClick={() => navigate("/policy-rules/describe")}>
            Describe a rule
          </Button>
          <Button variant="contained" onClick={() => navigate("/policy-rules/new")}>
            Add rule
          </Button>
        </PageTitle.Actions>
      </PageTitle>

      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Category</ListingTable.Cell>
              <ListingTable.Cell>Monthly cap</ListingTable.Cell>
              <ListingTable.Cell>Description</ListingTable.Cell>
              <ListingTable.Cell>Active</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {(rules ?? []).map((rule) => (
              <ListingTable.Row
                key={rule.id}
                clickable
                onClick={() => navigate(`/policy-rules/${rule.id}`)}
              >
                <ListingTable.Cell>{categoryLabel(rule.category)}</ListingTable.Cell>
                <ListingTable.Cell>{formatMoney(rule.monthlyCapAmount, "LKR")}</ListingTable.Cell>
                <ListingTable.Cell>{rule.description ?? "—"}</ListingTable.Cell>
                <ListingTable.Cell>
                  <Chip
                    label={rule.active ? "Yes" : "No"}
                    color={rule.active ? "success" : "default"}
                    size="small"
                  />
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
        {rules !== null && rules.length === 0 ? (
          <ListingTable.EmptyState title="No policy rules yet" description="Add one to get started." />
        ) : null}
      </ListingTable.Container>
    </PageContent>
  );
}
