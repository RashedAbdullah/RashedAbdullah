// Reads the account's numbers from GitHub. Only totals leave this file: no
// repository name is returned or logged, because this repository's Action logs
// are public and private repositories are counted too.
import config from "./config.mjs";

const token = process.env.GH_TOKEN;

async function gql(query, variables = {}, attempt = 1) {
  let res, body;
  try {
    res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        authorization: `bearer ${token}`,
        "content-type": "application/json",
        "user-agent": "profile-card",
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(45_000),
    });
    body = await res.json();
  } catch {
    res = null;
  }
  if (res?.ok && body?.data && !body.errors) return body.data;
  if (res?.status === 401) throw new Error("GitHub refused the token (401): it is wrong or has expired");
  const final = body?.errors?.some((e) => e.type === "FORBIDDEN" || e.type === "NOT_FOUND");
  if (attempt < 4 && !final) {
    await new Promise((r) => setTimeout(r, attempt * 3000));
    return gql(query, variables, attempt + 1);
  }
  // error types only: messages can carry repository names
  const types = [...new Set((body?.errors ?? []).map((e) => e.type ?? "error"))];
  throw new Error(`GitHub request failed (${res?.status ?? "network"}) ${types.join(", ")}`);
}

export const QUERIES = {
  profile: `query($login: String!) {
    user(login: $login) {
      id name login createdAt
      followers { totalCount }
      contributionsCollection {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
      }
    }
  }`,
  year: `query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
      }
    }
  }`,
  repos: `query($login: String!, $after: String) {
    user(login: $login) {
      repositories(first: 50, after: $after, ownerAffiliations: OWNER, isFork: false) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id isPrivate pushedAt stargazerCount
          languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name } }
          }
        }
      }
    }
  }`,
  history: `query($id: ID!, $author: ID!, $since: GitTimestamp!, $after: String) {
    node(id: $id) {
      ... on Repository {
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100, after: $after, since: $since, author: { id: $author }) {
                pageInfo { hasNextPage endCursor }
                nodes { authoredDate parents { totalCount } }
              }
            }
          }
        }
      }
    }
  }`,
};

const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

export async function fetchData(now = new Date()) {
  if (!token) throw new Error("GH_TOKEN is not set");
  const { login } = config;
  const { user } = await gql(QUERIES.profile, { login });

  const days = new Map();
  for (let y = new Date(user.createdAt).getUTCFullYear(); y <= now.getUTCFullYear(); y++) {
    const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59));
    const d = await gql(QUERIES.year, {
      login,
      from: `${y}-01-01T00:00:00Z`,
      to: (end < now ? end : now).toISOString(),
    });
    for (const w of d.user.contributionsCollection.contributionCalendar.weeks)
      for (const c of w.contributionDays)
        days.set(c.date, { date: c.date, count: c.contributionCount, level: LEVEL[c.contributionLevel] ?? 0 });
  }

  const repos = [];
  for (let after = null; ; ) {
    const r = (await gql(QUERIES.repos, { login, after })).user.repositories;
    repos.push(...r.nodes.filter(Boolean));
    if (!r.pageInfo.hasNextPage) break;
    after = r.pageInfo.endCursor;
  }

  // every repository counts equally, so one large old project doesn't decide
  // the whole chart
  const languages = {};
  for (const repo of repos) {
    const bytes = repo.languages.edges.reduce((s, e) => s + e.size, 0);
    for (const e of repo.languages.edges)
      languages[e.node.name] = (languages[e.node.name] ?? 0) + e.size / bytes;
  }

  const since = new Date(now);
  since.setUTCFullYear(since.getUTCFullYear() - 1);
  const commits = [];
  let skipped = 0;
  for (const repo of repos.filter((r) => r.pushedAt && new Date(r.pushedAt) >= since)) {
    try {
      for (let after = null; ; ) {
        const d = await gql(QUERIES.history, { id: repo.id, author: user.id, since: since.toISOString(), after });
        const h = d.node?.defaultBranchRef?.target?.history;
        if (!h) break;
        for (const c of h.nodes)
          if (c.parents.totalCount < 2) commits.push(c.authoredDate);
        if (!h.pageInfo.hasNextPage) break;
        after = h.pageInfo.endCursor;
      }
    } catch {
      skipped++;
    }
  }
  if (skipped) console.warn(`${skipped} repositories could not be read (does the token have Contents: Read-only?)`);

  const c = user.contributionsCollection;
  return {
    now: now.toISOString(),
    name: user.name ?? user.login,
    login: user.login,
    joined: user.createdAt,
    followers: user.followers.totalCount,
    publicRepos: repos.filter((r) => !r.isPrivate).length,
    privateRepos: repos.filter((r) => r.isPrivate).length,
    stars: repos.filter((r) => !r.isPrivate).reduce((s, r) => s + r.stargazerCount, 0),
    commits12: c.totalCommitContributions,
    prs: c.totalPullRequestContributions,
    reviews: c.totalPullRequestReviewContributions,
    issues: c.totalIssueContributions,
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    commits,
    languages,
  };
}
