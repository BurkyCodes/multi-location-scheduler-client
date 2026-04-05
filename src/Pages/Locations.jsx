import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "antd";
import { Eye, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import ReusableSlideForm from "../SharedComponents/Forms/ReusableSlideForm";
import {
  createLocation,
  deleteLocation,
  fetchLocations,
  updateLocation,
} from "../Store/Features/locationsSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";

const initialValues = {
  name: "",
  code: "",
  timezone: "EAT",
};

const locationEditableFields = [
  { name: "name", label: "Location Name", required: true, placeholder: "e.g. Westlands Branch" },
  { name: "code", label: "Code", required: true, placeholder: "e.g. WST-01" },
  {
    name: "timezone",
    label: "Timezone",
    type: "select",
    required: true,
    options: [
      { value: "EAT", label: "EAT (UTC+3)" },
      { value: "PST", label: "PST (UTC-8 / -7 DST)" },
    ],
  },
];

const toAddressSummary = (address = {}) =>
  [address.line_1, address.line_2, address.city, address.state, address.postal_code, address.country]
    .filter(Boolean)
    .join(", ");

const normalizeTimezoneCode = (value) => {
  const v = String(value || "").trim().toUpperCase();
  if (v === "PST" || v === "AMERICA/LOS_ANGELES") return "PST";
  return "EAT";
};

const mapLocationToForm = (item) => ({
  name: item?.name || "",
  code: item?.code || "",
  timezone: normalizeTimezoneCode(item?.timezone),
});

const buildCreatePayload = (formValues) => ({
  name: formValues.name.trim(),
  code: formValues.code.trim().toUpperCase(),
  timezone: normalizeTimezoneCode(formValues.timezone),
  is_active: true,
  address: {},
});

const buildUpdatePayload = (formValues) => ({
  name: formValues.name.trim(),
  code: formValues.code.trim().toUpperCase(),
  timezone: normalizeTimezoneCode(formValues.timezone),
});

const Locations = () => {
  const dispatch = useDispatch();
  const { list, loading, saving } = useSelector((state) => state.locations);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [viewingLocation, setViewingLocation] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  const onValueChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (payload) => {
    const nextErrors = {};
    if (!payload.name.trim()) nextErrors.name = "Location name is required";
    if (!payload.code.trim()) nextErrors.code = "Location code is required";
    if (!payload.timezone) nextErrors.timezone = "Timezone is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const rows = useMemo(
    () =>
      list.map((item) => ({
        key: item?._id || item?.id,
        raw: item,
        name: item?.name || "Unnamed Location",
        code: item?.code || item?.location_code || "N/A",
        address: toAddressSummary(item?.address) || "N/A",
        timezone:
          item?.timezone_label || item?.timezone || item?.location_timezone || "N/A",
        status: item?.is_active === false ? "deactivated" : "active",
      })),
    [list],
  );

  const canAddLocation = rows.length < 4;

  const handleSubmit = async (event, closeModal) => {
    event.preventDefault();
    if (!validate(values)) return;
    const result = await dispatch(createLocation(buildCreatePayload(values)));
    if (createLocation.fulfilled.match(result)) {
      toast.success("Location created");
      setValues(initialValues);
      closeModal();
    } else {
      toast.error(result?.payload || "Failed to create location");
    }
  };

  const openEditModal = (record) => {
    setEditingLocation(record);
    setValues(mapLocationToForm(record.raw));
    setErrors({});
    setEditOpen(true);
  };

  const handleUpdateSubmit = async (event) => {
    event.preventDefault();
    if (!editingLocation) return;
    if (!validate(values)) return;
    const result = await dispatch(
      updateLocation({
        id: editingLocation.key,
        ...buildUpdatePayload(values),
      }),
    );
    if (updateLocation.fulfilled.match(result)) {
      toast.success("Location updated");
      setEditOpen(false);
      setEditingLocation(null);
      setValues(initialValues);
      dispatch(fetchLocations());
    } else {
      toast.error(result?.payload || "Failed to update location");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await dispatch(deleteLocation(deleteTarget.key));
    if (deleteLocation.fulfilled.match(result)) {
      toast.success("Location deleted");
      setDeleteTarget(null);
    } else {
      toast.error(result?.payload || "Failed to delete location");
    }
  };

  const columns = [
    {
      title: colTitle("Location"),
      dataIndex: "name",
      key: "name",
      render: (name, record) => <ColumnData text={name} description={record.address} />,
    },
    {
      title: colTitle("Code"),
      dataIndex: "code",
      key: "code",
      render: (code) => <ColumnData text={code} />,
    },
    {
      title: colTitle("Timezone"),
      dataIndex: "timezone",
      key: "timezone",
      render: (timezone) => <ColumnData text={timezone} />,
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
              setViewingLocation(record);
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
      title="Location Management"
      subtitle="Define operating locations used by scheduling and shifts."
      headerAction={({ openModal }) =>
        canAddLocation ? (
          <Button type="primary" icon={<Plus size={14} />} className="h-10 rounded-xl font-bold" onClick={openModal}>
            Add Location
          </Button>
        ) : null
      }
      tableTitle="Locations"
      totalRecords={rows.length}
      tableProps={{
        columns,
        dataSource: rows,
        loading,
      }}
      editModalOpen={editOpen}
      onEditModalClose={() => {
        setEditOpen(false);
        setEditingLocation(null);
        setValues(initialValues);
        setErrors({});
      }}
      editModalTitle="Edit Location"
      editModalSubtitle="Update location name, code, and timezone."
      editModalIcon={<Pencil size={20} />}
      editModalContent={() => (
        <ReusableSlideForm
          title="Edit Location"
          subtitle="Update location details."
          icon={Pencil}
          fields={locationEditableFields}
          values={values}
          errors={errors}
          loading={saving}
          submitLabel="Update Location"
          onValueChange={onValueChange}
          onSubmit={handleUpdateSubmit}
          onCancel={() => {
            setEditOpen(false);
            setEditingLocation(null);
            setValues(initialValues);
            setErrors({});
          }}
        />
      )}
      secondaryModalOpen={viewOpen}
      onSecondaryModalClose={() => {
        setViewOpen(false);
        setViewingLocation(null);
      }}
      secondaryModalTitle="Location Details"
      secondaryModalSubtitle="Read-only location data."
      secondaryModalIcon={<Eye size={20} />}
      secondaryModalContent={
        viewingLocation ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Name</p>
              <p className="font-semibold text-slate-800">{viewingLocation.name}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Code</p>
              <p className="font-semibold text-slate-800">{viewingLocation.code}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Timezone</p>
              <p className="font-semibold text-slate-800">{viewingLocation.timezone}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Address</p>
              <p className="font-semibold text-slate-800">{viewingLocation.address}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
              <p className="font-semibold text-slate-800">{viewingLocation.status}</p>
            </div>
          </div>
        ) : null
      }
      deleteModalProps={{
        visible: Boolean(deleteTarget),
        onCancel: () => setDeleteTarget(null),
        onConfirm: handleDeleteConfirm,
        title: "Delete Location",
        subtitle: `Delete ${deleteTarget?.name || "this location"}? This action cannot be undone.`,
      }}
      modalTitle="Create Location"
      modalSubtitle="Add a new location."
      modalIcon={<MapPinned size={20} />}
      modalContent={({ closeModal }) => (
        <ReusableSlideForm
          title="Location Details"
          subtitle="Create location with name, code, and timezone."
          icon={MapPinned}
          fields={locationEditableFields}
          values={values}
          errors={errors}
          loading={saving}
          submitLabel="Create Location"
          onValueChange={onValueChange}
          onSubmit={(event) => handleSubmit(event, closeModal)}
          onCancel={closeModal}
        />
      )}
    />
  );
};

export default Locations;
