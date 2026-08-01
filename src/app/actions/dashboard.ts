"use server";

import { Octokit } from "@octokit/rest";
import { auth } from "@/auth";

export interface RepoSummary {
  id: number;
  name: string;
  owner: string;
  description: string | null;
  htmlUrl: string;
  isPrivate: boolean;
  stars: number;
  forks: number;
  language: string | null;
  updatedAt: string;
  topics: string[];
}

export interface ReadmeInfo {
  content: string;
  sha: string;
}

export interface ReleaseInfo {
  id: number;
  tagName: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  publishedAt: string | null;
  htmlUrl: string;
}

export interface WorkflowInfo {
  id: number;
  name: string;
  path: string;
  state: string;
}

export interface WorkflowRunInfo {
  id: number;
  name: string | null;
  headBranch: string | null;
  status: string | null;
  conclusion: string | null;
  createdAt: string;
  htmlUrl: string;
}

export interface IssueInfo {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  author: string;
  authorAvatar: string | null;
  createdAt: string;
  commentsCount: number;
  labels: string[];
  htmlUrl: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  authorName: string;
  authorAvatar: string | null;
  date: string;
  htmlUrl: string;
}

export interface BranchInfo {
  name: string;
  sha: string;
  isProtected: boolean;
}

export interface RepoFullDetails {
  repo: RepoSummary;
  readme: ReadmeInfo;
  releases: ReleaseInfo[];
  workflows: WorkflowInfo[];
  workflowRuns: WorkflowRunInfo[];
  issues: IssueInfo[];
  commits: CommitInfo[];
  branches: BranchInfo[];
}

async function getOctokit() {
  const session = await auth();
  if (!session || !session.accessToken) {
    throw new Error("Authentication failed. Please sign in with GitHub.");
  }
  return new Octokit({ auth: session.accessToken });
}

