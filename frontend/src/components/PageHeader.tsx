import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
}

export function PageHeader({ title, subtitle, actions, ctaHref, ctaLabel }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Textile OS</p>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold text-body"
        >
          {title}
        </motion.h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {ctaHref && ctaLabel && (
          <Button>
            <Link to={ctaHref}>{ctaLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

