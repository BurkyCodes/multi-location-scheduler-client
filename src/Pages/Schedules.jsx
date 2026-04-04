import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, message } from "antd";
import { CalendarClock, Plus } from "lucide-react";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import ReusableSlideForm from "../SharedComponents/Forms/ReusableSlideForm";
import { createSchedule, fetchSchedules } from "../Store/Features/schedulesSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
};

const initialValues = {
  name: "",
  start: "",
  end: "",
  timezone: "Africa/Nairobi",
  notes: "",
};

const Schedules = () => {
  const dispatch = useDispatch();
  const { list, loading, saving } = useSelector((state) => state.schedules);

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(fetchSchedules());
  }, [dispatch]);

  const onValueChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = "Schedule name is required";
    if (!values.start) nextErrors.start = "Start date is required";
    if (!values.end) nextErrors.end = "End date is required";
    if (values.start && values.end && new Date(values.end) <= new Date(values.start)) {
      nextErrors.end = "End date must be after start date";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const rows = useMemo(
    () =>
      list.map((item) => ({
        key: item?._id || item?.id,
        name: item?.name || item?.title || "Unnamed Schedule",
        period: `${formatDate(item?.starts_at_utc || item?.start_date)} - ${formatDate(item?.ends_at_utc || item?.end_date)}`,
        timezone: item?.location_timezone || item?.timezone || "N/A",
        status: item?.status || (item?.published_at ? "published" : "pending"),
      })),
    [list],
  );

  const handleSubmit = async (event, closeModal) => {
    event.preventDefault();
    if (!validate()) return;
    const result = await dispatch(
      createSchedule({
        name: values.name.trim(),
        title: values.name.trim(),
        starts_at_utc: new Date(values.start).toISOString(),
        ends_at_utc: new Date(values.end).toISOString(),
        location_timezone: values.timezone,
        notes: values.notes.trim() || undefined,
      }),
    );
    if (createSchedule.fulfilled.match(result)) {
      message.success("Schedule created");
      setValues(initialValues);
      closeModal();
    } else {
      message.error(result?.payload || "Failed to create schedule");
    }
  };

  const columns = [
    {
      title: colTitle("Schedule"),
      dataIndex: "name",
      key: "name",
      render: (name) => <ColumnData text={name} />,
    },
    {
      title: colTitle("Duration"),
      dataIndex: "period",
      key: "period",
      render: (period) => <ColumnData text={period} />,
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
      title="Schedule Builder"
      subtitle="Create and manage publishing windows for shifts."
      headerAction={({ openModal }) => (
        <Button
          type="primary"
          icon={<Plus size={14} />}
          className="h-10 rounded-xl font-bold"
          onClick={openModal}
        >
          Create Schedule
        </Button>
      )}
      tableTitle="Schedules"
      totalRecords={rows.length}
      tableProps={{
        columns,
        dataSource: rows,
        loading,
      }}
      modalTitle="Create Schedule"
      modalSubtitle="Use this reusable side form to add a scheduling window."
      modalIcon={<CalendarClock size={20} />}
      modalContent={({ closeModal }) => (
        <ReusableSlideForm
          title="Schedule Details"
          subtitle="The form slides from the right and follows the shared design."
          icon={CalendarClock}
          fields={[
            { name: "name", label: "Name", required: true, placeholder: "e.g. Week 15 Roster" },
            { name: "start", label: "Start Date", type: "datetime-local", required: true },
            { name: "end", label: "End Date", type: "datetime-local", required: true },
            { name: "timezone", label: "Timezone", placeholder: "e.g. Africa/Nairobi", required: true },
            { name: "notes", label: "Notes", type: "textarea", placeholder: "Optional context for this schedule" },
          ]}
          values={values}
          errors={errors}
          loading={saving}
          submitLabel="Create Schedule"
          onValueChange={onValueChange}
          onSubmit={(event) => handleSubmit(event, closeModal)}
          onCancel={closeModal}
        />
      )}
    />
  );
};

export default Schedules;