// 1. Fetch details ONLY for explicitly tracked repository names
export async function fetchTrackedRepos(
  repoList: Array<{ owner?: string; repoName: string }>
): Promise<{
  success: boolean;
  repos?: RepoSummary[];
  error?: string;
}> {
  try {
    const octokit = await getOctokit();
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const defaultOwner = user.login;

    const repoPromises = repoList.map(async (item) => {
      const owner = item.owner || defaultOwner;
      try {
        const { data: r } = await octokit.rest.repos.get({ owner, repo: item.repoName });
        return {
          id: r.id,
          name: r.name,
          owner: r.owner.login,
          description: r.description,
          htmlUrl: r.html_url,
          isPrivate: r.private,
          stars: r.stargazers_count || 0,
          forks: r.forks_count || 0,
          language: r.language || null,
          updatedAt: r.updated_at || new Date().toISOString(),
          topics: r.topics || [],
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(repoPromises);
    const validRepos = results.filter((r): r is RepoSummary => r !== null);

    return { success: true, repos: validRepos };
  } catch (error: any) {
    console.error("fetchTrackedRepos error:", error);
    return {
      success: false,
      error: error?.message || "Failed to fetch tracked repositories.",
    };
  }
}

// 1.5 Fetch authenticated user's repositories for autocomplete
export async function getUserRepos(): Promise<{
  success: boolean;
  repos?: { fullName: string; name: string; owner: string; isPrivate: boolean }[];
  error?: string;
}> {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 50,
    });

    const repos = data.map((r) => ({
      fullName: r.full_name,
      name: r.name,
      owner: r.owner.login,
      isPrivate: r.private,
    }));

    return { success: true, repos };
  } catch (error: any) {
    console.error("getUserRepos error:", error);
    return {
      success: false,
      error: error?.message || "Failed to fetch user repositories.",
    };
  }
}

// 2. Verify and fetch a single repository explicitly specified by user consent
export async function verifyAndGetSingleRepo(
  repoInput: string
): Promise<{
  success: boolean;
  repo?: RepoSummary;
  error?: string;
}> {
  try {
    const octokit = await getOctokit();
    const { data: user } = await octokit.rest.users.getAuthenticated();

    let owner = user.login;
    let repoName = repoInput.trim();

    if (repoName.includes("github.com/")) {
      const urlParts = repoName.replace(/https?:\/\/(www\.)?github\.com\//, "").split("/");
      if (urlParts.length >= 2) {
        owner = urlParts[0];
        repoName = urlParts[1].replace(/\.git$/, "");
      }
    } else if (repoName.includes("/")) {
      const parts = repoName.split("/");
      owner = parts[0];
      repoName = parts[1];
    }

    const { data: r } = await octokit.rest.repos.get({ owner, repo: repoName });

    const repoSummary: RepoSummary = {
      id: r.id,
      name: r.name,
      owner: r.owner.login,
      description: r.description,
      htmlUrl: r.html_url,
      isPrivate: r.private,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      language: r.language || null,
      updatedAt: r.updated_at || new Date().toISOString(),
      topics: r.topics || [],
    };

    return { success: true, repo: repoSummary };
  } catch (error: any) {
    if (error.status === 404) {
      return {
        success: false,
        error: "Repository not found or access denied on GitHub.",
      };
    }
    return {
      success: false,
      error: error?.message || "Failed to verify repository on GitHub.",
    };
  }
}

// 3. Fetch full repository details (Metadata, README, Releases, Workflows, Issues, Commits, Branches)
export async function getRepoFullDetails(
  owner: string,
  repo: string
): Promise<{
  success: boolean;
  details?: RepoFullDetails;
  error?: string;
}> {
  try {
    const octokit = await getOctokit();

    // Repo metadata
    const { data: r } = await octokit.rest.repos.get({ owner, repo });
    const repoSummary: RepoSummary = {
      id: r.id,
      name: r.name,
      owner: r.owner.login,
      description: r.description,
      htmlUrl: r.html_url,
      isPrivate: r.private,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      language: r.language || null,
      updatedAt: r.updated_at || new Date().toISOString(),
      topics: r.topics || [],
    };

    // README
    let readme: ReadmeInfo = { content: "", sha: "" };
    try {
      const { data: readmeData } = await octokit.rest.repos.getReadme({ owner, repo });
      const rawText = Buffer.from(readmeData.content, "base64").toString("utf-8");
      readme = { content: rawText, sha: readmeData.sha };
    } catch {
      // README does not exist yet
    }

    // Releases
    let releases: ReleaseInfo[] = [];
    try {
      const { data: relData } = await octokit.rest.repos.listReleases({ owner, repo });
      releases = relData.map((rel) => ({
        id: rel.id,
        tagName: rel.tag_name,
        name: rel.name || null,
        body: rel.body || null,
        draft: rel.draft,
        prerelease: rel.prerelease,
        publishedAt: rel.published_at || null,
        htmlUrl: rel.html_url,
      }));
    } catch {
      // No releases or API error
    }

    // Workflows
    let workflows: WorkflowInfo[] = [];
    let workflowRuns: WorkflowRunInfo[] = [];
    try {
      const { data: wfData } = await octokit.rest.actions.listRepoWorkflows({ owner, repo });
      workflows = wfData.workflows.map((w) => ({
        id: w.id,
        name: w.name,
        path: w.path,
        state: w.state,
      }));

      const { data: runsData } = await octokit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        per_page: 20,
      });
      workflowRuns = runsData.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name || null,
        headBranch: run.head_branch || null,
        status: run.status || null,
        conclusion: run.conclusion || null,
        createdAt: run.created_at,
        htmlUrl: run.html_url,
      }));
    } catch {
      // Actions disabled or no workflows
    }

    // Issues
    let issues: IssueInfo[] = [];
    try {
      const { data: issueData } = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: "all",
        per_page: 30,
      });
      issues = issueData
        .filter((item) => !item.pull_request) // Filter out PRs
        .map((iss) => ({
          number: iss.number,
          title: iss.title,
          body: iss.body || null,
          state: iss.state as "open" | "closed",
          author: iss.user?.login || "unknown",
          authorAvatar: iss.user?.avatar_url || null,
          createdAt: iss.created_at,
          commentsCount: iss.comments || 0,
          labels: iss.labels.map((l: any) => (typeof l === "string" ? l : l.name || "")),
          htmlUrl: iss.html_url,
        }));
    } catch {
      // Issues disabled or error
    }

    // Commits
    let commits: CommitInfo[] = [];
    try {
      const { data: commitData } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 20,
      });
      commits = commitData.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        authorName: c.commit.author?.name || c.author?.login || "Anonymous",
        authorAvatar: c.author?.avatar_url || null,
        date: c.commit.author?.date || new Date().toISOString(),
        htmlUrl: c.html_url,
      }));
    } catch {
      // Empty repo or error
    }

    // Branches
    let branches: BranchInfo[] = [];
    try {
      const { data: branchData } = await octokit.rest.repos.listBranches({
        owner,
        repo,
      });
      branches = branchData.map((b) => ({
        name: b.name,
        sha: b.commit.sha,
        isProtected: b.protected || false,
      }));
    } catch {
      // Error fetching branches
    }

    return {
      success: true,
      details: {
        repo: repoSummary,
        readme,
        releases,
        workflows,
        workflowRuns,
        issues,
        commits,
        branches,
      },
    };
  } catch (error: any) {
    console.error("getRepoFullDetails error:", error);
    return {
      success: false,
      error: error?.message || "Failed to fetch repository details.",
    };
  }
}

