import { useState, useEffect } from "react";
import { apiFetch } from "../api.js";
import { messageService } from "../services/messageService";
import Section from "../components/Section.jsx";

export default function AdminMessages() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [replyBody, setReplyBody] = useState("");
    const [sendingReply, setSendingReply] = useState(false);
    const [students, setStudents] = useState({}); // Map studentId -> { info, messages: [] }

    const loadMessages = async () => {
        try {
            setLoading(true);
            const data = await messageService.getMessages();

            // Group messages by student
            // If sender is student, key is sender._id
            // If sender is admin, key is recipient._id
            const grouped = {};

            data.forEach(msg => {
                const studentId = msg.isStudentToAdmin ? msg.sender._id : msg.recipient._id;
                const student = msg.isStudentToAdmin ? msg.sender : msg.recipient;

                if (!grouped[studentId]) {
                    grouped[studentId] = {
                        student: student,
                        messages: [],
                        unreadCount: 0,
                        lastMessage: null
                    };
                }

                grouped[studentId].messages.push(msg);
                if (msg.isStudentToAdmin && !msg.read) {
                    grouped[studentId].unreadCount++;
                }

                // Track last message for sorting
                if (!grouped[studentId].lastMessage || new Date(msg.createdAt) > new Date(grouped[studentId].lastMessage.createdAt)) {
                    grouped[studentId].lastMessage = msg;
                }
            });

            setStudents(grouped);
            setMessages(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMessages();
    }, []);

    const handleSelectStudent = (studentId) => {
        setSelectedStudent(studentId);
        // Mark messages from this student as read?
        // Ideally we should mark them as read when viewed
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyBody.trim() || !selectedStudent) return;

        try {
            setSendingReply(true);
            await messageService.sendMessage({
                recipientId: selectedStudent,
                content: replyBody
            });
            setReplyBody("");
            await loadMessages();
        } catch (err) {
            alert("Failed to send reply: " + err.message);
        } finally {
            setSendingReply(false);
        }
    };

    const getSortedStudentIds = () => {
        return Object.keys(students).sort((a, b) => {
            // Sort by unread count (desc), then last message date (desc)
            const sA = students[a];
            const sB = students[b];
            if (sA.unreadCount !== sB.unreadCount) return sB.unreadCount - sA.unreadCount;
            return new Date(sB.lastMessage?.createdAt) - new Date(sA.lastMessage?.createdAt);
        });
    };

    if (loading) return <div className="page-loading">Loading messages...</div>;

    const sortedIds = getSortedStudentIds();

    return (
        <div className="page admin-messages-page">
            <Section title="💬 Student Messages">
                <div className="messages-container" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px", height: "600px" }}>

                    <div className="students-list" style={{ borderRight: "1px solid #1f2937", overflowY: "auto", paddingRight: "10px" }}>
                        {sortedIds.length === 0 ? (
                            <p>No messages found.</p>
                        ) : (
                            sortedIds.map(id => {
                                const group = students[id];
                                return (
                                    <div
                                        key={id}
                                        onClick={() => handleSelectStudent(id)}
                                        className={`student-item ${selectedStudent === id ? "active" : ""}`}
                                        style={{
                                            padding: "10px",
                                            cursor: "pointer",
                                            borderRadius: "8px",
                                            backgroundColor: selectedStudent === id ? "#1f2937" : "transparent",
                                            marginBottom: "5px",
                                            border: "1px solid #1f2937"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <strong>{group.student.name}</strong>
                                            {group.unreadCount > 0 && (
                                                <span className="badge" style={{ backgroundColor: "#ef4444", color: "white", padding: "2px 6px", borderRadius: "10px", fontSize: "0.8rem" }}>
                                                    {group.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: "0.8rem", color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {group.lastMessage?.content}
                                        </p>
                                        <small style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                                            {new Date(group.lastMessage?.createdAt).toLocaleDateString()}
                                        </small>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="chat-area" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        {!selectedStudent ? (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                                Select a conversation to view details
                            </div>
                        ) : (
                            <>
                                <div className="chat-header" style={{ paddingBottom: "10px", borderBottom: "1px solid #1f2937", marginBottom: "10px" }}>
                                    <h3>Chat with {students[selectedStudent].student.name}</h3>
                                </div>

                                <div className="chat-messages" style={{ flex: 1, overflowY: "auto", paddingRight: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {students[selectedStudent].messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(msg => (
                                        <div
                                            key={msg._id}
                                            style={{
                                                alignSelf: msg.isStudentToAdmin ? "flex-start" : "flex-end",
                                                backgroundColor: msg.isStudentToAdmin ? "#1f2937" : "#059669",
                                                padding: "10px 15px",
                                                borderRadius: "15px",
                                                maxWidth: "70%",
                                                color: "white"
                                            }}
                                        >
                                            <p>{msg.content}</p>
                                            <div style={{ fontSize: "0.7rem", marginTop: "5px", opacity: 0.7, textAlign: "right" }}>
                                                {new Date(msg.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="chat-input" style={{ marginTop: "20px", borderTop: "1px solid #1f2937", paddingTop: "10px" }}>
                                    <form onSubmit={handleReply} style={{ display: "flex", gap: "10px" }}>
                                        <input
                                            type="text"
                                            value={replyBody}
                                            onChange={(e) => setReplyBody(e.target.value)}
                                            placeholder="Type a reply..."
                                            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #374151", backgroundColor: "#ffffff", color: "#000000" }}
                                            required
                                        />
                                        <button type="submit" className="btn-primary" disabled={sendingReply}>
                                            Send
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>

                </div>
            </Section>
        </div>
    );
}
