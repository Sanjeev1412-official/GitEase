"use server";

import { Octokit } from "@octokit/rest";
import { auth } from "@/auth";

export interface PushFilePayload {
  path: string;
  content: string;
  encoding: "utf-8" | "base64";
}

export interface TreeItem {
  path: string;
  mode: "100644";
  type: "blob";
  sha: string;
}

export interface PrepareRepoResult {
  success: boolean;
  owner?: string;
  repoName?: string;
  defaultBranch?: string;
  parentCommitSha?: string;
  error?: string;
}

export interface CreateBlobsResult {
  success: boolean;
  treeItems?: TreeItem[];
  error?: string;
}

export interface PushProjectResult {
  success: boolean;
  repoUrl?: string;
  commitSha?: string;
  branch?: string;
  fileCount?: number;
  error?: string;
}

async function getOctokit() {
  const session = await auth();
  if (!session || !session.accessToken) {
    throw new Error("Authentication failed. Please sign in with GitHub.");
  }
  return new Octokit({ auth: session.accessToken });
}

// 1. Prepare repository (Check existence / Create repo / Get default branch & HEAD ref)
export async function prepareRepository(
  repoNameInput: string,
  isPrivate: boolean
): Promise<PrepareRepoResult> {
  try {
    const octokit = await getOctokit();
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const owner = user.login;
    const repoName = repoNameInput.trim().replace(/[^a-zA-Z0-9-_.]/g, "-");

    if (!repoName) {
      return { success: false, error: "Please enter a valid repository name." };
    }

    let defaultBranch = "main";

    try {
      const { data: existingRepo } = await octokit.rest.repos.get({
        owner,
        repo: repoName,
      });
      defaultBranch = existingRepo.default_branch || "main";
    } catch (err: any) {
      if (err.status === 404) {
        const { data: newRepo } = await octokit.rest.repos.createForAuthenticatedUser({
          name: repoName,
          private: isPrivate,
          auto_init: true,
          description: "Uploaded via GitEase",
        });
        defaultBranch = newRepo.default_branch || "main";
        await new Promise((res) => setTimeout(res, 1500));
      } else {
        throw err;
      }
    }

    let parentCommitSha: string | null = null;
    try {
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${defaultBranch}`,
      });
      parentCommitSha = refData.object.sha;
    } catch (refErr: any) {
      if (refErr.status === 404) {
        const initBlob = await octokit.rest.git.createBlob({
          owner,
          repo: repoName,
          content: `# ${repoName}\nCreated with GitEase`,
          encoding: "utf-8",
        });
        const initTree = await octokit.rest.git.createTree({
          owner,
          repo: repoName,
          tree: [{ path: "README.md", mode: "100644", type: "blob", sha: initBlob.data.sha }],
        });
        const initCommit = await octokit.rest.git.createCommit({
          owner,
          repo: repoName,
          message: "Initial commit",
          tree: initTree.data.sha,
        });
        await octokit.rest.git.createRef({
          owner,
          repo: repoName,
          ref: `refs/heads/${defaultBranch}`,
          sha: initCommit.data.sha,
        });
        parentCommitSha = initCommit.data.sha;
      } else {
        throw refErr;
      }
    }

    return {
      success: true,
      owner,
      repoName,
      defaultBranch,
      parentCommitSha,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to initialize repository on GitHub.",
    };
  }
}

// 2. Create Git Blobs for a batch of files
export async function createGitBlobsBatch(
  owner: string,
  repoName: string,
  filesBatch: PushFilePayload[]
): Promise<CreateBlobsResult> {
  try {
    const octokit = await getOctokit();

    const createdBlobs = await Promise.all(
      filesBatch.map(async (file) => {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo: repoName,
          content: file.content,
          encoding: file.encoding,
        });
        return {
          path: file.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.sha,
        };
      })
    );

    return { success: true, treeItems: createdBlobs };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to create file blobs on GitHub.",
    };
  }
}

// 3. Finalize Commit (createTree -> createCommit -> updateRef)
export async function finalizeGitCommit(
  owner: string,
  repoName: string,
  defaultBranch: string,
  parentCommitSha: string,
  commitMessage: string,
  treeItems: TreeItem[]
): Promise<PushProjectResult> {
  try {
    const octokit = await getOctokit();

    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo: repoName,
      base_tree: parentCommitSha,
      tree: treeItems,
    });

    const message = commitMessage.trim() || "Upload project via GitEase";
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo: repoName,
      message,
      tree: newTree.sha,
      parents: [parentCommitSha],
    });

    await octokit.rest.git.updateRef({
      owner,
      repo: repoName,
      ref: `heads/${defaultBranch}`,
      sha: newCommit.sha,
      force: true,
    });

    const repoUrl = `https://github.com/${owner}/${repoName}`;

    return {
      success: true,
      repoUrl,
      commitSha: newCommit.sha,
      branch: defaultBranch,
      fileCount: treeItems.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to finalize commit on GitHub.",
    };
  }
}

// Single-call fallback server action if needed
export async function pushProjectToGithub(input: {
  repoName: string;
  isPrivate: boolean;
  commitMessage: string;
  files: PushFilePayload[];
}): Promise<PushProjectResult> {
  try {
    const prep = await prepareRepository(input.repoName, input.isPrivate);
    if (!prep.success || !prep.owner || !prep.repoName || !prep.parentCommitSha || !prep.defaultBranch) {
      return { success: false, error: prep.error || "Repository initialization failed." };
    }

    const blobs = await createGitBlobsBatch(prep.owner, prep.repoName, input.files);
    if (!blobs.success || !blobs.treeItems) {
      return { success: false, error: blobs.error || "Failed creating file blobs." };
    }

    return await finalizeGitCommit(
      prep.owner,
      prep.repoName,
      prep.defaultBranch,
      prep.parentCommitSha,
      input.commitMessage,
      blobs.treeItems
    );
  } catch (err: any) {
    return { success: false, error: err?.message || "Unexpected push error." };
  }
}
