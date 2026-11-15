"use client";

/** Shown in place of the editor page when something fails on the server, instead of the bare browser error page. */
export default function PanelError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <div className="adm-head"><h1>That did not work</h1></div>
      <p className="adm-help">
        The editor hit an error, so the last change was probably not saved. Go back, check the page, and try again. If a
        save had several new images, save with fewer of them at once.
      </p>
      <div className="adm-actions">
        <button className="btn btn-ink" type="button" onClick={() => retry()}>Try again</button>
        <button className="btn btn-line" type="button" onClick={() => history.back()}>Go back</button>
      </div>
    </>
  );
}
