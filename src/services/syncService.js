import * as githubService from "./githubService.js";
import * as userService from "./userService.js";

import { calculateInsights, determinePersona } from "./insightService.js";
import AppError from "../utils/AppError.js";
import { handleGitHubError } from "../utils/githubErrorHandler.js";

export async function syncGitHubUser(username) {
  try {
    const user = await githubService.fetchGitHubUser(username);

    const existingUser = await userService.getStoredUser(username);

    if (
      existingUser &&
      new Date(existingUser.updated_at).getTime() === new Date(user.updated_at).getTime()
    ) {
      return {
        status: "UNCHANGED",
        message: "GitHub profile unchanged",
      };
    }

    const repos = await githubService.fetchUserRepos(username);

    const insights = calculateInsights(repos);

    // Calculate account age in years
    const createdDate = new Date(user.created_at);
    const currentDate = new Date();
    const ageDiffMs = currentDate - createdDate;
    insights.accountAgeYears = parseFloat((ageDiffMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2));

    // Determine Developer Persona
    insights.persona = determinePersona(user, insights, repos);

    await userService.saveUser(user, insights);

    return {
      status: "UPDATED",
      message: "User synced successfully",
      data: {
        profile: user,
        insights,
      },
    };
  } catch (error) {
    handleGitHubError(error);
  }
}
