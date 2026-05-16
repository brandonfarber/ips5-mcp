import endpointsData from './endpoints.json' with { type: 'json' };

export type IpsQueryParam = {
  name: string;
  type: string;
  description: string;
};

export type IpsEndpoint = {
  id: string;
  app: string;
  controller: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  pathParams: string[];
  queryParams: IpsQueryParam[];
  description: string;
  memberOnly: boolean;
  clientOnly: boolean;
  toolName: string;
};

export type IpsEndpointCatalog = {
  generatedAt: string;
  source: string;
  count: number;
  endpoints: IpsEndpoint[];
};

const catalog = endpointsData as IpsEndpointCatalog;

export function getEndpointCatalog(): IpsEndpointCatalog {
  return catalog;
}

export function getAllEndpoints(): IpsEndpoint[] {
  return catalog.endpoints;
}

export function getEndpointByToolName(toolName: string): IpsEndpoint | undefined {
  return catalog.endpoints.find((e) => e.toolName === toolName);
}

export function filterEndpoints(options: {
  app?: string;
  method?: string;
  search?: string;
  limit?: number;
}): IpsEndpoint[] {
  const search = options.search?.toLowerCase().trim();
  let list = catalog.endpoints;

  if (options.app) {
    const app = options.app.toLowerCase();
    list = list.filter((e) => e.app.toLowerCase() === app);
  }
  if (options.method) {
    const method = options.method.toUpperCase();
    list = list.filter((e) => e.method === method);
  }
  if (search) {
    list = list.filter(
      (e) =>
        e.path.toLowerCase().includes(search) ||
        e.toolName.toLowerCase().includes(search) ||
        e.description.toLowerCase().includes(search) ||
        e.app.toLowerCase().includes(search) ||
        e.controller.toLowerCase().includes(search),
    );
  }

  const limit = options.limit ?? 50;
  return list.slice(0, limit);
}
