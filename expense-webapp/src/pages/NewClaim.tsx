import { useEffect, useRef, useState, type ChangeEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBreadcrumbs,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { Upload } from "@wso2/oxygen-ui-icons-react";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import {
  fileToAttachment,
  readReceipt,
  RECEIPT_ATTACHMENT_TYPES,
  RECEIPT_MAX_FILE_SIZE_MB,
} from "../agents/receiptAgent";
import { CATEGORIES, categoryLabel, type Category } from "../format";

type Flag = components["schemas"]["Flag"];

export function NewClaimPage(): ReactElement {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [merchant, setMerchant] = useState("");
  const [claimDate, setClaimDate] = useState("");
  const [total, setTotal] = useState("");
  const [category, setCategory] = useState<Category>("meals");
  const [note, setNote] = useState("");

  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!RECEIPT_ATTACHMENT_TYPES.includes(file.type as (typeof RECEIPT_ATTACHMENT_TYPES)[number])) {
      setReadError(`${file.name}: unsupported file type ${file.type || "unknown"}.`);
      return;
    }
    if (file.size > RECEIPT_MAX_FILE_SIZE_MB * 1024 * 1024) {
      setReadError(`${file.name}: larger than ${RECEIPT_MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    setReadError(null);
    setReading(true);
    setReceiptPreview(URL.createObjectURL(file));
    try {
      const attachment = await fileToAttachment(file);
      const response = await readReceipt(attachment);
      parseReceiptText(response.text);
    } catch (err) {
      setReadError(err instanceof Error ? err.message : "Could not read this receipt.");
    } finally {
      setReading(false);
    }
  }

  function parseReceiptText(text: string): void {
    const get = (label: string): string | undefined =>
      text
        .split(/\n/)
        .map((line) => line.trim())
        .find((line) => line.toLowerCase().startsWith(label.toLowerCase()))
        ?.split(":")
        .slice(1)
        .join(":")
        .trim();

    const merchantValue = get("merchant");
    const dateValue = get("date");
    const totalValue = get("total");
    const categoryValue = get("category");

    if (merchantValue) setMerchant(merchantValue);
    if (dateValue) setClaimDate(dateValue);
    if (totalValue) setTotal(totalValue.replace(/[^0-9.]/g, ""));
    if (categoryValue) {
      const normalized = categoryValue.toLowerCase().replace(/\s+/g, "-");
      const match = CATEGORIES.find((c) => c === normalized);
      if (match) setCategory(match);
    }
  }

  // Live policy check: re-checks whenever the fields it needs are all filled.
  useEffect(() => {
    const totalNumber = Number(total);
    if (!claimDate || !category || !total || Number.isNaN(totalNumber)) {
      setFlags(null);
      return;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      void expenseApi
        .POST("/me/claims/policy-check", {
          body: { claimDate, total: totalNumber, category },
        })
        .then(({ data }) => {
          if (live && data) setFlags(data.flags);
        });
    }, 400);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [claimDate, total, category]);

  async function onSubmit(): Promise<void> {
    setSubmitError(null);
    const totalNumber = Number(total);
    if (!merchant || !claimDate || !total || Number.isNaN(totalNumber)) {
      setSubmitError("Fill in merchant, date and total before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, response } = await expenseApi.POST("/me/claims", {
        body: {
          merchant,
          claimDate,
          total: totalNumber,
          currency: "LKR",
          category,
          note: note || undefined,
        },
      });
      if (!data) {
        setSubmitError(`Could not submit the claim (${response.status}).`);
        return;
      }
      navigate(`/claims/${data.id}`);
    } catch {
      setSubmitError("Could not submit the claim.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "my-claims", label: "My Claims", onClick: () => navigate("/claims") },
          { key: "new-claim", label: "New claim" },
        ]}
      />
      <PageTitle>
        <PageTitle.Header>New Claim</PageTitle.Header>
      </PageTitle>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Receipt" />
        <CardContent>
          <Stack spacing={2} alignItems="flex-start">
            {receiptPreview ? (
              <Box
                component="img"
                src={receiptPreview}
                alt="Uploaded receipt preview"
                sx={{ maxWidth: 240, maxHeight: 240, borderRadius: 1, border: "1px solid", borderColor: "divider" }}
              />
            ) : null}
            <input
              ref={fileInput}
              type="file"
              accept={RECEIPT_ATTACHMENT_TYPES.join(",")}
              style={{ display: "none" }}
              onChange={onUpload}
            />
            <Button
              variant="outlined"
              startIcon={<Upload size={18} />}
              onClick={() => fileInput.current?.click()}
              disabled={reading}
            >
              Upload photo or PDF
            </Button>
            {reading ? (
              <Typography variant="body2" color="text.secondary">
                Reading receipt… fields below are filled in automatically
              </Typography>
            ) : null}
            {readError ? (
              <Typography variant="body2" color="error">
                {readError}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Merchant"
          placeholder="e.g. Spice Garden Restaurant"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
        />
        <TextField
          fullWidth
          type="date"
          label="Date"
          value={claimDate}
          onChange={(e) => setClaimDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Total"
          placeholder="e.g. 8500"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
        />
        <TextField
          fullWidth
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
      </Stack>

      {flags && flags.length > 0 ? (
        <Card sx={{ mb: 2 }}>
          <CardHeader
            title="Policy check"
            action={<Chip label="Over monthly cap" color="warning" size="small" />}
          />
          <CardContent>
            {flags.map((flag) => (
              <Typography key={flag.id} variant="body2">
                {flag.reason}
              </Typography>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <TextField
        fullWidth
        multiline
        minRows={3}
        label="Business purpose note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        sx={{ mb: 3 }}
      />

      {submitError ? (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          {submitError}
        </Typography>
      ) : null}

      <Stack direction="row" justifyContent="flex-end" spacing={2}>
        <Button variant="outlined" onClick={() => navigate("/claims")}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void onSubmit()} disabled={submitting}>
          Submit claim
        </Button>
      </Stack>
    </PageContent>
  );
}
