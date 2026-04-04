import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card, Switch } from "antd";
import { Plus, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import ReusableSlideForm from "../SharedComponents/Forms/ReusableSlideForm";
import { createUserRole, fetchUserRoles } from "../Store/Features/userRolesSlice";
import {
  fetchNotificationPreferenceByUser,
  upsertNotificationPreference,
} from "../Store/Features/preferencesSlice";
import { colTitle } from "../SharedComponents/ColumnComponents/ColumnTitle";
import ColumnData from "../SharedComponents/ColumnComponents/ColumnData";
import StatusBadge from "../SharedComponents/ColumnComponents/StatusBadge";

const initialRoleValues = {
  role: "",
  description: "",
};

const Settings = () => {
  const dispatch = useDispatch();
  const roles = useSelector((state) => state.userRoles.list);
  const rolesLoading = useSelector((state) => state.userRoles.loading);
  const rolesSaving = useSelector((state) => state.userRoles.saving);
  const user = useSelector((state) => state.auth.user);
  const notificationPrefs = useSelector(
    (state) => state.preferences.notificationsByUser[user?._id],
  );

  const [roleValues, setRoleValues] = useState(initialRoleValues);
  const [roleErrors, setRoleErrors] = useState({});
  const [emailEnabled, setEmailEnabled] = useState();
  const [smsEnabled, setSmsEnabled] = useState();

  useEffect(() => {
    dispatch(fetchUserRoles());
  }, [dispatch]);

  useEffect(() => {
    if (!user?._id) return;
    dispatch(fetchNotificationPreferenceByUser(user._id));
  }, [dispatch, user?._id]);

  const effectiveEmailEnabled =
    emailEnabled ?? Boolean(notificationPrefs?.email_enabled || notificationPrefs?.email);
  const effectiveSmsEnabled =
    smsEnabled ?? Boolean(notificationPrefs?.sms_enabled || notificationPrefs?.sms);

  const onRoleValueChange = (name, value) => {
    setRoleValues((prev) => ({ ...prev, [name]: value }));
    setRoleErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateRole = () => {
    const nextErrors = {};
    if (!roleValues.role.trim()) nextErrors.role = "Role name is required";
    setRoleErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveNotificationPreferences = async () => {
    if (!user?._id) return;
    const result = await dispatch(
        upsertNotificationPreference({
          user_id: user._id,
          email_enabled: effectiveEmailEnabled,
          sms_enabled: effectiveSmsEnabled,
        }),
    );
    if (upsertNotificationPreference.fulfilled.match(result)) {
      toast.success("Notification preferences updated");
    } else {
      toast.error(result?.payload || "Failed to save preferences");
    }
  };

  const roleRows = useMemo(
    () =>
      roles.map((item) => ({
        key: item?._id || item?.id,
        role: item?.role || item?.name || "Unnamed Role",
        description: item?.description || "No description",
        status: item?.status || "active",
      })),
    [roles],
  );

  const roleColumns = [
    {
      title: colTitle("Role"),
      dataIndex: "role",
      key: "role",
      render: (value, row) => <ColumnData text={String(value).toUpperCase()} description={row.description} />,
    },
    {
      title: colTitle("Status"),
      dataIndex: "status",
      key: "status",
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  const handleCreateRole = async (event, closeModal) => {
    event.preventDefault();
    if (!validateRole()) return;
    const result = await dispatch(
      createUserRole({
        role: roleValues.role.trim(),
        name: roleValues.role.trim(),
        description: roleValues.description.trim() || undefined,
      }),
    );
    if (createUserRole.fulfilled.match(result)) {
      toast.success("Role created");
      setRoleValues(initialRoleValues);
      closeModal();
    } else {
      toast.error(result?.payload || "Failed to create role");
    }
  };

  return (
    <ModuleLayoutsOne
      title="System Settings"
      subtitle="Manage roles and communication preferences."
      statsContent={
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
              <SettingsIcon size={16} color="#f6873a" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Email Alerts</span>
                <Switch checked={effectiveEmailEnabled} onChange={setEmailEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">SMS Alerts</span>
                <Switch checked={effectiveSmsEnabled} onChange={setSmsEnabled} />
              </div>
            </div>
            <Button type="primary" className="mt-4 rounded-xl font-bold" onClick={saveNotificationPreferences}>
              Save Preferences
            </Button>
          </Card>
        </div>
      }
      headerAction={({ openModal }) => (
        <Button type="primary" icon={<Plus size={14} />} className="h-10 rounded-xl font-bold" onClick={openModal}>
          Create Role
        </Button>
      )}
      tableTitle="User Roles"
      totalRecords={roleRows.length}
      tableProps={{
        columns: roleColumns,
        dataSource: roleRows,
        loading: rolesLoading,
      }}
      modalTitle="Create Role"
      modalSubtitle="Create role definitions for access control."
      modalIcon={<ShieldCheck size={20} />}
      modalContent={({ closeModal }) => (
        <ReusableSlideForm
          title="Role Setup"
          subtitle="This create form is reusable and appears from the right side."
          icon={ShieldCheck}
          fields={[
            { name: "role", label: "Role Name", required: true, placeholder: "e.g. supervisor" },
            { name: "description", label: "Description", type: "textarea", placeholder: "Describe what this role can do" },
          ]}
          values={roleValues}
          errors={roleErrors}
          loading={rolesSaving}
          submitLabel="Create Role"
          onValueChange={onRoleValueChange}
          onSubmit={(event) => handleCreateRole(event, closeModal)}
          onCancel={closeModal}
        />
      )}
    />
  );
};

export default Settings;
