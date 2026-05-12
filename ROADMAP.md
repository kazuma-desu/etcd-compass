# ETCD Compass Roadmap

> **Goal**: Feature parity with MongoDB Compass for ETCD.
> **Current Parity**: ~78%

---

## Completed

| Feature | Status |
|---------|--------|
| Basic connection with auth | ✅ |
| Key browsing (flat/tree) | ✅ |
| CRUD operations | ✅ |
| Search/filter | ✅ |
| Connection history & profiles | ✅ |
| Split-pane UI | ✅ |
| TLS/SSL Support | ✅ |
| Pagination | ✅ |
| Watch/Subscribe | ✅ |
| Leases (TTL) | ✅ |
| JSON Formatting | ✅ |
| Bulk Operations | ✅ |
| Import/Export JSON | ✅ |
| Prefix/Range Queries | ✅ |
| Cluster Status & Metrics | ✅ |
| Dark Mode | ✅ |
| Keyboard Shortcuts | ✅ |
| User/Role Management (RBAC) | ✅ |
| Snapshots | ✅ |
| Tabs / Multiple Connections | ✅ |

---

## In Progress

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| P.1 | Performance Metrics Dashboard | 🟡 | Frontend UI exists; backend `get_cluster_metrics` command needed |

---

## Planned

| # | Feature | Notes | Status |
|---|---------|-------|--------|
| 3.1 | SSH Tunneling | Remote cluster access | ⬜ |
| 3.2 | Distributed Locks | Coordination primitives | ⬜ |
| 3.3 | Leader Election | ETCD election support | ⬜ |
| 3.4 | Transactions | Multi-key atomic operations | ⬜ |

---

## Technical Debt

| # | Item | Why It Matters | Status |
|---|------|---------------|--------|
| T.1 | Migrate to Tauri v2 | Unlocks modern plugin system, capabilities-based permissions, and improved mobile support. Also resolves libwebkit2gtk-4.0 removal in Ubuntu 24.04. | ✅ |

---

## Competitive Advantages

| Metric | ETCD Compass | MongoDB Compass |
|--------|-------------|-----------------|
| Bundle Size | ~5 MB | ~200 MB |
| Memory Usage | ~50 MB | ~300 MB |
| Startup Time | <1s | ~3-5s |
| Native Feel | ✅ System tray | ❌ Electron |
