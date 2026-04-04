/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { FONT } from "../FormBits";

const ColumnTitle = ({ label }) => (
  <span
    className="text-[11px] font-bold uppercase tracking-widest text-gray-400"
    style={FONT}
  >
    {label}
  </span>
);

const colTitle = (label) => <ColumnTitle label={label} />;

export { ColumnTitle, colTitle };
export default ColumnTitle;
