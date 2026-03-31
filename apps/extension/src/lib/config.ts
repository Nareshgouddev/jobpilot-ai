import { z } from "zod";

const extensionEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().trim().url().default("http://localhost:4000"),
  VITE_EXTENSION_SHARED_SECRET: z.string().trim().min(24)
});

export type ExtensionEnv = z.infer<typeof extensionEnvSchema>;

export function getExtensionEnv(): ExtensionEnv {
  const resolvedSharedSecret =
    import.meta.env.VITE_EXTENSION_SHARED_SECRET ?? import.meta.env.EXTENSION_SHARED_SECRET;

  return extensionEnvSchema.parse({
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000",
    VITE_EXTENSION_SHARED_SECRET: resolvedSharedSecret
  });
}
