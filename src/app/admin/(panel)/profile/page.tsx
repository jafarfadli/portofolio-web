import { saveProfileAction } from "@/admin/actions";
import { toFormValues } from "@/admin/fields";
import { mediaOptions } from "@/admin/media-options";
import { PROFILE_FIELDS } from "@/admin/resources";
import { requireAdminPage } from "@/auth/admin";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { getProfile } from "@/content/home";
import { getDb } from "@/db/client";

export default async function ProfilePage() {
  await requireAdminPage();
  const db = getDb();
  const row = getProfile(db);
  return (
    <>
      <div className="adm-head">
        <h1>Profile</h1>
      </div>
      {row ? null : <p className="adm-notice">The public site shows a placeholder until you save your profile.</p>}
      <ResourceForm
        fields={PROFILE_FIELDS}
        initial={toFormValues(PROFILE_FIELDS, row ?? { openToWork: true })}
        action={saveProfileAction}
        media={mediaOptions(db)}
        submitLabel={row ? "Save changes" : "Create profile"}
      />
    </>
  );
}
