#!/usr/bin/env node
"use strict";
// Gate guard runner.
//  CI (pull_request_target): reads the PR file list through the GitHub API. It never checks out
//  or executes code from the pull request; this file runs from the base branch.
//    env: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, PR_LABELS (JSON array), GITHUB_STEP_SUMMARY
//  Local:  node scripts/gate-guard.cjs --git <base> [<head>]   (default head: HEAD)
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const { analyze, decide, report } = require("./gate-guard-core.cjs");

const STATUS = { A: "added", M: "modified", D: "removed", R: "renamed", C: "copied", T: "changed" };

function filesFromGit(base, head) {
  const git = args => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const range = base + "..." + head;
  const files = [];
  for (const row of git(["diff", "--name-status", "-M", range]).split("\n").filter(Boolean)) {
    const parts = row.split("\t");
    const code = parts[0][0];
    const file = { status: STATUS[code] || "modified", filename: parts[parts.length - 1] };
    if (code === "R" || code === "C") file.previous_filename = parts[1];
    if (code !== "D") file.patch = git(["diff", "-M", range, "--", ...(file.previous_filename ? [file.previous_filename] : []), file.filename]);
    files.push(file);
  }
  return files;
}

async function filesFromApi() {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !/^\d+$/.test(PR_NUMBER || "")) throw new Error("missing GITHUB_TOKEN, GITHUB_REPOSITORY or PR_NUMBER");
  const files = [];
  for (let page = 1; page <= 30; page++) {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/files?per_page=100&page=${page}`, {
      headers: { authorization: "Bearer " + GITHUB_TOKEN, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" }
    });
    if (!res.ok) throw new Error("GitHub API " + res.status);
    const batch = await res.json();
    files.push(...batch);
    if (batch.length < 100) return files;
  }
  throw new Error("pull request has more than 3000 files; review manually");
}

function labels() {
  try { const v = JSON.parse(process.env.PR_LABELS || "[]"); return Array.isArray(v) ? v.map(String) : []; }
  catch { return []; }
}

async function main() {
  const gitAt = process.argv.indexOf("--git");
  const files = gitAt > -1 ? filesFromGit(process.argv[gitAt + 1], process.argv[gitAt + 2] || "HEAD") : await filesFromApi();
  const findings = analyze(files);
  const decision = decide(findings, labels());
  const text = report(findings, decision);
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n");
  if (!decision.pass) process.exitCode = 1;
}

main().catch(err => { console.error("gate-guard: " + err.message); process.exitCode = 2; });
