import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card, Switch } from "antd";
import { Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import ModuleLayoutsOne from "../Layouts/ModuleLayoutsOne";
import {
  fetchNotificationPreferenceByUser,
  upsertNotificationPreference,
} from "../Store/Features/preferencesSlice";

const Settings = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const prefsSaving = useSelector((state) => state.preferences.saving);
  const notificationPrefs = useSelector(
    (state) => state.preferences.notificationsByUser[user?._id],
  );
  const [inAppEnabled, setInAppEnabled] = useState();

  useEffect(() => {
    if (!user?._id) return;
    dispatch(fetchNotificationPreferenceByUser(user._id));
  }, [dispatch, user?._id]);

  const effectiveInAppEnabled =
    inAppEnabled ??
    Boolean(
      notificationPrefs?.channels?.in_app ??
      notificationPrefs?.in_app_enabled ??
        notificationPrefs?.channels?.email ??
        notificationPrefs?.email_enabled ??
        notificationPrefs?.email,
    );

  const saveNotificationPreferences = async () => {
    if (!user?._id) return;
    const result = await dispatch(
      upsertNotificationPreference({
        user_id: user._id,
        channels: {
          in_app: effectiveInAppEnabled,
          email: effectiveInAppEnabled,
        },
        in_app_enabled: effectiveInAppEnabled,
        email_enabled: effectiveInAppEnabled,
        sms_enabled: false,
      }),
    );
    if (upsertNotificationPreference.fulfilled.match(result)) {
      toast.success("Notification preference updated");
    } else {
      toast.error(result?.payload || "Failed to save preference");
    }
  };

  return (
    <ModuleLayoutsOne
      title="Settings"
      subtitle="Manage your app preferences."
      statsContent={
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
              <SettingsIcon size={16} color="#f6873a" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">In-app Notifications</span>
                <Switch checked={effectiveInAppEnabled} onChange={setInAppEnabled} />
              </div>
            </div>
            <Button
              type="primary"
              loading={prefsSaving}
              className="mt-4 rounded-xl font-bold"
              onClick={saveNotificationPreferences}
            >
              Save Preference
            </Button>
          </Card>
        </div>
      }
    />
  );
};

export default Settings;
