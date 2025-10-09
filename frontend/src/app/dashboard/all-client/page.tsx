"use client";

import {
  message,
  Modal,
  Spin,
  Tabs,
  Progress,
  Collapse,
  Button as AntButton,
  Input,
  InputNumber,
  Tooltip,
} from "antd";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Upload,
  FileText,
  TrendingUp,
  BarChart2,
  RefreshCw,
  Settings,
  Copy,
  Check,
  Mail,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/data-table";
import { auth } from "@/lib/firebase";

const { TabPane } = Tabs;
const { Panel } = Collapse;
const { TextArea } = Input;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface PitchAnalysis {
  fileName?: string;
  analyzedAt?: string;
  summary: {
    problem: string;
    solution: string;
    market: string;
    traction: string;
    status: "RED" | "YELLOW" | "GREEN";
    total_score: number;
  };
  scorecard: Record<string, number>;
  suggested_questions: string[];
  highlights: string[];
  email_subject?: string;
  email_body?: string;
}

interface UsageLimits {
  formEditCount: number;
  pitchAnalysisCount: number;
  maxFormEdits: number;
  maxPitchAnalysis: number;
  canEditForm: boolean;
  canAnalyzePitch: boolean;
}

interface Client {
  id: string;
  userId: string;
  founderName: string;
  email: string;
  phone: string;
  companyName: string;
  industry: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  city: string;
  gmailAppPassword?: string;
  pitchAnalyses: PitchAnalysis[];
  pitchAnalysisCount: number;
  usageLimits: UsageLimits;
  archived: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EditFormData {
  founderName: string;
  email: string;
  phone: string;
  companyName: string;
  industry: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  city: string;
  gmailAppPassword: string;
  archived: boolean;
}

interface UsageLimitsFormData {
  formEditCount: number;
  pitchAnalysisCount: number;
  maxFormEdits: number;
  maxPitchAnalysis: number;
}

const ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE_EMAIL: "A client with this email already exists.",
  VALIDATION_ERROR: "Please check all required fields.",
  UNAUTHORIZED: "Your session has expired. Please log in again.",
  TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  CLIENT_NOT_FOUND: "Client not found.",
  SERVER_ERROR: "Something went wrong. Please try again.",
  NETWORK_ERROR: "Unable to connect. Please check your internet.",
  DEFAULT: "An error occurred. Please try again.",
};

