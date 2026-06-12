import React from "react";

export function ScreenHeading({ title, subtitle, icon: Icon }) {
  return (
    <div className="screen-heading">
      <div className="title-row">
        {Icon && <Icon size={24} />}
        <h1>{title}</h1>
      </div>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <article className="stat-card">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}
