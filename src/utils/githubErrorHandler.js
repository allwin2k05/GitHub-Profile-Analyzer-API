import AppError from "./AppError.js";

export function handleGitHubError(error) {
  const status = error.response?.status;

  if (status === 404) {
    throw new AppError("GitHub user not found", 404);
  }

  if (status === 403) {
    const remaining = error.response?.headers?.["x-ratelimit-remaining"];

    if (remaining === "0") {
      throw new AppError("GitHub API rate limit exceeded", 429);
    }

    throw new AppError("GitHub access forbidden", 403);
  }

  if (status >= 500) {
    throw new AppError("GitHub service unavailable", 502);
  }

  throw error;
}
