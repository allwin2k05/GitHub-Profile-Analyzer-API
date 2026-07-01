import dotenv from "dotenv";
import { z } from "zod";

// 1. Load the environment variables from .env file
dotenv.config();

// 2. Define the schema with validation and transformations
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // automatically converts the string from process.env into a number
  PORT: z
    .string()
    .default("5000")
    .transform((val) => Number(val)),

  DB_HOST: z.string().min(1, "DB_HOST is required"),

  // Dynamic port handler: parses string to number, defaults to 3306 for local development
  DB_PORT: z
    .string()
    .default("3306")
    .transform((val) => Number(val)),

  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),
  DB_NAME: z.string().min(1, "DB_NAME is required"),

  // Optional path string pointing to your ca.pem file
  DB_SSL_CA: z.string().optional(),

  GITHUB_TOKEN: z.string().optional().default(""),
});

// 3. Parse and validate process.env
const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    // Formats Zod errors into a clean, human-readable format
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
};

const env = parseEnv();

// 4. Export the fully-typed env object
export default env;