// 4. Update Repository Settings (Description, Website, Visibility, Topics)
export async function updateRepoSettings(
  owner: string,
  repo: string,
  payload: {
    description?: string;
    homepage?: string;
    isPrivate?: boolean;
    topics?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const octokit = await getOctokit();

    await octokit.rest.repos.update({
      owner,
      repo,
      description: payload.description,
      homepage: payload.homepage,
      private: payload.isPrivate,
    });

    if (payload.topics) {
      await octokit.rest.repos.replaceAllTopics({
        owner,
        repo,
        names: payload.topics,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("updateRepoSettings error:", error);
    return {
      success: false,
      error: error?.message || "Failed to update repository settings.",
    };
  }
}

// 5. Save/Commit README.md changes
export async function saveReadmeContent(
  owner: string,
  repo: string,
  content: string,
  sha?: string,
  commitMessage?: string
): Promise<{ success: boolean; newSha?: string; error?: string }> {
  try {
    const octokit = await getOctokit();
    const base64Content = Buffer.from(content, "utf-8").toString("base64");
    const message = commitMessage?.trim() || "Update README.md via GitEase";

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: "README.md",
      message,
      content: base64Content,
      sha: sha || undefined,
    });

    return { success: true, newSha: data.content?.sha };
  } catch (error: any) {
    console.error("saveReadmeContent error:", error);
    return {
      success: false,
      error: error?.message || "Failed to save README.md.",
    };
  }
}

// 6. Create a new GitHub Release
export async function createNewRelease(
  owner: string,
  repo: string,
  payload: {
    tagName: string;
    name: string;
    body: string;
    draft: boolean;
    prerelease: boolean;
  }
): Promise<{ success: boolean; releaseUrl?: string; error?: string }> {
  try {
    const octokit = await getOctokit();

    const { data } = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: payload.tagName.trim(),
      name: payload.name.trim() || payload.tagName.trim(),
      body: payload.body,
      draft: payload.draft,
      prerelease: payload.prerelease,
    });

    return { success: true, releaseUrl: data.html_url };
  } catch (error: any) {
    console.error("createNewRelease error:", error);
    return {
      success: false,
      error: error?.message || "Failed to create release on GitHub.",
    };
  }
}

// 7. Dispatch a GitHub Action Workflow
export async function dispatchWorkflow(
  owner: string,
  repo: string,
  workflowId: number,
  ref: string = "main"
): Promise<{ success: boolean; error?: string }> {
  try {
    const octokit = await getOctokit();

    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflowId,
      ref,
    });

    return { success: true };
  } catch (error: any) {
    console.error("dispatchWorkflow error:", error);
    return {
      success: false,
      error: error?.message || "Failed to dispatch workflow.",
    };
  }
}

// 8. Create a new GitHub Issue
export async function createNewIssue(
  owner: string,
  repo: string,
  payload: {
    title: string;
    body: string;
    labels?: string[];
  }
): Promise<{ success: boolean; issueUrl?: string; error?: string }> {
  try {
    const octokit = await getOctokit();

    const { data } = await octokit.rest.issues.create({
      owner,
      repo,
      title: payload.title.trim(),
      body: payload.body,
      labels: payload.labels,
    });

    return { success: true, issueUrl: data.html_url };
  } catch (error: any) {
    console.error("createNewIssue error:", error);
    return {
      success: false,
      error: error?.message || "Failed to create issue.",
    };
  }
}

// 9. Close or Reopen an Issue
export async function toggleIssueState(
  owner: string,
  repo: string,
  issueNumber: number,
  currentState: "open" | "closed"
): Promise<{ success: boolean; error?: string }> {
  try {
    const octokit = await getOctokit();
    const newState = currentState === "open" ? "closed" : "open";

    await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      state: newState,
    });

    return { success: true };
  } catch (error: any) {
    console.error("toggleIssueState error:", error);
    return {
      success: false,
      error: error?.message || "Failed to update issue status.",
    };
  }
}

