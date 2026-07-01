import * as userService from "../services/userService.js";
import * as syncService from "../services/syncService.js";

import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const syncUser = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const result = await syncService.syncGitHubUser(username);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const result = await userService.getAllUsers(req.query);

  res.status(200).json({
    success: true,
    count: result.users.length,
    pagination: result.pagination,
    data: result.users,
  });
});

export const getLocalUser = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await userService.getLocalUser(username);

  if (!user) {
    throw new AppError("User not found in local database", 404);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

export const getAnalyticsSummary = asyncHandler(async (req, res) => {
  const analytics = await userService.getAnalyticsSummary();

  res.status(200).json({
    success: true,
    data: analytics,
  });
});

export const getTopInfluencers = asyncHandler(async (req, res) => {
  // Already validated by validateRequest(limitQuerySchema, "query")
  const { limit } = req.query;

  const users = await userService.getTopInfluencers(limit);

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

export const searchUsers = asyncHandler(async (req, res) => {
  // Already validated by validateRequest(languageQuerySchema, "query")
  const { language } = req.query;

  const users = await userService.searchByLanguage(language);

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});
