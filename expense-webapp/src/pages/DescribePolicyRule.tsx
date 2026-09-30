import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBreadcrumbs,
  Button,
  Card,
  CardContent,
  CardHeader,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { describePolicyRule } from "../agents/policyRuleAgent";

export function DescribePolicyRulePage(): ReactElement {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [parsed, setParsed] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onParseAndSave(): Promise<void> {
    if (!message.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const response = await describePolicyRule(message, conversationId);
      setConversationId(response.conversationId);
      setParsed(response.text);
    } catch {
      setError("Could not parse and save this rule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "policy-rules", label: "Policy Rules", onClick: () => navigate("/policy-rules") },
          { key: "describe", label: "Describe a rule" },
        ]}
      />
      <PageTitle>
        <PageTitle.Header>Describe a Rule</PageTitle.Header>
      </PageTitle>
      <Typography sx={{ mb: 2 }}>
        Type the rule the way you'd say it — for example, "cap meals at 25,000 LKR a month".
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={3}
        placeholder='e.g. Cap meals at 25,000 LKR a month'
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        sx={{ mb: 2 }}
      />

      {error ? (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mb: 3 }}>
        <Button variant="outlined" onClick={() => navigate("/policy-rules")}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void onParseAndSave()} disabled={saving}>
          Parse and save
        </Button>
      </Stack>

      {parsed ? (
        <Card>
          <CardHeader title="Parsed rule" />
          <CardContent>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {parsed}
            </Typography>
          </CardContent>
        </Card>
      ) : null}
    </PageContent>
  );
}
