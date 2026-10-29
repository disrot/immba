import { rest, rpc } from "./supabase.js?v=audit2";

export const logAudit = async () => null;

export const listAuditLogs = async (limit = 80, module = null) => {
  const rows = await rpc("audit_list", { p_limit: limit, p_module: module || null });
  return Array.isArray(rows) ? rows : [];
};

export const verifyAuditIntegrity = () => rpc("audit_verify_integrity");

export const restoreAuditVersion = (versionId, reason = "") =>
  rpc("audit_restore_single", { p_version_id: versionId, p_reason: reason });

export const previewGlobalRollback = (target, actorId = null) =>
  rpc("audit_rollback_preview", { p_target: target, p_actor_id: actorId || null });

export const executeGlobalRollback = (target, actorId = null) =>
  rpc("audit_rollback_execute", { p_target: target, p_confirm: "ROLLBACK", p_actor_id: actorId || null });

export const listEntityVersions = async (entityType, entityId) => {
  try {
    const rows = await rpc("audit_list_versions", {
      p_entity_type: entityType,
      p_entity_id: String(entityId || ""),
    });
    if (Array.isArray(rows)) return rows;
  } catch {
    /* fall through to table read */
  }
  const rows = await rest(
    `entity_version_snapshots?entity_type=eq.${encodeURIComponent(entityType)}&entity_id=eq.${encodeURIComponent(entityId)}&select=*&order=version_number.desc`
  );
  return Array.isArray(rows) ? rows : [];
};
