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
              You own <strong>ezysellonline.com</strong> on Cloudflare. You want{" "}
              <code>tree.ezysellonline.com</code> to open your “Tree” bio page.
            </p>
          </section>

          <ol className="acn-how-works-dialog__steps">
            <li>
              <span>1</span>
              <div>
                <strong>Connect Domain</strong>
                <p>
                  Enter <code>tree.ezysellonline.com</code> and choose the bio page “Tree”.
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
                  ACN creates CNAME <code>tree</code> → <code>{cnameTarget}</code> (DNS only / gray
                  cloud). For a root domain like <code>ezysellonline.com</code>, we use A{" "}
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
                  <code>https://tree.ezysellonline.com</code> with visitors.
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
                <strong>Many domains per account</strong> — shop., link., tree. on the same root are fine.
              </li>
              <li>
                <strong>One custom domain per bio page</strong> — pick another page if you see “already
                connected”.
              </li>
              <li>
                <strong>Other hosts</strong> (GoDaddy, Hostinger, …) — guided copy steps; auto-connect
                coming soon.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
