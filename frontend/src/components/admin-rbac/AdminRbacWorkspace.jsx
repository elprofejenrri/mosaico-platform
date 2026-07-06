import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileSearch,
  Filter,
  History,
  LayoutList,
  MoreVertical,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import WorkspaceSidePanel from "../WorkspaceSidePanel";

const riskStyles = {
  low: "bg-[#E0F2F0] text-[#1B6F68]",
  medium: "bg-[#FFF9E8] text-[#9A6A00]",
  high: "bg-[#FFF0E6] text-[#C95630]",
  critical: "bg-[#FFE7E2] text-[#B42318]",
};

const adminRoles = new Set(["administrador_sitio", "administrador_profesor", "coordinador"]);
const studentRoles = new Set(["alumno", "student"]);
const teacherRoles = new Set(["profesor", "teacher"]);
const tutorRoles = new Set(["tutor_padre", "tutor", "parent"]);

function Panel({ children, className = "" }) {
  return <section className={`rounded-lg border border-[#EFE4D0] bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

function Field({ label, children }) {
  return <label className="block text-sm font-semibold text-[#1F3B6E]"><span>{label}</span><div className="mt-2">{children}</div></label>;
}

function Badge({ children, tone = "low" }) {
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${riskStyles[tone] || "bg-[#FBF7EE] text-[#5C6680]"}`}>{children}</span>;
}

function RoleChip({ role, rolesByName }) {
  const detail = rolesByName[role];
  const tone = adminRoles.has(role) ? "critical" : teacherRoles.has(role) ? "medium" : "low";
  return <Badge tone={tone}>{detail?.label || role}</Badge>;
}

