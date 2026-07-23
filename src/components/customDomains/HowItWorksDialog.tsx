import React from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  cnameTarget: string;
  aRecordTarget: string;
};

export default function HowItWorksDialog({ open, onClose, cnameTarget, aRecordTarget }: Props) {
  if (!open) return null;

  return (
    <div className="acn-modal-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="acn-how-works-title"
        className="acn-how-works-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="acn-how-works-dialog__header">
          <div>
            <h3 id="acn-how-works-title">How custom domains work</h3>
            <p>Real flow in ACN Link today — with a quick example.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="acn-how-works-dialog__close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="acn-how-works-dialog__body">
          <section>
            <h4>Example</h4>
            <p>
              You own <strong>yourdomain.com</strong> on Cloudflare. You want{" "}
              <code>name.yourdomain.com</code> to open one of your bio pages.
            </p>
          </section>

          <ol className="acn-how-works-dialog__steps">
            <li>
              <span>1</span>
              <div>
                <strong>Connect Domain</strong>
                <p>
                  Enter <code>name.yourdomain.com</code> and choose which bio page should open.
                </p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Choose Cloudflare → Auto setup</strong>
                <p>
                  Approve ACN Link once on <em>your</em> Cloudflare account (orange logo button in the
                  header). After that, more domains reuse the same connection.
                </p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>We add DNS automatically</strong>
                <p>
                  ACN creates CNAME <code>name</code> → <code>{cnameTarget}</code> (DNS only / gray
                  cloud). For a root domain like <code>yourdomain.com</code>, we use A{" "}
                  <code>@</code> → <code>{aRecordTarget}</code>.
                </p>
              </div>
            </li>
            <li>
              <span>4</span>
              <div>
                <strong>Wait until LIVE</strong>
                <p>
                  Status moves Pending → Verified → <strong>LIVE</strong>. Share{" "}
                  <code>https://name.yourdomain.com</code> with visitors.
                </p>
              </div>
            </li>
            <li>
              <span>5</span>
              <div>
                <strong>Remove domain</strong>
                <p>
                  Trash on the domain row removes it from ACN Link and deletes that DNS record from
                  your Cloudflare when connected.
                </p>
              </div>
            </li>
          </ol>

          <section className="acn-how-works-dialog__rules">
            <h4>Rules to remember</h4>
            <ul>
              <li>
                <strong>Same root, many subdomains</strong> — on any root you own (e.g.{" "}
                <code>yourdomain.com</code>), you can connect several subdomains like{" "}
                <code>shop.</code>, <code>link.</code>, <code>name.</code>.
              </li>
              <li>
                <strong>One custom domain per bio page</strong> — if a page already opens on another
                address, pick a different page or remove the old domain first.
              </li>
              <li>
                <strong>Free plan</strong> — up to <strong>3</strong> custom domains{" "}
                <strong>per root</strong>, for every root domain. A 4th subdomain on that same root
                needs a paid plan. Other roots each get their own free allowance of 3.
              </li>
              <li>
                <strong>Manual DNS</strong> — for any other host (GoDaddy, Hostinger, …), copy the
                CNAME/A records we show. If Cloudflare auto-setup fails, the same manual steps appear.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
