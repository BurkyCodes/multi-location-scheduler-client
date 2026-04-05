import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Select } from "antd";
import { Check, Eye, MapPin, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import { createStaff, deleteStaff, fetchStaff, updateStaff } from "../Store/Features/staffSlice";
import { fetchLocations } from "../Store/Features/locationsSlice";
import { fetchUserRoles } from "../Store/Features/userRolesSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";

const FONT = { fontFamily: "'Montserrat', sans-serif" };
const FONT_SM = { ...FONT, fontSize: 12 };
const FONT_XS = { ...FONT, fontSize: 11 };

const initialValues = {
  name: "",
  email: "",
  phone_number: "",
  role: "staff",
  location_ids: [],
  status: "active",
};

const getId = (value) => (typeof value === "object" ? value?._id || value?.id : value);

const Lbl = ({ children, labelHint }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ ...FONT_SM, fontWeight: 700, color: "#374151" }}>{children}</div>
    {labelHint ? <div style={{ ...FONT_XS, color: "#94a3b8", marginTop: 2 }}>{labelHint}</div> : null}
  </div>
);

const PillToggle = ({ options, value, onChange, disabled, fullWidth }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: fullWidth ? "1fr" : `repeat(${Math.max(options.length, 1)}, 1fr)`,
      gap: 8,
    }}
  >
    {options.map((opt) => {
      const active = opt.value === value;
      const Icon = opt.icon;
      return (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(opt.value)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "11px 14px",
            borderRadius: 9,
            textAlign: "left",
            border: `1.5px solid ${active ? "#93c5fd" : "#e2e8f0"}`,
            background: active ? "#eff6ff" : "#fafbfc",
            cursor: disabled ? "not-allowed" : "pointer",
            outline: "none",
            transition: "all 0.15s",
            boxShadow: active ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
            opacity: disabled ? 0.55 : 1,
          }}
        >
          {Icon ? (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 7,
                flexShrink: 0,
                background: active ? "#dbeafe" : "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={14} color={active ? "#2563eb" : "#94a3b8"} />
            </div>
          ) : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                ...FONT_SM,
                fontWeight: 700,
                color: active ? "#1e40af" : "#374151",
                lineHeight: 1.2,
              }}
            >
              {opt.label}
            </div>
            {opt.desc ? (
              <div
                style={{
                  ...FONT_XS,
                  color: active ? "rgba(37,99,235,0.6)" : "#94a3b8",
                  marginTop: 2,
                  lineHeight: 1.2,
                }}
              >
                {opt.desc}
              </div>
            ) : null}
          </div>
          <div
            style={{
              width: 15,
              height: 15,
              borderRadius: "50%",
              flexShrink: 0,
              border: `2px solid ${active ? "#2563eb" : "#e2e8f0"}`,
              background: active ? "#2563eb" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {active ? <Check size={7} color="#fff" strokeWidth={3.5} /> : null}
          </div>
        </button>
      );
    })}
  </div>
);

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

const StaffForm = ({
  mode = "create",
  title,
  subtitle,
  submitLabel,
  loading,
  values,
  errors,
  onValueChange,
  onSubmit,
  onCancel,
  locationOptions,
}) => (
  <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ ...FONT, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{title}</div>
        <div style={{ ...FONT_XS, color: "#64748b", marginTop: 3 }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <Lbl>Full Name</Lbl>
          <input
            value={values.name}
            onChange={(event) => onValueChange("name", event.target.value)}
            style={inputStyle(Boolean(errors.name))}
            placeholder="e.g. Angela Wanjiru"
          />
          {errors.name ? <div style={{ ...FONT_XS, color: "#ef4444", marginTop: 4 }}>{errors.name}</div> : null}
        </div>

        <div>
          <Lbl>Email</Lbl>
          <input
            type="email"
            value={values.email}
            onChange={(event) => onValueChange("email", event.target.value)}
            style={inputStyle(Boolean(errors.email))}
            placeholder="name@company.com"
          />
          {errors.email ? <div style={{ ...FONT_XS, color: "#ef4444", marginTop: 4 }}>{errors.email}</div> : null}
        </div>

        {mode === "create" ? (
          <div>
            <Lbl>Phone Number</Lbl>
            <input
              value={values.phone_number}
              onChange={(event) => onValueChange("phone_number", event.target.value)}
              style={inputStyle(Boolean(errors.phone_number))}
              placeholder="e.g. 0114116073"
            />
            {errors.phone_number ? (
              <div style={{ ...FONT_XS, color: "#ef4444", marginTop: 4 }}>{errors.phone_number}</div>
            ) : null}
          </div>
        ) : null}

        <div>
          <Lbl>Role</Lbl>
          <select
            value={values.role}
            onChange={(event) => onValueChange("role", event.target.value)}
            style={inputStyle(false)}
          >
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <Lbl labelHint={values.role === "manager" ? "Managers can have multiple locations" : "Select one location"}>
            Assigned Location{values.role === "manager" ? "s" : ""}
          </Lbl>
          <Select
            mode={values.role === "manager" ? "multiple" : undefined}
            value={values.location_ids}
            onChange={(next) => onValueChange("location_ids", Array.isArray(next) ? next : next ? [next] : [])}
            options={locationOptions}
            placeholder={values.role === "manager" ? "Select one or more locations" : "Select one location"}
            style={{ width: "100%" }}
          />
          {errors.location_ids ? (
            <div style={{ ...FONT_XS, color: "#ef4444", marginTop: 4 }}>{errors.location_ids}</div>
          ) : null}
        </div>
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
          boxShadow: "0 2px 8px rgba(246,135,58,0.25)",
        }}
      >
        {loading ? "Saving..." : submitLabel}
      </button>
    </div>
  </form>
);

