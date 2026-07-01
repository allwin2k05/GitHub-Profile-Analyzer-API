export function calculateInsights(repositories) {
  let totalStars = 0;
  let totalForks = 0;

  const languages = {};

  for (const repo of repositories) {
    totalStars += repo.stargazers_count || 0;
    totalForks += repo.forks_count || 0;

    if (repo.language) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }
  }

  const topLanguage =
    Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Calculate languages distribution with count and percentage
  const totalReposWithLanguage = Object.values(languages).reduce((sum, count) => sum + count, 0);
  const languagesDistribution = {};
  for (const [lang, count] of Object.entries(languages)) {
    languagesDistribution[lang] = {
      count,
      percentage: totalReposWithLanguage > 0 ? parseFloat(((count / totalReposWithLanguage) * 100).toFixed(2)) : 0
    };
  }

  // Find top 3 repositories by stargazers count
  const topRepositories = [...repositories]
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 3)
    .map(repo => ({
      name: repo.name,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      language: repo.language || null,
      url: repo.html_url || null
    }));

  const avgStarsPerRepo = repositories.length > 0
    ? parseFloat((totalStars / repositories.length).toFixed(2))
    : 0.00;

  return {
    totalStars,
    totalForks,
    topLanguage,
    avgStarsPerRepo,
    languagesDistribution,
    topRepositories,
  };
}
