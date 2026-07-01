import axios from "axios";
import axiosRetry from "axios-retry";

const githubToken = process.env.GITHUB_TOKEN;
const hasValidToken = githubToken && githubToken !== "your_github_token_here" && githubToken.trim() !== "";

const githubClient = axios.create({
  baseURL: "https://api.github.com",
  timeout: 10000,

  headers: {
    Accept: "application/vnd.github+json",
    "User-Agent": "github-profile-analyzer",
    "X-GitHub-Api-Version": "2022-11-28",

    ...(hasValidToken && {
      Authorization: `Bearer ${githubToken}`,
    }),
  },
});

axiosRetry(githubClient, {
  retries: 3,

  retryDelay: (retryCount, error) => {
    console.warn(`GitHub request failed. Retry ${retryCount}/3`, error.message);

    return axiosRetry.exponentialDelay(retryCount);
  },

  retryCondition: (error) => {
    const status = error.response?.status;

    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      status === 429 ||
      status >= 500
    );
  },
});

export default githubClient;
