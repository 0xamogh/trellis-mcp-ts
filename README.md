# mcp-ts-server

A TypeScript-based MCP (Model Context Protocol) server that integrates with Trellis API.

## Docker Setup

### Prerequisites

- Docker and Docker Compose installed on your system
- Required environment variables (see Configuration section)

### Configuration

Create a `.env` file in the project root with the following variables:

```bash
# Required
TRELLIS_API_KEY=your_api_key_here
PROJECT_ID=your_project_id
WORKFLOW_ID=your_workflow_id

# Optional (with defaults)
TRELLIS_API_BASE=https://enterprise.training.api.runtrellis.com/v1
REQUEST_TIMEOUT=30
PORT=3000
```

### Running the Service

1. **Build and start the container:**
   ```bash
   docker compose up -d
   ```

2. **View logs:**
   ```bash
   docker compose logs -f mcp-server
   ```

3. **Stop the container:**
   ```bash
   docker compose down
   ```

4. **Rebuild after code changes:**
   ```bash
   docker compose up -d --build
   ```

### Accessing the Service

Once running, the MCP server will be accessible at `http://localhost:3000/mcp`

### Claude Desktop Configuration

To connect Claude Desktop to this MCP server, update your Claude Desktop config file:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "trellis-mcp": {
      "command": "/path/to/your/node/bin/npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3000/mcp"
      ],
      "env": {
        "PATH": "/path/to/your/node/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
      }
    }
  }
}
```

**Requirements:**
- Node.js 20.16.0 or higher

**Finding your npx path:**
```bash
which npx
```

**Example configuration:**
```json
{
  "mcpServers": {
    "trellis-mcp": {
      "command": "/Users/amogh/.nvm/versions/node/v20.16.0/bin/npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3000/mcp"
      ],
      "env": {
        "PATH": "/Users/amogh/.nvm/versions/node/v20.16.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
      }
    }
  }
}
```

After updating the config, restart Claude Desktop for changes to take effect.

### Troubleshooting

- **Container won't start:** Check logs with `docker compose logs mcp-server`
- **Connection refused:** Ensure port 3000 is not already in use on your host machine
- **API errors:** Verify your environment variables are correctly set in the `.env` file
- **Claude Desktop can't connect:** Ensure the Docker container is running and verify your npx path with `which npx`