// Set mock environment variables before any imports to satisfy env.js validation
process.env.DB_HOST = "localhost";
process.env.DB_USER = "root";
process.env.DB_PASSWORD = "root";
process.env.DB_NAME = "githubdb";
process.env.GITHUB_TOKEN = "mocked_token";

import request from "supertest";
import { jest } from "@jest/globals";

// Mock the db connection pool before importing app
const mockDb = {
  execute: jest.fn(),
  query: jest.fn().mockResolvedValue([[]]),
};

jest.unstable_mockModule("../db/connection.js", () => ({
  default: mockDb,
}));

// Mock githubService to avoid external API calls in tests
jest.unstable_mockModule("../services/githubService.js", () => ({
  fetchGitHubUser: jest.fn(),
  fetchUserRepos: jest.fn(),
}));

// Dynamic imports because ESM mock modules must run first
const { default: app } = await import("../app.js");
const githubService = await import("../services/githubService.js");
const db = (await import("../db/connection.js")).default;

describe("GitHub Profile Analyzer API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return system health", async () => {
      db.execute.mockResolvedValueOnce([[]]);
      const res = await request(app).get("/health");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.database).toBe("connected");
    });
  });

  describe("POST /api/users/sync/:username", () => {
    it("should successfully sync a new GitHub user profile", async () => {
      // Mock githubService responses
      githubService.fetchGitHubUser.mockResolvedValueOnce({
        id: 12345,
        login: "testuser",
        name: "Test User",
        avatar_url: "https://avatar.url",
        bio: "Just a test bio",
        company: "Test Co",
        blog: "https://test.blog",
        location: "Test Ville",
        twitter_username: "test_twitter",
        hireable: true,
        public_repos: 2,
        followers: 10,
        following: 5,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
      });

      githubService.fetchUserRepos.mockResolvedValueOnce([
        { name: "repo1", stargazers_count: 5, forks_count: 2, language: "JavaScript", html_url: "https://repo1" },
        { name: "repo2", stargazers_count: 15, forks_count: 3, language: "TypeScript", html_url: "https://repo2" },
        { name: "repo3", stargazers_count: 10, forks_count: 1, language: "TypeScript", html_url: "https://repo3" },
      ]);

      // Mock DB responses for getStoredUser (returns empty) and saveUser (returns query result)
      db.execute
        .mockResolvedValueOnce([[]]) // SELECT for getStoredUser
        .mockResolvedValueOnce([[]]); // INSERT for saveUser

      const res = await request(app).post("/api/users/sync/testuser");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe("UPDATED");
      expect(res.body.data.profile.login).toBe("testuser");
      expect(res.body.data.insights.totalStars).toBe(30);
      expect(res.body.data.insights.topLanguage).toBe("TypeScript");
      expect(res.body.data.insights.avgStarsPerRepo).toBe(10);
    });

    it("should return UNCHANGED if the profile updated_at matches", async () => {
      githubService.fetchGitHubUser.mockResolvedValueOnce({
        login: "testuser",
        updated_at: "2023-01-01T00:00:00Z",
      });

      // Mock DB select returning existing user with same updated_at
      db.execute.mockResolvedValueOnce([
        [{ login: "testuser", updated_at: new Date("2023-01-01T00:00:00Z").toISOString() }],
      ]);

      const res = await request(app).post("/api/users/sync/testuser");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe("UNCHANGED");
    });
  });

  describe("GET /api/users", () => {
    it("should fetch paginated list of users", async () => {
      db.execute
        .mockResolvedValueOnce([[{ total: 1 }]]) // COUNT(*) query
        .mockResolvedValueOnce([
          [{ login: "testuser", total_stars: 20, top_language: "TypeScript" }],
        ]); // SELECT * query

      const res = await request(app).get("/api/users?page=1&limit=10");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.data[0].login).toBe("testuser");
    });
  });

  describe("GET /api/users/local/:username", () => {
    it("should return user details if stored locally", async () => {
      db.execute.mockResolvedValueOnce([
        [{ login: "testuser", total_stars: 20, top_language: "TypeScript" }],
      ]);

      const res = await request(app).get("/api/users/local/testuser");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.login).toBe("testuser");
    });

    it("should return 404 if user not stored locally", async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const res = await request(app).get("/api/users/local/unknownuser");

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
