import githubClient from "../config/githubClient.js";

export async function fetchGitHubUser(username) {
  const response = await githubClient.get(`/users/${username}`);

  return response.data;
}

export async function fetchUserRepos(username) {
  const response = await githubClient.get(`/users/${username}/repos`, {
    params: {
      per_page: 100,
      sort: "updated",
    },
  });

  return response.data;
}