function ConfirmModal({ title, body, confirmLabel = "Confirm", onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-[#10213F]/45 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#FFE7E2] p-2 text-[#B42318]"><AlertTriangle size={20} /></div>
          <div>
            <h2 className="font-display text-2xl text-[#1F3B6E]">{title}</h2>
            <p className="mt-2 text-sm text-[#5C6680]">{body}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-[#B42318] text-white hover:bg-[#8F1D13]">{loading ? "Working..." : confirmLabel}</Button>
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

function roleCategory(role) {
  const name = role.name || "";
  if (adminRoles.has(name) || (role.level || 0) >= 80) return "Administrative";
  if (teacherRoles.has(name) || name.includes("profesor")) return "Academic";
  if (tutorRoles.has(name) || name.includes("tutor")) return "Support";
  if (name.includes("viewer") || name.includes("lector") || name.includes("student") || name.includes("alumno")) return "Read-only";
  return role.type === "system" ? "System" : "Custom";
}

function roleOptionsByCategory(roles) {
  return roles.reduce((groups, role) => {
    const category = roleCategory(role);
    groups[category] = groups[category] || [];
    groups[category].push(role);
    return groups;
  }, {});
}

function primaryRoleFor(user) {
  return user.role || user.roles?.[0] || "alumno";
}

function userRoleList(user) {
  return user.roles?.length ? user.roles : [user.role].filter(Boolean);
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  return date.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function userType(user) {
  const roles = new Set(userRoleList(user));
  if ([...roles].some((role) => adminRoles.has(role))) return "Admin";
  if ([...roles].some((role) => teacherRoles.has(role))) return "Teacher";
  if ([...roles].some((role) => tutorRoles.has(role))) return "Tutor / Parent";
  if ([...roles].some((role) => studentRoles.has(role))) return "Student";
  return user.profile_type || "Client";
}

function matchesUserSearch(user, query) {
  if (!query) return true;
  const haystack = [
    user.name,
    user.email,
    user.phone,
    user.user_id,
    user.role,
    user.profile_type,
    ...(user.roles || []),
  ].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function effectivePermissionRows(user, permissionsByName) {
  const permissionLevels = user?.effective_permissions || {};
  return Object.entries(permissionLevels).map(([name, level]) => ({
    name,
    level,
    ...(permissionsByName[name] || {}),
  })).sort((a, b) => (a.module || "").localeCompare(b.module || "") || a.name.localeCompare(b.name));
}

function UserDrawer({
  user,
  roles,
  rolesByName,
  permissionsByName,
  audit,
  loginHistory,
  loadingHistory,
  saving,
  onClose,
  onSaveRoles,
  onToggleActive,
  onLoadHistory,
}) {
  const [tab, setTab] = useState("general");
  const [draftRoles, setDraftRoles] = useState(userRoleList(user));

  useEffect(() => {
    setDraftRoles(userRoleList(user));
    setTab("general");
    onLoadHistory(user);
  }, [user, onLoadHistory]);

  const changed = !roleListsEqual(draftRoles, userRoleList(user));
  const groupedRoles = roleOptionsByCategory(roles);
  const permissionRows = effectivePermissionRows(user, permissionsByName);
  const groupedEffective = groupPermissions(permissionRows);

  const toggleRole = (roleName) => {
    setDraftRoles((current) => {
      const next = new Set(current);
      if (next.has(roleName)) next.delete(roleName);
      else next.add(roleName);
      return Array.from(next);
    });
  };

  const save = () => {
    if (!draftRoles.length) {
      toast.error("Every user must have at least one role.");
      return;
    }
    onSaveRoles(user, draftRoles);
  };

  return (
    <WorkspaceSidePanel title={user.name || "Unnamed user"} eyebrow="IAM user detail" onClose={onClose} maxWidth="max-w-3xl">
      <p className="text-sm text-[#5C6680]">{user.email}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {["general", "roles", "permissions", "activity", "audit", "sessions", "notes"].map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${tab === item ? "bg-[#1F3B6E] text-white" : "bg-[#FBF7EE] text-[#1F3B6E]"}`}>{item === "permissions" ? "Effective Permissions" : item}</button>
        ))}
      </div>

      <div className="mt-5 grid gap-5">
          {tab === "general" && (
            <Panel>
              <div className="grid gap-4 md:grid-cols-2">
                <div><p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">Status</p><p className="mt-1 font-semibold">{user.active === false ? "Inactive" : "Active"}</p></div>
                <div><p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">User type</p><p className="mt-1 font-semibold">{userType(user)}</p></div>
                <div><p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">Created</p><p className="mt-1 font-semibold">{formatDate(user.created_at)}</p></div>
                <div><p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">Last login</p><p className="mt-1 font-semibold">{formatDate(user.last_login_at)}</p></div>
                <div><p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">Bookings</p><p className="mt-1 font-semibold">{user.booking_count || 0}</p></div>
                <div><p className="text-xs uppercase tracking-[0.16em] text-[#5C6680]">Permissions</p><p className="mt-1 font-semibold">{user.effective_permission_count || 0}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button disabled={saving} onClick={() => onToggleActive(user, user.active === false)} variant="outline" className="border-[#EFE4D0]">{user.active === false ? "Activate user" : "Deactivate user"}</Button>
                <Button disabled title="User deletion needs a dedicated confirmation flow and retention policy." variant="outline" className="border-[#EFE4D0] text-[#B42318]">Delete user</Button>
              </div>
            </Panel>
          )}

          {tab === "roles" && (
            <Panel>
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <h3 className="font-display text-xl text-[#1F3B6E]">Role Assignment</h3>
                  <p className="mt-1 text-sm text-[#5C6680]">Roles are additive. Critical access requires confirmation on save.</p>
                </div>
                {changed && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-[#EFE4D0]" onClick={() => setDraftRoles(userRoleList(user))}>Cancel</Button>
                    <Button disabled={saving} onClick={save} className="bg-[#E8704C] text-white hover:bg-[#C95630]">{saving ? "Saving..." : "Save roles"}</Button>
                  </div>
                )}
              </div>
              <div className="mt-5 grid gap-4">
                {Object.entries(groupedRoles).map(([category, items]) => (
                  <div key={category} className="rounded-lg border border-[#EFE4D0] p-4">
                    <h4 className="font-semibold text-[#1F3B6E]">{category}</h4>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {items.map((role) => {
                        const selected = draftRoles.includes(role.name);
                        const privileged = adminRoles.has(role.name);
                        return (
                          <button
                            type="button"
                            key={role.name}
                            onClick={() => toggleRole(role.name)}
                            className={`rounded-md border p-3 text-left ${selected ? "border-[#2DA89F] bg-[#E0F2F0]" : "border-[#EFE4D0] bg-white"}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[#1F3B6E]">{roleLabel(role)}</span>
                              {selected && <CheckCircle2 size={16} className="text-[#2DA89F]" />}
                            </div>
                            <p className="mt-1 text-xs text-[#5C6680]">{role.description || role.name}</p>
                            <p className="mt-2 text-xs text-[#5C6680]">{role.userCount || 0} users · {role.permissionCount || 0} permissions</p>
                            {privileged && <p className="mt-2 text-xs font-semibold text-[#B42318]">Critical administrative role</p>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "permissions" && (
            <Panel>
              <h3 className="font-display text-xl text-[#1F3B6E]">Effective Permissions</h3>
              <p className="mt-1 text-sm text-[#5C6680]">Read-only view inherited from all assigned roles.</p>
              <div className="mt-5 grid gap-4">
                {Object.entries(groupedEffective).map(([module, sections]) => (
                  <div key={module} className="rounded-lg border border-[#EFE4D0] p-4">
                    <h4 className="font-semibold capitalize text-[#1F3B6E]">{module}</h4>
                    <div className="mt-3 grid gap-2">
                      {Object.entries(sections).map(([section, items]) => (
                        <div key={section} className="rounded-md bg-[#FBF7EE] p-3">
                          <p className="text-sm font-semibold capitalize">{section}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {items.map((permission) => <Badge key={permission.name} tone={permission.risk_level || "low"}>{permission.name}</Badge>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {permissionRows.length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">No effective permissions returned for this user.</p>}
              </div>
            </Panel>
          )}

          {tab === "activity" && (
            <Panel>
              <h3 className="font-display text-xl text-[#1F3B6E]">Activity</h3>
              <p className="mt-3 rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">Operational activity timeline is planned for this IAM drawer. Current backend activity logs are available in Activity Logs.</p>
            </Panel>
          )}

          {tab === "audit" && (
            <Panel>
              <h3 className="font-display text-xl text-[#1F3B6E]">Audit History</h3>
              <div className="mt-4 grid gap-3">
                {loadingHistory && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">Loading audit history...</p>}
                {!loadingHistory && audit.length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">No audit events yet.</p>}
                {audit.map((event) => (
                  <div key={event.id} className="rounded-lg border border-[#EFE4D0] p-4">
                    <p className="font-semibold text-[#1F3B6E]">{event.event_type || event.action}</p>
                    <p className="text-sm text-[#5C6680]">Actor: {event.actor_name || event.actor_user_id || "system"}</p>
                    <p className="mt-1 text-xs text-[#5C6680]">{formatDate(event.created_at)}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "sessions" && (
            <Panel>
              <h3 className="font-display text-xl text-[#1F3B6E]">Login Sessions</h3>
              <div className="mt-4 grid gap-3">
                {loadingHistory && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">Loading sessions...</p>}
                {!loadingHistory && loginHistory.length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">No login history yet.</p>}
                {loginHistory.map((login) => (
                  <div key={login.id} className="rounded-lg border border-[#EFE4D0] p-4">
                    <p className="font-semibold text-[#1F3B6E]">{login.provider || "Login"}</p>
                    <p className="text-sm text-[#5C6680]">{login.email}</p>
                    <p className="mt-1 text-xs text-[#5C6680]">{formatDate(login.created_at)}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "notes" && (
            <Panel>
              <h3 className="font-display text-xl text-[#1F3B6E]">Notes</h3>
              <textarea disabled className="mt-4 min-h-32 w-full rounded-md border border-[#EFE4D0] p-3 text-sm outline-none disabled:bg-[#FBF7EE]" placeholder="IAM notes require a persisted user notes model." />
            </Panel>
          )}
      </div>
    </WorkspaceSidePanel>
  );
}

function BulkRoleModal({ users, roles, selectedIds, onClose, onApply, saving }) {
  const [mode, setMode] = useState("assign");
  const [roleName, setRoleName] = useState(roles[0]?.name || "");
  const selectedUsers = users.filter((user) => selectedIds.has(user.user_id));
  const role = roles.find((item) => item.name === roleName);
  const privileged = adminRoles.has(roleName);
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#10213F]/45 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">Bulk IAM action</p>
            <h2 className="mt-2 font-display text-2xl text-[#1F3B6E]">Update roles for {selectedUsers.length} users</h2>
          </div>
          <Button variant="outline" onClick={onClose} disabled={saving}><X size={16} /></Button>
        </div>
        <div className="mt-5 grid gap-4">
          <Field label="Action">
            <select value={mode} onChange={(event) => setMode(event.target.value)} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]">
              <option value="assign">Assign role</option>
              <option value="remove">Remove role</option>
              <option value="replace">Replace roles</option>
            </select>
          </Field>
          <Field label="Role">
            <select value={roleName} onChange={(event) => setRoleName(event.target.value)} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]">
              {roles.map((item) => <option key={item.name} value={item.name}>{roleLabel(item)}</option>)}
            </select>
          </Field>
          {privileged && <div className="rounded-lg border border-[#F4B4A6] bg-[#FFE7E2] p-4 text-sm text-[#B42318]">This bulk action includes a critical administrative role and will require backend confirmation.</div>}
          <div className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">
            <p className="font-semibold text-[#1F3B6E]">Affected users</p>
            <p className="mt-1">{selectedUsers.slice(0, 5).map((user) => user.name || user.email).join(", ")}{selectedUsers.length > 5 ? ` and ${selectedUsers.length - 5} more` : ""}</p>
            <p className="mt-2">Role: {roleLabel(role)} · Mode: {mode}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button disabled={saving || !roleName} onClick={() => onApply({ mode, roleName, privileged })} className="bg-[#1F3B6E] text-white">{saving ? "Applying..." : "Apply bulk action"}</Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRbacWorkspace({ initialTab = "users" }) {
  const [tab, setTab] = useState(initialTab);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserAudit, setSelectedUserAudit] = useState([]);
  const [selectedUserLogins, setSelectedUserLogins] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [density, setDensity] = useState("comfortable");
  const [rowMenu, setRowMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", label: "", description: "" });

  const selectedRole = roles.find((role) => role.name === selectedRoleName) || roles[0];
  const rolesByName = useMemo(() => Object.fromEntries(roles.map((role) => [role.name, role])), [roles]);
  const permissionsByName = useMemo(() => Object.fromEntries(permissions.map((permission) => [permission.name, permission])), [permissions]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not load IAM.");
    } finally {
      setLoading(false);
    }
  }, [selectedRoleName]);

  // Initial IAM load only; explicit mutations refresh through load().
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const role = roles.find((item) => item.name === selectedRoleName) || roles[0];
    if (role) setSelectedPermissions(new Set(role.permissions || []));
  }, [selectedRoleName, roles]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter, typeFilter, pageSize]);

  const counts = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.active !== false).length,
    inactive: users.filter((user) => user.active === false).length,
    teachers: users.filter((user) => userRoleList(user).some((role) => teacherRoles.has(role))).length,
    students: users.filter((user) => userRoleList(user).some((role) => studentRoles.has(role))).length,
    tutors: users.filter((user) => userRoleList(user).some((role) => tutorRoles.has(role))).length,
    admins: users.filter((user) => userRoleList(user).some((role) => adminRoles.has(role))).length,
    pendingInvitations: 0,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const rows = users.filter((user) => {
      if (!matchesUserSearch(user, search)) return false;
      if (roleFilter !== "all" && !userRoleList(user).includes(roleFilter)) return false;
      if (statusFilter !== "all") {
        const status = user.active === false ? "inactive" : "active";
        if (status !== statusFilter) return false;
      }
      if (typeFilter !== "all" && userType(user) !== typeFilter) return false;
      return true;
    });
    rows.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const left = sortKey === "name" ? (a.name || a.email || "") : sortKey === "role" ? primaryRoleFor(a) : sortKey === "status" ? (a.active === false ? "inactive" : "active") : sortKey === "last_login_at" ? (a.last_login_at || "") : (a.created_at || "");
      const right = sortKey === "name" ? (b.name || b.email || "") : sortKey === "role" ? primaryRoleFor(b) : sortKey === "status" ? (b.active === false ? "inactive" : "active") : sortKey === "last_login_at" ? (b.last_login_at || "") : (b.created_at || "");
      return String(left).localeCompare(String(right)) * direction;
    });
    return rows;
  }, [users, search, roleFilter, statusFilter, typeFilter, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeFilters = [
    search && `Search: ${search}`,
    roleFilter !== "all" && `Role: ${roleLabel(rolesByName[roleFilter])}`,
    statusFilter !== "all" && `Status: ${statusFilter}`,
    typeFilter !== "all" && `Type: ${typeFilter}`,
  ].filter(Boolean);

  const loadUserHistory = useCallback(async (user) => {
    setLoadingHistory(true);
    try {
      const [auditResponse, loginResponse] = await Promise.all([
        api.get(`/admin/users/${user.user_id}/audit-events`),
        api.get(`/admin/users/${user.user_id}/login-history`),
      ]);
      setSelectedUserAudit(auditResponse.data || []);
      setSelectedUserLogins(loginResponse.data || []);
    } catch {
      toast.error("Could not load user history.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const openUser = (user) => {
    setSelectedUser(user);
    setRowMenu(null);
  };

  const replaceUserRoles = async (user, rolesForUser) => {
    if (!rolesForUser.length) {
      toast.error("Every user must have at least one role.");
      return;
    }
    const newAdmin = rolesForUser.includes("administrador_sitio") && !userRoleList(user).includes("administrador_sitio");
    const persist = async (confirmPrivileged = false) => {
      setSaving(true);
      try {
        const response = await api.patch(`/admin/rbac/users/${user.user_id}/roles`, { roles: rolesForUser, confirmPrivileged });
        toast.success("User roles updated.");
        setSelectedUser(response.data || null);
        await load();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Could not update user roles.");
      } finally {
        setSaving(false);
      }
    };
    if (newAdmin) {
      setConfirm({
        title: "Assign Super Admin",
        body: "Super Admin grants full platform access. Confirm this role change is intentional.",
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

  const toggleActive = async (user, active) => {
    const persist = async () => {
      setSaving(true);
      try {
        await api.patch(`/admin/users/${user.user_id}`, { active });
        toast.success(active ? "User activated." : "User deactivated.");
        setSelectedUser((current) => current?.user_id === user.user_id ? { ...current, active } : current);
        await load();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Could not update user.");
      } finally {
        setSaving(false);
      }
    };
    if (!active) {
      setConfirm({
        title: "Deactivate user",
        body: `Deactivate ${user.name || user.email}? They will lose platform access until reactivated.`,
        confirmLabel: "Deactivate user",
        onConfirm: () => {
          setConfirm(null);
          persist();
        },
      });
    } else {
      persist();
    }
  };

  const bulkApply = async ({ mode, roleName, privileged }) => {
    setSaving(true);
    try {
      await api.post("/admin/rbac/users/bulk-roles", { userIds: Array.from(selectedUsers), roles: [roleName], mode, confirmPrivileged: privileged });
      toast.success("Bulk role action complete.");
      setBulkOpen(false);
      setSelectedUsers(new Set());
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not complete bulk role action.");
    } finally {
      setSaving(false);
    }
  };

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
        body: `You are changing ${changed.length} critical permission(s). This can grant access to sensitive operations.`,
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

  const deleteRole = (role) => {
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

  if (loading) {
    return <Panel><div className="h-40 animate-pulse rounded-lg bg-[#FBF7EE]" /><p className="mt-3 text-sm text-[#5C6680]">Loading Identity & Access Management...</p></Panel>;
  }

  const userRowPadding = density === "compact" ? "p-3" : "p-4";
  const groupedPermissions = groupPermissions(permissions.filter((permission) => {
    const matchesSearch = !search || [permission.name, permission.description, permission.module, permission.section].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchesRisk = riskFilter === "all" || permission.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  }));

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8704C]">Access governance</p>
            <h2 className="mt-2 font-display text-3xl text-[#1F3B6E]">Identity & Access Management</h2>
            <p className="mt-2 text-sm text-[#5C6680]">Manage users, roles, access, and security across Mosaico.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled title="Invitations need an email delivery service and invite token model." variant="outline" className="border-[#EFE4D0]"><Send size={16} className="mr-2" />Invite User</Button>
            <Button disabled={!selectedUsers.size} onClick={() => setBulkOpen(true)} variant="outline" className="border-[#EFE4D0]"><Users size={16} className="mr-2" />Bulk Actions</Button>
            <Button disabled title="IAM export will be connected to a backend export endpoint." variant="outline" className="border-[#EFE4D0]"><Download size={16} className="mr-2" />Export</Button>
            <Button onClick={load} variant="outline" className="border-[#EFE4D0]"><RefreshCw size={16} className="mr-2" />Refresh</Button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ["users", "Users"],
            ["roles", "Roles"],
            ["matrix", "Permissions"],
            ["audit", "Audit"],
            ["invitations", "Invitations"],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === key ? "bg-[#1F3B6E] text-white" : "bg-[#FBF7EE] text-[#1F3B6E]"}`}>{label}</button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        {[
          ["Total users", counts.total, Users],
          ["Active", counts.active, CheckCircle2],
          ["Inactive", counts.inactive, AlertTriangle],
          ["Teachers", counts.teachers, ShieldCheck],
          ["Students", counts.students, Users],
          ["Tutors/Parents", counts.tutors, Users],
          ["Admins", counts.admins, ShieldCheck],
          ["Pending invites", counts.pendingInvitations, Send],
        ].map(([label, value, Icon]) => (
          <Panel key={label} className="p-4">
            <Icon size={18} className="text-[#E8704C]" />
            <p className="mt-3 font-display text-2xl text-[#1F3B6E]">{value}</p>
            <p className="text-xs text-[#5C6680]">{label}</p>
          </Panel>
        ))}
      </div>

      {(tab === "users" || tab === "matrix" || tab === "audit") && (
        <Panel>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6680]" />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by name, email, phone, role, user ID, or permission" className="h-11 w-full rounded-md border border-[#EFE4D0] bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-[#EFE4D0]" onClick={() => setDensity((current) => current === "compact" ? "comfortable" : "compact")}><LayoutList size={16} className="mr-2" />{density === "compact" ? "Comfortable" : "Compact"}</Button>
              <Button variant="outline" className="border-[#EFE4D0]" onClick={() => { setSearchInput(""); setSearch(""); setRoleFilter("all"); setStatusFilter("all"); setTypeFilter("all"); }}><X size={16} className="mr-2" />Clear</Button>
            </div>
          </div>
          {tab === "users" && (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Field label="Role"><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]"><option value="all">All roles</option>{roles.map((role) => <option key={role.name} value={role.name}>{roleLabel(role)}</option>)}</select></Field>
              <Field label="Status"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]"><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
              <Field label="User type"><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]"><option value="all">All types</option><option>Admin</option><option>Teacher</option><option>Student</option><option>Tutor / Parent</option><option>Client</option></select></Field>
              <Field label="Sort"><select value={`${sortKey}:${sortDirection}`} onChange={(event) => { const [key, direction] = event.target.value.split(":"); setSortKey(key); setSortDirection(direction); }} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]"><option value="created_at:desc">Newest</option><option value="name:asc">Name A-Z</option><option value="role:asc">Role A-Z</option><option value="status:asc">Status</option><option value="last_login_at:desc">Last login</option></select></Field>
              <Field label="Per page"><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-10 w-full rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]">{[20, 50, 100, 200].map((size) => <option key={size} value={size}>{size}</option>)}</select></Field>
            </div>
          )}
          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilters.map((filter) => <Badge key={filter} tone="medium">{filter}</Badge>)}
            </div>
          )}
        </Panel>
      )}

      {tab === "users" && (
        <Panel className="overflow-hidden">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#5C6680]">Showing {pagedUsers.length} of {filteredUsers.length} users. Selected: {selectedUsers.size}</p>
            <Button disabled={!selectedUsers.size} onClick={() => setBulkOpen(true)} className="bg-[#1F3B6E] text-white"><UserPlus size={16} className="mr-2" />Bulk role action</Button>
          </div>
          <div className="grid gap-2">
            <div className="hidden rounded-md border-b border-[#EFE4D0] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5C6680] lg:grid lg:grid-cols-[32px_minmax(220px,1.7fr)_minmax(190px,1.25fr)_96px_minmax(150px,0.9fr)_48px] lg:gap-3">
              <div><input aria-label="Select visible users" type="checkbox" checked={pagedUsers.length > 0 && pagedUsers.every((user) => selectedUsers.has(user.user_id))} onChange={(event) => setSelectedUsers((current) => { const next = new Set(current); pagedUsers.forEach((user) => event.target.checked ? next.add(user.user_id) : next.delete(user.user_id)); return next; })} /></div>
              <div>User</div>
              <div>Access</div>
              <div>Status</div>
              <div>Activity</div>
              <div className="text-right">Actions</div>
            </div>
            {pagedUsers.map((user) => {
              const rolesForUser = userRoleList(user);
              const primary = primaryRoleFor(user);
              const rest = rolesForUser.filter((role) => role !== primary);
              const selected = selectedUsers.has(user.user_id);
              return (
                <div key={user.user_id} className={`${userRowPadding} grid gap-3 rounded-lg border border-[#EFE4D0] bg-white text-sm lg:grid-cols-[32px_minmax(220px,1.7fr)_minmax(190px,1.25fr)_96px_minmax(150px,0.9fr)_48px] lg:items-center`}>
                  <div className="flex items-center justify-between lg:block">
                    <input aria-label={`Select ${user.email}`} type="checkbox" checked={selected} onChange={() => setSelectedUsers((current) => { const next = new Set(current); next.has(user.user_id) ? next.delete(user.user_id) : next.add(user.user_id); return next; })} />
                    <div className="lg:hidden"><Badge tone={user.active === false ? "high" : "low"}>{user.active === false ? "inactive" : "active"}</Badge></div>
                  </div>
                  <button type="button" onClick={() => openUser(user)} className="flex min-w-0 items-center gap-3 text-left">
                    {user.picture ? <img src={user.picture} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0E6] font-display text-[#E8704C]">{user.name?.[0] || user.email?.[0] || "?"}</span>}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#1F3B6E]">{user.name || "Unnamed user"}</span>
                      <span className="block truncate text-xs text-[#5C6680]">{user.email}</span>
                      <span className="block truncate text-xs text-[#5C6680]">{user.user_id}</span>
                    </span>
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1"><RoleChip role={primary} rolesByName={rolesByName} />{rest.slice(0, 3).map((role) => <RoleChip key={role} role={role} rolesByName={rolesByName} />)}{rest.length > 3 && <Badge tone="medium">+{rest.length - 3}</Badge>}</div>
                    <p className="mt-1 text-xs text-[#5C6680]">{user.effective_permission_count || 0} effective permissions</p>
                  </div>
                  <div className="hidden lg:block"><Badge tone={user.active === false ? "high" : "low"}>{user.active === false ? "inactive" : "active"}</Badge></div>
                  <div className="grid gap-1 text-xs text-[#5C6680] sm:grid-cols-3 lg:grid-cols-1">
                    <span><strong className="text-[#1F3B6E]">{user.booking_count || 0}</strong> bookings</span>
                    <span>Last: {formatDate(user.last_login_at)}</span>
                    <span>Wallet: not connected</span>
                  </div>
                  <div className="relative flex justify-end">
                    <Button variant="outline" className="border-[#EFE4D0]" onClick={() => setRowMenu(rowMenu === user.user_id ? null : user.user_id)} aria-label={`Actions for ${user.email}`}><MoreVertical size={16} /></Button>
                    {rowMenu === user.user_id && (
                      <div className="absolute right-0 top-10 z-20 w-56 rounded-lg border border-[#EFE4D0] bg-white p-2 text-left shadow-lg">
                        <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#FBF7EE]" onClick={() => openUser(user)}>View profile</button>
                        <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#FBF7EE]" onClick={() => openUser(user)}>Edit roles</button>
                        <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#FBF7EE]" onClick={() => openUser(user)}>View effective permissions</button>
                        <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#FBF7EE]" onClick={() => openUser(user)}>View activity</button>
                        <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#FBF7EE]" onClick={() => openUser(user)}>View audit history</button>
                        <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#FBF7EE]" onClick={() => openUser(user)}>Login sessions</button>
                        <button className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#B42318] hover:bg-[#FFE7E2]" onClick={() => { setRowMenu(null); toggleActive(user, user.active === false); }}>{user.active === false ? "Activate" : "Deactivate"}</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {pagedUsers.length === 0 && <p className="py-10 text-center text-sm text-[#5C6680]">No users match the current IAM filters.</p>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#5C6680]">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></Button>
              <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={16} /></Button>
            </div>
          </div>
        </Panel>
      )}

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
            <div className="grid gap-3">
              <div className="hidden rounded-md border-b border-[#EFE4D0] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5C6680] lg:grid lg:grid-cols-[minmax(240px,1.6fr)_110px_110px_minmax(150px,1fr)_minmax(220px,1.2fr)] lg:gap-3">
                <div>Role</div>
                <div>Type</div>
                <div>Status</div>
                <div>Usage</div>
                <div className="text-right">Actions</div>
              </div>
              {roles.map((role) => (
                <div key={role.name} className="grid gap-3 rounded-lg border border-[#EFE4D0] bg-white p-4 text-sm lg:grid-cols-[minmax(240px,1.6fr)_110px_110px_minmax(150px,1fr)_minmax(220px,1.2fr)] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#1F3B6E]">{roleLabel(role)}</p>
                    <p className="truncate text-xs text-[#5C6680]">{role.name}</p>
                    <p className="mt-1 text-xs text-[#5C6680]">{role.description}</p>
                  </div>
                  <div><Badge tone={role.type === "system" ? "medium" : "low"}>{role.type}</Badge></div>
                  <div><Badge tone={role.status === "active" ? "low" : "high"}>{role.status}</Badge></div>
                  <div className="grid gap-1 text-xs text-[#5C6680] sm:grid-cols-3 lg:grid-cols-1">
                    <span><strong className="text-[#1F3B6E]">{role.userCount || 0}</strong> users</span>
                    <span><strong className="text-[#1F3B6E]">{role.permissionCount || 0}</strong> permissions</span>
                    <span>Updated {formatDate(role.updated_at)}</span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button onClick={() => { setSelectedRoleName(role.name); setTab("matrix"); }} variant="outline" className="border-[#EFE4D0]"><FileSearch size={15} /></Button>
                    <Button disabled={saving} onClick={() => duplicateRole(role)} variant="outline" className="border-[#EFE4D0]"><Copy size={15} /></Button>
                    <Button disabled={saving || role.name === "administrador_sitio"} onClick={() => updateRoleStatus(role)} variant="outline" className="border-[#EFE4D0]">{role.status === "active" ? "Deactivate" : "Activate"}</Button>
                    <Button disabled={saving || role.type === "system"} onClick={() => deleteRole(role)} variant="outline" className="border-[#EFE4D0] text-[#B42318]"><Trash2 size={15} /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === "matrix" && selectedRole && (
        <Panel>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <Field label="Role"><select value={selectedRoleName} onChange={(event) => setSelectedRoleName(event.target.value)} className="h-10 rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]">{roles.map((role) => <option key={role.name} value={role.name}>{roleLabel(role)}</option>)}</select></Field>
            <Field label="Risk filter"><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="h-10 rounded-md border border-[#EFE4D0] px-3 text-sm outline-none focus:ring-2 focus:ring-[#E8704C]"><option value="all">All risk levels</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></Field>
            <Button disabled={saving} onClick={savePermissions} className="bg-[#E8704C] text-white hover:bg-[#C95630]">Save permissions</Button>
          </div>
          <div className="mt-5 grid gap-4">
            {Object.entries(groupedPermissions).map(([module, sections]) => (
              <div key={module} className="rounded-lg border border-[#EFE4D0] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-xl capitalize text-[#1F3B6E]">{module}</h3>
                  <Badge tone="medium">{Object.values(sections).flat().length} permissions</Badge>
                </div>
                <div className="mt-3 grid gap-3">
                  {Object.entries(sections).map(([section, items]) => (
                    <div key={`${module}-${section}`} className="rounded-md bg-[#FBF7EE] p-3">
                      <p className="font-semibold capitalize text-[#1F3B6E]">{section}</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((permission) => (
                          <label key={permission.name} className={`flex min-h-20 items-start gap-3 rounded-md border p-3 ${permission.risk_level === "critical" ? "border-[#F4B4A6] bg-white" : "border-[#EFE4D0] bg-white"}`}>
                            <input aria-label={permission.name} type="checkbox" checked={selectedPermissions.has(permission.name)} onChange={() => togglePermission(permission.name)} className="mt-1 h-4 w-4 accent-[#E8704C]" />
                            <span className="min-w-0"><span className="block truncate font-semibold">{permission.name}</span><span className="mt-1 block text-xs text-[#5C6680]">{permission.description}</span><span className="mt-2 inline-flex"><Badge tone={permission.risk_level}>{permission.risk_level}</Badge></span></span>
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

      {tab === "audit" && (
        <Panel>
          <div className="grid gap-3">
            {audit.filter((event) => !search || [event.event_type, event.entity_type, event.entity_id, JSON.stringify(event.metadata || {})].join(" ").toLowerCase().includes(search.toLowerCase())).map((event) => (
              <div key={event.id} className="rounded-lg border border-[#EFE4D0] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#1F3B6E]">{event.event_type}</p>
                  <Badge tone={JSON.stringify(event.metadata || {}).includes("critical") ? "critical" : "medium"}>{event.entity_type}</Badge>
                </div>
                <p className="mt-1 text-sm text-[#5C6680]">Target: {event.entity_id || "n/a"} · Actor: {event.actor_user_id || "system"}</p>
                <p className="mt-1 text-xs text-[#5C6680]">{formatDate(event.created_at)}</p>
              </div>
            ))}
            {audit.length === 0 && <p className="rounded-lg bg-[#FBF7EE] p-4 text-sm text-[#5C6680]">No IAM audit events yet.</p>}
          </div>
        </Panel>
      )}

      {tab === "invitations" && (
        <Panel>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#FFF9E8] p-2 text-[#9A6A00]"><Send size={20} /></div>
            <div>
              <h3 className="font-display text-xl text-[#1F3B6E]">Invitations</h3>
              <p className="mt-2 text-sm text-[#5C6680]">Invitation UX is staged here, but sending invites needs an invite token table and email delivery integration. Until then, the action stays disabled instead of pretending to send.</p>
            </div>
          </div>
        </Panel>
      )}

      {selectedUser && <UserDrawer user={selectedUser} roles={roles} rolesByName={rolesByName} permissionsByName={permissionsByName} audit={selectedUserAudit} loginHistory={selectedUserLogins} loadingHistory={loadingHistory} saving={saving} onClose={() => setSelectedUser(null)} onSaveRoles={replaceUserRoles} onToggleActive={toggleActive} onLoadHistory={loadUserHistory} />}
      {bulkOpen && <BulkRoleModal users={users} roles={roles} selectedIds={selectedUsers} saving={saving} onClose={() => setBulkOpen(false)} onApply={bulkApply} />}
      {confirm && <ConfirmModal {...confirm} loading={saving} onClose={() => setConfirm(null)} />}
    </div>
  );
}
