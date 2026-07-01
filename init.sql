DROP TABLE IF EXISTS github_users;

CREATE TABLE github_users (
    github_id BIGINT PRIMARY KEY,
    login VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    bio TEXT,
    company VARCHAR(255),
    blog VARCHAR(500),
    location VARCHAR(255),
    twitter_username VARCHAR(100),
    hireable BOOLEAN DEFAULT FALSE,
    public_repos INT DEFAULT 0,
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    total_stars INT DEFAULT 0,
    total_forks INT DEFAULT 0,
    top_language VARCHAR(100),
    avg_stars_per_repo DECIMAL(8, 2) DEFAULT 0.00,
    languages_distribution JSON,
    top_repositories JSON,
    account_age_years DECIMAL(5, 2) DEFAULT 0.00,
    created_at DATETIME,
    updated_at DATETIME,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lookup indexes
CREATE INDEX idx_login ON github_users(login);
CREATE INDEX idx_language ON github_users(top_language);

-- Ranking queries
CREATE INDEX idx_stars ON github_users(total_stars);

-- Frequently used sorting
CREATE INDEX idx_synced_at ON github_users(synced_at);