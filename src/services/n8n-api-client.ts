/**
 * n8n REST API Client
 * Handles all communication with n8n instance via REST API
 */

import {
  N8nWorkflow,
  N8nExecution,
  N8nListResponse,
  N8nConfig,
  N8nNode,
  N8nConnections,
  N8nWorkflowSettings
} from '../types';
import { logger } from '../utils/logger';
import { parseHttpError, withRetry, N8nError } from '../utils/errors';

export interface N8nApiClientOptions {
  timeout?: number;
  maxRetries?: number;
}

export class N8nApiClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: N8nConfig, options: N8nApiClientOptions = {}) {
    // Remove trailing slash from URL
    this.baseUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Make authenticated request to n8n API with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;

    const headers: Record<string, string> = {
      'X-N8N-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    logger.debug(`API Request: ${options.method || 'GET'} ${url}`);

    return withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw parseHttpError(response.status, errorBody);
        }

        // Handle empty responses (like DELETE)
        const text = await response.text();
        if (!text) {
          return {} as T;
        }

        return JSON.parse(text) as T;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof N8nError) {
          throw error;
        }

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Request timed out');
          }
          logger.error(`API Error: ${error.message}`);
          throw error;
        }
        throw new Error('Unknown API error');
      }
    }, { maxRetries: this.maxRetries });
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * Check n8n API connectivity
   */
  async healthCheck(): Promise<{ status: string; version?: string }> {
    try {
      // Try to list workflows with limit 1 to verify connection
      await this.request<N8nListResponse<N8nWorkflow>>('/workflows?limit=1');
      return { status: 'connected' };
    } catch (error) {
      return {
        status: 'error',
        version: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // Workflow Operations
  // ============================================================================

  /**
   * List all workflows
   */
  async listWorkflows(options?: {
    limit?: number;
    cursor?: string;
    active?: boolean;
    tags?: string[];
  }): Promise<N8nListResponse<N8nWorkflow>> {
    const params = new URLSearchParams();

    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.active !== undefined) params.set('active', String(options.active));
    if (options?.tags?.length) params.set('tags', options.tags.join(','));

    const queryString = params.toString();
    const endpoint = `/workflows${queryString ? `?${queryString}` : ''}`;

    return this.request<N8nListResponse<N8nWorkflow>>(endpoint);
  }

  /**
   * Get a specific workflow by ID
   */
  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>(`/workflows/${id}`);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: {
    name: string;
    nodes: N8nNode[];
    connections: N8nConnections;
    settings?: N8nWorkflowSettings;
  }): Promise<N8nWorkflow> {
    // Ensure settings is always provided with sensible defaults
    const workflowWithDefaults = {
      ...workflow,
      settings: workflow.settings || {
        executionOrder: 'v1' as const,
        saveManualExecutions: true,
        callerPolicy: 'workflowsFromSameOwner' as const,
      },
    };

    return this.request<N8nWorkflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflowWithDefaults),
    });
  }

  /**
   * Update an existing workflow
   * First fetches the existing workflow, then merges with updates
   */
  async updateWorkflow(
    id: string,
    workflow: Partial<{
      name: string;
      nodes: N8nNode[];
      connections: N8nConnections;
      settings: N8nWorkflowSettings;
      active: boolean;
    }>
  ): Promise<N8nWorkflow> {
    // First, get the existing workflow to merge with updates
    const existingWorkflow = await this.getWorkflow(id);

    // Merge existing workflow with updates
    const updatedWorkflow = {
      name: workflow.name ?? existingWorkflow.name,
      nodes: workflow.nodes ?? existingWorkflow.nodes,
      connections: workflow.connections ?? existingWorkflow.connections,
      settings: workflow.settings ?? existingWorkflow.settings ?? {
        executionOrder: 'v1' as const,
        saveManualExecutions: true,
        callerPolicy: 'workflowsFromSameOwner' as const,
      },
    };

    // Use PUT for full replacement to ensure all required fields are present
    return this.request<N8nWorkflow>(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedWorkflow),
    });
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    await this.request<void>(`/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Activate a workflow
   */
  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>(`/workflows/${id}/activate`, {
      method: 'POST',
    });
  }

  /**
   * Deactivate a workflow
   */
  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>(`/workflows/${id}/deactivate`, {
      method: 'POST',
    });
  }

  // ============================================================================
  // Execution Operations
  // ============================================================================

  /**
   * List executions
   */
  async listExecutions(options?: {
    limit?: number;
    cursor?: string;
    workflowId?: string;
    status?: 'success' | 'error' | 'waiting';
    includeData?: boolean;
  }): Promise<N8nListResponse<N8nExecution>> {
    const params = new URLSearchParams();

    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.workflowId) params.set('workflowId', options.workflowId);
    if (options?.status) params.set('status', options.status);
    if (options?.includeData !== undefined) params.set('includeData', String(options.includeData));

    const queryString = params.toString();
    const endpoint = `/executions${queryString ? `?${queryString}` : ''}`;

    return this.request<N8nListResponse<N8nExecution>>(endpoint);
  }

  /**
   * Get a specific execution by ID
   */
  async getExecution(id: string, includeData = false): Promise<N8nExecution> {
    const params = new URLSearchParams();
    if (includeData) params.set('includeData', 'true');

    const queryString = params.toString();
    const endpoint = `/executions/${id}${queryString ? `?${queryString}` : ''}`;

    return this.request<N8nExecution>(endpoint);
  }

  /**
   * Delete an execution
   */
  async deleteExecution(id: string): Promise<void> {
    await this.request<void>(`/executions/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Webhook Operations
  // ============================================================================

  /**
   * Trigger a workflow via webhook
   * Note: This calls the webhook URL directly, not the n8n API
   */
  async triggerWebhook(
    webhookUrl: string,
    options?: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: Record<string, unknown>;
      headers?: Record<string, string>;
    }
  ): Promise<unknown> {
    const method = options?.method || 'POST';

    logger.debug(`Triggering webhook: ${method} ${webhookUrl}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    };

    if (options?.data && method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.data);
    }

    try {
      const response = await fetch(webhookUrl, fetchOptions);

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`Webhook error: HTTP ${response.status} - ${text}`);
      }

      try {
        return JSON.parse(text);
      } catch {
        return { response: text };
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Webhook error: ${error.message}`);
        throw error;
      }
      throw new Error('Unknown webhook error');
    }
  }
}

/**
 * Create N8nApiClient from environment variables
 */
export function createN8nApiClient(): N8nApiClient {
  const apiUrl = process.env.N8N_API_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!apiUrl) {
    throw new Error('N8N_API_URL environment variable is required');
  }

  if (!apiKey) {
    throw new Error('N8N_API_KEY environment variable is required');
  }

  return new N8nApiClient({ apiUrl, apiKey });
}

