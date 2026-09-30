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
  TextField,
  Typography,
  Button,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { categoryLabel, formatMoney } from "../format";

type Claim = components["schemas"]["Claim"];

export function ClaimReviewPage(): ReactElement {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<Claim | null | undefined>(undefined);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void expenseApi
      .GET("/me/team/claims", { params: { query: { limit: 100 } } })
      .then(({ data }) => {
        if (!live || !data) return;
        setClaim(data.data.find((c) => c.id === claimId) ?? null);
      });
    return () => {
      live = false;
    };
  }, [claimId]);

  async function decide(outcome: "approved" | "rejected"): Promise<void> {
    if (!claimId) return;
    setError(null);
    setSubmitting(true);
    try {
      const { data, response } = await expenseApi.POST("/claims/{claimId}/decision", {
        params: { path: { claimId } },
        body: { outcome, comment },
      });
      if (!data) {
        setError(`Could not record the decision (${response.status}).`);
        return;
      }
      navigate("/approvals");
    } catch {
      setError("Could not record the decision.");
    } finally {
      setSubmitting(false);
    }
  }

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
          { key: "approvals", label: "Approval Queue", onClick: () => navigate("/approvals") },
          { key: "claim", label: claim.merchant },
        ]}
      />
      <PageTitle>
        <PageTitle.Header>{claim.merchant}</PageTitle.Header>
        <PageTitle.Actions>
          <Chip label={categoryLabel(claim.category)} color="info" size="small" />
        </PageTitle.Actions>
      </PageTitle>
      <Typography sx={{ mb: 2 }}>
        {claim.employeeId ?? "—"} — {formatMoney(claim.total, claim.currency)} — {claim.claimDate}
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

      {claim.note ? (
        <Typography variant="body2" sx={{ mb: 2 }}>
          Note: {claim.note}
        </Typography>
      ) : null}

      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        sx={{ mb: 2 }}
      />

      {error ? (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      <Stack direction="row" justifyContent="flex-end" spacing={2}>
        <Button
          variant="outlined"
          color="error"
          onClick={() => void decide("rejected")}
          disabled={submitting}
        >
          Reject
        </Button>
        <Button variant="contained" onClick={() => void decide("approved")} disabled={submitting}>
          Approve
        </Button>
      </Stack>
    </PageContent>
  );
}
