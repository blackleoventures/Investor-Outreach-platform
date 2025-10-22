"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, message, Spin } from "antd";
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  User,
} from "lucide-react";
import DataTable, { type Column } from "@/components/data-table";
import { useAuth } from "@/contexts/AuthContext";

interface Account {
  uid: string;
  email: string;
  displayName: string;
  role: "admin" | "subadmin";
  password?: string;
  photoURL?: string;
  active?: boolean;
  createdAt: string;
  lastLogin: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function AccountManagementPage() {
  const { userData, currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loadedRole, setLoadedRole] = useState(false);

  useEffect(() => {
    if (userData) {
      setIsAdmin(userData.role === "admin");
      setLoadedRole(true);
    }
  }, [userData]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const getAuthToken = async () => {
    if (currentUser) {
      return await currentUser.getIdToken();
    }
    return null;
  };

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/admin-users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        message.error(data.message || "Failed to load accounts");
        return;
      }

      setAccounts(data.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error loading accounts:", error);
      message.error("Unable to load accounts. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAccounts();
    }
  }, [isAdmin]);

  const refresh = () => {
    loadAccounts();
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    photoURL?: string;
    displayName: string;
    email: string;
    password: string;
    active: boolean;
  }>({ photoURL: "", displayName: "", email: "", password: "", active: true });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const onCreateSubmit = async () => {
    if (!createForm.displayName?.trim())
      return message.error("Name is required");
    if (!createForm.email?.trim()) return message.error("Email is required");
    if (!createForm.password?.trim())
      return message.error("Password is required");

    setActionLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/admin-users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: createForm.email.trim(),
          password: createForm.password,
          displayName: createForm.displayName.trim(),
          photoURL: createForm.photoURL?.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        message.error(data.message || "Failed to create account");
        return;
      }

