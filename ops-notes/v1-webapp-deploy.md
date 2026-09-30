# v1 expense-webapp deploy

The v1 deploy of expense-webapp was marked failed (ResourcesProgressing) because OpenChoreo's RenderedRelease controller applied it ~7 minutes after promotion, past the run's 15-minute deploy budget. The Deployment became Available at 13:59:46Z and the ReleaseBinding Ready at 14:03:46Z on 2026-09-30. No code change was needed.

#11 was closed by hand at the end of v1; no further work was outstanding.
