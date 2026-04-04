import React from "react";
import { CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { FONT } from "../FormBits";

const STATUS_META = {
  published: {
    icon: <CheckCircleOutlined className="text-[10px]" />,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "published",
  },
  pending: {
    icon: <ClockCircleOutlined className="text-[10px]" />,
    className: "bg-amber-50 text-amber-700 border-amber-200",
    label: "pending",
  },
  alert: {
    icon: <WarningOutlined className="text-[10px]" />,
    className: "bg-red-50 text-red-700 border-red-200",
    label: "alert",
  },
};

const StatusBadge = ({ status = "pending" }) => {
  const config = STATUS_META[status] || STATUS_META.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${config.className}`}
      style={FONT}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

export default StatusBadge;
