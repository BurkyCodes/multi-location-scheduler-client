import React from "react";

const StatCard = ({
  Icon,
  iconBg,
  iconText,
  label,
  labelText,
  text,
  value,
}) => (
  <div
    className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all duration-300"
  >
    <div className="flex items-center justify-between gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-white/60 ${iconBg}`}
      >
        {Icon ? <Icon className={iconText} /> : null}
      </div>
      <span className={`${labelText} text-sm font-semibold`}>
        {label}
      </span>
    </div>
    <div className="mt-3 border-t border-gray-100">
      <span className={`text-2xl font-bold ${text}`}>
        {value}
      </span>
    </div>
  </div>
);

export default StatCard;
