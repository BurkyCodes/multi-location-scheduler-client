import React from "react";
import { FONT } from "../FormBits";

const ColumnData = ({ icon, text, description }) => (
  <div className="flex flex-col gap-0.5">
    {text && (
      <span className="text-[13px] font-bold text-slate-800" style={FONT}>
        {text}
      </span>
    )}
    <div className="flex gap-1 items-start">
      {icon && <span>{icon}</span>}
      {description && (
        <span
          className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate"
          style={FONT}
        >
          {description}
        </span>
      )}
    </div>
  </div>
);

export default ColumnData;
