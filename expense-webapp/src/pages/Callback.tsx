import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { handleCallback } from "../authz/session";

/**
 * The one registered redirect URI, serving both the redirect leg and the
 * silent-renew iframe leg — handleCallback() (signinCallback()) dispatches.
 * On the redirect leg, sign-in is complete once this promise settles; send
 * the user on to the app root, which resolves their landing screen.
 */
export function CallbackPage(): ReactElement {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void handleCallback()
      .then(() => {
        if (live) navigate("/", { replace: true });
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [navigate]);

  if (failed) {
    return (
      <main>
        <p>Sign-in did not complete. Refresh to try again.</p>
      </main>
    );
  }
  return (
    <main>
      <p>Signing in…</p>
    </main>
  );
}
