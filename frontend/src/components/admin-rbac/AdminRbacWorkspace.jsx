import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Copy, FileSearch, RefreshCw, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";

const riskStyles = {
  low: "bg-[#E0F2F0] text-[#1B6F68]",
  medium: "bg-[#FFF9E8] text-[#9A6A00]",
  high: "bg-[#FFF0E6] text-[#C95630]",
  critical: "bg-[#FFE7E2] text-[#B42318]",
};

function Panel({ children, className = "" }) {
  return <section className={`rounded-lg border border-[#EFE4D0] bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

function Field({ label, children }) {
  return <label className="block text-sm font-semibold text-[#1F3B6E]"><span>{label}</span><div className="mt-2">{children}</div></label>;
}

function Badge({ children, tone = "low" }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${riskStyles[tone] || "bg-[#FBF7EE] text-[#5C6680]"}`}>{children}</span>;
}

function ConfirmModal({ title, body, confirmLabel = "Confirm", onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#10213F]/45 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#FFE7E2] p-2 text-[#B42318]"><AlertTriangle size={20} /></div>
          <div>
            <h2 className="font-display text-2xl text-[#1F3B6E]">{title}</h2>
            <p className="mt-2 text-sm text-[#5C6680]">{body}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} className="bg-[#B42318] text-white hover:bg-[#8F1D13]">{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

function groupPermissions(permissions) {
  return permissions.reduce((groups, permission) => {
    const module = permission.module || permission.catalog || "platform";
    const section = permission.section || permission.feature || "general";
    groups[module] = groups[module] || {};
    groups[module][section] = groups[module][section] || [];
    groups[module][section].push(permission);
    return groups;
  }, {});
}

function roleLabel(role) {
  return role?.label || role?.name || "Role";
}

function normalizeRoleList(items = []) {
  return [...new Set(items.filter(Boolean))].sort();
}

function roleListsEqual(left = [], right = []) {
  const a = normalizeRoleList(left);
  const b = normalizeRoleList(right);
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

const administrativePermissionPrefixes = [
  "roles.",
  "users.",
  "settings.",
  "audit.",
  "reports.",
  "credits.wallet.grant",
  "credits.wallet.refund",
  "teachers.profile.edit",
  "students.profile.edit",
  "students.credits.modify",
];

function administrativePermissionCount(user) {
  const permissions = Object.keys(user.effective_permissions || {});
  if (permissions.includes("*")) return permissions.length;
  return permissions.filter((permission) => administrativePermissionPrefixes.some((prefix) => permission.startsWith(prefix))).length;
}

export default function AdminRbacWorkspace() {
  const [tab, setTab] = useState("roles");
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [userDrafts, setUserDrafts] = useState({});
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [newRole, setNewRole] = useState({ name: "", label: "", description: "" });

  const selectedRole = roles.find((role) => role.name === selectedRoleName) || roles[0];
  const groupedPermissions = useMemo(() => groupPermissions(permissions), [permissions]);
  const filteredRoles = roles.filter((role) => [role.name, role.label, role.description, role.type, role.status].join(" ").toLowerCase().includes(search.toLowerCase()));
  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch = [permission.name, permission.description, permission.module, permission.section].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchesRisk = riskFilter === "all" || permission.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roleRes, permissionRes, userRes, auditRes] = await Promise.all([
        api.get("/admin/rbac/roles"),
        api.get("/admin/rbac/permissions"),
        api.get("/admin/rbac/users"),
        api.get("/admin/rbac/audit-logs"),
      ]);
      const nextRoles = roleRes.data || [];
      setRoles(nextRoles);
      setPermissions(permissionRes.data?.permissions || []);
      setUsers(userRes.data || []);
      setAudit(auditRes.data || []);
      const nextRole = selectedRoleName || nextRoles[0]?.name || "";
      setSelectedRoleName(nextRole);
      const role = nextRoles.find((item) => item.name === nextRole) || nextRoles[0];
      setSelectedPermissions(new Set(role?.permissions || []));
      setUserDrafts(Object.fromEntries((userRes.data || []).map((user) => [user.user_id, user.roles || [user.role].filter(Boolean)])));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not load RBAC.");
    } finally {
      setLoading(false);
    }
  }, [selectedRoleName]);

  // Initial RBAC load only; subsequent mutations refresh explicitly through load().
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const role = roles.find((item) => item.name === selectedRoleName) || roles[0];
    if (role) setSelectedPermissions(new Set(role.permissions || []));
  }, [selectedRoleName, roles]);

  const createRole = async () => {
    if (!newRole.name.trim()) {
      toast.error("Role name is required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/rbac/roles", newRole);
      toast.success("Role created.");
      setNewRole({ name: "", label: "", description: "" });
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not create role.");
    } finally {
      setSaving(false);
    }
  };

  const duplicateRole = async (role) => {
    setSaving(true);
    try {
      await api.post(`/admin/rbac/roles/${role.name}/duplicate`, { name: `${role.name}_copy`, label: `${roleLabel(role)} Copy` });
      toast.success("Role duplicated.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not duplicate role.");
    } finally {
      setSaving(false);
    }
  };

  const updateRoleStatus = async (role) => {
    setSaving(true);
    try {
      await api.patch(`/admin/rbac/roles/${role.name}/status`, { status: role.status === "active" ? "inactive" : "active" });
      toast.success("Role status updated.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not update role.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (role) => {
    setConfirm({
      title: "Delete role",
      body: `Deleting ${roleLabel(role)} is permanent and will be blocked if users would be left without roles.`,
      confirmLabel: "Delete role",
      onConfirm: async () => {
        setConfirm(null);
        setSaving(true);
        try {
          await api.delete(`/admin/rbac/roles/${role.name}`);
          toast.success("Role deleted.");
          await load();
        } catch (error) {
          toast.error(error.response?.data?.detail || "Could not delete role.");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const togglePermission = (permissionName) => {
    setSelectedPermissions((current) => {
      const next = new Set(current);
      if (next.has(permissionName)) next.delete(permissionName);
      else next.add(permissionName);
      return next;
    });
  };

  const savePermissions = async () => {
    const changed = permissions.filter((permission) => {
      const wasSelected = selectedRole?.permissions?.includes(permission.name);
      const isSelected = selectedPermissions.has(permission.name);
      return wasSelected !== isSelected && permission.risk_level === "critical";
    });
    const persist = async (confirmCritical = false) => {
      setSaving(true);
      try {
        await api.patch(`/admin/rbac/roles/${selectedRole.name}/permissions`, {
          permissions: Array.from(selectedPermissions).map((permission) => ({ permission, level: permission === "*" ? 100 : 1 })),
          confirmCritical,
        });
        toast.success("Role permissions updated.");
        await load();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Could not update permissions.");
      } finally {
        setSaving(false);
      }
    };
    if (changed.length) {
      setConfirm({
        title: "Critical permission change",
        body: `You are changing ${changed.length} critical permission(s). This can grant access to sensitive platform operations.`,
        confirmLabel: "Apply critical change",
        onConfirm: () => {
          setConfirm(null);
          persist(true);
        },
      });
    } else {
      persist(false);
    }
  };

  const toggleUserRole = (userId, roleName) => {
    setUserDrafts((drafts) => {
      const next = new Set(drafts[userId] || []);
      if (next.has(roleName)) next.delete(roleName);
      else next.add(roleName);
      return { ...drafts, [userId]: Array.from(next) };
    });
  };

  const userHasDraftChanges = (user) => !roleListsEqual(userDrafts[user.user_id] || [], user.roles || [user.role].filter(Boolean));

  const cancelUserRoleChanges = (user) => {
    setUserDrafts((drafts) => ({ ...drafts, [user.user_id]: user.roles || [user.role].filter(Boolean) }));
    toast.success("Role changes cancelled.");
  };

  const saveUserRoles = async (user) => {
    const rolesForUser = userDrafts[user.user_id] || [];
    if (!rolesForUser.length) {
      toast.error("Every user must have at least one role.");
      return;
    }
    const privileged = rolesForUser.includes("administrador_sitio");
    const persist = async (confirmPrivileged = false) => {
      setSaving(true);
      try {
        await api.patch(`/admin/rbac/users/${user.user_id}/roles`, { roles: rolesForUser, confirmPrivileged });
        toast.success("User roles updated.");
        await load();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Could not update user roles.");
      } finally {
        setSaving(false);
      }
    };
    if (privileged && !user.roles?.includes("administrador_sitio")) {
      setConfirm({
        title: "Assign Super Admin",
        body: "Super Admin grants full access to the platform. Confirm this is intentional.",
        confirmLabel: "Assign Super Admin",
        onConfirm: () => {
          setConfirm(null);
          persist(true);
        },
      });
    } else {
      persist(false);
    }
  };

  const bulkAssign = async () => {
    if (!selectedUsers.size || !selectedRoleName) return;
    setSaving(true);
    try {
      await api.post("/admin/rbac/users/bulk-roles", { userIds: Array.from(selectedUsers), roles: [selectedRoleName], mode: "assign", confirmPrivileged: selectedRoleName === "administrador_sitio" });
      toast.success("Bulk role assignment complete.");
      setSelectedUsers(new Set());
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not bulk assign roles.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Panel><div className="h-40 animate-pulse rounded-lg bg-[#FBF7EE]" /><p className="mt-3 text-sm text-[#5C6680]">Loading RBAC controls...</p></Panel>;
  }

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">Access governance</p>
            <h2 className="mt-2 font-display text-3xl text-[#1F3B6E]">Roles & Permissions</h2>
            <p className="mt-2 text-sm text-[#5C6680]">Manage additive roles, sensitive permissions, assignments, and RBAC audit history.</p>
          </div>
          <Button onClick={load} variant="outline" className="border-[#EFE4D0]"><RefreshCw size={16} className="mr-2" />Refresh</Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["roles", "matrix", "users", "audit"].map((item) => (
            <button key={item} onClick={() => setTab(item)} className={`rounded-md px-4 py-2 text-sm font-semibold capitalize ${tab === item ? "bg-[#1F3B6E] text-white" : "bg-[#FBF7EE] text-[#1F3B6E]"}`}>{item === "matrix" ? "Permissions Matrix" : item === "users" ? "User Assignments" : item}</button>
          ))}
        </div>
      </Panel>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6680]" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles, users, permissions, or audit events" className="h-11 w-full rounded-md border border-[#EFE4D0] bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" />
      </div>

      {tab === "roles" && (
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Panel>
            <h3 className="font-display text-xl text-[#1F3B6E]">Create custom role</h3>
            <div className="mt-4 grid gap-3">
              <Field label="Role key"><input value={newRole.name} onChange={(event) => setNewRole({ ...newRole, name: event.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" placeholder="school_operator" /></Field>
              <Field label="Display name"><input value={newRole.label} onChange={(event) => setNewRole({ ...newRole, label: event.target.value })} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" placeholder="School Operator" /></Field>
              <Field label="Description"><textarea value={newRole.description} onChange={(event) => setNewRole({ ...newRole, description: event.target.value })} className="min-h-20 w-full rounded-md border border-[#EFE4D0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" /></Field>
              <Button disabled={saving} onClick={createRole} className="bg-[#E8704C] text-white hover:bg-[#C95630]"><ShieldCheck size={16} className="mr-2" />Create role</Button>
            </div>
          </Panel>
          <Panel>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-[#5C6680]">
                  <tr className="border-b border-[#EFE4D0]"><th className="py-3">Role</th><th>Type</th><th>Status</th><th>Users</th><th>Permissions</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D0]">
                  {filteredRoles.map((role) => (
                    <tr key={role.name}>
                      <td className="py-4 pr-3"><p className="font-semibold text-[#1F3B6E]">{roleLabel(role)}</p><p className="text-xs text-[#5C6680]">{role.name}</p><p className="text-xs text-[#5C6680]">{role.description}</p></td>
                      <td><Badge tone={role.type === "system" ? "medium" : "low"}>{role.type}</Badge></td>
                      <td><Badge tone={role.status === "active" ? "low" : "high"}>{role.status}</Badge></td>
                      <td>{role.userCount || 0}</td>
                      <td>{role.permissionCount || 0}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => { setSelectedRoleName(role.name); setTab("matrix"); }} variant="outline" className="border-[#EFE4D0]"><FileSearch size={15} /></Button>
                          <Button disabled={saving} onClick={() => duplicateRole(role)} variant="outline" className="border-[#EFE4D0]"><Copy size={15} /></Button>
                          <Button disabled={saving || role.name === "administrador_sitio"} onClick={() => updateRoleStatus(role)} variant="outline" className="border-[#EFE4D0]">{role.status === "active" ? "Deactivate" : "Activate"}</Button>
                          <Button disabled={saving || role.type === "system"} onClick={() => deleteRole(role)} variant="outline" className="border-[#EFE4D0] text-[#B42318]"><Trash2 size={15} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRoles.length === 0 && <p className="py-8 text-center text-sm text-[#5C6680]">No roles match this search.</p>}
            </div>
          </Panel>
        </div>
      )}

      {tab === "matrix" && selectedRole && (
        <Panel>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <Field label="Editing role"><select value={selectedRoleName} onChange={(event) => setSelectedRoleName(event.target.value)} className="h-10 rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]">{roles.map((role) => <option key={role.name} value={role.name}>{roleLabel(role)}</option>)}</select></Field>
            <Field label="Risk filter"><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="h-10 rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]"><option value="all">All risk levels</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></Field>
            <Button disabled={saving} onClick={savePermissions} className="bg-[#E8704C] text-white hover:bg-[#C95630]">Save permissions</Button>
          </div>
          <div className="mt-5 grid gap-4">
            {Object.entries(groupPermissions(filteredPermissions)).map(([module, sections]) => (
              <div key={module} className="rounded-lg border border-[#EFE4D0] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-xl capitalize text-[#1F3B6E]">{module}</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-[#EFE4D0]" onClick={() => setSelectedPermissions((current) => new Set([...current, ...Object.values(sections).flat().map((item) => item.name)]))}>Select module</Button>
                    <Button variant="outline" className="border-[#EFE4D0]" onClick={() => setSelectedPermissions((current) => new Set([...current].filter((item) => !Object.values(sections).flat().some((permission) => permission.name === item))))}>Clear module</Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3">
                  {Object.entries(sections).map(([section, items]) => (
                    <div key={`${module}-${section}`} className="rounded-md bg-[#FBF7EE] p-3">
                      <p className="font-semibold capitalize text-[#1F3B6E]">{section}</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((permission) => (
                          <label key={permission.name} className={`flex min-h-20 items-start gap-3 rounded-md border p-3 ${permission.risk_level === "critical" ? "border-[#F4B4A6] bg-white" : "border-[#EFE4D0] bg-white"}`}>
                            <input aria-label={permission.name} type="checkbox" checked={selectedPermissions.has(permission.name)} onChange={() => togglePermission(permission.name)} className="mt-1 h-4 w-4 accent-[#E8704C]" />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{permission.name}</span>
                              <span className="mt-1 block text-xs text-[#5C6680]">{permission.description}</span>
                              <span className="mt-2 inline-flex"><Badge tone={permission.risk_level}>{permission.risk_level}</Badge></span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "users" && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#5C6680]">{users.length} users loaded. Selected: {selectedUsers.size}</p>
            <Button disabled={!selectedUsers.size || saving} onClick={bulkAssign} className="bg-[#1F3B6E] text-white"><UserPlus size={16} className="mr-2" />Assign selected role</Button>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.14em] text-[#5C6680]"><tr className="border-b border-[#EFE4D0]"><th className="py-3">Select</th><th>User</th><th>Status</th><th>Roles</th><th>Admin access</th><th className="text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#EFE4D0]">
                {users.filter((user) => [user.name, user.email, ...(user.roles || [])].join(" ").toLowerCase().includes(search.toLowerCase())).map((user) => (
                  <tr key={user.user_id}>
                    <td className="py-4"><input aria-label={`Select ${user.email}`} type="checkbox" checked={selectedUsers.has(user.user_id)} onChange={() => setSelectedUsers((current) => { const next = new Set(current); next.has(user.user_id) ? next.delete(user.user_id) : next.add(user.user_id); return next; })} /></td>
                    <td><p className="font-semibold text-[#1F3B6E]">{user.name || "Unnamed user"}</p><p className="text-xs text-[#5C6680]">{user.email}</p></td>
                    <td><Badge tone={user.active === false ? "high" : "low"}>{user.active === false ? "inactive" : "active"}</Badge></td>
                    <td><div className="flex max-w-xl flex-wrap gap-2">{roles.map((role) => <label key={`${user.user_id}-${role.name}`} className={`rounded-md border px-2 py-1 text-xs ${userDrafts[user.user_id]?.includes(role.name) ? "border-[#2DA89F] bg-[#E0F2F0] text-[#1B6F68]" : "border-[#EFE4D0] bg-white text-[#5C6680]"}`}><input aria-label={`${user.email} ${role.name}`} type="checkbox" checked={!!userDrafts[user.user_id]?.includes(role.name)} onChange={() => toggleUserRole(user.user_id, role.name)} className="mr-2 accent-[#2DA89F]" />{roleLabel(role)}</label>)}</div></td>
                    <td>
                      {administrativePermissionCount(user) > 0 ? (
                        <div>
                          <p className="font-semibold text-[#B42318]">{administrativePermissionCount(user)} admin</p>
                          <p className="text-xs text-[#5C6680]">{user.effective_permission_count || 0} total</p>
                        </div>
                      ) : (
                        <div>
                          <Badge tone="low">No admin access</Badge>
                          <p className="mt-1 text-xs text-[#5C6680]">{user.effective_permission_count || 0} learning/self permissions</p>
                        </div>
                      )}
                    </td>
                    <td className="text-right">
                      {userHasDraftChanges(user) ? (
                        <div className="flex justify-end gap-2">
                          <Button disabled={saving} onClick={() => cancelUserRoleChanges(user)} variant="outline" className="border-[#EFE4D0]">Cancel</Button>
                          <Button disabled={saving} onClick={() => saveUserRoles(user)} className="bg-[#E8704C] text-white hover:bg-[#C95630]">Save</Button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#5C6680]">No changes</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="py-8 text-center text-sm text-[#5C6680]">No users found.</p>}
          </div>
        </Panel>
      )}

      {tab === "audit" && (
        <Panel>
          <div className="grid gap-3">
            {audit.filter((event) => [event.event_type, event.entity_type, event.entity_id, JSON.stringify(event.metadata || {})].join(" ").toLowerCase().includes(search.toLowerCase())).map((event) => (
              <div key={event.id} className="rounded-lg border border-[#EFE4D0] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#1F3B6E]">{event.event_type}</p>
                  <Badge tone={JSON.stringify(event.metadata || {}).includes("critical") ? "critical" : "medium"}>{event.entity_type}</Badge>
                </div>
                <p className="mt-1 text-sm text-[#5C6680]">Target: {event.entity_id || "n/a"} · Actor: {event.actor_user_id || "system"}</p>
                <p className="mt-1 text-xs text-[#5C6680]">{event.created_at}</p>
                <pre className="mt-3 max-h-36 overflow-auto rounded-md bg-[#FBF7EE] p-3 text-xs text-[#1F3B6E]">{JSON.stringify(event.metadata || {}, null, 2)}</pre>
              </div>
            ))}
            {audit.length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">No RBAC audit events yet.</p>}
          </div>
        </Panel>
      )}

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
