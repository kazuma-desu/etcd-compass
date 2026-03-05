# ETCD Desktop Roadmap

> **Goal**: Feature parity with MongoDB Compass for ETCD.
> **Current Parity**: ~42%

---

## Completed

| Feature | Status |
|---------|--------|
| Basic connection with auth | ✅ Done |
| Key browsing (flat/tree) | ✅ Done |
| CRUD operations | ✅ Done |
| Search/filter | ✅ Done |
| Connection history | ✅ Done |
| Split-pane UI | ✅ Done |

---

## Phase 1 — Critical Missing Features (Target: 70%)

> **Timeline**: Week 1–2

| # | Feature | Why It Matters | Status |
|---|---------|---------------|--------|
| 1.1 | TLS/SSL Support | Production ETCD clusters require TLS | ⬜ |
| 1.2 | Pagination | Can't load 100k+ keys at once | ⬜ |
| 1.3 | Watch/Subscribe | ETCD's killer feature — real-time updates | ⬜ |
| 1.4 | Leases (TTL) | Key expiration is core to ETCD | ⬜ |
| 1.5 | JSON Formatting | Values are often JSON | ⬜ |
| 1.6 | Bulk Operations | Delete multiple keys | ⬜ |

---

## Phase 2 — Professional Features (Target: 85%)

> **Timeline**: Week 3–4

| # | Feature | Compass Equivalent | Status |
|---|---------|-------------------|--------|
| 2.1 | Import/Export JSON | Compass export/import | ⬜ |
| 2.2 | Connection Profiles | Saved connections | ⬜ |
| 2.3 | Prefix/Range Queries | Query builder | ⬜ |
| 2.4 | Cluster Status | Replica set status | ⬜ |
| 2.5 | Dark Mode | Theme toggle | ⬜ |
| 2.6 | Keyboard Shortcuts | Power user features | ⬜ |

---

## Phase 3 — Advanced Features (Target: 95%)

> **Timeline**: Month 2–3+

| # | Feature | Notes | Status |
|---|---------|-------|--------|
| 3.1 | SSH Tunneling | Remote cluster access | ⬜ |
| 3.2 | User/Role Management | ETCD RBAC | ⬜ |
| 3.3 | Snapshots | ETCD backup/restore | ⬜ |
| 3.4 | Performance Metrics | Dashboard | ⬜ |
| 3.5 | Tabs | Multiple connections | ⬜ |

---

## Phase 4 — ETCD-Specific Features (Beyond Compass)

> Features unique to ETCD that Compass doesn't need.

| # | Feature | Notes | Status |
|---|---------|-------|--------|
| 4.1 | Watch/Subscribe | Real-time key change notifications | ⬜ |
| 4.2 | Leases with TTL | Automatic key expiration | ⬜ |
| 4.3 | Distributed Locks | Coordination primitives | ⬜ |
| 4.4 | Elections | Leader election support | ⬜ |
| 4.5 | Transactions | Multi-key atomic operations | ⬜ |

---

## Competitive Advantages

| Metric | ETCD Desktop | MongoDB Compass |
|--------|-------------|-----------------|
| Bundle Size | ~5 MB | ~200 MB |
| Memory Usage | ~50 MB | ~300 MB |
| Startup Time | <1s | ~3-5s |
| Native Feel | ✅ System tray | ❌ Electron |