const ClientsData = () => {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [usageLimitsModalVisible, setUsageLimitsModalVisible] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [resetFormLoading, setResetFormLoading] = useState(false);
  const [resetAnalysisLoading, setResetAnalysisLoading] = useState(false);
  const [resetAllLoading, setResetAllLoading] = useState(false);

  const [editFormData, setEditFormData] = useState<EditFormData>({
    founderName: "",
    email: "",
    phone: "",
    companyName: "",
    industry: "",
    fundingStage: "",
    revenue: "",
    investment: "",
    city: "",
    gmailAppPassword: "",
    archived: false,
  });

  const [usageLimitsFormData, setUsageLimitsFormData] =
    useState<UsageLimitsFormData>({
      formEditCount: 0,
      pitchAnalysisCount: 0,
      maxFormEdits: 4,
      maxPitchAnalysis: 2,
    });

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      companyName: true,
      founderName: true,
      email: true,
      phone: true,
      fundingStage: true,
      revenue: true,
      investment: true,
      industry: true,
      city: true,
      pitchAnalysis: true,
      usageCredits: true,
      emailVerified: false,
      archived: false,
      onboarding: false,
    }
  );

  useEffect(() => {
    fetchAllClients();
  }, []);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        message.error(ERROR_MESSAGES.UNAUTHORIZED);
        router.push("/login");
        return null;
      }
      return await user.getIdToken(true);
    } catch (error) {
      console.error("[Get Token Error]:", error);
      message.error(ERROR_MESSAGES.UNAUTHORIZED);
      router.push("/login");
      return null;
    }
  };

  const getUserFriendlyError = (errorCode?: string): string => {
    if (!navigator.onLine) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    return ERROR_MESSAGES[errorCode || "DEFAULT"] || ERROR_MESSAGES.DEFAULT;
  };

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedField(fieldName);
        message.success(`${fieldName} copied to clipboard!`);
        setTimeout(() => setCopiedField(null), 2000);
      })
      .catch(() => {
        message.error("Failed to copy to clipboard");
      });
  };

  const fetchAllClients = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      console.log("[Fetch Clients] Fetching from:", `${API_BASE_URL}/clients`);

      const response = await fetch(`${API_BASE_URL}/clients`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("[Fetch Clients] Response:", data);

      if (!response.ok) {
        const errorMessage = getUserFriendlyError(data.error?.code);
        throw new Error(errorMessage);
      }

      setClients(data.data || []);
      console.log("[Fetch Clients] First client data:", data.data[0]);
    } catch (error) {
      console.error("[Fetch Clients Error]:", error);
      const errorMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.DEFAULT;
      message.error(errorMessage);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setDeleteLoading(clientId);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = getUserFriendlyError(data.error?.code);
        throw new Error(errorMessage);
      }

      message.success("Client deleted successfully");
      setClients((prevClients) =>
        prevClients.filter((client) => client.id !== clientId)
      );
    } catch (error) {
      console.error("[Delete Client Error]:", error);
      const errorMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.DEFAULT;
      message.error(errorMessage);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleViewClient = (client: Client) => {
    console.log("[View Client]", client);
    setSelectedClient(client);
    setModalVisible(true);
  };

  const handleEditClient = (client: Client) => {
    console.log("[Edit Client]", client);
    setSelectedClient(client);
    setModalVisible(false);
    setEditModalVisible(true);
    setEditFormData({
      founderName: client.founderName || "",
      email: client.email || "",
      phone: client.phone || "",
      companyName: client.companyName || "",
      industry: client.industry || "",
      fundingStage: client.fundingStage || "",
      revenue: client.revenue || "",
      investment: client.investment || "",
      city: client.city || "",
      gmailAppPassword: client.gmailAppPassword || "",
      archived: client.archived || false,
    });
  };

  const handleManageUsageLimits = (client: Client) => {
    console.log("[Manage Usage Limits]", client);
    setSelectedClient(client);
    setUsageLimitsFormData({
      formEditCount: client.usageLimits?.formEditCount || 0,
      pitchAnalysisCount: client.usageLimits?.pitchAnalysisCount || 0,
      maxFormEdits: client.usageLimits?.maxFormEdits || 4,
      maxPitchAnalysis: client.usageLimits?.maxPitchAnalysis || 2,
    });
    setUsageLimitsModalVisible(true);
  };

  const handleResetFormEdits = async (clientId: string) => {
    setResetFormLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      console.log("[Reset Form Edits]", clientId);

      const response = await fetch(
        `${API_BASE_URL}/clients/${clientId}/reset-form-edits`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = getUserFriendlyError(data.error?.code);
        throw new Error(errorMessage);
      }

      message.success("Form edit limits reset to 0 successfully");
      await fetchAllClients();

      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient(data.data);
      }
    } catch (error) {
      console.error("[Reset Form Edits Error]:", error);
      const errorMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.DEFAULT;
      message.error(errorMessage);
    } finally {
      setResetFormLoading(false);
    }
  };

  const handleResetPitchAnalysis = async (clientId: string) => {
    setResetAnalysisLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      console.log("[Reset Pitch Analysis]", clientId);

      const response = await fetch(
        `${API_BASE_URL}/clients/${clientId}/reset-pitch-analysis`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = getUserFriendlyError(data.error?.code);
        throw new Error(errorMessage);
      }

      message.success("Pitch analysis limits reset to 0 successfully");
      await fetchAllClients();

      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient(data.data);
      }
    } catch (error) {
      console.error("[Reset Pitch Analysis Error]:", error);
      const errorMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.DEFAULT;
      message.error(errorMessage);
    } finally {
      setResetAnalysisLoading(false);
    }
  };

  const handleResetAllLimits = async (clientId: string) => {
    setResetAllLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      console.log("[Reset All Limits]", clientId);

      const response = await fetch(
        `${API_BASE_URL}/clients/${clientId}/reset-all-limits`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = getUserFriendlyError(data.error?.code);
        throw new Error(errorMessage);
      }

      message.success("All usage limits reset to 0 successfully");
      await fetchAllClients();

      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient(data.data);
      }
    } catch (error) {
      console.error("[Reset All Limits Error]:", error);
      const errorMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.DEFAULT;
      message.error(errorMessage);
    } finally {
      setResetAllLoading(false);
    }
  };

  const handleUpdateUsageLimits = async () => {
    if (!selectedClient) return;

    setUpdateLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const payload = {
        usageLimits: usageLimitsFormData,
      };

      console.log("[Update Usage Limits] Payload:", payload);

      const response = await fetch(
        `${API_BASE_URL}/clients/${selectedClient.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = getUserFriendlyError(data.error?.code);
        throw new Error(errorMessage);
      }

      message.success("Usage limits updated successfully");
      setUsageLimitsModalVisible(false);
      await fetchAllClients();

      if (modalVisible) {
        setSelectedClient(data.data);
      }
    } catch (error) {
      console.error("[Update Usage Limits Error]:", error);
      const errorMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.DEFAULT;
      message.error(errorMessage);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleUnarchiveClient = async (clientId: string) => {
    setUpdateLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ archived: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = getUserFriendlyError(data.error?.code);
        throw new Error(errorMessage);
      }

      message.success("Client unarchived successfully");
      await fetchAllClients();
    } catch (error) {
      console.error("[Unarchive Client Error]:", error);
      const errorMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.DEFAULT;
      message.error(errorMessage);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) return;

    setUpdateLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const payload = {
        founderName: editFormData.founderName,
        email: editFormData.email,
        phone: editFormData.phone,
        companyName: editFormData.companyName,
        industry: editFormData.industry,
        fundingStage: editFormData.fundingStage,
        revenue: editFormData.revenue,
        investment: editFormData.investment,
        city: editFormData.city,
        gmailAppPassword: editFormData.gmailAppPassword,
        archived: editFormData.archived,
      };

      console.log("[Update Client] Payload:", payload);

      const response = await fetch(
        `${API_BASE_URL}/clients/${selectedClient.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = getUserFriendlyError(data.error?.code);
        throw new Error(errorMessage);
      }

      message.success("Client updated successfully");
      setEditModalVisible(false);
      setSelectedClient(null);
      await fetchAllClients();
    } catch (error) {
      console.error("[Update Client Error]:", error);
      const errorMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.DEFAULT;
      message.error(errorMessage);
    } finally {
      setUpdateLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "GREEN":
        return "bg-green-100 text-green-800";
      case "YELLOW":
        return "bg-yellow-100 text-yellow-800";
      case "RED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return "#52c41a";
    if (score >= 40) return "#faad14";
    return "#ff4d4f";
  };

  const renderPitchAnalysis = (analysis: PitchAnalysis, index: number) => (
    <div key={index} className="border rounded-lg p-4 mb-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-blue-600" />
          <span className="font-semibold text-lg">
            {analysis.fileName || `Analysis ${index + 1}`}
          </span>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
            analysis.summary.status
          )}`}
        >
          {analysis.summary.status}
        </span>
      </div>

      {analysis.analyzedAt && (
        <div className="text-xs text-gray-500 mb-3">
          Analyzed on{" "}
          {new Date(analysis.analyzedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Investment Readiness Score
          </span>
          <span className="text-xl font-bold">
            {analysis.summary.total_score}/100
          </span>
        </div>
        <Progress
          percent={analysis.summary.total_score}
          strokeColor={getProgressColor(analysis.summary.total_score)}
          strokeWidth={12}
        />
      </div>

      <Collapse ghost>
        <Panel header="Summary" key="summary">
          <div className="space-y-3">
            <div>
              <div className="font-semibold text-sm mb-1">Problem</div>
              <div className="text-sm text-gray-700">
                {analysis.summary.problem}
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm mb-1">Solution</div>
              <div className="text-sm text-gray-700">
                {analysis.summary.solution}
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm mb-1">Market</div>
              <div className="text-sm text-gray-700">
                {analysis.summary.market}
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm mb-1">Traction</div>
              <div className="text-sm text-gray-700">
                {analysis.summary.traction}
              </div>
            </div>
          </div>
        </Panel>

        <Panel header="Detailed Scorecard" key="scorecard">
          <div className="space-y-3">
            {Object.entries(analysis.scorecard).map(([criteria, score]) => (
              <div key={criteria}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{criteria}</span>
                  <span className="text-sm font-bold text-blue-600">
                    {score}/10
                  </span>
                </div>
                <Progress
                  percent={score * 10}
                  strokeColor="#1890ff"
                  strokeWidth={8}
                  showInfo={false}
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel header="Key Highlights" key="highlights">
          <div className="space-y-2">
            {analysis.highlights.map((highlight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 bg-green-50 rounded"
              >
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-sm">{highlight}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel header="Suggested Questions" key="questions">
          <div className="space-y-2">
            {analysis.suggested_questions.map((question, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 bg-blue-50 rounded"
              >
                <span className="text-blue-600 mt-1">?</span>
                <span className="text-sm">{question}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Email Content Panel */}
        {(analysis.email_subject || analysis.email_body) && (
          <Panel
            header={
              <div className="flex items-center gap-2">
                <span>Email Content</span>
              </div>
            }
            key="email"
          >
            <div className="space-y-4">
              {analysis.email_subject && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Email Subject
                    </label>
                    <Tooltip
                      title={
                        copiedField === `subject-${index}`
                          ? "Copied!"
                          : "Copy Subject"
                      }
                    >
                      <button
                        onClick={() =>
                          handleCopyToClipboard(
                            analysis.email_subject!,
                            `subject-${index}`
                          )
                        }
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        {copiedField === `subject-${index}` ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-gray-800 font-medium">
                      {analysis.email_subject}
                    </p>
                  </div>
                </div>
              )}

              {analysis.email_body && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Email Body
                    </label>
                    <Tooltip
                      title={
                        copiedField === `body-${index}`
                          ? "Copied!"
                          : "Copy Email Body"
                      }
                    >
                      <button
                        onClick={() =>
                          handleCopyToClipboard(
                            analysis.email_body!,
                            `body-${index}`
                          )
                        }
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        {copiedField === `body-${index}` ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                  <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                    <TextArea
                      value={analysis.email_body}
                      readOnly
                      autoSize={{ minRows: 6, maxRows: 20 }}
                      className="font-mono text-sm"
                      style={{
                        resize: "none",
                        backgroundColor: "#fafafa",
                        border: "none",
                        boxShadow: "none",
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <AntButton
                  icon={<Copy size={16} />}
                  onClick={() => {
                    const fullEmail = `Subject: ${
                      analysis.email_subject || ""
                    }\n\n${analysis.email_body || ""}`;
                    handleCopyToClipboard(fullEmail, `full-email-${index}`);
                  }}
                  type="default"
                  block
                >
                  Copy Full Email (Subject + Body)
                </AntButton>
              </div>
            </div>
          </Panel>
        )}
      </Collapse>
    </div>
  );

  const columns: Column[] = [
    {
      key: "companyName",
      title: "Company Name",
      render: (_, record: Client) => (
        <span className="text-sm font-medium">
          {record.companyName || "N/A"}
        </span>
      ),
    },
    {
      key: "founderName",
      title: "Founder Name",
      render: (_, record: Client) => (
        <span className="text-sm">{record.founderName || "N/A"}</span>
      ),
    },
    {
      key: "email",
      title: "Email",
      render: (_, record: Client) => (
        <span className="text-sm">{record.email || "N/A"}</span>
      ),
    },
    {
      key: "phone",
      title: "Phone",
      render: (_, record: Client) => (
        <span className="text-sm">{record.phone || "N/A"}</span>
      ),
    },
    {
      key: "emailVerified",
      title: "Email Verified",
      render: (_, record: Client) => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            record.emailVerified
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {record.emailVerified ? "Verified" : "Not Verified"}
        </span>
      ),
    },
    {
      key: "archived",
      title: "Is Archived",
      render: (_, record: Client) => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            record.archived
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {record.archived ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "fundingStage",
      title: "Funding Stage",
      render: (_, record: Client) => (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
          {record.fundingStage || "N/A"}
        </span>
      ),
    },
    {
      key: "revenue",
      title: "Revenue",
      render: (_, record: Client) => (
        <span className="text-sm">{record.revenue || "N/A"}</span>
      ),
    },
    {
      key: "investment",
      title: "Investment Ask",
      render: (_, record: Client) => (
        <span className="text-sm">{record.investment || "N/A"}</span>
      ),
    },
    {
      key: "industry",
      title: "Industry",
      render: (_, record: Client) => {
        if (!record.industry) {
          return <span className="text-sm text-gray-500">N/A</span>;
        }

        const industries = record.industry
          .split(/\/|,/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);

        if (industries.length === 0) {
          return <span className="text-sm text-gray-500">N/A</span>;
        }

        return (
          <div className="flex flex-wrap gap-1">
            {industries.slice(0, 2).map((industry, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {industry}
              </span>
            ))}
            {industries.length > 2 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                +{industries.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "city",
      title: "City",
      render: (_, record: Client) => (
        <span className="text-sm">{record.city || "N/A"}</span>
      ),
    },
    {
      key: "onboarding",
      title: "Onboarding Info",
      render: (_, record: Client) => {
        if (!record.createdAt) return <span className="text-sm">N/A</span>;

        const onboardedDate = new Date(record.createdAt);
        const today = new Date();
        const diffTime = today.getTime() - onboardedDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return (
          <span className="text-sm">
            {diffDays} day{diffDays !== 1 ? "s" : ""} ago
          </span>
        );
      },
    },
    {
      key: "actions",
      title: "Actions",
      align: "center",
      render: (_, record: Client) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleViewClient(record)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="View details"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => handleEditClient(record)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
            title="Edit client"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={() => handleManageUsageLimits(record)}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
            title="Manage usage limits"
          >
            <Settings size={18} />
          </button>
          {record.archived && (
            <button
              onClick={() => handleUnarchiveClient(record.id)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
              title="Unarchive client"
              disabled={updateLoading}
            >
              {updateLoading ? <Spin size="small" /> : <Upload size={18} />}
            </button>
          )}
          <button
            onClick={() => {
              Modal.confirm({
                title: "Delete this client?",
                content:
                  "This action cannot be undone. All pitch analyses will be deleted.",
                okText: "Delete",
                cancelText: "Cancel",
                okButtonProps: { danger: true },
                onOk: () => handleDeleteClient(record.id),
              });
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Delete client"
            disabled={deleteLoading === record.id}
          >
            {deleteLoading === record.id ? (
              <Spin size="small" />
            ) : (
              <Trash2 size={18} />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
          Client Management
        </h1>
        <button
          onClick={() => router.push("/dashboard/add-client")}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
          style={{ backgroundColor: "#ac6a1e" }}
        >
          <Plus size={18} />
          <span>Add Client</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={clients}
        loading={loading}
        onRefresh={fetchAllClients}
        searchPlaceholder="Search by email, company or founder name..."
        searchKeys={["email", "companyName", "founderName", "phone"]}
        rowKey={(record: Client) => record.id}
        visibleColumns={visibleColumns}
        onColumnVisibilityChange={setVisibleColumns}
        customizeColumns={true}
        pageSize={10}
        pageSizeOptions={[5, 10, 20, 50]}
      />

      {/* View Modal */}
      <Modal
        title={<span className="text-lg font-semibold">Client Details</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={900}
        style={{ top: 20 }}
      >
        {selectedClient && (
          <Tabs defaultActiveKey="1" className="p-4">
            <TabPane tab="Basic Information" key="1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2 border-b pb-3">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Founder Name
                  </div>
                  <div className="text-base text-gray-900">
                    {selectedClient.founderName || "N/A"}
                  </div>
                </div>

                <div className="col-span-2 border-b pb-3">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Email
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base text-gray-900 break-all">
                      {selectedClient.email || "N/A"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedClient.emailVerified
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {selectedClient.emailVerified
                        ? "Verified"
                        : "Not Verified"}
                    </span>
                  </div>
                </div>

                <div className="border-b pb-3">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Phone
                  </div>
                  <div className="text-base text-gray-900">
                    {selectedClient.phone || "N/A"}
                  </div>
                </div>

                <div className="border-b pb-3">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Company Name
                  </div>
                  <div className="text-base font-semibold text-gray-900">
                    {selectedClient.companyName || "N/A"}
                  </div>
                </div>

                <div className="border-b pb-3">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Industry
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {selectedClient.industry || "N/A"}
                  </span>
                </div>

                <div className="border-b pb-3">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Funding Stage
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {selectedClient.fundingStage || "N/A"}
                  </span>
                </div>

                <div className="border-b pb-3">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Revenue
                  </div>
                  <div className="text-base text-gray-900">
                    {selectedClient.revenue || "N/A"}
                  </div>
                </div>

                <div className="border-b pb-3">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Investment Ask
                  </div>
                  <div className="text-base text-gray-900">
                    {selectedClient.investment || "N/A"}
                  </div>
                </div>

                <div className="border-b pb-3">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    City
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {selectedClient.city || "N/A"}
                  </span>
                </div>

                {selectedClient.createdAt && (
                  <div className="border-b pb-3">
                    <div className="text-sm font-medium text-gray-500 mb-1">
                      Onboarded
                    </div>
                    <div className="text-base text-gray-900">
                      {(() => {
                        const onboardedDate = new Date(
                          selectedClient.createdAt
                        );
                        const today = new Date();
                        const diffDays = Math.floor(
                          (today.getTime() - onboardedDate.getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        return `${diffDays} day${
                          diffDays !== 1 ? "s" : ""
                        } ago`;
                      })()}
                    </div>
                  </div>
                )}

                <div className="border-b pb-3">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Is Archived
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedClient.archived
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {selectedClient.archived ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </TabPane>

            <TabPane
              tab={`Pitch Analyses (${
                selectedClient.pitchAnalyses?.length || 0
              })`}
              key="2"
            >
              <div className="max-h-[500px] overflow-y-auto">
                {selectedClient.pitchAnalyses &&
                selectedClient.pitchAnalyses.length > 0 ? (
                  selectedClient.pitchAnalyses.map((analysis, index) =>
                    renderPitchAnalysis(analysis, index)
                  )
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText
                      size={48}
                      className="mx-auto mb-3 text-gray-300"
                    />
                    <p>No pitch analyses yet</p>
                  </div>
                )}
              </div>
            </TabPane>

            <TabPane tab="Usage Statistics" key="3">
              <div className="space-y-6 p-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Edit size={20} className="text-blue-600" />
                      <span className="font-semibold">Form Edits</span>
                    </div>
                    <span className="text-lg font-bold">
                      {selectedClient.usageLimits?.formEditCount || 0} /{" "}
                      {selectedClient.usageLimits?.maxFormEdits || 4}
                    </span>
                  </div>
                  <Progress
                    percent={
                      ((selectedClient.usageLimits?.formEditCount || 0) /
                        (selectedClient.usageLimits?.maxFormEdits || 4)) *
                      100
                    }
                    strokeColor="#1890ff"
                  />
                  <div className="mt-2 text-sm text-gray-600">
                    {selectedClient.usageLimits?.canEditForm
                      ? "Can still edit"
                      : "Edit limit reached"}
                  </div>
                  <div className="mt-3">
                    <AntButton
                      icon={<RefreshCw size={16} />}
                      onClick={() => handleResetFormEdits(selectedClient.id)}
                      loading={resetFormLoading}
                      type="default"
                      size="small"
                      block
                    >
                      Reset Form Edits to 0
                    </AntButton>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart2 size={20} className="text-green-600" />
                      <span className="font-semibold">Pitch Analyses</span>
                    </div>
                    <span className="text-lg font-bold">
                      {selectedClient.usageLimits?.pitchAnalysisCount || 0} /{" "}
                      {selectedClient.usageLimits?.maxPitchAnalysis || 2}
                    </span>
                  </div>
                  <Progress
                    percent={
                      ((selectedClient.usageLimits?.pitchAnalysisCount || 0) /
                        (selectedClient.usageLimits?.maxPitchAnalysis || 2)) *
                      100
                    }
                    strokeColor="#52c41a"
                  />
                  <div className="mt-2 text-sm text-gray-600">
                    {selectedClient.usageLimits?.canAnalyzePitch
                      ? "Can add more analyses"
                      : "Analysis limit reached"}
                  </div>
                  <div className="mt-3">
                    <AntButton
                      icon={<RefreshCw size={16} />}
                      onClick={() =>
                        handleResetPitchAnalysis(selectedClient.id)
                      }
                      loading={resetAnalysisLoading}
                      type="default"
                      size="small"
                      block
                    >
                      Reset Pitch Analysis to 0
                    </AntButton>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <AntButton
                    icon={<RefreshCw size={16} />}
                    onClick={() => handleResetAllLimits(selectedClient.id)}
                    loading={resetAllLoading}
                    type="default"
                    danger
                  >
                    Reset Both to 0
                  </AntButton>
                  <AntButton
                    icon={<Settings size={16} />}
                    onClick={() => {
                      setModalVisible(false);
                      handleManageUsageLimits(selectedClient);
                    }}
                    type="primary"
                    style={{
                      backgroundColor: "#1890ff",
                      borderColor: "#1890ff",
                    }}
                  >
                    Manage Limits
                  </AntButton>
                </div>
              </div>
            </TabPane>
          </Tabs>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={<span className="text-lg font-semibold">Edit Client</span>}
        open={editModalVisible}
        onCancel={() => !updateLoading && setEditModalVisible(false)}
        footer={[
          <button
            key="cancel"
            onClick={() => setUsageLimitsModalVisible(false)}
            disabled={updateLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>,
          <button
            key="reset-form"
            onClick={() =>
              selectedClient && handleResetFormEdits(selectedClient.id)
            }
            disabled={updateLoading || resetFormLoading}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
          >
            {resetFormLoading ? <Spin size="small" /> : "Reset Form Edits"}
          </button>,
          <button
            key="reset-analysis"
            onClick={() =>
              selectedClient && handleResetPitchAnalysis(selectedClient.id)
            }
            disabled={updateLoading || resetAnalysisLoading}
            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
          >
            {resetAnalysisLoading ? <Spin size="small" /> : "Reset Analysis"}
          </button>,
          <button
            key="reset-all"
            onClick={() =>
              selectedClient && handleResetAllLimits(selectedClient.id)
            }
            disabled={updateLoading || resetAllLoading}
            className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-300 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
          >
            {resetAllLoading ? <Spin size="small" /> : "Reset Both"}
          </button>,
          <button
            key="save"
            onClick={handleUpdateUsageLimits}
            disabled={updateLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
          >
            {updateLoading ? <Spin size="small" /> : "Save Changes"}
          </button>,
        ]}
        width={800}
      >
        {selectedClient && (
          <form onSubmit={handleUpdateClient} className="space-y-4 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Founder Name
                </label>
                <input
                  type="text"
                  value={editFormData.founderName}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      founderName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updateLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updateLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updateLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={editFormData.companyName}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      companyName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updateLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={editFormData.industry}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      industry: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updateLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Funding Stage
                </label>
                <select
                  value={editFormData.fundingStage}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      fundingStage: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updateLoading}
                >
                  <option value="">Select...</option>
                  <option value="Pre-seed">Pre-seed</option>
                  <option value="Seed">Seed</option>
                  <option value="Series A">Series A</option>
                  <option value="Series B">Series B</option>
                  <option value="Series C">Series C</option>
                  <option value="Growth">Growth</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Revenue
                </label>
                <input
                  type="text"
                  value={editFormData.revenue}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      revenue: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updateLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Investment Ask
                </label>
                <input
                  type="text"
                  value={editFormData.investment}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      investment: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updateLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={editFormData.city}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, city: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updateLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gmail App Password
                </label>
                <input
                  type="text"
                  value={editFormData.gmailAppPassword}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      gmailAppPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updateLoading}
                  placeholder="16 character app password"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editFormData.archived}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      archived: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  id="archive-checkbox"
                  disabled={updateLoading}
                />
                <label
                  htmlFor="archive-checkbox"
                  className="ml-2 text-sm text-gray-700"
                >
                  Archive Client
                </label>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Usage Limits Management Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Settings size={20} />
            <span className="text-lg font-semibold">Manage Usage Limits</span>
          </div>
        }
        open={usageLimitsModalVisible}
        onCancel={() => !updateLoading && setUsageLimitsModalVisible(false)}
        footer={[
          <button
            key="cancel"
            onClick={() => setUsageLimitsModalVisible(false)}
            disabled={updateLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>,
          <button
            key="reset"
            onClick={() =>
              selectedClient && handleResetUsageLimits(selectedClient.id)
            }
            disabled={updateLoading || resetLoading}
            className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-300 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
          >
            {resetLoading ? <Spin size="small" /> : "Reset to Default"}
          </button>,
          <button
            key="save"
            onClick={handleUpdateUsageLimits}
            disabled={updateLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
          >
            {updateLoading ? <Spin size="small" /> : "Save Changes"}
          </button>,
        ]}
        width={600}
      >
        <div className="p-4 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Form Edits
                </label>
                <InputNumber
                  min={0}
                  max={usageLimitsFormData.maxFormEdits}
                  value={usageLimitsFormData.formEditCount}
                  onChange={(value) =>
                    setUsageLimitsFormData({
                      ...usageLimitsFormData,
                      formEditCount: value || 0,
                    })
                  }
                  className="w-full"
                  size="large"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Form Edits
                </label>
                <InputNumber
                  min={usageLimitsFormData.formEditCount}
                  max={100}
                  value={usageLimitsFormData.maxFormEdits}
                  onChange={(value) =>
                    setUsageLimitsFormData({
                      ...usageLimitsFormData,
                      maxFormEdits: value || 4,
                    })
                  }
                  className="w-full"
                  size="large"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Pitch Analyses
                </label>
                <InputNumber
                  min={0}
                  max={usageLimitsFormData.maxPitchAnalysis}
                  value={usageLimitsFormData.pitchAnalysisCount}
                  onChange={(value) =>
                    setUsageLimitsFormData({
                      ...usageLimitsFormData,
                      pitchAnalysisCount: value || 0,
                    })
                  }
                  className="w-full"
                  size="large"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Pitch Analyses
                </label>
                <InputNumber
                  min={usageLimitsFormData.pitchAnalysisCount}
                  max={100}
                  value={usageLimitsFormData.maxPitchAnalysis}
                  onChange={(value) =>
                    setUsageLimitsFormData({
                      ...usageLimitsFormData,
                      maxPitchAnalysis: value || 2,
                    })
                  }
                  className="w-full"
                  size="large"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <div className="font-semibold mb-2">💡 Usage Limits Guide:</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Current:</strong> How many times the client has
                  already used this feature
                </li>
                <li>
                  <strong>Max:</strong> Maximum allowed uses (increase to give
                  more credits)
                </li>
                <li>
                  <strong>Reset:</strong> Sets "Current" back to 0 while keeping
                  "Max" unchanged
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default function Page() {
  return <ClientsData />;
}
