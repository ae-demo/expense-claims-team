// Routing structure adapted from thunder-authentication's assets/App.example.tsx.
// NoAccess sits ABOVE the shell route and REPLACES it; Forbidden sits INSIDE
// the shell, at /forbidden; every gated route is wrapped in <RequireOperation>
// taken from SCREEN_ROUTES; /callback is routed OUTSIDE the provider.
import { useEffect, type ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  AuthzProvider,
  Forbidden,
  NoAccess,
  RequireOperation,
  useAuthz,
  useScopes,
} from "./authz/gates";
import { reachableScreens, hasScopedReach, SCREEN_ROUTES } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { AppShell } from "./shell/AppShell";
import { APP_NAME } from "./appName";
import { CallbackPage } from "./pages/Callback";
import { MyClaimsPage } from "./pages/MyClaims";
import { NewClaimPage } from "./pages/NewClaim";
import { ClaimDetailPage } from "./pages/ClaimDetail";
import { ApprovalQueuePage } from "./pages/ApprovalQueue";
import { ClaimReviewPage } from "./pages/ClaimReview";
import { PolicyRulesPage } from "./pages/PolicyRules";
import { DescribePolicyRulePage } from "./pages/DescribePolicyRule";
import { EditPolicyRulePage } from "./pages/EditPolicyRule";
import { AllClaimsPage } from "./pages/AllClaims";
import { PolicyRulesReadOnlyPage } from "./pages/PolicyRulesReadOnly";

const PAGE_BY_KEY: Record<string, ReactElement> = {
  approvals: <ApprovalQueuePage />,
  myclaims: <MyClaimsPage />,
  newclaim: <NewClaimPage />,
  policyrules: <PolicyRulesPage />,
  allclaims: <AllClaimsPage />,
  policyreadonly: <PolicyRulesReadOnlyPage />,
  claimdetail: <ClaimDetailPage />,
  claimreview: <ClaimReviewPage />,
  editpolicyrule: <EditPolicyRulePage />,
  describepolicyrule: <DescribePolicyRulePage />,
};

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <ForbiddenWiring />
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        <Route
          path="*"
          element={
            <AuthzProvider fallback={<Splash />}>
              <SignedIn />
            </AuthzProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): ReactElement {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Checking your session…</p>
    </main>
  );
}

function SignedIn(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  // The load-time guard: only a MISSING session starts a sign-in. Signing in
  // on a merely expired token would re-log the user in on every visit.
  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  const reachable = reachableScreens(scopes, signedIn);

  if (!hasScopedReach(scopes, signedIn)) return <NoAccess appName={APP_NAME} />;

  const landing = (reachable.find((s) => !s.public && s.loads !== null) ?? reachable[0]).path;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          const page = PAGE_BY_KEY[screen.key];
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          return (
            <Route
              key={screen.key}
              element={<RequireOperation op={screen.loads} screen={screen.label} />}
            >
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}
