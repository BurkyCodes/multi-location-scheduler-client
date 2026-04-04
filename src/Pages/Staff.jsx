import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "antd";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import ReusableSlideForm from "../SharedComponents/Forms/ReusableSlideForm";
import { createStaff, fetchStaff } from "../Store/Features/staffSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";

const initialValues = {
  name: "",
  email: "",
  phone_number: "",
  role: "staff",
};

const Staff = () => {
  const dispatch = useDispatch();
  const { list, loading, saving } = useSelector((state) => state.staff);

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch]);

  const onValueChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = "Name is required";
    if (!values.email.trim()) nextErrors.email = "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) nextErrors.email = "Enter a valid email";
    if (!values.phone_number.trim()) nextErrors.phone_number = "Phone number is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const rows = useMemo(
    () =>
      list.map((item) => ({
        key: item?._id || item?.id,
        name: item?.name || "Unnamed",
        email: item?.email || "N/A",
        phone: item?.phone_number || item?.phone || "N/A",
        role: item?.role_id?.role || item?.role || "staff",
        status: item?.status || "active",
      })),
    [list],
  );

  const handleSubmit = async (event, closeModal) => {
    event.preventDefault();
    if (!validate()) return;
    const result = await dispatch(
      createStaff({
        name: values.name.trim(),
        email: values.email.trim(),
        phone_number: values.phone_number.trim(),
        role: values.role,
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
      title: colTitle("Status"),
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
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
      modalTitle="Add Staff Member"
      modalSubtitle="Use the shared reusable drawer form."
      modalIcon={<UserPlus size={20} />}
      modalContent={({ closeModal }) => (
        <ReusableSlideForm
          title="Staff Information"
          subtitle="Create a staff record used in schedule assignment."
          icon={UserPlus}
          fields={[
            { name: "name", label: "Full Name", required: true, placeholder: "e.g. Angela Wanjiru" },
            { name: "email", label: "Email", type: "email", required: true, placeholder: "name@company.com" },
            { name: "phone_number", label: "Phone Number", required: true, placeholder: "e.g. 0114116073" },
            {
              name: "role",
              label: "Role",
              type: "select",
              required: true,
              options: [
                { value: "staff", label: "Staff" },
                { value: "manager", label: "Manager" },
                { value: "admin", label: "Admin" },
              ],
            },
          ]}
          values={values}
          errors={errors}
          loading={saving}
          submitLabel="Create Staff"
          onValueChange={onValueChange}
          onSubmit={(event) => handleSubmit(event, closeModal)}
          onCancel={closeModal}
        />
      )}
    />
  );
};

export default Staff;
