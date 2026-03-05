# ETCD Compass

A modern desktop client for ETCD Compass - distributed key-value store. Built with Tauri, React, and Rust.

<!-- ![ETCD Compass](screenshot.png) -->

## Features

- 🔌 **Direct ETCD Connection** - Connect to any ETCD cluster with authentication support
- 🌳 **Tree & Flat Views** - Browse keys hierarchically or as a flat list
- 🔍 **Real-time Search** - Filter keys and values instantly
- ➕ **CRUD Operations** - Create, read, update, and delete keys
- 💾 **Connection History** - Quickly reconnect to previous servers
- 🔔 **Native Notifications** - Toast notifications for all actions
- 🖥️ **Cross-Platform** - Windows, macOS, and Linux support
- 🔒 **Secure** - Passwords handled securely in Rust backend

## Prerequisites

Before you begin, ensure you have the following installed:

### 1. Rust

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Or on Windows, download from https://rustup.rs/

# Verify installation
rustc --version
cargo --version
```

### 2. Node.js

```bash
# Install Node.js 18+ from https://nodejs.org/
# Or use nvm
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

### 3. System Dependencies

#### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libappindicator3-dev \
    librsvg2-dev
```

#### Windows
```powershell
# Install Visual Studio Build Tools with C++ workload
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Or use winget:
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --includeRecommended --add Microsoft.VisualStudio.Workload.VCTools"
```

## Installation

### From Source

1. Clone the repository:
```bash
git clone https://github.com/kazuma-desu/etcd-compass.git
cd etcd-compass
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run tauri:dev
```

4. Build for production:
```bash
npm run tauri:build
```

The built application will be in `src-tauri/target/release/bundle/`.

### Pre-built Binaries

Download pre-built binaries from the [Releases](https://github.com/kazuma-desu/etcd-compass/releases) page.

## Usage

### Connecting to ETCD Compass

1. Launch ETCD Compass
2. Enter your ETCD server endpoint (e.g., `localhost:2379`)
3. Optionally provide username and password for authenticated clusters
4. Click "Connect"

### Browsing Keys

- **Flat View**: Shows all keys as a simple list
- **Tree View**: Shows keys in a hierarchical folder structure based on `/` separators

### Managing Keys

- **Add Key**: Click the "Add Key" button and enter key path and value
- **Edit Key**: Select a key and click "Edit"
- **Delete Key**: Select a key and click "Delete"
- **Search**: Use the search box to filter keys and values

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + R` | Refresh keys |
| `Ctrl/Cmd + F` | Focus search |
| `Ctrl/Cmd + N` | Add new key |
| `Delete` | Delete selected key |
| `Ctrl/Cmd + Q` | Quit application |

## Architecture

```
┌─────────────────────────────────────────┐
│           ETCD Compass App              │
├─────────────────────────────────────────┤
│  Frontend (React + TypeScript)          │
│  ├── Connection Screen                  │
│  ├── Key Browser (Flat/Tree views)      │
│  ├── Key Detail Panel                   │
│  └── Dialogs (Add/Edit/Delete)          │
├─────────────────────────────────────────┤
│  Backend (Rust + Tauri)                 │
│  ├── etcd3-rs client (gRPC)             │
│  ├── Config persistence                 │
│  └── OS-native features                 │
├─────────────────────────────────────────┤
│  ETCD Cluster (via gRPC)                │
└─────────────────────────────────────────┘
```

## Development

### Project Structure

```
etcd-compass/
├── src/                    # React frontend
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Entry point
│   ├── components/        # UI components
│   └── ...
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs        # Tauri entry point
│   │   ├── etcd.rs        # ETCD client wrapper
│   │   └── config.rs      # Config management
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── package.json           # Node dependencies
└── vite.config.ts         # Vite configuration
```

### Adding New Tauri Commands

1. Add the command in `src-tauri/src/main.rs`:

```rust
#[tauri::command]
async fn my_command(state: State<'_, AppState>, param: String) -> Result<String, String> {
    // Implementation
    Ok("Success".to_string())
}
```

2. Register in the handler:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    my_command,
])
```

3. Call from frontend:

```typescript
import { invoke } from '@tauri-apps/api/tauri'

const result = await invoke('my_command', { param: 'value' })
```

### Running Tests

```bash
# Frontend tests
npm test

# Backend tests
cd src-tauri
cargo test
```

## Building for Distribution

### All Platforms

```bash
npm run tauri:build
```

### Specific Platform

```bash
# macOS (Universal binary)
npm run tauri:build -- --target universal-apple-darwin

# Windows
npm run tauri:build -- --target x86_64-pc-windows-msvc

# Linux
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```

## Troubleshooting

### Connection Issues

- Verify ETCD is running: `etcdctl endpoint health`
- Check firewall rules
- Ensure correct endpoint format: `host:port`
- For TLS clusters, additional configuration may be needed

### Build Issues

**Rust not found:**
```bash
# Reinstall rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Missing system libraries (Linux):**
```bash
sudo apt install libwebkit2gtk-4.0-dev libssl-dev
```

**Windows build tools:**
Install Visual Studio Build Tools with "Desktop development with C++" workload.

### Runtime Issues

Check logs:
- **macOS**: `~/Library/Logs/etcd-compass/`
- **Windows**: `%APPDATA%\etcd-compass\logs\`
- **Linux**: `~/.config/etcd-compass/logs/`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, testing, and contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - Desktop application framework
- [etcd3-rs](https://github.com/etcdv3/etcd3-rs) - Rust ETCD client
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Lucide](https://lucide.dev/) - Icons