      message.success(data.message);
      await loadAccounts();
      setCreateOpen(false);
      setCreateForm({
        photoURL: "",
        displayName: "",
        email: "",
        password: "",
        active: true,
      });
      setShowCreatePassword(false);
    } catch (error) {
      console.error("Error creating account:", error);
      message.error("Unable to create account. Please check your connection.");
    } finally {
      setActionLoading(false);
    }
  };

  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState<{
    photoURL?: string;
    displayName: string;
    email: string;
    password: string;
    active: boolean;
    createdAt: string;
    lastLogin: string | null;
  }>({
    photoURL: "",
    displayName: "",
    email: "",
    password: "",
    active: true,
    createdAt: "",
    lastLogin: null,
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  const openEdit = (acc: Account) => {
    setCurrent(acc);
    setEditForm({
      photoURL: acc.photoURL || "",
      displayName: acc.displayName,
      email: acc.email,
      password: "",
      active: acc.active ?? true,
      createdAt: acc.createdAt,
      lastLogin: acc.lastLogin,
    });
    setEditOpen(true);
  };

  const onEditSubmit = async () => {
    if (!current) return;
    if (!editForm.displayName?.trim()) return message.error("Name is required");

    setActionLoading(true);
    try {
      const token = await getAuthToken();
      const updateData: any = {
        displayName: editForm.displayName.trim(),
        photoURL: editForm.photoURL?.trim() || undefined,
        active: !!editForm.active,
      };

      if (editForm.password?.trim()) {
        updateData.password = editForm.password;
      }

      const response = await fetch(`${API_URL}/admin-users/${current.uid}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        message.error(data.message || "Failed to update account");
        return;
      }

      message.success(data.message);
      await loadAccounts();
      setEditOpen(false);
      setCurrent(null);
      setShowEditPassword(false);
    } catch (error) {
      console.error("Error updating account:", error);
      message.error("Unable to update account. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Account | null>(null);

  const openDelete = (acc: Account) => {
    setToDelete(acc);
    setDeleteOpen(true);
  };

  const onDeleteConfirm = async () => {
    if (!toDelete) return;

    setActionLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/admin-users/${toDelete.uid}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        message.error(data.message || "Failed to delete account");
        return;
      }

      message.success(data.message);
      await loadAccounts();
      setDeleteOpen(false);
      setToDelete(null);
    } catch (error) {
      console.error("Error deleting account:", error);
      message.error("Unable to delete account. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<Account>[] = useMemo(
    () => [
      {
        key: "user",
        title: "User",
        render: (_, rec) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full overflow-hidden bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center">
              {rec.photoURL ? (
                <img
                  src={rec.photoURL}
                  alt={`${rec.displayName}'s avatar`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.innerHTML =
                      '<div class="text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                  }}
                />
              ) : (
                <User className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {rec.displayName}
              </span>
              <span className="text-xs text-gray-500">{rec.role}</span>
            </div>
          </div>
        ),
      },
      { key: "email", title: "Email", dataIndex: "email" },
      {
        key: "status",
        title: "Status",
        render: (_, rec) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              rec.active
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {rec.active ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        key: "createdAt",
        title: "Created",
        render: (_, r) => (
          <span className="text-gray-700 text-sm">
            {new Date(r.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        key: "lastLogin",
        title: "Last Login",
        render: (_, r) => (
          <span className="text-gray-700 text-sm">
            {r.lastLogin ? new Date(r.lastLogin).toLocaleString() : "Never"}
          </span>
        ),
      },
      {
        key: "actions",
        title: "Actions",
        align: "right",
        render: (_, rec) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => openEdit(rec)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              disabled={actionLoading}
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => openDelete(rec)}
              className="inline-flex items-center gap-1 rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-sm hover:bg-red-50"
              disabled={actionLoading}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        ),
      },
    ],
    [actionLoading]
  );

  if (!loadedRole) {
    return (
      <main className="p-6">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-800">
          <h2 className="text-lg font-semibold mb-1">Unauthorized</h2>
          <p className="text-sm">
            Only users with the admin role can access Account Management.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-pretty text-2xl font-semibold tracking-tight text-gray-900">
          Account Management
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            disabled={actionLoading}
          >
            <Plus className="h-4 w-4" />
            <span>Create Account</span>
          </button>
        </div>
      </div>

      <div className="pt-3">
        <DataTable<Account>
          columns={columns}
          data={accounts}
          loading={loading}
          onRefresh={refresh}
          searchPlaceholder="Search accounts..."
          searchKeys={["displayName", "email", "role"]}
          rowKey={(r) => r.uid}
          customizeColumns
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
          lastUpdated={lastUpdated}
        />
      </div>

      {/* Create Modal - Same as before */}
      <Modal
        open={createOpen}
        onCancel={() => !actionLoading && setCreateOpen(false)}
        onOk={onCreateSubmit}
        okText="Create"
        title="Create Account"
        destroyOnClose
        maskClosable={!actionLoading}
        centered
        confirmLoading={actionLoading}
        okButtonProps={{
          style: {
            backgroundColor: "#1677ff",
            borderColor: "#1677ff",
            color: "#fff",
          },
          disabled: actionLoading,
        }}
        cancelButtonProps={{
          style: { borderColor: "#d9d9d9", color: "rgba(0, 0, 0, 0.88)" },
          disabled: actionLoading,
        }}
      >
        <div className="mt-2 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Image URL (optional)
            </label>
            <input
              type="url"
              placeholder="https://example.com/avatar.jpg"
              value={createForm.photoURL || ""}
              onChange={(e) =>
                setCreateForm((s) => ({ ...s, photoURL: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={actionLoading}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              placeholder="John Doe"
              value={createForm.displayName}
              onChange={(e) =>
                setCreateForm((s) => ({ ...s, displayName: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={actionLoading}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              placeholder="john@example.com"
              value={createForm.email}
              onChange={(e) =>
                setCreateForm((s) => ({ ...s, email: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={actionLoading}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showCreatePassword ? "text" : "password"}
                placeholder="••••••••"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((s) => ({ ...s, password: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={actionLoading}
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={
                  showCreatePassword ? "Hide password" : "Show password"
                }
                disabled={actionLoading}
              >
                {showCreatePassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs ${
                  createForm.active ? "text-blue-700" : "text-gray-600"
                }`}
              >
                {createForm.active ? "Active" : "Inactive"}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCreateForm((s) => ({ ...s, active: !s.active }))
                }
                className={`h-6 w-11 rounded-full transition-colors ${
                  createForm.active ? "bg-blue-500" : "bg-gray-300"
                }`}
                aria-pressed={createForm.active}
                aria-label="Toggle active"
                disabled={actionLoading}
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${
                    createForm.active ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Modal with Password Field */}
      <Modal
        open={editOpen}
        onCancel={() => !actionLoading && setEditOpen(false)}
        onOk={onEditSubmit}
        okText="Update"
        title="Edit Account"
        destroyOnClose
        maskClosable={!actionLoading}
        centered
        confirmLoading={actionLoading}
        okButtonProps={{
          style: {
            backgroundColor: "#1677ff",
            borderColor: "#1677ff",
            color: "#fff",
          },
          disabled: actionLoading,
        }}
        cancelButtonProps={{
          style: { borderColor: "#d9d9d9", color: "rgba(0, 0, 0, 0.88)" },
          disabled: actionLoading,
        }}
      >
        <div className="mt-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-gray-200 bg-gray-100 flex items-center justify-center">
              {editForm.photoURL ? (
                <img
                  src={editForm.photoURL}
                  alt="avatar"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.innerHTML =
                      '<div class="text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                  }}
                />
              ) : (
                <User className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-800">Created:</span>{" "}
                {new Date(editForm.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="font-medium text-gray-800">Last Login:</span>{" "}
                {editForm.lastLogin
                  ? new Date(editForm.lastLogin).toLocaleString()
                  : "Never"}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Image URL (optional)
            </label>
            <input
              type="url"
              placeholder="https://example.com/avatar.jpg"
              value={editForm.photoURL || ""}
              onChange={(e) =>
                setEditForm((s) => ({ ...s, photoURL: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={actionLoading}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              placeholder="Full name"
              value={editForm.displayName}
              onChange={(e) =>
                setEditForm((s) => ({ ...s, displayName: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={actionLoading}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={editForm.email}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              New Password (optional)
            </label>
            <div className="relative">
              <input
                type={showEditPassword ? "text" : "password"}
                placeholder="Leave blank to keep current password"
                value={editForm.password}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, password: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={actionLoading}
              />
              <button
                type="button"
                onClick={() => setShowEditPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={
                  showEditPassword ? "Hide password" : "Show password"
                }
                disabled={actionLoading}
              >
                {showEditPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter a new password only if you want to change it
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs ${
                  editForm.active ? "text-blue-700" : "text-gray-600"
                }`}
              >
                {editForm.active ? "Active" : "Inactive"}
              </span>
              <button
                type="button"
                onClick={() =>
                  setEditForm((s) => ({ ...s, active: !s.active }))
                }
                className={`h-6 w-11 rounded-full transition-colors ${
                  editForm.active ? "bg-blue-500" : "bg-gray-300"
                }`}
                aria-pressed={editForm.active}
                aria-label="Toggle active"
                disabled={actionLoading}
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${
                    editForm.active ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Modal - Same as before */}
      <Modal
        open={deleteOpen}
        onCancel={() => !actionLoading && setDeleteOpen(false)}
        onOk={onDeleteConfirm}
        okText="Delete"
        okButtonProps={{
          danger: true,
          style: {
            backgroundColor: "#ff4d4f",
            borderColor: "#ff4d4f",
            color: "#fff",
          },
          disabled: actionLoading,
        }}
        cancelButtonProps={{
          style: { borderColor: "#d9d9d9", color: "rgba(0, 0, 0, 0.88)" },
          disabled: actionLoading,
        }}
        title="Delete Account"
        destroyOnClose
        maskClosable={!actionLoading}
        centered
        confirmLoading={actionLoading}
      >
        <p className="text-sm text-gray-700">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900">
            {toDelete?.displayName}
          </span>
          ? This action cannot be undone.
        </p>
      </Modal>
    </main>
  );
}
