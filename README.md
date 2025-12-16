# Cursor n8n MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

A Model Context Protocol (MCP) server that enables AI assistants in Cursor IDE to manage n8n workflows through the n8n REST API.

## Features

- **Workflow Management**: Create, update, delete, and list workflows
- **Workflow Activation**: Activate and deactivate workflows
- **Execution Management**: View execution history and details
- **Webhook Triggering**: Trigger workflows via webhook URLs
- **Self-Documentation**: Built-in help system for AI assistants
- **Node Information**: Common n8n node types and configurations
- **Error Handling**: Automatic retry with exponential backoff

## Quick Start

### Installation

```bash
git clone https://github.com/alicankiraz1/cursor-n8n-builder.git
cd cursor-n8n-mcp

npm install
npm run build

node dist/index.js setup
```

Or use the install script:

```bash
./install.sh
```

### Manual Configuration

Create or edit `~/.cursor/mcp.json` for global configuration:

```json
{
  "mcpServers": {
    "cursor-n8n-mcp": {
      "command": "node",
      "args": ["/path/to/cursor-n8n-mcp/dist/index.js"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "N8N_API_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Getting n8n API Key

1. Log in to your n8n instance
2. Go to **Settings** > **API**
3. Click **Create API Key**
4. Copy the generated key

## Available Tools

### Documentation & Help

| Tool | Description |
|------|-------------|
| `n8n_tools_help` | Get usage guide and documentation |
| `n8n_get_node_info` | Get information about common n8n nodes |

### Workflow Management

| Tool | Description |
|------|-------------|
| `n8n_list_workflows` | List all workflows |
| `n8n_get_workflow` | Get workflow details by ID |
| `n8n_create_workflow` | Create a new workflow |
| `n8n_update_workflow` | Update an existing workflow |
| `n8n_delete_workflow` | Delete a workflow |
| `n8n_activate_workflow` | Activate a workflow |
| `n8n_deactivate_workflow` | Deactivate a workflow |

### Execution Management

| Tool | Description |
|------|-------------|
| `n8n_list_executions` | List execution history |
| `n8n_get_execution` | Get execution details |
| `n8n_delete_execution` | Delete an execution record |
| `n8n_trigger_webhook` | Trigger a workflow via webhook |

### System

| Tool | Description |
|------|-------------|
| `n8n_health_check` | Check n8n API connectivity |

## Usage Examples

### Check Connection
```
"Check the n8n connection"
```

### List Workflows
```
"List all workflows in n8n"
```

### Create a Workflow
```
"Create a webhook workflow that responds with the received data"
```

### Get Node Information
```
"Show me how to configure a webhook node"
```

## CLI Commands

```bash
node dist/index.js --help       # Show help
node dist/index.js setup        # Interactive setup
node dist/index.js config       # Show configuration template
```

## Project Structure

```
cursor-n8n-mcp/
├── src/
│   ├── index.ts              # Entry point with CLI
│   ├── server.ts             # MCP Server implementation
│   ├── tools/
│   │   ├── index.ts          # Tool exports
│   │   ├── workflow-tools.ts # Workflow CRUD operations
│   │   ├── execution-tools.ts# Execution management
│   │   └── documentation-tools.ts # Help and node info
│   ├── services/
│   │   └── n8n-api-client.ts # n8n REST API client
│   ├── types/
│   │   └── index.ts          # TypeScript definitions
│   └── utils/
│       ├── logger.ts         # Logging utility
│       └── errors.ts         # Error handling
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

## Supported Node Types

The `n8n_get_node_info` tool provides information about these common nodes:

- **Triggers**: webhook, scheduleTrigger, manualTrigger
- **Actions**: httpRequest, code, set, if, merge
- **Utilities**: splitInBatches, respondToWebhook

## Error Handling

The server includes robust error handling:

- **Automatic Retry**: Failed requests are retried up to 3 times
- **Exponential Backoff**: Delays increase between retries
- **Detailed Errors**: Error messages include hints for resolution
- **Timeout Management**: 30-second timeout for API requests

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `N8N_API_URL` | Your n8n instance URL | Yes |
| `N8N_API_KEY` | n8n API key | Yes |
| `LOG_LEVEL` | Log level (debug, info, warn, error) | No |
| `MCP_MODE` | MCP transport mode (stdio) | No |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [n8n](https://n8n.io) - Workflow automation platform
- [Anthropic](https://anthropic.com) - Model Context Protocol
- [Cursor](https://cursor.sh) - AI-powered IDE
