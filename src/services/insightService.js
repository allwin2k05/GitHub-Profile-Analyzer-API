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

export function determinePersona(profile, insights, repositories) {
  const stars = insights.totalStars || 0;
  const reposCount = repositories.length;
  const topLang = insights.topLanguage || "";
  const followers = profile.followers || 0;

  if (stars > 1000 || followers > 500) {
    return {
      title: "Ecosystem Influencer",
      description: "A prominent developer with significant reach and high community impact."
    };
  }

  const systemsLangs = ["Rust", "Go", "C++", "C", "Zig"];
  const dataLangs = ["Python", "R", "Julia", "Jupyter Notebook"];
  const webLangs = ["TypeScript", "JavaScript", "HTML", "CSS"];

  const languagesUsed = Object.keys(insights.languagesDistribution || {});
  const isPolyglot = languagesUsed.length >= 4;

  if (isPolyglot) {
    return {
      title: "Polyglot Pioneer",
      description: "A versatile developer comfortable working across multiple programming paradigms and stacks."
    };
  }

  if (systemsLangs.includes(topLang)) {
    return {
      title: "Systems Architect",
      description: "Focuses on high-performance infrastructure, low-level efficiency, and robust systems."
    };
  }

  if (dataLangs.includes(topLang)) {
    return {
      title: "Data Alchemist",
      description: "Extracts value from data, specializes in analytical tooling, machine learning, or scientific workflows."
    };
  }

  if (webLangs.includes(topLang)) {
    return {
      title: "Modern Web Artisan",
      description: "Specializes in building responsive user interfaces, fluid web systems, and rich interactive platforms."
    };
  }

  if (reposCount > 15) {
    return {
      title: "Prolific Builder",
      description: "Maintains a massive portfolio of diverse repositories and open-source explorations."
    };
  }

  return {
    title: "Rising Technologist",
    description: "Actively building their digital portfolio and establishing their presence in the developer community."
  };
}
