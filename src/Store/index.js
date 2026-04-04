import { configureStore } from '@reduxjs/toolkit';
import authReducer from './Features/authSlice';
import shiftsReducer from './Features/shiftsSlice';
import staffReducer from './Features/staffSlice';
import locationsReducer from './Features/locationsSlice';
import assignmentsReducer from './Features/assignmentsSlice';
import schedulesReducer from './Features/schedulesSlice';
import availabilityReducer from './Features/availabilitySlice';
import fairnessReducer from './Features/fairnessSlice';
import auditLogsReducer from './Features/auditLogsSlice';
import certificationsReducer from './Features/certificationsSlice';
import clockEventsReducer from './Features/clockEventsSlice';
import laborAlertsReducer from './Features/laborAlertsSlice';
import notificationsReducer from './Features/notificationsSlice';
import preferencesReducer from './Features/preferencesSlice';
import skillsReducer from './Features/skillsSlice';
import swapRequestsReducer from './Features/swapRequestsSlice';
import userRolesReducer from './Features/userRolesSlice';
import healthReducer from './Features/healthSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    shifts: shiftsReducer,
    staff: staffReducer,
    locations: locationsReducer,
    assignments: assignmentsReducer,
    schedules: schedulesReducer,
    availability: availabilityReducer,
    fairness: fairnessReducer,
    auditLogs: auditLogsReducer,
    certifications: certificationsReducer,
    clockEvents: clockEventsReducer,
    laborAlerts: laborAlertsReducer,
    notifications: notificationsReducer,
    preferences: preferencesReducer,
    skills: skillsReducer,
    swapRequests: swapRequestsReducer,
    userRoles: userRolesReducer,
    health: healthReducer,
  },
});
