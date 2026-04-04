import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "antd";
import { MapPinned, Plus } from "lucide-react";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import ReusableSlideForm from "../SharedComponents/Forms/ReusableSlideForm";
import { createLocation, fetchLocations } from "../Store/Features/locationsSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";

const initialValues = {
  name: "",
  code: "",
  address: "",
  timezone: "Africa/Nairobi",
};

const Locations = () => {
  const dispatch = useDispatch();
  const { list, loading, saving } = useSelector((state) => state.locations);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  const onValueChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = "Location name is required";
    if (!values.timezone.trim()) nextErrors.timezone = "Timezone is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const rows = useMemo(
    () =>
      list.map((item) => ({
        key: item?._id || item?.id,
        name: item?.name || "Unnamed Location",
        code: item?.code || item?.location_code || "N/A",
        address: item?.address || item?.street || "N/A",
        timezone: item?.timezone || item?.location_timezone || "N/A",
        status: item?.status || "active",
      })),
    [list],
  );

  const handleSubmit = async (event, closeModal) => {
    event.preventDefault();
    if (!validate()) return;
    const result = await dispatch(
      createLocation({
        name: values.name.trim(),
        code: values.code.trim() || undefined,
        address: values.address.trim() || undefined,
        timezone: values.timezone.trim(),
      }),
    );
    if (createLocation.fulfilled.match(result)) {
      toast.success("Location created");
      setValues(initialValues);
      closeModal();
    } else {
      toast.error(result?.payload || "Failed to create location");
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
  ];

  return (
    <ModuleLayoutsOne
      title="Location Management"
      subtitle="Define operating locations used by scheduling and shifts."
      headerAction={({ openModal }) => (
        <Button type="primary" icon={<Plus size={14} />} className="h-10 rounded-xl font-bold" onClick={openModal}>
          Add Location
        </Button>
      )}
      tableTitle="Locations"
      totalRecords={rows.length}
      tableProps={{
        columns,
        dataSource: rows,
        loading,
      }}
      modalTitle="Create Location"
      modalSubtitle="Add a new location in a reusable side form."
      modalIcon={<MapPinned size={20} />}
      modalContent={({ closeModal }) => (
        <ReusableSlideForm
          title="Location Details"
          subtitle="This same form pattern is reused across create pages."
          icon={MapPinned}
          fields={[
            { name: "name", label: "Location Name", required: true, placeholder: "e.g. Westlands Branch" },
            { name: "code", label: "Code", placeholder: "e.g. WST-01" },
            { name: "address", label: "Address", type: "textarea", placeholder: "Physical address" },
            { name: "timezone", label: "Timezone", required: true, placeholder: "e.g. Africa/Nairobi" },
          ]}
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
