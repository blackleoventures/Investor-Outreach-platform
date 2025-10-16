// @ts-nocheck
"use client";

import { Modal, message } from "antd";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import DataTable, { type Column } from "@/components/data-table";
import { Eye, Edit2, Trash2, Mail, Copy, Check } from "lucide-react";

const Campaigns = () => {
  const { currentUser, login } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState("all");
  const [campaignStats, setCampaignStats] = useState({});
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: "",
    type: "Email",
    status: "draft",
    recipients: 0,
  });

  useEffect(() => {
    loadCampaigns();

    // Real-time campaign tracking
    const interval = setInterval(() => {
      loadCampaigns();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      // Load campaign tracking stats
      const tracking = JSON.parse(
        localStorage.getItem("campaignTracking") || "{}"
      );
      setCampaignStats(tracking);

      // Load from localStorage first (real campaigns)
      let localCampaigns = JSON.parse(
        localStorage.getItem("campaigns") || "[]"
      );

      // Strip any previously-seeded demo/placeholder items
      if (Array.isArray(localCampaigns)) {
        const cleaned = localCampaigns.filter((c: any) => {
          const name = (c?.name || "").toString();
          const isKnownDemo =
            (c?.id === "1" && name === "TechStartup_Seed_Outreach") ||
            (name === "TechStartup_Seed_Outreach" &&
              (c?.recipients === 15 || c?.stats));
          return !isKnownDemo;
        });
        if (cleaned.length !== localCampaigns.length) {
          localCampaigns = cleaned;
          try {
            localStorage.setItem("campaigns", JSON.stringify(localCampaigns));
          } catch {}
        }
      }

      // Load from sessionStorage for current campaign
      const savedCampaign = sessionStorage.getItem("currentCampaign");
      if (savedCampaign) {
        try {
          const campaignData = JSON.parse(savedCampaign);
          // Add to campaigns if not already present
          const exists = localCampaigns.find((c) => c.id === campaignData.id);
          if (!exists) {
            localCampaigns.unshift(campaignData);
          }
        } catch (e) {
          console.error("Failed to load saved campaign:", e);
        }
      }

      // If nothing in local, attempt restore from backup
      if (!Array.isArray(localCampaigns) || localCampaigns.length === 0) {
        try {
          const backup = JSON.parse(
            localStorage.getItem("campaigns_backup") || "[]"
          );
          if (Array.isArray(backup) && backup.length > 0) {
            // Also strip demo from backup
            const cleanedBackup = backup.filter(
              (c: any) =>
                c?.id !== "1" && (c?.name || "") !== "TechStartup_Seed_Outreach"
            );
            localCampaigns = cleanedBackup;
            try {
              localStorage.setItem("campaigns", JSON.stringify(localCampaigns));
            } catch {}
            if (localCampaigns.length > 0)
              message.success("Restored campaigns from backup");
          }
        } catch {}
      }

      setCampaigns(localCampaigns);
    } catch (e) {
      console.error("Failed to load campaigns:", e);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (campaign) => {
    setSelected(campaign);
    setViewOpen(true);
  };

  const handleEdit = (campaign, index) => {
    setSelected(campaign);
    setEditIndex(index);
    setEditFormData({
      name: campaign.name || "",
      type: campaign.type || "Email",
      status: campaign.status || "draft",
      recipients: campaign.recipients ?? (campaign.audience?.length || 0),
    });
    setEditOpen(true);
  };

  const handleDelete = (campaign, index) => {
    Modal.confirm({
      title: "Delete this campaign?",
      content: "This action cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const id = campaign.id || campaign._id;
          // Create a backup before mutating
          try {
            localStorage.setItem(
              "campaigns_backup",
              localStorage.getItem("campaigns") || "[]"
            );
          } catch {}
          if (id) {
            // Use Next.js API route to avoid CORS and attach auth implicitly from browser
            const idToken = currentUser
              ? await currentUser.getIdToken(true)
              : undefined;
            const headers: any = idToken
              ? { Authorization: `Bearer ${idToken}` }
              : {};
            await fetch(`/api/campaign/${id}`, { method: "DELETE", headers });
          }
          setCampaigns((prev) => {
            const updated = id
              ? prev.filter((c) => (c.id || c._id) !== id)
              : prev.filter((_, i) => i !== index);
            try {
              localStorage.setItem("campaigns", JSON.stringify(updated));
              const current = sessionStorage.getItem("currentCampaign");
              if (current) {
                const parsed = JSON.parse(current);
                if (id && (parsed?.id || parsed?._id) === id) {
                  sessionStorage.removeItem("currentCampaign");
                }
              }
            } catch {}
            return updated;
          });
          message.success("Campaign deleted");
        } catch {
          message.error("Delete failed");
        }
      },
    });
  };

  const handleSaveEdit = () => {
    if (!editFormData.name.trim()) {
      message.error("Campaign name is required");
      return;
    }

    setCampaigns((prev) => {
      const list = [...prev];
      if (editIndex !== null) {
        list[editIndex] = { ...list[editIndex], ...editFormData };
      }
      try {
        localStorage.setItem("campaigns", JSON.stringify(list));
      } catch {}
      return list;
    });
    setEditOpen(false);
    message.success("Campaign updated");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Filter campaigns by client
  const filteredCampaigns =
    selectedClient === "all"
      ? campaigns
      : campaigns.filter((c) => c.clientName === selectedClient);

  // Get unique clients
  const clients = [
    "all",
    ...new Set(campaigns.map((c) => c.clientName).filter(Boolean)),
  ];

  const columns = [
    {
      key: "serial",
      title: "S.No.",
      render: (_, __, idx) => <span className="text-gray-700">{idx + 1}</span>,
    },
    {
      key: "name",
      title: "Campaign Name",
      render: (record) => (
        <span className="font-medium text-gray-900">{record.name}</span>
      ),
    },
    {
      key: "clientName",
      title: "Client",
      render: (record) => (
        <span className="text-gray-700">{record.clientName || "-"}</span>
      ),
    },
    {
      key: "type",
      title: "Type",
      render: (record) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {record.type || "Email"}
        </span>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (record) => {
        const status = record.status || "draft";
        const isActive = status.toLowerCase() === "active";
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive
                ? "bg-green-100 text-green-800"
                : "bg-orange-100 text-orange-800"
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      key: "recipients",
      title: "Recipients",
      render: (record) => {
        const sentEmails =
          record?.sentEmails?.length ?? record?.emailsSent ?? 0;
        const isDraft = (record.status || "draft").toLowerCase() === "draft";

        return (
          <span
            className={`font-medium ${
              isDraft ? "text-gray-700" : "text-green-600"
            }`}
          >
            {sentEmails}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      title: "Created Date",
      render: (record) => {
        const date = record.createdAt;
        return (
          <span className="text-gray-700">
            {date
              ? new Date(
                  date.seconds ? date.seconds * 1000 : date
                ).toLocaleDateString()
              : "-"}
          </span>
        );
      },
    },
    {
      key: "actions",
      title: "Actions",
      render: (record, index) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleView(record)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(record, index)}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title={
              (record.status || "").toLowerCase() === "draft"
                ? "Edit Campaign"
                : "Edit (Draft only)"
            }
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(record, index)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const sentEmailsColumns = [
    {
      key: "serial",
      title: "S.No.",
      render: (_, __, index) => (
        <span className="text-gray-700">{index + 1}</span>
      ),
    },
    {
      key: "email",
      title: "Investor Email",
      render: (record) => (
        <div className="flex items-center gap-2">
          <span className="text-blue-600">{record.email}</span>
          <button
            onClick={() => copyToClipboard(record.email)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Copy email"
          >
            {copiedEmail === record.email ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: "subject",
      title: "Subject",
      render: (record) => (
        <span
          className="text-gray-700 truncate block max-w-xs"
          title={record.subject}
        >
          {record.subject || selected?.subject || "-"}
        </span>
      ),
    },
    {
      key: "sentAt",
      title: "Sent At",
      render: (record) => (
        <span className="text-sm text-gray-600">
          {record.sentAt ? new Date(record.sentAt).toLocaleString() : "-"}
        </span>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: () => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Sent
        </span>
      ),
    },
  ];

  return (
    <div>
      <div>
        <div className="mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">
                Campaign Management
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">
                Filter by client:
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Clients</option>
                {clients
                  .filter((c) => c !== "all")
                  .map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        <div className="pt-3">
          <DataTable
            columns={columns}
            data={filteredCampaigns}
            loading={loading}
            onRefresh={loadCampaigns}
            searchPlaceholder="Search campaigns..."
            searchKeys={["name", "clientName", "type", "status"]}
            rowKey={(record, index) =>
              record.id || record._id || `${record.name || "campaign"}-${index}`
            }
            customizeColumns={true}
            pageSize={10}
            pageSizeOptions={[10, 20, 50]}
          />
        </div>
      </div>

      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleSaveEdit}
        okText="Save"
        cancelText="Cancel"
        title={<span className="text-lg font-semibold">Edit Campaign</span>}
      >
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter campaign name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={editFormData.type}
              onChange={(e) =>
                setEditFormData({ ...editFormData, type: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="Email">Email</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={editFormData.status}
              onChange={(e) =>
                setEditFormData({ ...editFormData, status: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipients
            </label>
            <input
              type="number"
              min={0}
              value={editFormData.recipients}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  recipients: Number.parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={null}
        width={1200}
        title={
          <span className="text-lg font-semibold">
            Campaign Details - Sent Emails
          </span>
        }
        style={{ top: 20 }}
      >
        {selected && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto p-1">
            {/* Campaign Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Campaign</div>
                  <div className="font-semibold text-gray-900">
                    {selected.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Client</div>
                  <div className="font-semibold text-gray-900">
                    {selected.clientName || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (selected.status || "draft").toLowerCase() === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {selected.status || "draft"}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Sent</div>
                  <div className="font-semibold text-green-600">
                    {selected?.sentEmails?.length || selected?.emailsSent || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Sent Emails List */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Sent Emails ({selected?.sentEmails?.length || 0})
              </h3>
              {selected?.sentEmails && selected.sentEmails.length > 0 ? (
                <DataTable
                  columns={sentEmailsColumns}
                  data={selected.sentEmails}
                  loading={false}
                  onRefresh={() => {}}
                  searchPlaceholder="Search emails..."
                  searchKeys={["email", "subject"]}
                  rowKey={(record, index) => record.email + index}
                  customizeColumns={false}
                  pageSize={10}
                  pageSizeOptions={[10, 20, 50]}
                />
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <div className="text-gray-700 font-medium mb-1">
                    No emails sent yet
                  </div>
                  <div className="text-sm text-gray-500">
                    Emails will appear here once the campaign is executed
                  </div>
                </div>
              )}
            </div>

            {/* Campaign Details */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                📋 Campaign Details
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 bg-gray-50">
                    <div className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100">
                      Subject
                    </div>
                    <div className="px-4 py-3 text-sm text-gray-900 sm:col-span-2">
                      {selected.subject || "-"}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3">
                    <div className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100">
                      Email Body
                    </div>
                    <div className="px-4 py-3 text-sm text-gray-900 sm:col-span-2">
                      <div className="max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {selected.body || selected.emailBody || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 bg-gray-50">
                    <div className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100">
                      Schedule
                    </div>
                    <div className="px-4 py-3 text-sm text-gray-900 sm:col-span-2">
                      {selected.schedule ||
                        selected.scheduleType ||
                        "Immediate"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default function Page() {
  return <Campaigns />;
}
