import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppBreadcrumbs,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import { CATEGORIES, categoryLabel, type Category } from "../format";

export function EditPolicyRulePage(): ReactElement {
  const { ruleId } = useParams<{ ruleId: string }>();
  const navigate = useNavigate();
  const isNew = ruleId === "new" || !ruleId;

  const [category, setCategory] = useState<Category>("meals");
  const [monthlyCap, setMonthlyCap] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    let live = true;
    void expenseApi.GET("/policy-rules", {}).then(({ data }) => {
      if (!live || !data) return;
      const rule = data.data.find((r) => r.id === ruleId);
      if (rule) {
        setCategory(rule.category);
        setMonthlyCap(String(rule.monthlyCapAmount));
        setDescription(rule.description ?? "");
        setActive(rule.active);
      }
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [isNew, ruleId]);

  async function onSave(): Promise<void> {
    const monthlyCapAmount = Number(monthlyCap);
    if (Number.isNaN(monthlyCapAmount)) {
      setError("Enter a valid monthly cap amount.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const body = { category, monthlyCapAmount, description: description || undefined, active };
      const { data, response } = isNew
        ? await expenseApi.POST("/policy-rules", { body })
        : await expenseApi.PATCH("/policy-rules/{ruleId}", {
            params: { path: { ruleId: ruleId! } },
            body,
          });
      if (!data) {
        setError(`Could not save the rule (${response.status}).`);
        return;
      }
      navigate("/policy-rules");
    } catch {
      setError("Could not save the rule.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <PageContent>
        <Typography>Loading…</Typography>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "policy-rules", label: "Policy Rules", onClick: () => navigate("/policy-rules") },
          { key: "rule", label: isNew ? "Add rule" : categoryLabel(category) },
        ]}
      />
      <PageTitle>
        <PageTitle.Header>Edit Policy Rule</PageTitle.Header>
      </PageTitle>

      <Stack spacing={2} sx={{ maxWidth: 480 }}>
        <TextField
          select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {categoryLabel(c)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Monthly cap"
          placeholder="e.g. 20000"
          value={monthlyCap}
          onChange={(e) => setMonthlyCap(e.target.value)}
        />
        <TextField
          label="Description"
          placeholder="e.g. Team outings and meals"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <FormControlLabel
          control={<Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} />}
          label="Active"
        />

        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : null}

        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button variant="outlined" onClick={() => navigate("/policy-rules")}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void onSave()} disabled={saving}>
            Save rule
          </Button>
        </Stack>
      </Stack>
    </PageContent>
  );
}
