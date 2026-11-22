import createClient, { type ClientOptions } from "openapi-fetch";
import type { components, paths } from "./schema";

export type { components, paths };
export type EngineDescriptor = components["schemas"]["Descriptor"];
export type HealthResponse = components["schemas"]["HealthOutputBody"];
export type EnginesResponse = components["schemas"]["EnginesOutputBody"];

export function createTydBaseClient(options: ClientOptions = {}) {
  return createClient<paths>({
    baseUrl: "http://localhost:8080",
    ...options,
  });
}
