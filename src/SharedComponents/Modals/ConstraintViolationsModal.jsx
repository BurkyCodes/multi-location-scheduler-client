import React from "react";
import { Modal, Button } from "antd";
import { AlertTriangle } from "lucide-react";

const toReadableRule = (rule) =>
  ({
    daily_12_block: "Block",
  }[String(rule || "").toLowerCase()]) ||
  String(rule || "unknown_rule")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const fallbackMessageByRule = {
  required_skill: "Staff does not have the required skill for this shift.",
  location_certification: "Staff is not certified for this location.",
  availability_hours: "Shift timing is outside staff availability coverage.",
};

const ConstraintViolationsModal = ({
  visible,
  title = "Assignment constraint violation",
  subtitle = "This assignment could not be saved because one or more rules failed.",
  violations = [],
  suggestions = [],
  onClose,
}) => (
  <Modal
    open={visible}
    onCancel={onClose}
    footer={null}
    centered
    width={560}
    className="rounded-2xl overflow-hidden"
    closable={false}
  >
    <div className="p-6">
      <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle size={28} />
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-5">{subtitle}</p>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">
          Constraint Violations ({violations.length})
        </p>
        <div className="space-y-2">
          {violations.map((violation, index) => {
            const rule = String(violation?.rule || "unknown_rule");
            const message =
              violation?.message ||
              fallbackMessageByRule[rule] ||
              "This assignment violates scheduling constraints.";

            return (
              <div key={`${rule}-${index}`} className="rounded-lg bg-white/70 border border-amber-100 p-3">
                <p className="text-sm font-bold text-slate-800">
                  {index + 1}. {toReadableRule(rule)}
                </p>
                <p className="text-sm text-slate-600 mt-1">{message}</p>
              </div>
            );
          })}
        </div>
      </div>

      {suggestions.length ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-2">
            Suggestions ({suggestions.length})
          </p>
          <ul className="space-y-1 text-sm text-slate-700">
            {suggestions.map((item, index) => (
              <li key={`${item?._id || item?.user_id || item?.name || "suggestion"}-${index}`}>
                {index + 1}. {item?.name || item?.user_id || "Alternative staff"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button className="h-10 rounded-xl border-slate-200 text-slate-700 font-bold" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  </Modal>
);

export default ConstraintViolationsModal;
