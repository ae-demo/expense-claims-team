import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppBreadcrumbs,
  Card,
  CardContent,
  CardHeader,
  Chip,
  PageContent,
  PageTitle,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { categoryLabel, formatMoney, statusColor, statusLabel } from "../format";

type Claim = components["schemas"]["Claim"];

export function ClaimDetailPage(): ReactElement {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<Claim | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    void expenseApi.GET("/me/claims", { params: { query: { limit: 100 } } }).then(({ data }) => {
      if (!live || !data) return;
      setClaim(data.data.find((c) => c.id === claimId) ?? null);
    });
    return () => {
      live = false;
    };
  }, [claimId]);

  if (claim === undefined) {
    return (
      <PageContent>
        <Typography>Loading…</Typography>
      </PageContent>
    );
  }
  if (claim === null) {
    return (
      <PageContent>
        <Typography>This claim is not in your reach.</Typography>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "my-claims", label: "My Claims", onClick: () => navigate("/claims") },
          { key: "claim", label: claim.merchant },
        ]}
      />
      <PageTitle>
        <PageTitle.Header>{claim.merchant}</PageTitle.Header>
      </PageTitle>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Chip label={statusLabel(claim.status)} color={statusColor(claim.status)} size="small" />
      </Stack>
      <Typography sx={{ mb: 2 }}>
        {formatMoney(claim.total, claim.currency)} — {categoryLabel(claim.category)} —{" "}
        {claim.claimDate}
      </Typography>

      {claim.flags && claim.flags.length > 0 ? (
        <Card sx={{ mb: 2 }}>
          <CardHeader title="Policy flag" action={<Chip label="Over monthly cap" color="warning" size="small" />} />
          <CardContent>
            {claim.flags.map((flag) => (
              <Typography key={flag.id} variant="body2">
                {flag.reason}
              </Typography>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {claim.note ? <Typography variant="body2">Note: {claim.note}</Typography> : null}
    </PageContent>
  );
}
