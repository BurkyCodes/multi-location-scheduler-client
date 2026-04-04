import { AlertCircle, CheckCircle2 } from "lucide-react";

const FONT = { fontFamily: "'Montserrat', sans-serif" };
const FONT_SM = { ...FONT, fontSize: 12 };
const FONT_XS = { ...FONT, fontSize: 11 };

const SectionHeader = ({ icon, title, subtitle }) => {
  const HeaderIcon = icon;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: "#fff7ed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {HeaderIcon ? <HeaderIcon size={16} color="#f6873a" /> : null}
      </div>
    </div>
  );
};

const Label = ({ children, required }) => (
  <div style={{ ...FONT_SM, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
    {children}
    {required ? <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span> : null}
  </div>
);

const FieldError = ({ value }) =>
  value ? (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
      <AlertCircle size={11} color="#ef4444" />
      <span style={{ ...FONT_XS, color: "#ef4444" }}>{value}</span>
    </div>
  ) : null;

const inputStyle = (hasError) => ({
  ...FONT_SM,
  width: "100%",
  height: 40,
  borderRadius: 8,
  border: `1.5px solid ${hasError ? "#fecaca" : "#e2e8f0"}`,
  padding: "0 12px",
  color: "#1e293b",
  background: hasError ? "#fef2f2" : "#fff",
  outline: "none",
});

const textAreaStyle = (hasError) => ({
  ...FONT_SM,
  width: "100%",
  borderRadius: 8,
  border: `1.5px solid ${hasError ? "#fecaca" : "#e2e8f0"}`,
  padding: "10px 12px",
  color: "#1e293b",
  background: hasError ? "#fef2f2" : "#fff",
  outline: "none",
  resize: "vertical",
  minHeight: 88,
});

const renderField = (field, values, errors, onValueChange) => {
  const value = values[field.name] ?? "";
  const error = errors[field.name];

  return (
    <div key={field.name}>
      <Label required={field.required}>{field.label}</Label>
      {field.type === "textarea" ? (
        <textarea
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onValueChange(field.name, event.target.value)}
          style={textAreaStyle(Boolean(error))}
        />
      ) : field.type === "select" ? (
        <select
          value={value}
          onChange={(event) => onValueChange(field.name, event.target.value)}
          style={inputStyle(Boolean(error))}
        >
          <option value="">{field.placeholder || `Select ${field.label}`}</option>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type || "text"}
          min={field.min}
          step={field.step}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onValueChange(field.name, event.target.value)}
          style={inputStyle(Boolean(error))}
        />
      )}
      {field.hint && !error ? <div style={{ ...FONT_XS, color: "#94a3b8", marginTop: 4 }}>{field.hint}</div> : null}
      <FieldError value={error} />
    </div>
  );
};

const ReusableSlideForm = ({
  title,
  subtitle,
  icon,
  fields,
  values,
  errors,
  loading,
  submitLabel = "Create",
  onValueChange,
  onSubmit,
  onCancel,
}) => (
  <form
    onSubmit={onSubmit}
    style={{ display: "flex", flexDirection: "column", height: "100%" }}
  >
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {fields.map((field) => renderField(field, values, errors, onValueChange))}
      </div>
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "14px 24px",
        borderTop: "1px solid #f1f5f9",
        background: "#fff",
      }}
    >
      <button
        type="button"
        onClick={onCancel}
        style={{
          ...FONT_SM,
          height: 40,
          borderRadius: 8,
          border: "1.5px solid #e2e8f0",
          background: "#fff",
          color: "#374151",
          padding: "0 16px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        style={{
          ...FONT_SM,
          height: 40,
          borderRadius: 8,
          border: "none",
          background: loading ? "#fdba74" : "#f6873a",
          color: "#fff",
          padding: "0 20px",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 2px 8px rgba(246,135,58,0.25)",
        }}
      >
        <CheckCircle2 size={14} />
        {loading ? "Saving..." : submitLabel}
      </button>
    </div>
  </form>
);

export default ReusableSlideForm;
