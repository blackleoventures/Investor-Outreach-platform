/* eslint-disable */
// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import DataTable, { type Column } from "@/components/data-table";
import { Modal, message, Form, Input } from "antd";
import { Plus, Eye, Edit, Trash2, User } from "lucide-react";

export default function AllInvestorsPage() {
  const router = useRouter();
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
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

  const fetchInvestors = async () => {
    setLoading(true);
    try {
      const cacheBuster = `_t=${Date.now()}`;
      const response = await apiFetch(
        `/api/investors?limit=100000&page=1&${cacheBuster}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        const investorData = result.docs || result.data || [];

        const formattedData = investorData.map((investor: any) => ({
          ...investor,
          "Investor Name":
            investor["Investor Name"] ||
            investor.investor_name ||
            investor.name ||
            "Unknown",
          "Partner Name":
            investor["Partner Name"] ||
            investor.partner_name ||
            investor.contact ||
            "Unknown",
          "Partner Email":
            investor["Partner Email"] ||
            investor.partner_email ||
            investor.email ||
            "",
          "Fund Type": investor["Fund Type"] || investor.fund_type || "Unknown",
          "Fund Stage":
            investor["Fund Stage"] || investor.fund_stage || "Unknown",
          "Fund Focus (Sectors)":
            investor["Fund Focus (Sectors)"] ||
            investor.fund_focus_sectors ||
            investor.sector_focus ||
            "Unknown",
          Location: investor["Location"] || investor.location || "Unknown",
          "Phone number":
            investor["Phone number"] || investor.phone_number || "",
          "Ticket Size": investor["Ticket Size"] || investor.ticket_size || "",
        }));

        setInvestors(formattedData);
      } else {
        message.error("Failed to fetch investors data");
      }
    } catch (error) {
      message.error("Failed to fetch investors data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
    const interval = setInterval(fetchInvestors, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteInvestor = (investorId) => {
    Modal.confirm({
      title: "Delete Investor",
      content: "Are you sure you want to delete this investor?",
      okText: "Delete",
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        try {
          const response = await apiFetch(`/api/investors/${investorId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            message.success("Investor deleted successfully!");
            fetchInvestors();
          } else {
            message.error("Failed to delete investor");
          }
        } catch (error) {
          message.error("Failed to delete investor");
        }
      },
    });
  };

  const handleEditInvestor = async (values) => {
    try {
      const id = selectedInvestor?.id ?? selectedInvestor?._id;
      if (!id) {
        message.error("Missing investor id");
        return;
      }

      const updates = Object.fromEntries(
        Object.entries(values || {}).filter(([, v]) => v !== undefined)
      );

      if (
        !("Partner Email" in updates) &&
        selectedInvestor &&
        selectedInvestor["Partner Email"]
      ) {
        updates["Partner Email"] = selectedInvestor["Partner Email"];
      }
      if (
        !("Investor Name" in updates) &&
        selectedInvestor &&
        selectedInvestor["Investor Name"]
      ) {
        updates["Investor Name"] = selectedInvestor["Investor Name"];
      }

      const response = await apiFetch(`/api/investors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        message.success("Investor updated successfully!");
        fetchInvestors();
      } else {
        const err = await response.json().catch(() => ({}));
        message.error(err.error || "Failed to update investor");
      }
    } catch (error) {
      message.error("Failed to update investor");
    }

    setEditModalOpen(false);
    setSelectedInvestor(null);
    form.resetFields();
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
        return email ? <span className="text-blue-600">{email}</span> : "N/A";
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
        return stage ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {stage}
          </span>
        ) : (
          "N/A"
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

  const visibleColumnsArray = columns.filter(
    (col) => visibleColumns[col.key] !== false
  );

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              All Investors
            </h1>
            {/* <p className="text-sm text-gray-600 mt-1">
              Browse, search and manage investors
            </p> */}
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

      {/* Data Table */}
      <div className=" pt-3">
        <DataTable
          columns={visibleColumnsArray}
          data={investors}
          loading={loading}
          onRefresh={fetchInvestors}
          searchPlaceholder="Search investors by name, email, or focus..."
          searchKeys={[
            "Investor Name",
            "Partner Name",
            "Partner Email",
            "Fund Focus (Sectors)",
            "Location",
          ]}
          rowKey={(record, index) => {
            const email = (record["Partner Email"] ?? "")
              .toString()
              .toLowerCase();
            const name = (record["Investor Name"] ?? "")
              .toString()
              .toLowerCase();
            return `${index}-${email || name || Math.random()}`;
          }}
          visibleColumns={visibleColumns}
          onColumnVisibilityChange={setVisibleColumns}
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          dataSource="Google Sheets"
          lastUpdated={new Date().toLocaleTimeString()}
        />
      </div>

      {/* View Modal */}
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

      {/* Edit Modal */}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setEditModalOpen(false);
                setSelectedInvestor(null);
                form.resetFields();
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
