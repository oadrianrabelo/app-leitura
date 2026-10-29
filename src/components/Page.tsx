import type { ReactNode } from "react";
import "./Page.css";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface PageProps {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Page({ eyebrow, title, children, actions }: PageProps) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          {eyebrow && <p className="page-eyebrow">{capitalize(eyebrow)}</p>}
          <h1 className="page-title">{title}</h1>
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="section">
      {title && <h2 className="section-title">{title}</h2>}
      {children}
    </section>
  );
}

export function SoonTag() {
  return <span className="soon-tag">Em breve</span>;
}