const Staff = () => {
  const dispatch = useDispatch();
  const { list, loading, saving } = useSelector((state) => state.staff);
  const { list: locations } = useSelector((state) => state.locations);
  const { list: userRoles } = useSelector((state) => state.userRoles);

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchStaff());
    dispatch(fetchLocations());
    dispatch(fetchUserRoles());
  }, [dispatch]);

  const roleIdByName = useMemo(
    () =>
      (userRoles || []).reduce((acc, roleDoc) => {
        const roleName = String(roleDoc?.role || "").toLowerCase().trim();
        if (!roleName) return acc;
        acc[roleName] = String(getId(roleDoc));
        return acc;
      }, {}),
    [userRoles],
  );

  const onValueChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (payload) => {
    const nextErrors = {};
    if (!payload.name.trim()) nextErrors.name = "Name is required";
    if (!payload.email.trim()) nextErrors.email = "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(payload.email.trim())) nextErrors.email = "Enter a valid email";
    if (!editingStaff && !payload.phone_number.trim()) nextErrors.phone_number = "Phone number is required";
    const selectedLocationCount = Array.isArray(payload.location_ids) ? payload.location_ids.length : 0;
    if (payload.role === "manager" && selectedLocationCount < 1) {
      nextErrors.location_ids = "Select at least one location for manager";
    } else if (payload.role === "staff" && selectedLocationCount !== 1) {
      nextErrors.location_ids = "Staff must have exactly one location";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const locationNameById = useMemo(
    () =>
      locations.reduce((acc, location) => {
        acc[String(getId(location))] = location?.name || "Unnamed Location";
        return acc;
      }, {}),
    [locations],
  );

  const locationOptions = useMemo(
    () =>
      locations.map((location) => ({
        value: String(getId(location)),
        label: `${location?.name || "Unnamed Location"} (${location?.code || "No code"})`,
      })),
    [locations],
  );

  const rows = useMemo(
    () =>
      list.map((item) => ({
        key: item?._id || item?.id,
        raw: item,
        name: item?.name || "Unnamed",
        email: item?.email || "N/A",
        phone: item?.phone_number || item?.phone || "N/A",
        role: item?.role_id?.role || item?.role || "staff",
        status: item?.status || "active",
        locations: (item?.location_ids || [])
          .map((locationId) => locationNameById[String(getId(locationId))] || "Unknown Location")
          .join(", "),
      })),
    [list, locationNameById],
  );

  const handleSubmit = async (event, closeModal) => {
    event.preventDefault();
    if (!validate(values)) return;
    const roleName = String(values.role || "staff").toLowerCase().trim();
    const roleId = roleIdByName[roleName];
    if (!roleId) {
      toast.error(`Role "${roleName}" is not configured in user roles.`);
      return;
    }
    const result = await dispatch(
      createStaff({
        name: values.name.trim(),
        email: values.email.trim(),
        phone_number: values.phone_number.trim(),
        role_id: roleId,
        status: values.status,
        location_ids: Array.isArray(values.location_ids) ? values.location_ids : [],
      }),
    );
    if (createStaff.fulfilled.match(result)) {
      toast.success("Staff member created");
      setValues(initialValues);
      closeModal();
    } else {
      toast.error(result?.payload || "Failed to create staff");
    }
  };

  const openEditModal = (record) => {
    const item = record.raw;
    const locationIds = (item?.location_ids || []).map((locationId) => String(getId(locationId))).filter(Boolean);
    setEditingStaff(record);
    setErrors({});
    setValues({
      name: item?.name || "",
      email: item?.email || "",
      phone_number: item?.phone_number || "",
      role: item?.role_id?.role || item?.role || "staff",
      status: item?.status || "active",
      location_ids: locationIds,
    });
    setEditOpen(true);
  };

  const handleUpdateSubmit = async (event) => {
    event.preventDefault();
    if (!editingStaff) return;
    if (!validate(values)) return;
    const roleName = String(values.role || "staff").toLowerCase().trim();
    const roleId = roleIdByName[roleName];
    if (!roleId) {
      toast.error(`Role "${roleName}" is not configured in user roles.`);
      return;
    }

    const result = await dispatch(
      updateStaff({
        id: editingStaff.key,
        name: values.name.trim(),
        email: values.email.trim(),
        role_id: roleId,
        location_ids: Array.isArray(values.location_ids) ? values.location_ids : [],
      }),
    );

    if (updateStaff.fulfilled.match(result)) {
      toast.success("Staff member updated");
      setEditOpen(false);
      setEditingStaff(null);
      setValues(initialValues);
      dispatch(fetchStaff());
    } else {
      toast.error(result?.payload || "Failed to update staff");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await dispatch(deleteStaff(deleteTarget.key));
    if (deleteStaff.fulfilled.match(result)) {
      toast.success("Staff member deleted");
      setDeleteTarget(null);
    } else {
      toast.error(result?.payload || "Failed to delete staff");
    }
  };

  const columns = [
    {
      title: colTitle("Name"),
      dataIndex: "name",
      key: "name",
      render: (name, record) => <ColumnData text={name} description={record.email} />,
    },
    {
      title: colTitle("Phone"),
      dataIndex: "phone",
      key: "phone",
      render: (phone) => <ColumnData text={phone} />,
    },
    {
      title: colTitle("Role"),
      dataIndex: "role",
      key: "role",
      render: (role) => <ColumnData text={String(role).toUpperCase()} />,
    },
    {
      title: colTitle("Locations"),
      dataIndex: "locations",
      key: "locations",
      render: (locationsValue) => <ColumnData text={locationsValue || "Not assigned"} />,
    },
    {
      title: colTitle("Status"),
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: colTitle("Action"),
      key: "action",
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button
            type="text"
            className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700"
            icon={<Eye size={13} />}
            onClick={() => {
              setViewingStaff(record);
              setViewOpen(true);
            }}
          />
          <Button
            type="text"
            className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600"
            icon={<Pencil size={13} />}
            onClick={() => openEditModal(record)}
          />
          <Button
            danger
            type="text"
            className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600"
            icon={<Trash2 size={13} />}
            onClick={() => setDeleteTarget(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <ModuleLayoutsOne
      title="Staff Directory"
      subtitle="Manage staff details and role assignments."
      headerAction={({ openModal }) => (
        <Button type="primary" icon={<Plus size={14} />} className="h-10 rounded-xl font-bold" onClick={openModal}>
          Add Staff
        </Button>
      )}
      tableTitle="Staff Members"
      totalRecords={rows.length}
      tableProps={{
        columns,
        dataSource: rows,
        loading,
      }}
      editModalOpen={editOpen}
      onEditModalClose={() => {
        setEditOpen(false);
        setEditingStaff(null);
        setValues(initialValues);
        setErrors({});
      }}
      editModalTitle="Edit Staff Member"
      editModalSubtitle="Update full name, email, role, and assigned locations."
      editModalIcon={<Pencil size={20} />}
      editModalContent={() => (
        <StaffForm
          mode="edit"
          title="Edit Staff Information"
          subtitle="Only full name, email, role, and locations can be edited."
          submitLabel="Update Staff"
          loading={saving}
          values={values}
          errors={errors}
          onValueChange={onValueChange}
          onSubmit={handleUpdateSubmit}
          onCancel={() => {
            setEditOpen(false);
            setEditingStaff(null);
            setValues(initialValues);
            setErrors({});
          }}
          locationOptions={locationOptions}
        />
      )}
      secondaryModalOpen={viewOpen}
      onSecondaryModalClose={() => {
        setViewOpen(false);
        setViewingStaff(null);
      }}
      secondaryModalTitle="Staff Details"
      secondaryModalSubtitle="Read-only user profile snapshot."
      secondaryModalIcon={<Eye size={20} />}
      secondaryModalContent={
        viewingStaff ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Name</p>
              <p className="font-semibold text-slate-800">{viewingStaff.name}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</p>
              <p className="font-semibold text-slate-800">{viewingStaff.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone</p>
              <p className="font-semibold text-slate-800">{viewingStaff.phone}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Role</p>
              <p className="font-semibold text-slate-800">{String(viewingStaff.role).toUpperCase()}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Locations</p>
              <p className="font-semibold text-slate-800">{viewingStaff.locations || "Not assigned"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
              <p className="font-semibold text-slate-800">{viewingStaff.status}</p>
            </div>
          </div>
        ) : null
      }
      deleteModalProps={{
        visible: Boolean(deleteTarget),
        onCancel: () => setDeleteTarget(null),
        onConfirm: handleDeleteConfirm,
        title: "Delete Staff Member",
        subtitle: `Delete ${deleteTarget?.name || "this staff member"}? This action cannot be undone.`,
      }}
      modalTitle="Add Staff Member"
      modalSubtitle="Create a staff profile and assign locations."
      modalIcon={<UserPlus size={20} />}
      modalContent={({ closeModal }) => (
        <StaffForm
          mode="create"
          title="Staff Information"
          subtitle="Create a staff record used in schedule assignment."
          submitLabel="Create Staff"
          loading={saving}
          values={values}
          errors={errors}
          onValueChange={onValueChange}
          onSubmit={(event) => handleSubmit(event, closeModal)}
          onCancel={closeModal}
          locationOptions={locationOptions}
        />
      )}
    />
  );
};

export default Staff;
