const BASE = "https://api.anthropic.com";
const ANTHROPIC_VERSION = "2023-06-01";

type AdminFetchOpts = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export class AdminApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Admin API ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

async function adminFetch<T>(
  adminKey: string,
  path: string,
  opts: AdminFetchOpts = {}
): Promise<T> {
  if (!adminKey) throw new AdminApiError(401, "missing admin key");

  const url = new URL(path, BASE);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) v.forEach((vv) => url.searchParams.append(k, vv));
      else url.searchParams.append(k, v);
    }
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      "x-api-key": adminKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
      "user-agent": "keymaster/0.2.0",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) throw new AdminApiError(res.status, text);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export type AdminApiKey = {
  id: string;
  type: "api_key";
  name: string;
  workspace_id: string | null;
  created_at: string;
  created_by: { id: string; type: string };
  partial_key_hint: string;
  status: "active" | "inactive" | "archived";
};

export type ListResponse<T> = {
  data: T[];
  has_more: boolean;
  first_id: string | null;
  last_id: string | null;
};

export function getOrganization(adminKey: string) {
  return adminFetch<{ id: string; type: string; name: string }>(
    adminKey,
    "/v1/organizations/me"
  );
}

export async function listApiKeys(adminKey: string): Promise<AdminApiKey[]> {
  const out: AdminApiKey[] = [];
  let page: string | undefined;
  for (let i = 0; i < 20; i++) {
    const res = await adminFetch<ListResponse<AdminApiKey> & { next_page?: string }>(
      adminKey,
      "/v1/organizations/api_keys",
      { query: { limit: "100", page } }
    );
    out.push(...res.data);
    if (!res.has_more) break;
    page = res.last_id ?? undefined;
    if (!page) break;
  }
  return out;
}

export function updateApiKey(
  adminKey: string,
  id: string,
  patch: { name?: string; status?: "active" | "inactive" | "archived" }
) {
  return adminFetch<AdminApiKey>(
    adminKey,
    `/v1/organizations/api_keys/${id}`,
    {
      method: "POST",
      body: patch,
    }
  );
}

export type UsageBucket = {
  starting_at: string;
  ending_at: string;
  results: Array<{
    api_key_id?: string | null;
    workspace_id?: string | null;
    model?: string | null;
    service_tier?: string | null;
    context_window?: string | null;
    uncached_input_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens?: number;
    output_tokens: number;
  }>;
};

export type UsageReport = {
  data: UsageBucket[];
  has_more: boolean;
  next_page?: string;
};

export async function getUsageReport(
  adminKey: string,
  params: {
    startingAt: string;
    endingAt: string;
    bucketWidth?: "1m" | "1h" | "1d";
    apiKeyIds?: string[];
    groupBy?: Array<"api_key_id" | "workspace_id" | "model" | "service_tier">;
  }
) {
  return adminFetch<UsageReport>(
    adminKey,
    "/v1/organizations/usage_report/messages",
    {
      query: {
        starting_at: params.startingAt,
        ending_at: params.endingAt,
        bucket_width: params.bucketWidth ?? "1d",
        "api_key_ids[]": params.apiKeyIds,
        "group_by[]": params.groupBy,
        limit: "31",
      },
    }
  );
}
