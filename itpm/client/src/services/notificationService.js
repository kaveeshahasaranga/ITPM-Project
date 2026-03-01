import { apiFetch } from "../api";

export const notificationService = {
    getNotifications: async (query = {}) => {
        // query can be { unread: true }
        const params = new URLSearchParams(query);
        return await apiFetch(`/notifications?${params.toString()}`);
    },

    markAsRead: async (id) => {
        return await apiFetch(`/notifications/${id}/read`, {
            method: "PATCH"
        });
    },

    deleteNotification: async (id) => {
        return await apiFetch(`/notifications/${id}`, {
            method: "DELETE"
        });
    },

    markAllAsRead: async () => {
        return await apiFetch("/notifications/read-all", {
            method: "PATCH"
        });
    }
};
