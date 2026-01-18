/* eslint-disable */
// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/data-table";
import { Modal, message, Form, Input } from "antd";
import { Plus, Eye, Edit, Trash2, User, Copy } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Investor {
  id: string;
  "Investor Name": string;
  "Partner Name": string;
  "Partner Email": string;
  "Fund Type": string;
  "Fund Stage": string;
  "Fund Focus (Sectors)": string;
  Location: string;
  "Phone number": string;
  "Ticket Size": string;
}

export default function AllInvestorsPage() {
  const router = useRouter();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(
    null,
  );
  const [form] = Form.useForm();

  const [visibleColumns, setVisibleColumns] = useState({
    serialNumber: true,
    investorName: true,
    partnerName: true,
    partnerEmail: true,
    fundType: true,
    fundStage: true,
    fundFocusSectors: true,
    location: true,
    phoneNumber: true,
    ticketSize: true,
    actions: true,
  });

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success("Email copied to clipboard!");
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      message.success("Email copied to clipboard!");
    }
  };

  const fetchInvestors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/investors`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error occurred" }));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Invalid response format from server");
      }

      const formattedData = result.data.map((investor: any, index: number) => ({
        id: investor.id || investor._id || `investor_${index}`,
        "Investor Name":
          investor["Investor Name"] ||
          investor.investor_name ||
          investor.name ||
          "",
        "Partner Name":
          investor["Partner Name"] ||
          investor.partner_name ||
          investor.contact ||
          "",
        "Partner Email":
          investor["Partner Email"] ||
          investor.partner_email ||
          investor.email ||
          "",
        "Fund Type": investor["Fund Type"] || investor.fund_type || "",
        "Fund Stage": investor["Fund Stage"] || investor.fund_stage || "",
        "Fund Focus (Sectors)":
          investor["Fund Focus (Sectors)"] ||
          investor.fund_focus_sectors ||
          investor.sector_focus ||
          "",
        Location: investor["Location"] || investor.location || "",
        "Phone number": investor["Phone number"] || investor.phone_number || "",
        "Ticket Size": investor["Ticket Size"] || investor.ticket_size || "",
      }));

      setInvestors(formattedData);
      message.success(`Successfully loaded ${formattedData.length} investors`);
    } catch (error) {
      console.error("Failed to fetch investors:", error);
      message.error(
        error instanceof Error
          ? error.message
          : "Failed to load investors. Please try again.",
      );
      setInvestors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, []);

  const handleDeleteInvestor = (investorId: string) => {
    const investor = investors.find((inv) => inv.id === investorId);

    Modal.confirm({
      title: "Delete Investor",
      content: `Are you sure you want to delete ${
        investor?.["Investor Name"] || "this investor"
      }? This action cannot be undone.`,
      okText: "Delete",
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/investors/${investorId}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            },
          );

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Failed to delete investor" }));
            throw new Error(
              errorData.error || `HTTP error: ${response.status}`,
            );
          }

          message.success("Investor deleted successfully");
          fetchInvestors();
        } catch (error) {
          console.error("Failed to delete investor:", error);
          message.error(
            error instanceof Error
              ? error.message
              : "Failed to delete investor. Please try again.",
          );
        }
      },
    });
  };

  const handleEditInvestor = async (values: any) => {
    setEditLoading(true);
    try {
      if (!selectedInvestor?.id) {
        message.error("Invalid investor selected");
        return;
      }

      const updates = {
        "Investor Name":
          values["Investor Name"] || selectedInvestor["Investor Name"],
        "Partner Name": values["Partner Name"],
        "Partner Email":
          values["Partner Email"] || selectedInvestor["Partner Email"],
        "Phone number": values["Phone number"],
        "Fund Type": values["Fund Type"],
        "Fund Stage": values["Fund Stage"],
        "Fund Focus (Sectors)": values["Fund Focus (Sectors)"],
        Location: values["Location"],
        "Ticket Size": values["Ticket Size"],
      };

      const response = await fetch(
        `${API_BASE_URL}/investors/${selectedInvestor.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to update investor" }));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      message.success("Investor updated successfully");
      setEditModalOpen(false);
      setSelectedInvestor(null);
      form.resetFields();
      fetchInvestors();
    } catch (error) {
      console.error("Failed to update investor:", error);
      message.error(
        error instanceof Error
          ? error.message
          : "Failed to update investor. Please try again.",
      );
    } finally {
      setEditLoading(false);
    }
  };

  const columns: Column[] = [
    {
      key: "serialNumber",
      title: "Sr. No.",
      width: 80,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      key: "investorName",
      title: "Investor Name",
      width: 200,
      render: (_, record) => {
        const name = record["Investor Name"];
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-medium">{name || "N/A"}</span>
          </div>
        );
      },
    },
    {
      key: "partnerName",
      title: "Partner Name",
      width: 160,
      render: (_, record) => record["Partner Name"] || "N/A",
    },
    {
      key: "partnerEmail",
      title: "Partner Email",
      width: 220,
      render: (_, record) => {
        const email = record["Partner Email"];
        return email ? (
          <div className="flex items-center gap-2">
            <span className="text-blue-600">{email}</span>
            <button
              onClick={() => copyToClipboard(email)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Copy email"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        ) : (
          "N/A"
        );
      },
    },
    {
      key: "fundType",
      title: "Fund Type",
      width: 140,
      render: (_, record) => record["Fund Type"] || "N/A",
    },
    {
      key: "fundStage",
      title: "Fund Stage",
      width: 140,
      render: (_, record) => {
        const stage = record["Fund Stage"];
        if (!stage) return "N/A";

        const stageList =
          typeof stage === "string"
            ? stage.split(",").map((s) => s.trim())
            : [stage];

        return (
          <div className="flex flex-wrap gap-1">
            {stageList.slice(0, 2).map((s, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {String(s)}
              </span>
            ))}
            {stageList.length > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                +{stageList.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "fundFocusSectors",
      title: "Fund Focus (Sectors)",
      width: 240,
      render: (_, record) => {
        const sectors = record["Fund Focus (Sectors)"];
        if (!sectors) return "N/A";
        const sectorList =
          typeof sectors === "string"
            ? sectors.split(",").map((s) => s.trim())
            : [sectors];
        return (
          <div className="flex flex-wrap gap-1">
            {sectorList.slice(0, 2).map((s, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
              >
                {String(s)}
              </span>
            ))}
            {sectorList.length > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                +{sectorList.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "location",
      title: "Location",
      width: 180,
      render: (_, record) => record["Location"] || "N/A",
    },
    {
      key: "phoneNumber",
      title: "Phone Number",
      width: 160,
      render: (_, record) => record["Phone number"] || "N/A",
    },
    {
      key: "ticketSize",
      title: "Ticket Size",
      width: 140,
      render: (_, record) => record["Ticket Size"] || "N/A",
    },
    {
      key: "actions",
      title: "Actions",
      width: 140,
      align: "center",
      render: (_, record) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setSelectedInvestor(record);
              setViewModalOpen(true);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedInvestor(record);
              form.setFieldsValue(record);
              setEditModalOpen(true);
            }}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteInvestor(record.id)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              All Investors
            </h1>
          </div>

          <button
            onClick={() => router.push("/dashboard/add-investor")}
            className="flex items-center gap-2 px-4 py-2 bg-[#ac6a1e] text-white rounded-lg hover:bg-[#8d5518] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Investors</span>
          </button>
        </div>
      </div>

      <div className="pt-3">
        <DataTable
          columns={columns}
          data={investors}
          loading={loading}
          onRefresh={fetchInvestors}
          searchPlaceholder="Search investors by name, email, or focus..."
          searchKeys={[
            "Investor Name",
            "Partner Name",
            "Partner Email",
            "Fund Stage",
            "Fund Focus (Sectors)",
            "Location",
          ]}
          rowKey={(record, index) => record.id || `investor_${index}`}
          visibleColumns={visibleColumns}
          onColumnVisibilityChange={setVisibleColumns}
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          dataSource="Google Sheets"
          lastUpdated={new Date().toLocaleTimeString()}
        />
      </div>

      <Modal
        title="Investor Details"
        open={viewModalOpen}
        onCancel={() => {
          setViewModalOpen(false);
          setSelectedInvestor(null);
        }}
        footer={null}
        width={800}
      >
        {selectedInvestor && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries({
              "Investor Name": selectedInvestor["Investor Name"],
              "Partner Name": selectedInvestor["Partner Name"],
              "Partner Email": selectedInvestor["Partner Email"],
              "Phone Number": selectedInvestor["Phone number"],
              "Fund Type": selectedInvestor["Fund Type"],
              "Fund Stage": selectedInvestor["Fund Stage"],
              "Fund Focus (Sectors)": selectedInvestor["Fund Focus (Sectors)"],
              Location: selectedInvestor["Location"],
              "Ticket Size": selectedInvestor["Ticket Size"],
            }).map(([label, value]) => (
              <div
                key={label}
                className="border border-gray-200 rounded-lg p-3"
              >
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="font-medium text-gray-900 break-words">
                  {value || "N/A"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        title="Edit Investor"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setSelectedInvestor(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form form={form} onFinish={handleEditInvestor} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="Investor Name" label="Investor Name">
              <Input placeholder="Investor Name" />
            </Form.Item>
            <Form.Item name="Partner Name" label="Partner Name">
              <Input placeholder="Partner Name" />
            </Form.Item>
            <Form.Item
              name="Partner Email"
              label="Partner Email"
              rules={[{ type: "email", message: "Enter a valid email" }]}
            >
              <Input placeholder="Partner Email" />
            </Form.Item>
            <Form.Item name="Phone number" label="Phone Number">
              <Input placeholder="Phone Number" />
            </Form.Item>
            <Form.Item name="Fund Type" label="Fund Type">
              <Input placeholder="Fund Type" />
            </Form.Item>
            <Form.Item name="Fund Stage" label="Fund Stage">
              <Input placeholder="Fund Stage" />
            </Form.Item>
            <Form.Item name="Location" label="Location">
              <Input placeholder="Location" />
            </Form.Item>
            <Form.Item name="Fund Focus (Sectors)" label="Fund Focus (Sectors)">
              <Input placeholder="Fund Focus (Sectors)" />
            </Form.Item>
            <Form.Item name="Ticket Size" label="Ticket Size">
              <Input placeholder="Ticket Size" />
            </Form.Item>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={editLoading}
              className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                editLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {editLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editLoading ? "Updating..." : "Save Changes"}
            </button>
            <button
              type="button"
              disabled={editLoading}
              onClick={() => {
                setEditModalOpen(false);
                setSelectedInvestor(null);
                form.resetFields();
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-disabled"
            >
              Cancel
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
