import { apiFetch } from "../api";

export const messageService = {
    // Send a message
    sendMessage: async (data) => {
        // data: { recipientId, content }
        return await apiFetch("/messages", {
            method: "POST",
            body: JSON.stringify(data)
        });
    },

    // Get messages
    getMessages: async (studentId = null) => {
        let url = "/messages";
        if (studentId) {
            url += `?studentId=${studentId}`;
        }
        return await apiFetch(url);
    },

    // Mark message as read
    markAsRead: async (id) => {
        return await apiFetch(`/messages/${id}/read`, {
            method: "PATCH"
        });
    },

    // Delete message
    deleteMessage: async (id) => {
        return await apiFetch(`/messages/${id}`, {
            method: "DELETE"
        });
    }
};