// 10. Create a new Branch
export async function createNewBranch(
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string = "main"
): Promise<{ success: boolean; error?: string }> {
  try {
    const octokit = await getOctokit();

    // Get SHA of parent branch
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName.trim().replace(/[^a-zA-Z0-9-_/.]/g, "-")}`,
      sha: refData.object.sha,
    });

    return { success: true };
  } catch (error: any) {
    console.error("createNewBranch error:", error);
    return {
      success: false,
      error: error?.message || "Failed to create new branch.",
    };
  }
}

// 11. Get Repo Contents (file explorer)
export interface RepoContentItem {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size: number;
  sha: string;
  htmlUrl: string | null;
  downloadUrl: string | null;
}

export async function getRepoContents(
  owner: string,
  repo: string,
  path: string = ""
): Promise<{ success: boolean; items?: RepoContentItem[]; error?: string }> {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });

    if (!Array.isArray(data)) {
      return { success: false, error: "Expected a directory, got a file." };
    }

    const items: RepoContentItem[] = data.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: item.type as RepoContentItem["type"],
      size: item.size || 0,
      sha: item.sha,
      htmlUrl: item.html_url || null,
      downloadUrl: item.download_url || null,
    }));

    // Sort: dirs first, then files alphabetically
    items.sort((a, b) => {
      if (a.type === "dir" && b.type !== "dir") return -1;
      if (a.type !== "dir" && b.type === "dir") return 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, items };
  } catch (error: any) {
    console.error("getRepoContents error:", error);
    return { success: false, error: error?.message || "Failed to fetch repository contents." };
  }
}

// 12. Get Repo Clone URLs
export async function getRepoCloneUrls(
  owner: string,
  repo: string
): Promise<{
  success: boolean;
  httpsUrl?: string;
  sshUrl?: string;
  githubCliUrl?: string;
  error?: string;
}> {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.get({ owner, repo });

    return {
      success: true,
      httpsUrl: data.clone_url,
      sshUrl: data.ssh_url,
      githubCliUrl: `gh repo clone ${owner}/${repo}`,
    };
  } catch (error: any) {
    console.error("getRepoCloneUrls error:", error);
    return { success: false, error: error?.message || "Failed to get clone URLs." };
  }
}

// 13. Get a single file's decoded content + SHA for editing
export async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<{ success: boolean; content?: string; sha?: string; error?: string }> {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
    if (Array.isArray(data) || data.type !== "file") {
      return { success: false, error: "Path is not a file." };
    }
    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    return { success: true, content: decoded, sha: data.sha };
  } catch (error: any) {
    console.error("getFileContent error:", error);
    return { success: false, error: error?.message || "Failed to get file content." };
  }
}

// 14. Update (commit) a single file
export async function updateFileContent(
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha: string,
  commitMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const octokit = await getOctokit();
    const encoded = Buffer.from(content, "utf-8").toString("base64");
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: commitMessage || `Update ${path} via GitEase`,
      content: encoded,
      sha,
    });
    return { success: true };
  } catch (error: any) {
    console.error("updateFileContent error:", error);
    return { success: false, error: error?.message || "Failed to update file." };
  }
}

// 15. Delete a single file
export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  sha: string,
  commitMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const octokit = await getOctokit();
    await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path,
      message: commitMessage || `Delete ${path} via GitEase`,
      sha,
    });
    return { success: true };
  } catch (error: any) {
    console.error("deleteFile error:", error);
    return { success: false, error: error?.message || "Failed to delete file." };
  }
}

// 16. Delete an entire folder recursively via the Git Trees API
export async function deleteFolder(
  owner: string,
  repo: string,
  folderPath: string,
  commitMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const octokit = await getOctokit();

    // Get the default branch HEAD commit
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });
    const headSha = refData.object.sha;

    // Get the full tree recursively
    const { data: commit } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: headSha });
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: commit.tree.sha,
      recursive: "true",
    });

    // Filter out all blobs inside the target folder
    const prefix = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
    const filtered = tree.tree
      .filter((node) => node.type === "blob" && !node.path?.startsWith(prefix))
      .map((node) => ({
        path: node.path!,
        mode: node.mode as "100644" | "100755" | "040000" | "160000" | "120000",
        type: node.type as "blob" | "tree" | "commit",
        sha: node.sha!,
      }));

    if (filtered.length === tree.tree.filter((n) => n.type === "blob").length) {
      return { success: false, error: "Folder not found or already empty." };
    }

    // Create new tree without the folder files
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      tree: filtered,
    });

    // Create a new commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: commitMessage || `Delete folder ${folderPath} via GitEase`,
      tree: newTree.sha,
      parents: [headSha],
    });

    // Update the branch ref
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
      sha: newCommit.sha,
    });

    return { success: true };
  } catch (error: any) {
    console.error("deleteFolder error:", error);
    return { success: false, error: error?.message || "Failed to delete folder." };
  }
}


