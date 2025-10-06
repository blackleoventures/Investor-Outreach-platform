/* eslint-disable */
// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/data-table";
import { Modal, message, Form, Input} from "antd";
import { Plus, Eye, Edit, Trash2, User, Copy } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Incubator {
  id: string;
  "Incubator Name": string;
  "Partner Name": string;
  "Partner Email": string;
  "Phone Number": string;
  "Sector Focus": string;
  Country: string;
  "State/City": string;
  Website: string;
}

export default function AllIncubatorsPage() {
  const router = useRouter();
  const [incubators, setIncubators] = useState<Incubator[]>([]);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedIncubator, setSelectedIncubator] = useState<Incubator | null>(null);
  const [form] = Form.useForm();

  const [visibleColumns, setVisibleColumns] = useState({
    serialNumber: true,
    incubatorName: true,
    partnerName: true,
    partnerEmail: true,
    phoneNumber: true,
    sectorFocus: true,
    country: true,
    stateCity: true,
    website: true,
    actions: true,
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success("Email copied to clipboard!");
    } catch (error) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      message.success("Email copied to clipboard!");
    }
  };

  const fetchIncubators = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/incubators`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load incubators");
      }

      const result = await response.json();

      if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Invalid response format from server");
      }

      const formattedData = result.data.map((incubator: any, index: number) => ({
        id: incubator.id || incubator._id || `incubator_${index}`,
        "Incubator Name": incubator["Incubator Name"] || incubator.incubator_name || incubator.name || "",
        "Partner Name": incubator["Partner Name"] || incubator.partner_name || incubator.contact || "",
        "Partner Email": incubator["Partner Email"] || incubator.partner_email || incubator.email || "",
        "Phone Number": incubator["Phone Number"] || incubator.phone_number || "",
        "Sector Focus": incubator["Sector Focus"] || incubator.sector_focus || incubator.focus || "",
        Country: incubator["Country"] || incubator.country || "",
        "State/City": incubator["State/City"] || incubator.state_city || incubator.location || "",
        Website: incubator["Website"] || incubator.website || "",
      }));

      setIncubators(formattedData);
      message.success(`Successfully loaded ${formattedData.length} incubators`);
    } catch (error) {
      console.error("Failed to fetch incubators:", error);
      message.error("Unable to load incubators. Please try again.");
      setIncubators([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncubators();
  }, []);

  const handleDeleteIncubator = (incubatorId: string) => {
    const incubator = incubators.find((inc) => inc.id === incubatorId);

    Modal.confirm({
      title: "Delete Incubator",
      content: `Are you sure you want to delete ${incubator?.["Incubator Name"] || "this incubator"}? This action cannot be undone.`,
      okText: "Delete",
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/incubators/${incubatorId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Failed to delete incubator");
          }

          message.success("Incubator deleted successfully");
          fetchIncubators();
        } catch (error) {
          console.error("Failed to delete incubator:", error);
          message.error("Unable to delete incubator. Please try again.");
        }
      },
    });
  };

  const handleEditIncubator = async (values: any) => {
    setEditLoading(true);
    try {
      if (!selectedIncubator?.id) {
        message.error("Invalid incubator selected");
        return;
      }

      const updates = {
        "Incubator Name": values["Incubator Name"] || selectedIncubator["Incubator Name"],
        "Partner Name": values["Partner Name"],
        "Partner Email": values["Partner Email"] || selectedIncubator["Partner Email"],
        "Phone Number": values["Phone Number"],
        "Sector Focus": values["Sector Focus"],
        Country: values["Country"],
        "State/City": values["State/City"],
        Website: values["Website"],
      };

      const response = await fetch(`${API_BASE_URL}/incubators/${selectedIncubator.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update incubator");
      }

      message.success("Incubator updated successfully");
      setEditModalOpen(false);
      setSelectedIncubator(null);
      form.resetFields();
      fetchIncubators();
    } catch (error) {
      console.error("Failed to update incubator:", error);
      message.error("Unable to update incubator. Please try again.");
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
      key: "incubatorName",
      title: "Incubator Name",
      width: 200,
      render: (_, record) => {
        const name = record["Incubator Name"];
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <User className="h-4 w-4 text-purple-600" />
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
      key: "phoneNumber",
      title: "Phone Number",
      width: 160,
      render: (_, record) => record["Phone Number"] || "N/A",
    },
    {
      key: "sectorFocus",
      title: "Sector Focus",
      width: 180,
      render: (_, record) => {
        const sectors = record["Sector Focus"];
        if (!sectors) return "N/A";
        const sectorList = typeof sectors === "string" ? sectors.split(",").map((s) => s.trim()) : [sectors];
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
      key: "country",
      title: "Country",
      width: 140,
      render: (_, record) => record["Country"] || "N/A",
    },
    {
      key: "stateCity",
      title: "State/City",
      width: 160,
      render: (_, record) => record["State/City"] || "N/A",
    },
    {
      key: "website",
      title: "Website",
      width: 180,
      render: (_, record) => {
        const website = record["Website"];
        return website ? (
          <a href={website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {website.length > 30 ? website.substring(0, 30) + "..." : website}
          </a>
        ) : (
          "N/A"
        );
      },
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
              setSelectedIncubator(record);
              setViewModalOpen(true);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedIncubator(record);
              form.setFieldsValue(record);
              setEditModalOpen(true);
            }}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteIncubator(record.id)}
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Incubators</h1>
          </div>

          <button
            onClick={() => router.push("/dashboard/add-incubator")}
            className="flex items-center gap-2 px-4 py-2 bg-[#ac6a1e] text-white rounded-lg hover:bg-[#8d5518] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Incubators</span>
          </button>
        </div>
      </div>

      <div className="pt-3">
        <DataTable
          columns={columns}
          data={incubators}
          loading={loading}
          onRefresh={fetchIncubators}
          searchPlaceholder="Search incubators by name, email, or sector..."
          searchKeys={[
            "Incubator Name",
            "Partner Name",
            "Partner Email",
            "Sector Focus",
            "Country",
            "State/City",
          ]}
          rowKey={(record, index) => record.id || `incubator_${index}`}
          visibleColumns={visibleColumns}
          onColumnVisibilityChange={setVisibleColumns}
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          dataSource="Google Sheets"
          lastUpdated={new Date().toLocaleTimeString()}
        />
      </div>

      <Modal
        title="Incubator Details"
        open={viewModalOpen}
        onCancel={() => {
          setViewModalOpen(false);
          setSelectedIncubator(null);
        }}
        footer={null}
        width={800}
      >
        {selectedIncubator && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries({
              "Incubator Name": selectedIncubator["Incubator Name"],
              "Partner Name": selectedIncubator["Partner Name"],
              "Partner Email": selectedIncubator["Partner Email"],
              "Phone Number": selectedIncubator["Phone Number"],
              "Sector Focus": selectedIncubator["Sector Focus"],
              Country: selectedIncubator["Country"],
              "State/City": selectedIncubator["State/City"],
              Website: selectedIncubator["Website"],
            }).map(([label, value]) => (
              <div key={label} className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="font-medium text-gray-900 break-words">{value || "N/A"}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        title="Edit Incubator"
        open={editModalOpen}
        onCancel={() => {
          if (!editLoading) {
            setEditModalOpen(false);
            setSelectedIncubator(null);
            form.resetFields();
          }
        }}
        footer={null}
        width={800}
        maskClosable={!editLoading}
        closable={!editLoading}
      >
          <Form form={form} onFinish={handleEditIncubator} layout="vertical">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="Incubator Name"
                label="Incubator Name"
                rules={[
                  { required: true, message: "Incubator name is required" },
                  { whitespace: true, message: "Incubator name cannot be empty" },
                ]}
              >
                <Input placeholder="Incubator Name" disabled={editLoading} />
              </Form.Item>
              <Form.Item
                name="Partner Name"
                label="Partner Name"
                rules={[
                  { required: true, message: "Partner name is required" },
                  { whitespace: true, message: "Partner name cannot be empty" },
                ]}
              >
                <Input placeholder="Partner Name" disabled={editLoading} />
              </Form.Item>
              <Form.Item
                name="Partner Email"
                label="Partner Email"
                rules={[
                  { required: true, message: "Partner email is required" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input placeholder="Partner Email" disabled={editLoading} />
              </Form.Item>
              <Form.Item
                name="Phone Number"
                label="Phone Number"
                rules={[
                  { required: true, message: "Phone number is required" },
                  { whitespace: true, message: "Phone number cannot be empty" },
                ]}
              >
                <Input placeholder="Phone Number" disabled={editLoading} />
              </Form.Item>
              <Form.Item
                name="Sector Focus"
                label="Sector Focus"
                rules={[
                  { required: true, message: "Sector focus is required" },
                  { whitespace: true, message: "Sector focus cannot be empty" },
                ]}
              >
                <Input placeholder="Sector Focus" disabled={editLoading} />
              </Form.Item>
              <Form.Item
                name="Country"
                label="Country"
                rules={[
                  { required: true, message: "Country is required" },
                  { whitespace: true, message: "Country cannot be empty" },
                ]}
              >
                <Input placeholder="Country" disabled={editLoading} />
              </Form.Item>
              <Form.Item
                name="State/City"
                label="State/City"
                rules={[
                  { required: true, message: "State/City is required" },
                  { whitespace: true, message: "State/City cannot be empty" },
                ]}
              >
                <Input placeholder="State/City" disabled={editLoading} />
              </Form.Item>
              <Form.Item name="Website" label="Website (Optional)" rules={[{ type: "url", message: "Enter a valid URL" }]}>
                <Input placeholder="https://example.com" disabled={editLoading} />
              </Form.Item>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={editLoading}
                className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                  editLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {editLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editLoading ? "Updating..." : "Save Changes"}
              </button>
              <button
                type="button"
                disabled={editLoading}
                onClick={() => {
                  setEditModalOpen(false);
                  setSelectedIncubator(null);
                  form.resetFields();
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </Form>
      </Modal>
    </div>
  );
}