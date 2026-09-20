import { UploadLinkPreview } from "@/components/staff/UploadLinkPreview";
import { portalUrl } from "@/lib/brand";
import { uploadLinkCopy } from "@/lib/mock";
import shell from "../staff.module.css";

export const metadata = { title: "Client upload link" };

export default function UploadLinkPage() {
  // The token is per case and expires; the URL is built from the configured domain
  // so a rebrand does not leave dead links in already-sent emails.
  const url = portalUrl("/u/8f3a-2c19-4b70");

  return (
    <div className={shell.screen}>
      <div className={shell.pageHead}>
        <h1 className={shell.pageTitle}>Client upload link</h1>
      </div>
      <p className={shell.pageLead}>
        What the client sees when they open the link. Check it in their language before you send it —
        the wording is what decides whether they upload the right thing the first time.
      </p>

      <UploadLinkPreview copy={uploadLinkCopy} url={url} expiry="2 October" />
    </div>
  );
}
