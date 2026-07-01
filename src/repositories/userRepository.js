import db from "../db/connection.js";

function toMySQLDate(isoString) {
  if (!isoString) return null;

  return new Date(isoString).toISOString().slice(0, 19).replace("T", " ");
}

export async function saveUser(user, insights) {
  const sql = `
    INSERT INTO github_users (
      github_id,
      login,
      name,
      avatar_url,
      bio,
      company,
      blog,
      location,
      twitter_username,
      hireable,
      public_repos,
      followers,
      following,
      total_stars,
      total_forks,
      top_language,
      avg_stars_per_repo,
      languages_distribution,
      top_repositories,
      account_age_years,
      persona_title,
      persona_description,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      avatar_url = VALUES(avatar_url),
      bio = VALUES(bio),
      company = VALUES(company),
      blog = VALUES(blog),
      location = VALUES(location),
      twitter_username = VALUES(twitter_username),
      hireable = VALUES(hireable),
      public_repos = VALUES(public_repos),
      followers = VALUES(followers),
      following = VALUES(following),
      total_stars = VALUES(total_stars),
      total_forks = VALUES(total_forks),
      top_language = VALUES(top_language),
      avg_stars_per_repo = VALUES(avg_stars_per_repo),
      languages_distribution = VALUES(languages_distribution),
      top_repositories = VALUES(top_repositories),
      account_age_years = VALUES(account_age_years),
      persona_title = VALUES(persona_title),
      persona_description = VALUES(persona_description),
      updated_at = VALUES(updated_at)
  `;

  const values = [
    user.id,
    user.login,
    user.name,
    user.avatar_url || null,
    user.bio || null,
    user.company || null,
    user.blog || null,
    user.location || null,
    user.twitter_username || null,
    user.hireable ? 1 : 0,
    user.public_repos || 0,
    user.followers || 0,
    user.following || 0,
    insights.totalStars,
    insights.totalForks,
    insights.topLanguage,
    insights.avgStarsPerRepo,
    JSON.stringify(insights.languagesDistribution),
    JSON.stringify(insights.topRepositories),
    insights.accountAgeYears,
    insights.persona?.title || null,
    insights.persona?.description || null,
    toMySQLDate(user.created_at),
    toMySQLDate(user.updated_at),
  ];

  await db.execute(sql, values);
}

export async function findAllUsers(options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = "synced_at",
    order = "DESC",
    language,
    location,
    hireable,
  } = options;

  const offset = (page - 1) * limit;

  // Whitelist sortBy and order to avoid SQL injection
  const allowedSortFields = [
    "total_stars",
    "total_forks",
    "public_repos",
    "followers",
    "following",
    "synced_at",
    "avg_stars_per_repo",
    "account_age_years",
    "login",
  ];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "synced_at";
  const safeOrder = ["ASC", "DESC"].includes(order.toUpperCase()) ? order.toUpperCase() : "DESC";

  const whereClauses = [];
  const queryParams = [];

  if (language) {
    whereClauses.push("top_language = ?");
    queryParams.push(language);
  }

  if (location) {
    whereClauses.push("location LIKE ?");
    queryParams.push(`%${location}%`);
  }

  if (hireable !== undefined && hireable !== null && hireable !== "") {
    const isHireable = hireable === "true" || hireable === true || hireable === "1" || hireable === 1;
    whereClauses.push("hireable = ?");
    queryParams.push(isHireable ? 1 : 0);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Count total matching users for pagination metadata
  const countSql = `SELECT COUNT(*) AS total FROM github_users ${whereSql}`;
  const [countRows] = await db.execute(countSql, queryParams);
  const total = countRows[0].total;

  const limitVal = parseInt(limit, 10) || 10;
  const offsetVal = parseInt(offset, 10) || 0;

  const dataSql = `
    SELECT * FROM github_users
    ${whereSql}
    ORDER BY ${safeSortBy} ${safeOrder}
    LIMIT ${limitVal} OFFSET ${offsetVal}
  `;

  const [rows] = await db.execute(dataSql, queryParams);

  return {
    users: rows,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: limitVal,
      totalPages: Math.ceil(total / limitVal),
    },
  };
}

export async function findUserByLogin(username) {
  const [rows] = await db.execute(
    `SELECT * FROM github_users WHERE login = ?`,
    [username],
  );

  return rows[0];
}

export async function findStoredUser(username) {
  const [rows] = await db.execute(
    `SELECT login, updated_at FROM github_users WHERE login = ?`,
    [username],
  );

  return rows[0];
}

export async function getAnalyticsSummary() {
  const [rows] = await db.execute(`
    SELECT
      COUNT(*) AS total_users,
      ROUND(AVG(public_repos), 2) AS avg_repositories,
      SUM(total_stars + total_forks) AS ecosystem_impact,
      (
        SELECT login
        FROM github_users
        ORDER BY total_stars DESC
        LIMIT 1
      ) AS top_influencer
    FROM github_users
  `);

  return rows[0];
}

export async function getTopInfluencers(limit = 10) {
  const cleanLimit = parseInt(limit, 10) || 10;

  const [rows] = await db.query(
    `
    SELECT
      login,
      total_stars,
      followers
    FROM github_users
    ORDER BY total_stars DESC
    LIMIT ?
    `,
    [cleanLimit],
  );

  return rows;
}

export async function searchByLanguage(language) {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM github_users
    WHERE top_language = ?
    ORDER BY total_stars DESC
    `,
    [language],
  );

  return rows;
}
